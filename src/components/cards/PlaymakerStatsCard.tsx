'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, BarChart3 } from 'lucide-react';

interface Statistic {
    displayName?: string;
    name?: string;
    value: string | number;
}

interface TeamStatistics {
    team?: { name?: string };
    statistics: Statistic[];
}

interface PlaymakerStatsCardProps {
    statistics?: TeamStatistics[] | Statistic[];
    headers?: string[];
    rows?: (string | number)[][];
    title?: string;
    collapsible?: boolean;
}

function StatRow({ label, homeValue, awayValue, homeTeam, awayTeam }: {
    label: string;
    homeValue: string | number;
    awayValue?: string | number;
    homeTeam?: string;
    awayTeam?: string;
}) {
    const homeNum = parseFloat(String(homeValue)) || 0;
    const awayNum = parseFloat(String(awayValue || 0));
    const total = homeNum + awayNum;

    const homePercentage = total > 0 ? (homeNum / total) * 100 : 50;
    const awayPercentage = total > 0 ? (awayNum / total) * 100 : 50;

    return (
        <div className="space-y-2 mb-4">
            <div className="flex justify-between items-center text-sm">
                <span className="text-gray-300">{label}</span>
            </div>

            <div className="flex justify-between items-center text-white font-medium">
                <span>{homeValue || '0'}</span>
                <span>{awayValue || '0'}</span>
            </div>

            <div className="relative h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                    className="absolute left-0 top-0 h-full bg-sky-500 transition-all duration-500"
                    style={{ width: `${homePercentage}%` }}
                />
                <div
                    className="absolute right-0 top-0 h-full bg-purple-500 transition-all duration-500"
                    style={{ width: `${awayPercentage}%` }}
                />
            </div>

            <div className="flex justify-between items-center text-xs text-gray-400">
                <span>{homeTeam || 'Home'}</span>
                <span>{awayTeam || 'Away'}</span>
            </div>
        </div>
    );
}

function PlayerStatRow({ stat }: { stat: Statistic }) {
    const percentage = stat.value && typeof stat.value === 'string' && stat.value.includes('%')
        ? parseFloat(stat.value)
        : Math.min(parseFloat(String(stat.value)) * 10, 100);

    return (
        <div className="flex justify-between items-center p-3 bg-gray-900/50 rounded-lg mb-2">
            <span className="text-gray-300 text-sm">{stat.displayName || stat.name}</span>
            <div className="flex items-center space-x-3">
                <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-blue-400 to-purple-600 transition-all duration-500"
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                </div>
                <span className="text-white font-medium text-sm min-w-[3rem] text-right">
                    {stat.value}
                </span>
            </div>
        </div>
    );
}

export function PlaymakerStatsCard({
    statistics,
    headers,
    rows,
    title = "Key Statistics",
    collapsible = true
}: PlaymakerStatsCardProps) {
    const [isExpanded, setIsExpanded] = useState(true);

    // Handle new headers/rows format
    if (headers && rows) {
        return (
            <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-blue-500/30 rounded-xl overflow-hidden mb-4">
                {collapsible ? (
                    <>
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="w-full flex items-center justify-between p-4 bg-blue-800/30 hover:bg-blue-800/40 transition-colors"
                        >
                            <div className="flex items-center space-x-3">
                                <BarChart3 className="w-5 h-5 text-blue-400" />
                                <h3 className="text-lg font-semibold text-white">{title}</h3>
                            </div>
                            {isExpanded ? (
                                <ChevronUp className="w-5 h-5 text-gray-400" />
                            ) : (
                                <ChevronDown className="w-5 h-5 text-gray-400" />
                            )}
                        </button>
                        {isExpanded && (
                            <div className="p-4">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-gray-700">
                                                {headers.map((header, index) => (
                                                    <th key={index} className="text-left text-gray-300 font-medium p-2 text-sm">
                                                        {header}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {rows.map((row, index) => (
                                                <tr key={index} className="border-b border-gray-800 hover:bg-gray-800/50">
                                                    {row.map((cell, cellIndex) => (
                                                        <td key={cellIndex} className="text-gray-200 p-2 text-sm">
                                                            {cell}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="p-4">
                        <div className="flex items-center space-x-3 mb-4">
                            <BarChart3 className="w-5 h-5 text-blue-400" />
                            <h3 className="text-lg font-semibold text-white">{title}</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-700">
                                        {headers.map((header, index) => (
                                            <th key={index} className="text-left text-gray-300 font-medium p-2 text-sm">
                                                {header}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((row, index) => (
                                        <tr key={index} className="border-b border-gray-800 hover:bg-gray-800/50">
                                            {row.map((cell, cellIndex) => (
                                                <td key={cellIndex} className="text-gray-200 p-2 text-sm">
                                                    {cell}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Fall back to legacy statistics format
    if (!statistics || (Array.isArray(statistics) && statistics.length === 0)) {
        return null;
    }

    const renderMatchStatistics = () => {
        if (!Array.isArray(statistics) || statistics.length === 0) return null;

        // Handle team vs team statistics
        const firstItem = statistics[0] as TeamStatistics | Statistic;
        if ('statistics' in firstItem && statistics.length >= 2) {
            const homeTeamStats = firstItem;
            const awayTeamStats = statistics[1] as TeamStatistics;

            return (
                <div className="space-y-3">
                    {homeTeamStats.statistics.map((homeStat, index) => {
                        const awayStat = awayTeamStats.statistics[index];
                        return (
                            <StatRow
                                key={index}
                                label={homeStat.displayName || homeStat.name || `Statistic ${index + 1}`}
                                homeValue={homeStat.value}
                                awayValue={awayStat?.value}
                                homeTeam={homeTeamStats.team?.name}
                                awayTeam={awayTeamStats.team?.name}
                            />
                        );
                    })}
                </div>
            );
        }

        // Handle single set of statistics
        if ('statistics' in firstItem) {
            return (
                <div className="space-y-2">
                    {firstItem.statistics.map((stat, index) => (
                        <PlayerStatRow key={index} stat={stat} />
                    ))}
                </div>
            );
        }

        // Handle direct array of stats
        return (
            <div className="space-y-2">
                {(statistics as Statistic[]).map((stat, index) => (
                    <PlayerStatRow key={index} stat={stat} />
                ))}
            </div>
        );
    };

    return (
        <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-blue-500/30 rounded-xl overflow-hidden mb-4">
            {collapsible ? (
                <>
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="w-full flex items-center justify-between p-4 bg-blue-800/30 hover:bg-blue-800/40 transition-colors"
                    >
                        <div className="flex items-center space-x-3">
                            <BarChart3 className="w-5 h-5 text-blue-400" />
                            <h3 className="text-lg font-semibold text-white">{title}</h3>
                        </div>
                        {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                    </button>
                    {isExpanded && (
                        <div className="p-4">
                            {renderMatchStatistics()}
                        </div>
                    )}
                </>
            ) : (
                <div className="p-4">
                    <div className="flex items-center space-x-3 mb-4">
                        <BarChart3 className="w-5 h-5 text-blue-400" />
                        <h3 className="text-lg font-semibold text-white">{title}</h3>
                    </div>
                    {renderMatchStatistics()}
                </div>
            )}
        </div>
    );
}

export default PlaymakerStatsCard;
