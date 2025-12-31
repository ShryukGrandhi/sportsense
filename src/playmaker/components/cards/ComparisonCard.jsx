import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Users, Trophy, TrendingUp, BarChart3, Zap } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, Legend } from 'recharts';
import ChartErrorBoundary from '../ChartErrorBoundary';

// ESPN headshot URL generator
const getPlayerHeadshotUrl = (playerName) => {
  // Common NBA/NFL player IDs (can be expanded)
  const playerIds = {
    'lebron james': '1966',
    'luka doncic': '3945274',
    'stephen curry': '3975',
    'kevin durant': '3202',
    'giannis antetokounmpo': '3032977',
    'nikola jokic': '3112335',
    'jayson tatum': '4065648',
    'joel embiid': '3059318',
    'anthony edwards': '4594327',
    'shai gilgeous-alexander': '4278073',
    'patrick mahomes': '3139477',
    'travis kelce': '2976316',
    'lamar jackson': '3916387',
    'josh allen': '3918298',
    'jalen hurts': '4040715',
    'tyreek hill': '3116406',
    'ceedee lamb': '4241389',
    'justin jefferson': '4262921',
    'ja\'marr chase': '4362628',
    'puka nacua': '4362234',
    'jaxon smith-njigba': '4429795'
  };

  const id = playerIds[playerName?.toLowerCase()];
  if (id) {
    return `https://a.espncdn.com/combiner/i?img=/i/headshots/nba/players/full/${id}.png&w=350&h=254`;
  }
  return null;
};

