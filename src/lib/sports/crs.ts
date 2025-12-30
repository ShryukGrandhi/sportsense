// Content Retrieval Service - unified sports data access layer

import {
    Game,
    GameWithStats,
    PlayerGameStats,
    League,
    Team,
    VisualCard,
    PlayerCardData,
    ScoreboardCardData,
    GameListCardData
} from './types';
import {
    getLiveNFLGames,
    getLiveNBAGames,
    getGameById,
    getPlayerStatsForGame
} from './api-client';

export class ContentRetrievalService {
    /**
     * Get all live games across specified leagues
     */
    async getLiveGames(leagues: League[] = ['NFL', 'NBA'], date?: string): Promise<Game[]> {
        const gamePromises: Promise<Game[]>[] = [];

        if (leagues.includes('NFL')) {
            gamePromises.push(getLiveNFLGames(date));
        }
        if (leagues.includes('NBA')) {
            gamePromises.push(getLiveNBAGames(date));
        }

        const results = await Promise.all(gamePromises);
        return results.flat().sort((a, b) =>
            new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        );
    }

    /**
     * Get a specific game with player stats
     */
    async getGameWithStats(gameId: string): Promise<GameWithStats | null> {
        const game = await getGameById(gameId);
        if (!game) return null;

        const playerStats = await getPlayerStatsForGame(gameId);

        return {
            ...game,
            homePlayerStats: playerStats.filter(p => p.teamAbbreviation === game.homeTeam.abbreviation),
            awayPlayerStats: playerStats.filter(p => p.teamAbbreviation === game.awayTeam.abbreviation),
        };
    }

    /**
     * Search for games by team name
     */
    async findGamesByTeam(teamName: string, date?: string): Promise<Game[]> {
        const allGames = await this.getLiveGames(['NFL', 'NBA'], date);
        const searchLower = teamName.toLowerCase();

        return allGames.filter(game =>
            game.homeTeam.name.toLowerCase().includes(searchLower) ||
            game.awayTeam.name.toLowerCase().includes(searchLower) ||
            game.homeTeam.abbreviation.toLowerCase() === searchLower ||
            game.awayTeam.abbreviation.toLowerCase() === searchLower
        );
    }

    /**
     * Get the most likely current game (for Pulse)
     * Uses heuristics: live games first, then user's favorite teams
     */
    async getMostLikelyGame(
        favoriteTeams: string[] = [],
        favoriteLeagues: League[] = ['NFL', 'NBA']
    ): Promise<Game | null> {
        const games = await this.getLiveGames(favoriteLeagues);

        if (games.length === 0) return null;

        // First priority: in-progress games for favorite teams
        const favoriteInProgress = games.filter(g =>
            g.status === 'in_progress' &&
            (favoriteTeams.some(t =>
                g.homeTeam.name.toLowerCase().includes(t.toLowerCase()) ||
                g.awayTeam.name.toLowerCase().includes(t.toLowerCase())
            ))
        );
        if (favoriteInProgress.length > 0) return favoriteInProgress[0];

        // Second priority: any in-progress game
        const inProgress = games.filter(g => g.status === 'in_progress');
        if (inProgress.length > 0) return inProgress[0];

        // Third priority: favorite team games (any status)
        const favoriteGames = games.filter(g =>
            favoriteTeams.some(t =>
                g.homeTeam.name.toLowerCase().includes(t.toLowerCase()) ||
                g.awayTeam.name.toLowerCase().includes(t.toLowerCase())
            )
        );
        if (favoriteGames.length > 0) return favoriteGames[0];

        // Fallback: first game
        return games[0];
    }

