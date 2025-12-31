'use client';

import { motion } from 'framer-motion';
import { PlayerGameStats } from '@/lib/sports/types';
import { getTeamTheme, TeamTheme } from '@/lib/utils/team-colors';
import clsx from 'clsx';
import { Trophy, TrendingUp, BarChart2 } from 'lucide-react';

interface ComparisonCardProps {
    data: {
        players: PlayerGameStats[];
        statKeys?: string[];
    };
    delay?: number;
}

export function ComparisonCard({ data, delay = 0 }: ComparisonCardProps) {
    if (!data || !data.players || data.players.length < 2) {
        // Fallback for partial data or single player
        if (data?.players?.[0]) {
            // Maybe render single player card? Or just return null.
            return null;
        }
        return null;
    }

    const [p1, p2] = data.players;
    const t1 = getTeamTheme(p1.teamAbbreviation);
    const t2 = getTeamTheme(p2.teamAbbreviation);

    // Determine relevant stats to compare based on position/sport
    // Use statKeys if provided, otherwise default
    const defaultStats = getComparisonKeys(p1);
    const statsToCompare = data.statKeys && data.statKeys.length > 0
        ? data.statKeys.map(k => ({ key: k, label: k.replace(/([A-Z])/g, ' $1').trim() }))
        : defaultStats;

    // Calculate "Impact Score" (Mock logic for visual demo)
    const getImpactScore = (p: PlayerGameStats) => {
        const s = p.stats;
        let score = 0;
        // NBA
        if (s.points) score += s.points + (s.rebounds || 0) * 1.2 + (s.assists || 0) * 1.5;
        // NFL
        if (s.passingYards) score += s.passingYards / 25 + (s.passingTouchdowns || 0) * 4;
        if (s.rushingYards) score += s.rushingYards / 10 + (s.rushingTouchdowns || 0) * 6;
        if (s.receivingYards) score += s.receivingYards / 10 + (s.receivingTouchdowns || 0) * 6;
        return score.toFixed(1);
    };

    const score1 = getImpactScore(p1);
    const score2 = getImpactScore(p2);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: delay * 0.1 }}
            className="w-full max-w-2xl mx-auto"
        >
            <div className="bg-slate-950 rounded-3xl border border-indigo-500/20 overflow-hidden shadow-2xl relative">
                {/* Header */}
                <div className="p-6 border-b border-white/5 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800">
                    <div className="flex items-center gap-2 mb-4">
                        <TrendingUp className="w-5 h-5 text-indigo-400" />
                        <h3 className="text-lg font-bold text-white">
                            Head-to-Head: {p1.name.split(' ').pop()} vs {p2.name.split(' ').pop()}
                        </h3>
                    </div>

                    {/* Tabs (Visual only) */}
                    <div className="flex gap-2">
                        <div className="bg-indigo-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg shadow-indigo-500/20 cursor-default">
                            Side-by-Side
                        </div>
                        <div className="bg-slate-800 text-slate-400 text-xs font-bold px-4 py-1.5 rounded-full hover:bg-slate-700 transition cursor-pointer flex items-center gap-1">
                            <BarChart2 className="w-3 h-3" /> Chart View
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="p-6 grid grid-cols-2 gap-4 relative">
                    {/* Background Glow */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none" />

                    {/* Player 1 */}
                    <PlayerColumn player={p1} theme={t1} score={score1} stats={statsToCompare} />

                    {/* Player 2 */}
                    <PlayerColumn player={p2} theme={t2} score={score2} stats={statsToCompare} />
                </div>

                {/* Category Winners */}
                <div className="px-6 pb-6 pt-2 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                        <Trophy className="w-3 h-3" /> Category Winners
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {statsToCompare.map(key => {
                            const val1 = Number(p1.stats[key.key as keyof typeof p1.stats] || 0);
                            const val2 = Number(p2.stats[key.key as keyof typeof p2.stats] || 0);
                            const winner = val1 > val2 ? p1 : val2 > val1 ? p2 : null;
                            if (!winner) return null;

                            const theme = winner === p1 ? t1 : t2;
                            return (
                                <div key={key.key} className={clsx(
                                    "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide border flex items-center gap-2",
                                    "bg-slate-900 border-slate-800"
                                )}>
                                    <span className="text-slate-400">{key.label}</span>
                                    <span className={clsx(theme.text)}>{winner.name.split(' ').pop()}</span>
                                </div>
                            );
                        })}
                        {/* Overall Winner */}
                        <div className={clsx(
                            "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide border flex items-center gap-2",
                            Number(score1) > Number(score2) ? `bg-${t1.primary}/10 border-${t1.primary}/20` : `bg-${t2.primary}/10 border-${t2.primary}/20`
                        )}>
                            <span className="text-slate-400">Impact Score</span>
                            <span className={Number(score1) > Number(score2) ? t1.text : t2.text}>
                                {Number(score1) > Number(score2) ? p1.name.split(' ').pop() : p2.name.split(' ').pop()}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

function PlayerColumn({ player, theme, score, stats }: { player: PlayerGameStats, theme: TeamTheme, score: string, stats: { key: string, label: string }[] }) {
    return (
        <div className={clsx(
            "relative rounded-2xl p-4 border transition-all",
            "bg-slate-900/50 border-white/5 hover:border-white/10"
        )}>
            {/* Header */}
            <div className="text-center mb-6">
                <div className={clsx(
                    "w-16 h-16 mx-auto rounded-full mb-3 flex items-center justify-center text-xl font-bold border-2 shadow-lg relative overflow-hidden",
                    `border-${theme.primary}`,
                    "bg-slate-800"
                )}>
                    {player.photoUrl ? (
                        <img src={player.photoUrl} alt={player.name} className="w-full h-full object-cover" />
                    ) : (
                        <div className={clsx("w-full h-full flex items-center justify-center bg-gradient-to-br", theme.gradient)}>
                            {player.name.charAt(0)}
                        </div>
                    )}
                </div>
                <h4 className="text-sm font-bold text-white mb-0.5">{player.name}</h4>
                <div className={clsx("text-[10px] font-bold uppercase tracking-wider opacity-60", theme.text)}>
                    {player.position} • {player.teamAbbreviation}
                </div>
                <div className="mt-3 inline-block px-3 py-1 rounded-full bg-slate-800 border border-slate-700">
                    <span className="text-[10px] text-slate-400 uppercase mr-2">Impact Score</span>
                    <span className={clsx("font-mono font-bold", theme.text)}>{score}</span>
                </div>
            </div>

            {/* Stats */}
            <div className="space-y-3">
                {stats.map(s => (
                    <div key={s.key} className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-medium">{s.label}</span>
                        <span className="text-white font-mono font-bold">
                            {player.stats[s.key as keyof typeof player.stats] || 0}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function getComparisonKeys(player: PlayerGameStats) {
    const p = player.position;
    if (['QB'].includes(p)) {
        return [
            { key: 'passingYards', label: 'Passing Yds' },
            { key: 'passingTouchdowns', label: 'TDs' },
            { key: 'completions', label: 'Completions' },
            { key: 'interceptions', label: 'INTs' }
        ];
    }
    if (['RB'].includes(p)) {
        return [
            { key: 'rushingYards', label: 'Rushing Yds' },
            { key: 'rushingAttempts', label: 'Carries' },
            { key: 'rushingTouchdowns', label: 'TDs' },
            { key: 'yardsPerCarry', label: 'Yds/Carry' }
        ];
    }
    if (['WR', 'TE'].includes(p)) {
        return [
            { key: 'receivingYards', label: 'Receiving Yds' },
            { key: 'receptions', label: 'Receptions' },
            { key: 'receivingTouchdowns', label: 'TDs' },
            { key: 'targets', label: 'Targets' }
        ];
    }
    // NBA Defaults
    return [
        { key: 'points', label: 'Points' },
        { key: 'rebounds', label: 'Rebounds' },
        { key: 'assists', label: 'Assists' },
        { key: 'fieldGoalPercentage', label: 'FG%' }
    ];
}
