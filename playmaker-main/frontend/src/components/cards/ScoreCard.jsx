import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Trophy, Clock, MapPin, TrendingUp, Zap } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import ChartErrorBoundary from '../ChartErrorBoundary';

const ScoreCard = ({ matches, teams, title = "Match Results", collapsible = true, meta, quarters, chart_data, stats }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // Handle both new teams format and legacy matches format
  let processedMatches = matches;
  if (teams && teams.length >= 2) {
    processedMatches = [{
      homeTeam: { name: teams[0].name, logo: teams[0].logo, stats: teams[0].stats },
      awayTeam: { name: teams[1].name, logo: teams[1].logo, stats: teams[1].stats },
      home_points: teams[0].score,
      away_points: teams[1].score,
      status: meta?.status,
      date: meta?.date,
      venue: meta?.venue ? { name: meta.venue } : null,
      stats: teams[0].stats || stats // Include team stats if available
    }];
  }

  if (!processedMatches || processedMatches.length === 0) {
    return null;
  }

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'finished':
      case 'full time':
      case 'final':
        return 'text-green-400';
      case 'live':
      case 'in play':
      case 'first half':
      case 'second half':
      case 'halftime':
        return 'text-red-400 animate-pulse';
      case 'scheduled':
      case 'not started':
        return 'text-gray-400';
      default:
        return 'text-gray-400';
    }
  };

  // Team logo component with better fallback handling
  const TeamLogo = ({ team, size = "w-12 h-12", className = "" }) => {
    const [imageError, setImageError] = useState(false);
    const teamName = team?.name || 'Team';
    const initials = teamName.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);

    // Debug logging
    React.useEffect(() => {
      console.log(`[ScoreCard] TeamLogo for ${teamName}:`, {
        hasLogo: !!team?.logo,
        logoUrl: team?.logo,
        imageError
      });
    }, [team?.logo, teamName, imageError]);

    if (imageError || !team?.logo) {
      console.warn(`[ScoreCard] Showing fallback for ${teamName}:`, {
        imageError,
        hasLogo: !!team?.logo,
        logoUrl: team?.logo
      });
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
        onError={(e) => {
          console.error(`[ScoreCard] Image load error for ${teamName}:`, {
            src: e.target.src,
            error: e
          });
          setImageError(true);
        }}
        onLoad={() => {
          console.log(`[ScoreCard] Image loaded successfully for ${teamName}:`, team.logo);
        }}
      />
    );
  };

  // Modern comparison-style display matching the screenshot
  const ComparisonDisplay = ({ match }) => {
    const homeTeam = match.homeTeam;
    const awayTeam = match.awayTeam;
    const homeScore = match.home_points || match.homeScore || match.score?.current?.split(' - ')[0] || '0';
    const awayScore = match.away_points || match.awayScore || match.score?.current?.split(' - ')[1] || '0';

    // Extract stats with proper fallbacks
    const homeStats = {
      points: homeTeam?.stats?.points ?? (parseInt(homeScore) || 0),
      yards: homeTeam?.stats?.yards ?? 0,
      touchdowns: homeTeam?.stats?.touchdowns ?? 0,
      completionPct: homeTeam?.stats?.completionPct ?? 0
    };

    const awayStats = {
      points: awayTeam?.stats?.points ?? (parseInt(awayScore) || 0),
      yards: awayTeam?.stats?.yards ?? 0,
      touchdowns: awayTeam?.stats?.touchdowns ?? 0,
      completionPct: awayTeam?.stats?.completionPct ?? 0
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

        {/* Stats Comparison - Points, Yards, Touchdowns */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          {/* Points */}
          <div className="bg-slate-800/50 rounded-lg p-4 text-center">
            <div className="text-slate-400 text-sm mb-2">Points</div>
            <div className="flex items-center justify-between">
              <span className="font-bold text-white">{homeStats.points}</span>
              <Zap className="w-4 h-4 text-yellow-500" />
              <span className="font-bold text-white">{awayStats.points}</span>
            </div>
          </div>

          {/* Yards */}
          <div className="bg-slate-800/50 rounded-lg p-4 text-center">
            <div className="text-slate-400 text-sm mb-2">Total Yards</div>
            <div className="flex items-center justify-between">
              <span className="font-bold text-white">{homeStats.yards}</span>
              <TrendingUp className="w-4 h-4 text-blue-500" />
              <span className="font-bold text-white">{awayStats.yards}</span>
            </div>
          </div>

          {/* Touchdowns */}
          <div className="bg-slate-800/50 rounded-lg p-4 text-center">
            <div className="text-slate-400 text-sm mb-2">Touchdowns</div>
            <div className="flex items-center justify-between">
              <span className="font-bold text-white">{homeStats.touchdowns}</span>
              <Trophy className="w-4 h-4 text-purple-500" />
              <span className="font-bold text-white">{awayStats.touchdowns}</span>
            </div>
          </div>
        </div>

        {/* Category Winners */}
        <div className="mt-4">
          <div className="text-center mb-3">
            <Trophy className="w-5 h-5 text-yellow-500 inline-block mr-2" />
            <span className="text-sm font-medium text-slate-300">Category Winners</span>
          </div>
          <div className="flex justify-center space-x-4 text-xs flex-wrap gap-2">
            <span className={`px-2 py-1 rounded ${homeStats.points > awayStats.points ? 'bg-green-600/20 text-green-300' : homeStats.points < awayStats.points ? 'bg-red-600/20 text-red-300' : 'bg-slate-600/20 text-slate-300'}`}>
              Points: {homeStats.points > awayStats.points ? homeTeam?.name : awayStats.points > homeStats.points ? awayTeam?.name : 'Tie'}
            </span>
            <span className={`px-2 py-1 rounded ${homeStats.yards > awayStats.yards ? 'bg-green-600/20 text-green-300' : homeStats.yards < awayStats.yards ? 'bg-red-600/20 text-red-300' : 'bg-slate-600/20 text-slate-300'}`}>
              Yards: {homeStats.yards > awayStats.yards ? homeTeam?.name : awayStats.yards > homeStats.yards ? awayTeam?.name : 'Tie'}
            </span>
            <span className={`px-2 py-1 rounded ${homeStats.touchdowns > awayStats.touchdowns ? 'bg-green-600/20 text-green-300' : homeStats.touchdowns < awayStats.touchdowns ? 'bg-red-600/20 text-red-300' : 'bg-slate-600/20 text-slate-300'}`}>
              TDs: {homeStats.touchdowns > awayStats.touchdowns ? homeTeam?.name : awayStats.touchdowns > homeStats.touchdowns ? awayTeam?.name : 'Tie'}
            </span>
          </div>
        </div>

        {/* Quarter-by-quarter breakdown */}
        {quarters && quarters.length > 0 && (
          <div className="mt-6 pt-4 border-t border-slate-700/50">
            <div className="flex items-center mb-3">
              <TrendingUp className="w-4 h-4 text-purple-400 mr-2" />
              <span className="text-sm font-medium text-slate-300">Quarter Breakdown</span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-xs">
              {quarters.map((quarter, index) => (
                <div key={index} className="bg-slate-800/50 rounded p-2 text-center">
                  <div className="text-slate-400 mb-1">Q{quarter.quarter}</div>
                  <div className="text-white font-medium">
                    {quarter.home} - {quarter.away}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Scoring trend chart */}
        {chart_data && chart_data.type === 'line' && chart_data.data && Array.isArray(chart_data.data) && chart_data.data.length > 0 && (
          <div className="mt-6 pt-4 border-t border-slate-700/50">
            <div className="flex items-center mb-3">
              <TrendingUp className="w-4 h-4 text-purple-400 mr-2" />
              <span className="text-sm font-medium text-slate-300">Scoring Trend</span>
            </div>
            <div className="h-32">
              <ChartErrorBoundary>
                <ResponsiveContainer width="100%" height={128} minHeight={128}>
                  <LineChart data={chart_data.data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis
                      dataKey={chart_data.xKey || "period"}
                      tick={{ fill: '#94A3B8', fontSize: 10 }}
                      axisLine={{ stroke: '#64748B' }}
                      height={30}
                    />
                    <YAxis
                      tick={{ fill: '#94A3B8', fontSize: 10 }}
                      axisLine={{ stroke: '#64748B' }}
                      width={40}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1E293B',
                        border: '1px solid #475569',
                        borderRadius: '8px'
                      }}
                      wrapperStyle={{ outline: 'none' }}
                    />
                    <Line
                      type="monotone"
                      dataKey={chart_data.yKey || "value"}
                      stroke="#8B5CF6"
                      strokeWidth={2}
                      dot={{ fill: '#8B5CF6', strokeWidth: 2 }}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartErrorBoundary>
            </div>
          </div>
        )}
      </div>
    );
  };

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
};

export default ScoreCard;
