// Pulse service - audio-based game detection with heuristic matching

import { crs } from '../sports';
import { Game, GameWithStats, PulseResult, League } from '../sports/types';
import prisma from '../db';

export interface PulseRequest {
    audioBlob?: Uint8Array;
    userId?: string;
    favoriteTeams?: string[];
    favoriteLeagues?: League[];
    timestamp?: Date;
}

export interface ACRProvider {
    name: string;
    matchAudio(audioBlob: Uint8Array): Promise<ACRResult | null>;
}

export interface ACRResult {
    gameId?: string;
    teamName?: string;
    league?: League;
    confidence: number;
    metadata?: Record<string, unknown>;
}

// Extension point for ACR providers (Gracenote, etc.)
const acrProviders: ACRProvider[] = [];

export function registerACRProvider(provider: ACRProvider): void {
    acrProviders.push(provider);
    console.log(`Registered ACR provider: ${provider.name}`);
}

/**
 * Process a Pulse request and find the most likely game
 */
export async function processPulse(request: PulseRequest): Promise<PulseResult | null> {
    const {
        audioBlob,
        userId,
        favoriteTeams = [],
        favoriteLeagues = ['NFL', 'NBA'],
        timestamp = new Date(),
    } = request;

    // If we have ACR providers, try them first
    if (audioBlob && acrProviders.length > 0) {
        for (const provider of acrProviders) {
            try {
                const acrResult = await provider.matchAudio(audioBlob);
                if (acrResult && acrResult.confidence > 0.7) {
                    const game = await findGameFromACR(acrResult);
                    if (game) {
                        const result = await buildPulseResult(game, acrResult.confidence, 'ACR match');
                        await savePulseEntry(userId, result);
                        return result;
                    }
                }
            } catch (error) {
                console.error(`ACR provider ${provider.name} failed:`, error);
            }
        }
    }

    // Fallback to heuristic matching
    const result = await heuristicMatch(favoriteTeams, favoriteLeagues, timestamp);

    if (result) {
        await savePulseEntry(userId, result);
    }

    return result;
}

/**
 * Heuristic matching based on time, user preferences, and game status
 */
async function heuristicMatch(
    favoriteTeams: string[],
    favoriteLeagues: League[],
    timestamp: Date
): Promise<PulseResult | null> {
    // Get current hour to determine expected games
    const hour = timestamp.getHours();

    // NFL games typically: Sunday 1pm, 4pm, 8pm ET; Monday 8pm ET; Thursday 8pm ET
    // NBA games typically: 7pm-10pm ET start times
    const isLikelyGameTime = hour >= 12 && hour <= 23;

    if (!isLikelyGameTime) {
        // Still try to find games, but with lower confidence
    }

    // Get live games
    const games = await crs.getLiveGames(favoriteLeagues);

    if (games.length === 0) {
        return null;
    }

    // Score each game for likelihood
    const scoredGames = games.map(game => ({
        game,
        score: scoreGame(game, favoriteTeams, timestamp),
    }));

    // Sort by score descending
    scoredGames.sort((a, b) => b.score - a.score);

    const bestMatch = scoredGames[0];

    if (bestMatch.score === 0) {
        return null;
    }

    // Get full game with stats
    const gameWithStats = await crs.getGameWithStats(bestMatch.game.id);

    if (!gameWithStats) {
        return null;
    }

    // Calculate confidence based on scoring
    const confidence = calculateConfidence(bestMatch.score, scoredGames.length);

    return buildPulseResult(
        gameWithStats,
        confidence,
        buildMatchReason(bestMatch.game, favoriteTeams)
    );
}

/**
 * Score a game based on various factors
 */