const ComparisonCard = ({
  players = [],
  comparison_metrics = [],
  chart_data,
  winner_analysis = {},
  title = "Player Comparison",
  collapsible = true,
  key_insight
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeView, setActiveView] = useState('stats');
  const [imageError1, setImageError1] = useState(false);
  const [imageError2, setImageError2] = useState(false);

  if (!players || !Array.isArray(players) || players.length < 2) {
    return null;
  }

  const player1 = players[0] || {};
  const player2 = players[1] || {};

  if (!player1.name || !player2.name) {
    return null;
  }

  // Get headshot URLs
  const player1Image = player1.image || getPlayerHeadshotUrl(player1.name);
  const player2Image = player2.image || getPlayerHeadshotUrl(player2.name);

  // Auto-generate chart data from stats if not provided
  const generatedChartData = useMemo(() => {
    const stats1 = player1.stats || {};
    const stats2 = player2.stats || {};
    const allKeys = [...new Set([...Object.keys(stats1), ...Object.keys(stats2)])];

    return allKeys.slice(0, 6).map(key => ({
      stat: key.toUpperCase(),
      [player1.name]: parseFloat(stats1[key]) || 0,
      [player2.name]: parseFloat(stats2[key]) || 0,
    }));
  }, [player1, player2]);

  // Generate radar data for comparative visualization
  const radarData = useMemo(() => {
    const stats1 = player1.stats || {};
    const stats2 = player2.stats || {};
    const allKeys = [...new Set([...Object.keys(stats1), ...Object.keys(stats2)])];

    return allKeys.slice(0, 5).map(key => {
      const val1 = parseFloat(stats1[key]) || 0;
      const val2 = parseFloat(stats2[key]) || 0;
      const max = Math.max(val1, val2, 1);
      return {
        stat: key.toUpperCase(),
        [player1.name]: (val1 / max) * 100,
        [player2.name]: (val2 / max) * 100,
        fullMark: 100,
      };
    });
  }, [player1, player2]);

  const PlayerCard = ({ player, image, color, colorLight, imageError, onImageError }) => (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${color} p-1`}>
      <div className="bg-gray-900/95 backdrop-blur-xl rounded-xl p-5">
        {/* Glow effect */}
        <div className={`absolute -top-20 -right-20 w-40 h-40 ${colorLight} rounded-full blur-3xl opacity-20`} />

        <div className="relative flex items-center gap-4 mb-5">
          {/* Player Image */}
          <div className="relative">
            {image && !imageError ? (
              <img
                src={image}
                alt={player.name}
                className="w-20 h-20 rounded-full object-cover border-3 border-white/20 shadow-xl"
                onError={onImageError}
              />
            ) : (
              <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white font-bold text-2xl shadow-xl`}>
                {player.name?.split(' ').map(n => n[0]).join('')}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 bg-white/10 backdrop-blur-sm rounded-full px-2 py-0.5 text-xs text-white font-medium">
              {player.position}
            </div>
          </div>

          {/* Player Info */}
          <div className="flex-1">
            <h3 className="text-xl font-bold text-white tracking-tight">{player.name}</h3>
            <p className="text-gray-400 text-sm">{player.team}</p>
            {player.impact_score && (
              <div className="flex items-center gap-1 mt-2">
                <Zap className="w-3 h-3 text-yellow-400" />
                <span className="text-yellow-400 text-xs font-semibold">Impact: {player.impact_score}</span>
              </div>
            )}
          </div>
        </div>

        {/* Stats Grid - Enhanced Density used to be slice(0,6) */}
        <div className="grid grid-cols-3 gap-3">
          {Object.entries(player.stats || {}).map(([key, value]) => (
            <div key={key} className="bg-white/5 rounded-lg p-3 text-center backdrop-blur-sm hover:bg-white/10 transition-colors">
              <div className="text-white font-bold text-lg">{value}</div>
              <div className="text-gray-400 text-xs uppercase tracking-wider">{key}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const ChartView = () => (
    <div className="space-y-6">
      {/* Bar Chart Comparison */}
      <div className="bg-gray-900/50 rounded-xl p-4 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-cyan-400" />
          <h4 className="text-white text-sm font-semibold">Stat Comparison</h4>
        </div>
        <div className="h-56">
          <ChartErrorBoundary>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={generatedChartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                <XAxis
                  dataKey="stat"
                  tick={{ fill: '#9CA3AF', fontSize: 10 }}
                  axisLine={{ stroke: '#374151' }}
                />
                <YAxis
                  tick={{ fill: '#9CA3AF', fontSize: 10 }}
                  axisLine={{ stroke: '#374151' }}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                  }}
                />
                <Bar dataKey={player1.name} fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar dataKey={player2.name} fill="#A855F7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartErrorBoundary>
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-gray-400 text-xs">{player1.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-500" />
            <span className="text-gray-400 text-xs">{player2.name}</span>
          </div>
        </div>
      </div>

      {/* Radar Chart */}
      {radarData.length > 2 && (
        <div className="bg-gray-900/50 rounded-xl p-4 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <h4 className="text-white text-sm font-semibold">Performance Profile</h4>
          </div>
          <div className="h-56">
            <ChartErrorBoundary>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#374151" />
                  <PolarAngleAxis dataKey="stat" tick={{ fill: '#9CA3AF', fontSize: 10 }} />
                  <Radar name={player1.name} dataKey={player1.name} stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} />
                  <Radar name={player2.name} dataKey={player2.name} stroke="#A855F7" fill="#A855F7" fillOpacity={0.3} />
                </RadarChart>
              </ResponsiveContainer>
            </ChartErrorBoundary>
          </div>
        </div>
      )}
    </div>
  );

  const ComparisonContent = () => (
    <div className="space-y-6">
      {/* View Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveView('stats')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeView === 'stats'
            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25'
            : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 hover:text-white'
            }`}
        >
          <Users className="w-4 h-4" />
          Side-by-Side
        </button>
        <button
          onClick={() => setActiveView('chart')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeView === 'chart'
            ? 'bg-gradient-to-r from-cyan-600 to-emerald-600 text-white shadow-lg shadow-cyan-500/25'
            : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 hover:text-white'
            }`}
        >
          <BarChart3 className="w-4 h-4" />
          Charts
        </button>
      </div>

      {activeView === 'stats' ? (
        <div className="grid md:grid-cols-2 gap-4">
          <PlayerCard
            player={player1}
            image={player1Image}
            color="from-blue-600 to-blue-800"
            colorLight="bg-blue-400"
            imageError={imageError1}
            onImageError={() => setImageError1(true)}
          />
          <PlayerCard
            player={player2}
            image={player2Image}
            color="from-purple-600 to-purple-800"
            colorLight="bg-purple-400"
            imageError={imageError2}
            onImageError={() => setImageError2(true)}
          />
        </div>
      ) : (
        <ChartView />
      )}

      {/* Category Winners Section */}
      <div className="mt-6 pt-6 border-t border-gray-800">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-4 h-4 text-yellow-500" />
          <h4 className="text-white text-sm font-semibold">Category Winners</h4>
        </div>
        <div className="flex flex-wrap gap-3 mb-6">
          {/* Calculate winners dynamically if not provided */}
          {(() => {
            const stats1 = player1.stats || {};
            const stats2 = player2.stats || {};
            const allKeys = [...new Set([...Object.keys(stats1), ...Object.keys(stats2)])];

            return allKeys.slice(0, 10).map(key => { // Increased limit to 10
              const val1 = parseFloat(stats1[key]) || 0;
              const val2 = parseFloat(stats2[key]) || 0;
              if (val1 === val2) return null;

              const winner = val1 > val2 ? player1.name : player2.name;
              const isP1 = winner === player1.name;

              return (
                <div key={key} className={`px-3 py-1.5 rounded-full text-xs font-medium border flex items-center gap-2
                    ${isP1 ? 'bg-blue-500/10 border-blue-500/30 text-blue-200' : 'bg-purple-500/10 border-purple-500/30 text-purple-200'}
                 `}>
                  <span className="text-gray-400 uppercase tracking-tight text-[10px]">{key}:</span>
                  <span>{winner}</span>
                </div>
              );
            });
          })()}
        </div>

        {/* Analyst Insight Section (NEW) */}
        {(key_insight || winner_analysis?.content) && (
          <div className="bg-gradient-to-r from-indigo-900/30 to-purple-900/30 border border-indigo-500/30 rounded-xl p-4 mt-6">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-indigo-400" />
              <h4 className="text-indigo-200 text-sm font-semibold uppercase tracking-wider">Analyst Insight</h4>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">
              {key_insight || winner_analysis?.content || "Detailed analysis not available."}
            </p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 border border-gray-700/50 shadow-2xl mb-4">
      {/* Background glow */}
      <div className="absolute top-0 left-1/4 w-1/2 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 blur-sm" />

      {collapsible ? (
        <>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between p-5 hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <h3 className="text-lg font-bold text-white">{title}</h3>
                <p className="text-gray-400 text-xs">{player1.name} vs {player2.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 text-blue-300 text-xs px-3 py-1 rounded-full border border-blue-500/30">
                Head-to-Head
              </span>
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </div>
          </button>
          {isExpanded && (
            <div className="px-5 pb-5">
              <ComparisonContent />
            </div>
          )}
        </>
      ) : (
        <div className="p-5">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg">
              <Users className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-bold text-white">{title}</h3>
          </div>
          <ComparisonContent />
        </div>
      )}
    </div>
  );
};

export default ComparisonCard;