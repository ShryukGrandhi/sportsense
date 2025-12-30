'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Trophy, Clock, MapPin, TrendingUp, Zap } from 'lucide-react';

interface TeamData {
    name: string;
    logo?: string;
    score?: number;
    stats?: {
        points?: number;
        yards?: number;
        touchdowns?: number;
        completionPct?: number;
    };
}

interface MatchData {
    id?: string;
    homeTeam?: TeamData;
    awayTeam?: TeamData;
    home_points?: number;
    away_points?: number;
    homeScore?: number;
    awayScore?: number;
    status?: string;
    state?: { description?: string };
    date?: string;
    venue?: { name?: string };
    score?: { current?: string };
    stats?: Record<string, number>;
}

interface QuarterData {
    quarter: number;
    home: number;
    away: number;
}

interface Meta {
    status?: string;
    date?: string;
    venue?: string;
    sport?: string;
}

interface PlaymakerScoreCardProps {
    matches?: MatchData[];
    teams?: TeamData[];
    title?: string;
    collapsible?: boolean;
    meta?: Meta;
    quarters?: QuarterData[];
}

function TeamLogo({ team, size = "w-12 h-12", className = "" }: { team?: TeamData; size?: string; className?: string }) {
    const [imageError, setImageError] = useState(false);
    const teamName = team?.name || 'Team';
    const initials = teamName.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);

    if (imageError || !team?.logo) {
        return (
            <div className={`${size} rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white font-bold text-lg ${className}`}>
                {initials}
            </div>
        );
    }

    return (
        <img
            src={team.logo}
            alt={teamName}
            className={`${size} rounded-full object-cover border-2 border-gray-600 ${className}`}
            onError={() => setImageError(true)}
        />
    );
}