function scoreGame(game: Game, favoriteTeams: string[], timestamp: Date): number {
    let score = 0;

    // In-progress games get highest priority
    if (game.status === 'in_progress') {
        score += 50;
    } else if (game.status === 'halftime') {
        score += 45;
    } else if (game.status === 'scheduled') {
        // Check if game is about to start (within 30 minutes)
        const gameTime = new Date(game.startTime).getTime();
        const now = timestamp.getTime();
        const diff = Math.abs(gameTime - now);
        if (diff < 30 * 60 * 1000) {
            score += 30;
        } else if (diff < 60 * 60 * 1000) {
            score += 15;
        }
    }

    // Favorite team bonus
    const isFavoriteTeam = favoriteTeams.some(team =>
        game.homeTeam.name.toLowerCase().includes(team.toLowerCase()) ||
        game.awayTeam.name.toLowerCase().includes(team.toLowerCase())
    );
    if (isFavoriteTeam) {
        score += 30;
    }

    // Close game bonus (more exciting to watch)
    if (game.status === 'in_progress' && game.score) {
        const scoreDiff = Math.abs(game.score.home - game.score.away);
        if (scoreDiff <= 7) { // Close game
            score += 10;
        }
    }

    return score;
}

/**
 * Calculate confidence percentage from score
 */
function calculateConfidence(score: number, totalGames: number): number {
    // Base confidence from score (max 80 from scoring)
    const baseConfidence = Math.min(score / 80, 1) * 0.8;

    // Fewer running games = higher confidence
    const gameCountBonus = totalGames === 1 ? 0.2 : Math.max(0, (5 - totalGames) * 0.04);

    return Math.min(baseConfidence + gameCountBonus, 0.95);
}

/**
 * Build a human-readable match reason
 */
function buildMatchReason(game: Game, favoriteTeams: string[]): string {
    const reasons: string[] = [];

    if (game.status === 'in_progress') {
        reasons.push('Game is currently live');
    } else if (game.status === 'halftime') {
        reasons.push('Game is at halftime');
    }

    const isFavorite = favoriteTeams.some(team =>
        game.homeTeam.name.toLowerCase().includes(team.toLowerCase()) ||
        game.awayTeam.name.toLowerCase().includes(team.toLowerCase())
    );
    if (isFavorite) {
        reasons.push('Matches your favorite team');
    }

    if (reasons.length === 0) {
        reasons.push('Best available match based on current time');
    }

    return reasons.join('. ');
}

/**
 * Build full pulse result with game stats
 */
async function buildPulseResult(
    game: GameWithStats,
    confidence: number,
    matchReason: string
): Promise<PulseResult> {
    return {
        gameId: game.id,
        confidence,
        game,
        matchReason,
    };
}

/**
 * Find game from ACR result
 */
async function findGameFromACR(acrResult: ACRResult): Promise<GameWithStats | null> {
    if (acrResult.gameId) {
        return crs.getGameWithStats(acrResult.gameId);
    }

    if (acrResult.teamName) {
        const games = await crs.findGamesByTeam(acrResult.teamName);
        if (games.length > 0) {
            return crs.getGameWithStats(games[0].id);
        }
    }

    return null;
}

/**
 * Save pulse entry to database
 */
async function savePulseEntry(userId: string | undefined, result: PulseResult): Promise<void> {
    try {
        await prisma.pulseEntry.create({
            data: {
                userId: userId || null,
                gameId: result.gameId,
                league: result.game.league,
                rawMetaJson: {
                    confidence: result.confidence,
                    matchReason: result.matchReason,
                    timestamp: new Date().toISOString(),
                },
            },
        });
    } catch (error) {
        console.error('Failed to save pulse entry:', error);
    }
}

// Example: Mock ACR provider for testing
export const mockACRProvider: ACRProvider = {
    name: 'MockACR',
    async matchAudio(_audioBlob: Uint8Array): Promise<ACRResult | null> {
        // In production, this would send audio to an ACR service
        // For now, return null to use heuristic matching
        return null;
    },
};

// Uncomment to enable mock ACR for testing
// registerACRProvider(mockACRProvider);
