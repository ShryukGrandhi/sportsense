// Sports data types - normalized interfaces for all sports APIs

export type League = 'NFL' | 'NBA' | 'MLB' | 'NHL' | 'NCAA_FB' | 'NCAA_BB' | 'SOCCER';

export type GameStatus = 'scheduled' | 'in_progress' | 'halftime' | 'final' | 'postponed' | 'cancelled';

export interface Team {
  id: string;
  name: string;
  abbreviation: string;
  logoUrl: string;
  league: League;
  colors?: {
    primary: string;
    secondary: string;
  };
  city?: string;
  conference?: string;
  division?: string;
}

export interface Score {
  home: number;
  away: number;
  periods?: number[]; // Scores by period/quarter
}

export interface GameClock {
  period: number;
  periodName: string; // "1st Quarter", "2nd Half", etc.
  time: string; // "12:34" or "FINAL"
  possession?: 'home' | 'away';
  down?: number; // NFL specific
  yardsToGo?: number; // NFL specific
  ballPosition?: string; // "OPP 25"
}

export interface Game {
  id: string;
  league: League;
  homeTeam: Team;
  awayTeam: Team;
  startTime: Date;
  status: GameStatus;
  score: Score;
  clock?: GameClock;
  venue?: string;
  broadcast?: string;
  weather?: string;
}

export interface PlayerStats {
  // Common stats
  playerId: string;
  name: string;
  position: string;
  teamId: string;
  teamAbbreviation: string;
  jerseyNumber?: string;
  photoUrl?: string;

  // NFL stats
  passingYards?: number;
  passingTouchdowns?: number;
  interceptions?: number;
  completions?: number;
  attempts?: number;
  rushingYards?: number;
  rushingAttempts?: number;
  rushingTouchdowns?: number;
  receivingYards?: number;
  receptions?: number;
  targets?: number;
  receivingTouchdowns?: number;
  tackles?: number;
  sacks?: number;
  fumbles?: number;

  // NBA stats
  points?: number;
  rebounds?: number;
  assists?: number;
  steals?: number;
  blocks?: number;
  turnovers?: number;
  fieldGoalsMade?: number;
  fieldGoalsAttempted?: number;
  threePointersMade?: number;
  threePointersAttempted?: number;
  freeThrowsMade?: number;
  freeThrowsAttempted?: number;
  minutes?: string;

  // Derived stats (calculated)
  completionPercentage?: number;
  yardsPerCarry?: number;
  yardsPerReception?: number;
  fieldGoalPercentage?: number;
  threePointPercentage?: number;
  freeThrowPercentage?: number;
}

export interface PlayerGameStats {
  playerId: string;
  name: string;
  position: string;
  teamId: string;
  teamAbbreviation: string;
  photoUrl?: string;
  stats: PlayerStats;
}

export interface GameWithStats extends Game {
  homePlayerStats: PlayerGameStats[];
  awayPlayerStats: PlayerGameStats[];
}

// Visual context types for chat responses
export type CardType = 'player' | 'team' | 'scoreboard' | 'game-list' | 'stat-comparison';

export interface VisualCard {
  id: string;
  type: CardType;
  data: PlayerCardData | TeamCardData | ScoreboardCardData | GameListCardData | StatComparisonCardData;
}

export interface PlayerCardData {
  player: PlayerGameStats;
  game: Game;
  highlight?: string; // Key stat to highlight
}

export interface TeamCardData {
  team: Team;
  recentGames?: Game[];
  record?: { wins: number; losses: number; ties?: number };
}

export interface ScoreboardCardData {
  game: Game;
  showDetails?: boolean;
}

export interface GameListCardData {
  games: Game[];
  title?: string;
}

export interface StatComparisonCardData {
  players: PlayerGameStats[];
  statKeys: string[];
}

// Chat types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  visualContext?: VisualCard[];
  timestamp: Date;
}

// Pulse types
export interface PulseResult {
  gameId: string;
  confidence: number;
  game: GameWithStats;
  matchReason: string;
}

// API response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  cached?: boolean;
}