    /**
     * Build visual context for chat responses
     */
    buildVisualContext(
        game?: GameWithStats,
        players?: PlayerGameStats[],
        games?: Game[]
    ): VisualCard[] {
        const cards: VisualCard[] = [];

        // Add scoreboard card if we have a game
        if (game) {
            cards.push({
                id: `scoreboard-${game.id}`,
                type: 'scoreboard',
                data: {
                    game,
                    showDetails: true,
                } as ScoreboardCardData,
            });

            // Add player cards for the game
            const allPlayers = [...(game.homePlayerStats || []), ...(game.awayPlayerStats || [])];
            allPlayers.slice(0, 6).forEach((player, index) => {
                cards.push({
                    id: `player-${player.playerId}-${index}`,
                    type: 'player',
                    data: {
                        player,
                        game,
                    } as PlayerCardData,
                });
            });
        }

        // Add standalone player cards
        if (players && players.length > 0) {
            players.forEach((player, index) => {
                cards.push({
                    id: `player-standalone-${player.playerId}-${index}`,
                    type: 'player',
                    data: {
                        player,
                        game: game || undefined,
                    } as PlayerCardData,
                });
            });
        }

        // Add game list card
        if (games && games.length > 0) {
            cards.push({
                id: 'game-list',
                type: 'game-list',
                data: {
                    games,
                    title: 'Live Games',
                } as GameListCardData,
            });
        }

        return cards;
    }

    /**
     * Parse user message to extract intent
     */
    parseIntent(message: string): {
        teams: string[];
        players: string[];
        isScoreQuery: boolean;
        isStatsQuery: boolean;
        isLiveQuery: boolean;
    } {
        const messageLower = message.toLowerCase();

        // Common team names
        const teamPatterns = [
            // NFL
            'bears', 'packers', 'lions', 'vikings', 'chiefs', 'bills', 'eagles', 'cowboys',
            '49ers', 'niners', 'seahawks', 'rams', 'cardinals', 'broncos', 'raiders', 'chargers',
            'patriots', 'jets', 'dolphins', 'bengals', 'steelers', 'browns', 'ravens', 'titans',
            'colts', 'jaguars', 'texans', 'saints', 'falcons', 'panthers', 'buccaneers', 'bucs',
            'giants', 'commanders', 'redskins',
            // NBA
            'lakers', 'warriors', 'celtics', 'heat', 'nuggets', 'bucks', 'suns', 'mavericks',
            'spurs', 'rockets', 'clippers', 'kings', 'blazers', 'thunder', 'grizzlies',
            'pelicans', 'jazz', 'timberwolves', 'wolves', 'raptors', 'sixers', '76ers',
            'knicks', 'nets', 'bulls', 'cavaliers', 'cavs', 'pistons', 'pacers', 'hawks',
            'hornets', 'wizards', 'magic',
        ];

        const teams = teamPatterns.filter(team => messageLower.includes(team));

        // Common player names (would be more comprehensive in production)
        const playerPatterns = [
            'mahomes', 'burrow', 'allen', 'hurts', 'williams', 'swift',
            'lebron', 'curry', 'durant', 'tatum', 'jokic', 'giannis',
        ];

        const players = playerPatterns.filter(player => messageLower.includes(player));

        return {
            teams,
            players,
            isScoreQuery: /score|winning|losing|ahead|behind/i.test(message),
            isStatsQuery: /stats|yards|points|touchdowns?|rebounds|assists/i.test(message),
            isLiveQuery: /live|now|current|today|tonight/i.test(message),
        };
    }

    /**
     * Get context for LLM based on user message
     */
    async getContextForMessage(message: string): Promise<{
        game?: GameWithStats;
        games?: Game[];
        players?: PlayerGameStats[];
        contextSummary: string;
    }> {
        const intent = this.parseIntent(message);

        // If asking about specific team
        if (intent.teams.length > 0) {
            const games = await this.findGamesByTeam(intent.teams[0]);
            if (games.length > 0) {
                const gameWithStats = await this.getGameWithStats(games[0].id);
                return {
                    game: gameWithStats || undefined,
                    contextSummary: `Found game: ${games[0].awayTeam.abbreviation} @ ${games[0].homeTeam.abbreviation}`,
                };
            }
        }

        // If asking about live games
        if (intent.isLiveQuery) {
            const games = await this.getLiveGames();
            return {
                games,
                contextSummary: `Found ${games.length} live/scheduled games today`,
            };
        }

        // Default: get most likely game
        const game = await this.getMostLikelyGame();
        if (game) {
            const gameWithStats = await this.getGameWithStats(game.id);
            return {
                game: gameWithStats || undefined,
                contextSummary: `Default game: ${game.awayTeam.abbreviation} @ ${game.homeTeam.abbreviation}`,
            };
        }

        return { contextSummary: 'No games found' };
    }
}

// Singleton instance
export const crs = new ContentRetrievalService();