function ComparisonDisplay({ match }: { match: MatchData }) {
    const homeTeam = match.homeTeam;
    const awayTeam = match.awayTeam;
    const homeScore = match.home_points || match.homeScore || (match.score?.current?.split(' - ')[0]) || '0';
    const awayScore = match.away_points || match.awayScore || (match.score?.current?.split(' - ')[1]) || '0';

    const homeStats = {
        points: homeTeam?.stats?.points ?? (parseInt(String(homeScore)) || 0),
        yards: homeTeam?.stats?.yards ?? 0,
        touchdowns: homeTeam?.stats?.touchdowns ?? 0,
    };

    const awayStats = {
        points: awayTeam?.stats?.points ?? (parseInt(String(awayScore)) || 0),
        yards: awayTeam?.stats?.yards ?? 0,
        touchdowns: awayTeam?.stats?.touchdowns ?? 0,
    };

    const getStatusColor = (status?: string) => {
        switch (status?.toLowerCase()) {
            case 'finished':
            case 'full time':
            case 'final':
                return 'text-green-400';
            case 'live':
            case 'in play':
                return 'text-red-400 animate-pulse';
            default:
                return 'text-gray-400';
        }
    };

    return (
        <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 rounded-2xl p-6 border border-slate-700/50 backdrop-blur-sm">
            {/* Header with match info */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-2 text-sm text-slate-400">
                    <Clock className="w-4 h-4" />
                    <span>{match.date ? new Date(match.date).toLocaleDateString() : 'TBD'}</span>
                    {match.venue?.name && (
                        <>
                            <MapPin className="w-4 h-4 ml-2" />
                            <span>{match.venue.name}</span>
                        </>
                    )}
                </div>
                <span className={`text-sm font-medium px-3 py-1 rounded-full ${getStatusColor(match.status || match.state?.description)}`}>
                    {match.status || match.state?.description || 'Scheduled'}
                </span>
            </div>

            {/* Team Comparison Header */}
            <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-slate-200 mb-1">Team Comparison</h3>
                <p className="text-sm text-slate-400">{homeTeam?.name} vs {awayTeam?.name}</p>
            </div>

            {/* Main comparison layout */}
            <div className="flex items-center justify-between mb-6">
                {/* Home Team */}
                <div className="flex flex-col items-center space-y-3 flex-1">
                    <TeamLogo team={homeTeam} size="w-16 h-16" />
                    <div className="text-center">
                        <div className="text-white font-semibold text-lg">{homeTeam?.name || 'Home'}</div>
                    </div>
                </div>

                {/* VS and Scores */}
                <div className="flex flex-col items-center space-y-2 px-6">
                    <div className="text-4xl font-bold text-slate-200">
                        {homeScore} - {awayScore}
                    </div>
                    <div className="text-xs text-slate-500 bg-slate-800/50 px-2 py-1 rounded">
                        {['finished', 'full time', 'final'].includes((match.status || match.state?.description || '').toLowerCase()) ? 'Final Score' : 'Current Score'}
                    </div>
                </div>

                {/* Away Team */}
                <div className="flex flex-col items-center space-y-3 flex-1">
                    <TeamLogo team={awayTeam} size="w-16 h-16" />
                    <div className="text-center">
                        <div className="text-white font-semibold text-lg">{awayTeam?.name || 'Away'}</div>
                    </div>
                </div>
            </div>

            {/* Stats Comparison */}
            <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                    <div className="text-slate-400 text-sm mb-2">Points</div>
                    <div className="flex items-center justify-between">
                        <span className="font-bold text-white">{homeStats.points}</span>
                        <Zap className="w-4 h-4 text-yellow-500" />
                        <span className="font-bold text-white">{awayStats.points}</span>
                    </div>
                </div>

                <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                    <div className="text-slate-400 text-sm mb-2">Total Yards</div>
                    <div className="flex items-center justify-between">
                        <span className="font-bold text-white">{homeStats.yards}</span>
                        <TrendingUp className="w-4 h-4 text-blue-500" />
                        <span className="font-bold text-white">{awayStats.yards}</span>
                    </div>
                </div>

                <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                    <div className="text-slate-400 text-sm mb-2">Touchdowns</div>
                    <div className="flex items-center justify-between">
                        <span className="font-bold text-white">{homeStats.touchdowns}</span>
                        <Trophy className="w-4 h-4 text-purple-500" />
                        <span className="font-bold text-white">{awayStats.touchdowns}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function PlaymakerScoreCard({
    matches,
    teams,
    title = "Match Results",
    collapsible = true,
    meta,
    quarters
}: PlaymakerScoreCardProps) {
    const [isExpanded, setIsExpanded] = useState(true);

    // Handle both new teams format and legacy matches format
    let processedMatches: MatchData[] = matches || [];
    if (teams && teams.length >= 2) {
        processedMatches = [{
            homeTeam: { name: teams[0].name, logo: teams[0].logo, stats: teams[0].stats },
            awayTeam: { name: teams[1].name, logo: teams[1].logo, stats: teams[1].stats },
            home_points: teams[0].score,
            away_points: teams[1].score,
            status: meta?.status,
            date: meta?.date,
            venue: meta?.venue ? { name: meta.venue } : undefined,
        }];
    }

    if (processedMatches.length === 0) {
        return null;
    }

    return (
        <div className="mb-4">
            {collapsible ? (
                <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-xl overflow-hidden">
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="w-full flex items-center justify-between p-4 bg-purple-800/30 hover:bg-purple-800/40 transition-colors"
                    >
                        <div className="flex items-center space-x-3">
                            <Trophy className="w-5 h-5 text-purple-400" />
                            <h3 className="text-lg font-semibold text-white">{title}</h3>
                            {processedMatches.length > 1 && (
                                <span className="bg-purple-600/50 text-purple-200 text-xs px-2 py-1 rounded-full">
                                    {processedMatches.length} games
                                </span>
                            )}
                        </div>
                        {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                    </button>
                    {isExpanded && (
                        <div className="p-4 space-y-4">
                            {processedMatches.map((match, index) => (
                                <ComparisonDisplay key={match.id || index} match={match} />
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {processedMatches.map((match, index) => (
                        <ComparisonDisplay key={match.id || index} match={match} />
                    ))}
                </div>
            )}
        </div>
    );
}

export default PlaymakerScoreCard;
