'use client';

import React from 'react';

interface PlayerStats {
    cmpAtt?: string;
    yds?: number;
    td?: number;
    completionPct?: number;
    car?: number;
    yardsPerCarry?: number;
    rec?: number;
    yprCatchRate?: string;
}

interface PlayerCardProps {
    name: string;
    position: 'QB' | 'RB' | 'WR' | 'TE' | 'K' | string;
    team?: string;
    teamColor?: string;
    stats: PlayerStats;
    imageUrl?: string;
}

export function EnhancedPlayerCard({ name, position, team, teamColor = '#6366f1', stats }: PlayerCardProps) {
    const getPositionStats = () => {
        switch (position) {
            case 'QB':
                return (
                    <>
                        <div className="grid grid-cols-3 gap-2 mb-4">
                            <StatBox label="CMP/ATT" value={stats.cmpAtt || '-'} />
                            <StatBox label="YDS" value={stats.yds?.toString() || '-'} />
                            <StatBox label="TD" value={stats.td?.toString() || '-'} />
                        </div>
                        <div className="bg-[#0a0a0a] rounded-lg p-3">
                            <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Completion %</div>
                            <div className="text-2xl font-bold text-white">{stats.completionPct?.toFixed(1)}%</div>
                            <div className="mt-2 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-1000 ease-out"
                                    style={{
                                        width: `${stats.completionPct || 0}%`,
                                        background: `linear-gradient(90deg, ${teamColor}, ${teamColor}99)`
                                    }}
                                />
                            </div>
                        </div>
                    </>
                );
            case 'RB':
                return (
                    <>
                        <div className="grid grid-cols-3 gap-2 mb-4">
                            <StatBox label="CAR" value={stats.car?.toString() || '-'} />
                            <StatBox label="YDS" value={stats.yds?.toString() || '-'} />
                            <StatBox label="TD" value={stats.td?.toString() || '-'} />
                        </div>
                        <div className="bg-[#0a0a0a] rounded-lg p-3">
                            <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Yards/Carry</div>
                            <div className="text-2xl font-bold text-white">{stats.yardsPerCarry?.toFixed(1)}</div>
                            <div className="mt-2 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-1000 ease-out"
                                    style={{
                                        width: `${Math.min((stats.yardsPerCarry || 0) * 15, 100)}%`,
                                        background: `linear-gradient(90deg, ${teamColor}, ${teamColor}99)`
                                    }}
                                />
                            </div>
                        </div>
                    </>
                );
            case 'WR':
            case 'TE':
                return (
                    <>
                        <div className="grid grid-cols-3 gap-2 mb-4">
                            <StatBox label="REC" value={stats.rec?.toString() || '-'} />
                            <StatBox label="YDS" value={stats.yds?.toString() || '-'} />
                            <StatBox label="TD" value={stats.td?.toString() || '-'} />
                        </div>
                        <div className="bg-[#0a0a0a] rounded-lg p-3">
                            <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">YPR / Catch Rate</div>
                            <div className="text-2xl font-bold text-white">{stats.yprCatchRate || '-'}</div>
                            <div className="mt-2 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-1000 ease-out"
                                    style={{
                                        width: `80%`,
                                        background: `linear-gradient(90deg, ${teamColor}, ${teamColor}99)`
                                    }}
                                />
                            </div>
                        </div>
                    </>
                );
            default:
                return null;
        }
    };

    return (
        <div
            className="relative bg-gradient-to-br from-[#1a1a2e] to-[#16162a] rounded-2xl p-5 border border-[#2a2a4a] 
                 hover:border-[#4a4a7a] transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl
                 animate-fade-in-up min-w-[220px]"
            style={{
                boxShadow: `0 0 40px ${teamColor}15`
            }}
        >
            {/* Header */}
            <div className="mb-4">
                <h3 className="text-lg font-semibold text-white leading-tight">{name}</h3>
                <span className="text-xs text-gray-500 uppercase tracking-wider">{position}</span>
            </div>

            {/* Game Stats Label */}
            <div className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">Game Stats</div>

            {/* Position-specific stats */}
            {getPositionStats()}
        </div>
    );
}

function StatBox({ label, value }: { label: string; value: string }) {
    return (
        <div className="bg-[#0a0a0a]/50 rounded-lg p-2 text-center">
            <div className="text-[9px] text-gray-600 uppercase tracking-wider mb-1">{label}</div>
            <div className="text-base font-bold text-white">{value}</div>
        </div>
    );
}

// Team Player Row Component (like in the screenshot)
interface TeamPlayerRowProps {
    teamName: string;
    teamLogo?: string;
    teamColor: string;
    players: PlayerCardProps[];
}

export function TeamPlayerRow({ teamName, teamLogo, teamColor, players }: TeamPlayerRowProps) {
    return (
        <div className="mb-8 animate-fade-in-up">
            {/* Team Header */}
            <div className="flex items-center gap-3 mb-4">
                {teamLogo && (
                    <img src={teamLogo} alt={teamName} className="w-8 h-8 object-contain" />
                )}
                <h2 className="text-lg font-semibold text-white">{teamName}</h2>
            </div>

            {/* Players Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {players.map((player, idx) => (
                    <EnhancedPlayerCard
                        key={idx}
                        {...player}
                        teamColor={teamColor}
                    />
                ))}
            </div>
        </div>
    );
}

// Player Comparison Component (like in the second screenshot)
interface ComparisonPlayerProps {
    name: string;
    team: string;
    position: string;
    imageUrl?: string;
    impactScore: number;
    stats: { label: string; value: number | string }[];
}

interface PlayerComparisonCardProps {
    season: string;
    player1: ComparisonPlayerProps;
    player2: ComparisonPlayerProps;
    categoryWinners: { category: string; winner: string }[];
}

export function PlayerComparisonCard({ season, player1, player2, categoryWinners }: PlayerComparisonCardProps) {
    return (
        <div className="bg-gradient-to-br from-[#1a1a2e] to-[#16162a] rounded-2xl p-6 border border-[#2a2a4a] animate-fade-in-up">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 border border-gray-600 rounded-full flex items-center justify-center">
                    <span className="text-xs">👥</span>
                </div>
                <h2 className="text-lg font-semibold text-white">{season}</h2>
            </div>

            {/* View Toggle */}
            <div className="flex gap-2 mb-6">
                <button className="bg-indigo-600 text-white px-4 py-1.5 rounded-full text-xs font-medium">
                    Side-by-Side
                </button>
                <button className="bg-transparent text-gray-400 px-4 py-1.5 rounded-full text-xs font-medium border border-gray-700 hover:border-gray-500">
                    Chart View
                </button>
            </div>

            {/* Players Comparison */}
            <div className="grid grid-cols-2 gap-6 mb-6">
                <ComparisonPlayerPanel player={player1} />
                <ComparisonPlayerPanel player={player2} />
            </div>

            {/* Category Winners */}
            <div className="border-t border-gray-800 pt-4">
                <h3 className="text-sm font-medium text-white mb-3">Category Winners</h3>
                <div className="flex flex-wrap gap-2">
                    {categoryWinners.map((cat, idx) => (
                        <div
                            key={idx}
                            className="bg-[#0a0a0a] border border-gray-800 rounded-full px-3 py-1.5 text-xs"
                        >
                            <span className="text-gray-500">{cat.category}: </span>
                            <span className="text-indigo-400 font-medium">{cat.winner}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function ComparisonPlayerPanel({ player }: { player: ComparisonPlayerProps }) {
    return (
        <div className="bg-[#0a0a0a]/50 rounded-xl p-4 border border-gray-800">
            {/* Player Info */}
            <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    {player.imageUrl ? (
                        <img src={player.imageUrl} alt={player.name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                        <span className="text-xl">🏈</span>
                    )}
                </div>
                <div>
                    <h4 className="text-white font-semibold">{player.name}</h4>
                    <p className="text-xs text-gray-500">{player.position} • {player.team}</p>
                    <p className="text-xs text-indigo-400">Impact Score: {player.impactScore}</p>
                </div>
            </div>

            {/* Stats */}
            <div className="space-y-2">
                {player.stats.map((stat, idx) => (
                    <div key={idx} className="flex justify-between items-center">
                        <span className="text-sm text-gray-400">{stat.label}</span>
                        <span className="text-sm text-white font-medium">{stat.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default EnhancedPlayerCard;
