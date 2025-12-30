'use client';

import { motion } from 'framer-motion';
import { PlayerGameStats, Game } from '@/lib/sports/types';
import { getTeamTheme, TeamTheme } from '@/lib/utils/team-colors';
import clsx from 'clsx';
import { TrendingUp } from 'lucide-react';

interface PlayerCardProps {
    player: PlayerGameStats;
    game?: Game;
    compact?: boolean;
    delay?: number;
}

export function PlayerCard({ player, game, compact = false, delay = 0 }: PlayerCardProps) {
    const stats = player.stats;
    const theme = getTeamTheme(player.teamAbbreviation);
    const isNFL = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'].includes(player.position);

    const containerVariants = {
        hidden: { opacity: 0, y: 20, scale: 0.95 },
        visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: {
                duration: 0.5,
                delay: delay * 0.1,
                ease: "backOut"
            }
        },
        hover: {
            y: -5,
            scale: 1.02,
            transition: { duration: 0.2 }
        }
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            whileHover="hover"
            className={clsx(
                "relative overflow-hidden rounded-3xl border backdrop-blur-3xl",
                theme.border,
                // Background gradient
                "bg-slate-950"
            )}
        >
            {/* Background Gradient Mesh */}
            <div className={clsx(
                "absolute inset-0 bg-gradient-to-br opacity-40 z-0",
                theme.gradient
            )} />

            {/* Glow Effect */}
            <div className={clsx(
                "absolute -top-20 -right-20 w-40 h-40 rounded-full blur-[60px] opacity-20 z-0",
                `bg-${theme.primary}`
            )} />

            <div className="relative z-10 p-5">
                {/* Header: Team & Name */}
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            {/* Team Logo Placeholder / Abbrev */}
                            <div className={clsx(
                                "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border border-white/10",
                                "bg-slate-900",
                                theme.text
                            )}>
                                {player.teamAbbreviation}
                            </div>
                            <span className="text-xs font-medium text-slate-400">
                                {game ? `${player.teamAbbreviation} vs ${game.homeTeam.abbreviation === player.teamAbbreviation ? game.awayTeam.abbreviation : game.homeTeam.abbreviation}` : player.teamAbbreviation}
                            </span>
                        </div>
                        <h3 className="text-xl font-bold text-white tracking-tight">
                            {player.name}
                        </h3>
                        <div className={clsx("text-xs font-bold tracking-wider opacity-80", theme.text)}>
                            {player.position}
                        </div>
                    </div>
                </div>

                {/* GAME STATS Label */}
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    Game Stats
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                    {isNFL ? (
                        <>
                            {/* NFL Logic */}
                            {stats.passingYards !== undefined && (
                                <>
                                    <StatBox label="CMP/ATT" value={`${stats.completions}/${stats.attempts}`} theme={theme} />
                                    <StatBox label="YDS" value={stats.passingYards} theme={theme} highlight />
                                    <StatBox label="TD" value={stats.passingTouchdowns || 0} theme={theme} />
                                </>
                            )}
                            {stats.rushingYards !== undefined && (!stats.passingYards) && (
                                <>
                                    <StatBox label="CAR" value={stats.rushingAttempts || 0} theme={theme} />
                                    <StatBox label="YDS" value={stats.rushingYards} theme={theme} highlight />
                                    <StatBox label="TD" value={stats.rushingTouchdowns || 0} theme={theme} />
                                </>
                            )}
                            {stats.receivingYards !== undefined && (
                                <>
                                    <StatBox label="REC" value={stats.receptions || 0} theme={theme} />
                                    <StatBox label="YDS" value={stats.receivingYards} theme={theme} highlight />
                                    <StatBox label="TD" value={stats.receivingTouchdowns || 0} theme={theme} />
                                </>
                            )}
                        </>
                    ) : (
                        <>
                            {/* NBA Logic */}
                            <StatBox label="PTS" value={stats.points || 0} theme={theme} highlight />
                            <StatBox label="REB" value={stats.rebounds || 0} theme={theme} />
                            <StatBox label="AST" value={stats.assists || 0} theme={theme} />
                        </>
                    )}
                </div>

                {/* Secondary Stat / Progress Bar Area */}
                <div className={clsx(
                    "rounded-xl p-3 border border-white/5",
                    "bg-slate-900/40"
                )}>
                    {isNFL && stats.passingYards !== undefined && (
                        <SecondaryStat
                            label="COMPLETION %"
                            value={`${stats.completionPercentage?.toFixed(1) || 0}%`}
                            percent={stats.completionPercentage || 0}
                            theme={theme}
                        />
                    )}
                    {isNFL && stats.rushingYards !== undefined && !stats.passingYards && (
                        <SecondaryStat
                            label="YARDS / CARRY"
                            value={stats.yardsPerCarry?.toFixed(1) || "0.0"}
                            theme={theme}
                        />
                    )}
                    {isNFL && stats.receivingYards !== undefined && (
                        <SecondaryStat
                            label="YARDS / CATCH"
                            value={stats.yardsPerReception?.toFixed(1) || "0.0"}
                            theme={theme}
                        />
                    )}
                    {!isNFL && (
                        <SecondaryStat
                            label="FG %"
                            value={`${stats.fieldGoalPercentage?.toFixed(1) || 0}%`}
                            percent={stats.fieldGoalPercentage || 0}
                            theme={theme}
                        />
                    )}
                </div>
            </div>
        </motion.div>
    );
}

function StatBox({ label, value, theme, highlight }: { label: string; value: string | number; theme: TeamTheme; highlight?: boolean }) {
    return (
        <div className={clsx(
            "flex flex-col items-center justify-center py-3 rounded-xl border transition-all",
            highlight
                ? `bg-${theme.primary}/20 border-${theme.primary}/30`
                : "bg-slate-800/50 border-white/5"
        )}>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">
                {label}
            </div>
            <div className={clsx(
                "text-lg font-bold font-mono tracking-tight",
                highlight ? "text-white" : "text-slate-200"
            )}>
                {value}
            </div>
        </div>
    );
}

function SecondaryStat({ label, value, percent, theme }: { label: string; value: string; percent?: number; theme: TeamTheme }) {
    return (
        <div className="flex flex-col gap-2">
            <div className="flex justify-between items-end">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    {label}
                </span>
                <span className={clsx("text-lg font-bold font-mono", theme.text)}>
                    {value}
                </span>
            </div>
            {percent !== undefined && (
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(percent, 100)}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className={clsx("h-full rounded-full", `bg-${theme.primary}`)}
                    />
                </div>
            )}
        </div>
    );
}
