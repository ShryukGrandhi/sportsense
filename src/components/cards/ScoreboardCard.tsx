'use client';

import { motion } from 'framer-motion';
import { Card } from '../ui';
import { Game } from '@/lib/sports/types';
import clsx from 'clsx';
import Image from 'next/image';

interface ScoreboardCardProps {
    game: Game;
    showDetails?: boolean;
    compact?: boolean;
    delay?: number;
}

export function ScoreboardCard({ game, showDetails = false, compact = false, delay = 0 }: ScoreboardCardProps) {
    const isLive = game.status === 'in_progress';
    const isFinal = game.status === 'final';
    const homeWinning = game.score.home > game.score.away;
    const awayWinning = game.score.away > game.score.home;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: delay * 0.1 }}
        >
            <Card className={clsx('overflow-hidden', compact ? 'p-3' : 'p-4')} hover>
                {/* Status Bar */}
                <div className="flex items-center justify-between mb-3">
                    <span className={clsx(
                        'px-2 py-0.5 rounded-full text-xs font-semibold',
                        isLive && 'bg-green-500/20 text-green-400',
                        isFinal && 'bg-slate-600/50 text-slate-400',
                        game.status === 'scheduled' && 'bg-yellow-500/20 text-yellow-400',
                        game.status === 'halftime' && 'bg-orange-500/20 text-orange-400'
                    )}>
                        {isLive && (
                            <span className="inline-block w-2 h-2 bg-green-400 rounded-full mr-1.5 animate-pulse" />
                        )}
                        {formatStatus(game)}
                    </span>
                    <span className="text-xs text-slate-500">{game.league}</span>
                </div>

                {/* Teams & Score */}
                <div className="space-y-3">
                    {/* Away Team */}
                    <TeamRow
                        team={game.awayTeam}
                        score={game.score.away}
                        isWinning={awayWinning}
                        isFinal={isFinal}
                    />

                    {/* Home Team */}
                    <TeamRow
                        team={game.homeTeam}
                        score={game.score.home}
                        isWinning={homeWinning}
                        isFinal={isFinal}
                        isHome
                    />
                </div>

                {/* Game Details */}
                {showDetails && (
                    <div className="mt-4 pt-3 border-t border-slate-700/50">
                        <div className="flex items-center justify-between text-xs text-slate-400">
                            {game.venue && <span>{game.venue}</span>}
                            {game.clock && (
                                <span className="font-mono">
                                    {game.clock.periodName} • {game.clock.time}
                                </span>
                            )}
                        </div>
                    </div>
                )}
            </Card>
        </motion.div>
    );
}

interface TeamRowProps {
    team: Game['homeTeam'];
    score: number;
    isWinning: boolean;
    isFinal: boolean;
    isHome?: boolean;
}

function TeamRow({ team, score, isWinning, isFinal, isHome }: TeamRowProps) {
    return (
        <div className={clsx(
            'flex items-center gap-3 p-2 rounded-lg transition-colors',
            isWinning && isFinal && 'bg-gradient-to-r from-green-500/10 to-transparent'
        )}>
            {/* Team Logo */}
            <div className="w-10 h-10 rounded-lg bg-slate-700/50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {team.logoUrl ? (
                    <Image
                        src={team.logoUrl}
                        alt={team.name}
                        width={32}
                        height={32}
                        className="object-contain"
                    />
                ) : (
                    <span className="text-sm font-bold text-slate-400">
                        {team.abbreviation}
                    </span>
                )}
            </div>

            {/* Team Name */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className={clsx(
                        'font-semibold truncate',
                        isWinning ? 'text-white' : 'text-slate-300'
                    )}>
                        {team.name}
                    </span>
                    {isHome && (
                        <span className="text-[10px] text-slate-500 uppercase">Home</span>
                    )}
                </div>
                <span className="text-xs text-slate-500">{team.abbreviation}</span>
            </div>

            {/* Score */}
            <motion.div
                className={clsx(
                    'text-2xl font-bold tabular-nums',
                    isWinning ? 'text-white' : 'text-slate-400'
                )}
                key={score}
                initial={{ scale: 1 }}
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 0.3 }}
            >
                {score}
            </motion.div>
        </div>
    );
}

function formatStatus(game: Game): string {
    switch (game.status) {
        case 'in_progress':
            return game.clock
                ? `${game.clock.periodName} ${game.clock.time}`
                : 'LIVE';
        case 'halftime':
            return 'HALFTIME';
        case 'final':
            return 'FINAL';
        case 'scheduled':
            return new Date(game.startTime).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit'
            });
        case 'postponed':
            return 'POSTPONED';
        case 'cancelled':
            return 'CANCELLED';
        default:
            return game.status;
    }
}
