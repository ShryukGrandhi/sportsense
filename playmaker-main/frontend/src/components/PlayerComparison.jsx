import React, { useState } from 'react';
import { Users, BarChart3, Trophy, TrendingUp, RefreshCw, X } from 'lucide-react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import axios from 'axios';
import PlayerSelector from './PlayerSelector';
import ChartErrorBoundary from './ChartErrorBoundary';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const PlayerComparison = ({ onClose }) => {
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeView, setActiveView] = useState('overview'); // 'overview' | 'stats' | 'radar'
  const [sport, setSport] = useState('NFL');

  const compareAllPlayers = async () => {
    if (selectedPlayers.length < 2) {
      setError('Please select at least 2 players to compare');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/api/players/compare`,
        {
          player_ids: selectedPlayers.map(p => p.id),
          sport: sport
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      setComparisonData(response.data);
    } catch (err) {
      console.error('Error comparing players:', err);
      setError(err.response?.data?.detail || 'Failed to compare players. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetComparison = () => {
    setSelectedPlayers([]);
    setComparisonData(null);
    setError(null);
  };

  const PLAYER_COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B'];

  return (
    <div className="h-full overflow-y-auto bg-[#0a0a0a] p-8 animate-slide-up" style={{ maxHeight: '100%' }}>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 border-2 border-white flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-light text-white tracking-wide mb-1">Player Comparison</h1>
              <p className="text-xs text-gray-600 uppercase tracking-wider">Compare up to 4 players</p>
            </div>
          </div>
          
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#111111] transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          )}

          {/* Sport Selector */}
          <div className="flex items-center gap-3">
            <label className="text-xs text-gray-600 uppercase tracking-wider">Sport:</label>
            <select
              value={sport}
              onChange={(e) => {
                setSport(e.target.value);
                setSelectedPlayers([]);
                setComparisonData(null);
              }}
              className="px-5 py-2.5 bg-[#111111] border border-[#1a1a1a] text-white text-sm uppercase tracking-wider focus:outline-none focus:border-white transition-colors"
            >
              <option value="NFL">NFL</option>
              <option value="NBA">NBA</option>
              <option value="MLB">MLB</option>
            </select>
          </div>
        </div>

        {/* Player Selection */}
        <div className="bg-[#111111] border border-[#1a1a1a] p-8">
          <h2 className="text-sm font-medium text-white mb-6 uppercase tracking-wider">Select Players</h2>
          <PlayerSelector
            selectedPlayers={selectedPlayers}
            onPlayersChange={setSelectedPlayers}
            maxPlayers={4}
            sport={sport}
          />

          {/* Compare Button */}
          {selectedPlayers.length >= 2 && (
            <div className="mt-8 flex justify-center gap-4">
              <button
                onClick={compareAllPlayers}
                disabled={loading}
                className="px-8 py-3 bg-white text-[#0a0a0a] font-medium text-sm uppercase tracking-wider transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 hover:bg-gray-100"
              >
                {loading ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-[#0a0a0a] border-t-transparent"></div>
                    Comparing...
                  </>
                ) : (
                  <>
                    <BarChart3 className="w-4 h-4" />
                    Compare Players
                  </>
                )}
              </button>

              <button
                onClick={resetComparison}
                className="px-8 py-3 bg-[#111111] border border-[#1a1a1a] text-white font-medium text-sm uppercase tracking-wider transition-all duration-200 flex items-center gap-2 hover:border-white hover:bg-[#1a1a1a]"
              >
                <RefreshCw className="w-4 h-4" />
                Reset
              </button>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-[#111111] border border-white/20 p-4">
            <p className="text-white text-sm">{error}</p>
          </div>
        )}

        {/* Comparison Results */}
        {comparisonData && (
          <div className="space-y-6">
            {/* View Tabs */}
            <div className="bg-[#111111] border border-[#1a1a1a] p-1 flex">
              <button
                onClick={() => setActiveView('overview')}
                className={`flex items-center gap-2 px-6 py-3 text-xs font-medium uppercase tracking-wider transition-all ${
                  activeView === 'overview'
                    ? 'bg-[#0a0a0a] text-white border-b border-white'
                    : 'text-gray-600 hover:text-white hover:bg-[#0a0a0a]'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                Overview
              </button>

              <button
                onClick={() => setActiveView('stats')}
                className={`flex items-center gap-2 px-6 py-3 text-xs font-medium uppercase tracking-wider transition-all ${
                  activeView === 'stats'
                    ? 'bg-[#0a0a0a] text-white border-b border-white'
                    : 'text-gray-600 hover:text-white hover:bg-[#0a0a0a]'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                Statistics
              </button>

              <button
                onClick={() => setActiveView('radar')}
                className={`flex items-center gap-2 px-6 py-3 text-xs font-medium uppercase tracking-wider transition-all ${
                  activeView === 'radar'
                    ? 'bg-[#0a0a0a] text-white border-b border-white'
                    : 'text-gray-600 hover:text-white hover:bg-[#0a0a0a]'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                Skills Radar
              </button>
            </div>

            {/* Overview Tab */}
            {activeView === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {comparisonData.players.map((player, index) => (
                  <div
                    key={player.name}
                    className="bg-[#111111] border border-[#1a1a1a] p-6"
                  >
                    <div className="flex items-center gap-4 mb-6">
                      <div
                        className="w-14 h-14 border-2 border-white flex items-center justify-center text-white font-medium text-lg"
                        style={{ borderColor: PLAYER_COLORS[index] }}
                      >
                        {player.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-white font-medium text-base mb-1">{player.name}</h3>
                        <p className="text-gray-600 text-xs uppercase tracking-wider">{player.team}</p>
                        {player.position && (
                          <p className="text-gray-500 text-xs mt-1">{player.position}</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="border border-white/20 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-gray-600 text-xs uppercase tracking-wider">Impact Score</span>
                          <Trophy className="w-4 h-4 text-white" />
                        </div>
                        <div className="text-3xl font-light text-white">
                          {player.impact_score || 'N/A'}
                        </div>
                      </div>

                      <div className="space-y-3 pt-4 border-t border-[#1a1a1a]">
                        <div className="text-xs text-gray-600 font-medium uppercase tracking-wider">
                          Key Stats
                        </div>
                        {Object.entries(player.stats || {})
                          .slice(0, 5)
                          .map(([key, value]) => (
                            <div key={key} className="flex justify-between text-sm">
                              <span className="text-gray-500 text-xs uppercase">
                                {key.replace(/_/g, ' ')}
                              </span>
                              <span className="text-white font-light">{value}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Statistics Tab */}
            {activeView === 'stats' && comparisonData.chart_data && (
              <div className="bg-[#111111] border border-[#1a1a1a] p-8">
                <h3 className="text-lg font-light text-white mb-8 uppercase tracking-wider">
                  Statistical Comparison
                </h3>

                <div className="h-96 mb-8">
                  <ChartErrorBoundary>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={comparisonData.chart_data.data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                        <XAxis
                          dataKey="category"
                          tick={{ fill: '#666', fontSize: 11 }}
                          angle={-45}
                          textAnchor="end"
                          height={100}
                        />
                        <YAxis tick={{ fill: '#666', fontSize: 11 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#111111',
                            border: '1px solid #1a1a1a',
                          }}
                          labelStyle={{ color: '#fff', fontSize: 12 }}
                        />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                        {comparisonData.players.map((player, index) => (
                          <Bar
                            key={`player_${index + 1}`}
                            dataKey={`player_${index + 1}`}
                            fill={PLAYER_COLORS[index]}
                            name={player.name}
                          />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartErrorBoundary>
                </div>

                {/* Winner Analysis */}
                {comparisonData.winner_analysis &&
                  Object.keys(comparisonData.winner_analysis).length > 0 && (
                    <div className="mt-8 pt-8 border-t border-[#1a1a1a]">
                      <h4 className="text-sm font-medium text-white mb-6 flex items-center gap-3 uppercase tracking-wider">
                        <Trophy className="w-4 h-4 text-white" />
                        Category Leaders
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(comparisonData.winner_analysis).map(
                          ([metric, winner]) => (
                            <div
                              key={metric}
                              className="bg-[#0a0a0a] border border-[#1a1a1a] p-4"
                            >
                              <div className="text-xs text-gray-600 font-medium uppercase mb-2 tracking-wider">
                                {metric.replace(/_/g, ' ')}
                              </div>
                              <div className="text-sm text-white font-light">{winner}</div>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}
              </div>
            )}

            {/* Radar Chart Tab */}
            {activeView === 'radar' && comparisonData.radar_data && (
              <div className="bg-[#111111] border border-[#1a1a1a] p-8">
                <h3 className="text-lg font-light text-white mb-8 uppercase tracking-wider">Skills Comparison</h3>

                <div className="h-96">
                  <ChartErrorBoundary>
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={comparisonData.radar_data}>
                        <PolarGrid stroke="#1a1a1a" />
                        <PolarAngleAxis
                          dataKey="skill"
                          tick={{ fill: '#666', fontSize: 11 }}
                        />
                        <PolarRadiusAxis angle={90} domain={[0, 'auto']} tick={{ fill: '#666', fontSize: 10 }} />
                        {comparisonData.players.map((player, index) => (
                          <Radar
                            key={`player_${index + 1}`}
                            name={player.name}
                            dataKey={`player_${index + 1}`}
                            stroke={PLAYER_COLORS[index]}
                            fill={PLAYER_COLORS[index]}
                            fillOpacity={0.2}
                            strokeWidth={2}
                          />
                        ))}
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </ChartErrorBoundary>
                </div>

                <div className="mt-8 text-xs text-gray-600 text-center uppercase tracking-wider">
                  Comparative strengths across different skill categories
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerComparison;
