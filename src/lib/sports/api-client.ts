// API-Sports client wrapper with caching and rate limiting

import {
    Game,
    PlayerGameStats,
    League,
    GameStatus,
    GameClock
} from './types';

// In-memory cache
interface CacheEntry<T> {
    data: T;
    expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const CACHE_TTL = 60 * 1000; // 60 seconds

function getCached<T>(key: string): T | null {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
        cache.delete(key);
        return null;
    }
    return entry.data as T;
}

function setCache<T>(key: string, data: T, ttl: number = CACHE_TTL): void {
    cache.set(key, { data, expiresAt: Date.now() + ttl });
}

// API configuration
const API_KEY = process.env.SPORTS_API_KEY || '0118d8db2dc7adcd1aa2e49a208ab47b';
const NFL_BASE_URL = 'https://v1.american-football.api-sports.io';
const NBA_BASE_URL = 'https://v1.basketball.api-sports.io';

async function fetchFromApi<T>(baseUrl: string, endpoint: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${baseUrl}${endpoint}`);
    Object.entries(params).forEach(([key, value]) => url.searchParams.append(key, value));

    const cacheKey = url.toString();
    const cached = getCached<T>(cacheKey);
    if (cached) return cached;

    const response = await fetch(url.toString(), {
        headers: {
            'x-apisports-key': API_KEY,
        },
    });

    if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    setCache(cacheKey, data);
    return data;
}

// NFL API Types (from API-Sports)
interface NFLGameResponse {
    response: Array<{
        game: {
            id: number;
            stage: string;
            week: string;
            date: {
                date: string;
                time: string;
                timezone: string;
            };
            venue: {
                name: string;
                city: string;
            };
            status: {
                short: string;
                long: string;
                timer: string | null;
            };
        };
        league: {
            id: number;
            name: string;
            season: number;
            logo: string;
        };
        teams: {
            home: {
                id: number;
                name: string;
                logo: string;
            };
            away: {
                id: number;
                name: string;
                logo: string;
            };
        };
        scores: {
            home: {
                quarter_1: number | null;
                quarter_2: number | null;
                quarter_3: number | null;
                quarter_4: number | null;
                overtime: number | null;
                total: number | null;
            };
            away: {
                quarter_1: number | null;
                quarter_2: number | null;
                quarter_3: number | null;
                quarter_4: number | null;
                overtime: number | null;
                total: number | null;
            };
        };
    }>;
}

// NBA API Types
interface NBAGameResponse {
    response: Array<{
        id: number;
        date: string;
        time: string;
        timestamp: number;
        timezone: string;
        stage: number | null;
        week: string | null;
        status: {
            long: string;
            short: string;
            timer: string | null;
        };
        league: {
            id: number;
            name: string;
            type: string;
            season: string;
            logo: string;
        };
        country: {
            id: number;
            name: string;
            code: string;
            flag: string;
        };
        teams: {
            home: {
                id: number;
                name: string;
                logo: string;
            };
            away: {
                id: number;
                name: string;
                logo: string;
            };
        };
        scores: {
            home: {
                quarter_1: number | null;
                quarter_2: number | null;
                quarter_3: number | null;
                quarter_4: number | null;
                over_time: number | null;
                total: number | null;
            };
            away: {
                quarter_1: number | null;
                quarter_2: number | null;
                quarter_3: number | null;
                quarter_4: number | null;
                over_time: number | null;
                total: number | null;
            };
        };
    }>;
}

// Normalize NFL game to our Game type
function normalizeNFLGame(raw: NFLGameResponse['response'][0]): Game {
    const status = mapNFLStatus(raw.game.status.short);

    return {
        id: `nfl-${raw.game.id}`,
        league: 'NFL',
        homeTeam: {
            id: `nfl-team-${raw.teams.home.id}`,
            name: raw.teams.home.name,
            abbreviation: getTeamAbbreviation(raw.teams.home.name),
            logoUrl: raw.teams.home.logo,
            league: 'NFL',
        },
        awayTeam: {
            id: `nfl-team-${raw.teams.away.id}`,
            name: raw.teams.away.name,
            abbreviation: getTeamAbbreviation(raw.teams.away.name),
            logoUrl: raw.teams.away.logo,
            league: 'NFL',
        },
        startTime: new Date(`${raw.game.date.date}T${raw.game.date.time}`),
        status,
        score: {
            home: raw.scores.home.total ?? 0,
            away: raw.scores.away.total ?? 0,
            periods: [
                raw.scores.home.quarter_1 ?? 0,
                raw.scores.home.quarter_2 ?? 0,
                raw.scores.home.quarter_3 ?? 0,
                raw.scores.home.quarter_4 ?? 0,
            ],
        },
        clock: raw.game.status.timer ? parseNFLClock(raw.game.status.timer, status) : undefined,
        venue: raw.game.venue?.name,
    };
}

// Normalize NBA game to our Game type
function normalizeNBAGame(raw: NBAGameResponse['response'][0]): Game {
    const status = mapNBAStatus(raw.status.short);

    return {
        id: `nba-${raw.id}`,
        league: 'NBA',
        homeTeam: {
            id: `nba-team-${raw.teams.home.id}`,
            name: raw.teams.home.name,
            abbreviation: getTeamAbbreviation(raw.teams.home.name),
            logoUrl: raw.teams.home.logo,
            league: 'NBA',
        },
        awayTeam: {
            id: `nba-team-${raw.teams.away.id}`,
            name: raw.teams.away.name,
            abbreviation: getTeamAbbreviation(raw.teams.away.name),
            logoUrl: raw.teams.away.logo,
            league: 'NBA',
        },
        startTime: new Date(raw.timestamp * 1000),
        status,
        score: {
            home: raw.scores.home.total ?? 0,
            away: raw.scores.away.total ?? 0,
            periods: [
                raw.scores.home.quarter_1 ?? 0,
                raw.scores.home.quarter_2 ?? 0,
                raw.scores.home.quarter_3 ?? 0,
                raw.scores.home.quarter_4 ?? 0,
            ],
        },
        clock: raw.status.timer ? parseNBAClock(raw.status.timer, status) : undefined,
    };
}

function mapNFLStatus(status: string): GameStatus {
    switch (status) {
        case 'NS': return 'scheduled';
        case 'Q1': case 'Q2': case 'Q3': case 'Q4': case 'OT': return 'in_progress';
        case 'HT': return 'halftime';
        case 'FT': case 'AOT': return 'final';
        case 'PST': return 'postponed';
        case 'CANC': return 'cancelled';
        default: return 'scheduled';
    }
}

function mapNBAStatus(status: string): GameStatus {
    switch (status) {
        case 'NS': return 'scheduled';
        case 'Q1': case 'Q2': case 'Q3': case 'Q4': case 'OT': case 'BT': return 'in_progress';
        case 'HT': return 'halftime';
        case 'FT': case 'AOT': return 'final';
        case 'PST': return 'postponed';
        case 'CANC': return 'cancelled';
        default: return 'scheduled';
    }
}

function parseNFLClock(timer: string, status: GameStatus): GameClock {
    const period = getPeriodFromStatus(status);
    return {
        period,
        periodName: getPeriodName(period, 'NFL'),
        time: timer || '',
    };
}

function parseNBAClock(timer: string, status: GameStatus): GameClock {
    const period = getPeriodFromStatus(status);
    return {
        period,
        periodName: getPeriodName(period, 'NBA'),
        time: timer || '',
    };
}

function getPeriodFromStatus(status: GameStatus): number {
    // This is simplified - in real implementation, parse from the status string
    return status === 'halftime' ? 2 : 1;
}

function getPeriodName(period: number, league: League): string {
    if (league === 'NFL' || league === 'NBA') {
        const ordinal = ['1st', '2nd', '3rd', '4th'][period - 1] || 'OT';
        return `${ordinal} Quarter`;
    }
    return `Period ${period}`;
}

function getTeamAbbreviation(name: string): string {
    // Common team abbreviations
    const abbreviations: Record<string, string> = {
        // NFL
        'Chicago Bears': 'CHI',
        'Green Bay Packers': 'GB',
        'Detroit Lions': 'DET',
        'Minnesota Vikings': 'MIN',
        // NBA
        'Los Angeles Lakers': 'LAL',
        'Golden State Warriors': 'GSW',
        'Boston Celtics': 'BOS',
        'Miami Heat': 'MIA',
        'San Antonio Spurs': 'SAS',
        'Houston Rockets': 'HOU',
        'Dallas Mavericks': 'DAL',
        'Phoenix Suns': 'PHX',
        'Denver Nuggets': 'DEN',
        'Los Angeles Clippers': 'LAC',
        'Sacramento Kings': 'SAC',
        'Portland Trail Blazers': 'POR',
        'Oklahoma City Thunder': 'OKC',
        'Memphis Grizzlies': 'MEM',
        'New Orleans Pelicans': 'NOP',
        'Utah Jazz': 'UTA',
    };
    return abbreviations[name] || name.substring(0, 3).toUpperCase();
}

// Public API
export async function getLiveNFLGames(date?: string): Promise<Game[]> {
    const today = date || new Date().toISOString().split('T')[0];
    try {
        const response = await fetchFromApi<NFLGameResponse>(NFL_BASE_URL, '/games', {
            date: today,
        });
        return response.response.map(normalizeNFLGame);
    } catch (error) {
        console.error('Failed to fetch NFL games:', error);
        return [];
    }
}

export async function getLiveNBAGames(date?: string): Promise<Game[]> {
    const today = date || new Date().toISOString().split('T')[0];
    try {
        const response = await fetchFromApi<NBAGameResponse>(NBA_BASE_URL, '/games', {
            date: today,
        });
        return response.response.map(normalizeNBAGame);
    } catch (error) {
        console.error('Failed to fetch NBA games:', error);
        return [];
    }
}

export async function getGameById(gameId: string): Promise<Game | null> {
    const [league, id] = gameId.split('-');

    if (league === 'nfl') {
        try {
            const response = await fetchFromApi<NFLGameResponse>(NFL_BASE_URL, '/games', {
                id: id,
            });
            if (response.response.length > 0) {
                return normalizeNFLGame(response.response[0]);
            }
        } catch (error) {
            console.error('Failed to fetch NFL game:', error);
        }
    } else if (league === 'nba') {
        try {
            const response = await fetchFromApi<NBAGameResponse>(NBA_BASE_URL, '/games', {
                id: id,
            });
            if (response.response.length > 0) {
                return normalizeNBAGame(response.response[0]);
            }
        } catch (error) {
            console.error('Failed to fetch NBA game:', error);
        }
    }

    return null;
}

// Mock player stats for now (API-Sports requires separate endpoints)
export async function getPlayerStatsForGame(gameId: string): Promise<PlayerGameStats[]> {
    // This would call the player statistics endpoint
    // For MVP, return mock data
    return getMockPlayerStats(gameId);
}

function getMockPlayerStats(gameId: string): PlayerGameStats[] {
    // Generate realistic mock stats based on game ID
    const isNFL = gameId.startsWith('nfl');

    if (isNFL) {
        return [
            {
                playerId: 'player-1',
                name: 'Caleb Williams',
                position: 'QB',
                teamId: 'team-chi',
                teamAbbreviation: 'CHI',
                stats: {
                    playerId: 'player-1',
                    name: 'Caleb Williams',
                    position: 'QB',
                    teamId: 'team-chi',
                    teamAbbreviation: 'CHI',
                    passingYards: 287,
                    passingTouchdowns: 2,
                    interceptions: 1,
                    completions: 24,
                    attempts: 35,
                    rushingYards: 32,
                    rushingAttempts: 5,
                    completionPercentage: 68.6,
                },
            },
            {
                playerId: 'player-2',
                name: 'D\'Andre Swift',
                position: 'RB',
                teamId: 'team-chi',
                teamAbbreviation: 'CHI',
                stats: {
                    playerId: 'player-2',
                    name: 'D\'Andre Swift',
                    position: 'RB',
                    teamId: 'team-chi',
                    teamAbbreviation: 'CHI',
                    rushingYards: 98,
                    rushingAttempts: 18,
                    rushingTouchdowns: 1,
                    receivingYards: 24,
                    receptions: 3,
                    yardsPerCarry: 5.4,
                },
            },
        ];
    } else {
        return [
            {
                playerId: 'player-3',
                name: 'LeBron James',
                position: 'SF',
                teamId: 'team-lal',
                teamAbbreviation: 'LAL',
                stats: {
                    playerId: 'player-3',
                    name: 'LeBron James',
                    position: 'SF',
                    teamId: 'team-lal',
                    teamAbbreviation: 'LAL',
                    points: 28,
                    rebounds: 8,
                    assists: 11,
                    steals: 2,
                    blocks: 1,
                    turnovers: 3,
                    fieldGoalsMade: 10,
                    fieldGoalsAttempted: 18,
                    fieldGoalPercentage: 55.6,
                    minutes: '35:22',
                },
            },
        ];
    }
}

export { cache, CACHE_TTL };
