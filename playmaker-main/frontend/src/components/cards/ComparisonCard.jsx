import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Users, Trophy, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import ChartErrorBoundary from '../ChartErrorBoundary';

const ComparisonCard = ({
  players = [],
  comparison_metrics = [],
  chart_data,
  winner_analysis = {},
  title = "Player Comparison",
  collapsible = true
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeView, setActiveView] = useState('stats'); // 'stats' | 'chart'
  const [imageError1, setImageError1] = useState(false);
  const [imageError2, setImageError2] = useState(false);

  // Validate players data
  if (!players || !Array.isArray(players) || players.length < 2) {
    return null;
  }

  const player1 = players[0] || {};
  const player2 = players[1] || {};

  // Validate player objects have required fields
  if (!player1.name || !player2.name) {
    return null;
  }

  const StatComparison = ({ metric, value1, value2, winner }) => {
    const max = Math.max(value1, value2);
    const percentage1 = max > 0 ? (value1 / max) * 100 : 0;
    const percentage2 = max > 0 ? (value2 / max) * 100 : 0;

    return (
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-300 text-sm font-medium capitalize">
            {metric.replace('_', ' ')}
          </span>
          {winner && (
            <Trophy className="w-4 h-4 text-yellow-500" />
          )}
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-white text-sm">{player1.name}</span>
            <span className="text-white font-bold">{value1}</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${percentage1}%` }}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-white text-sm">{player2.name}</span>
            <span className="text-white font-bold">{value2}</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-purple-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${percentage2}%` }}
            />
          </div>
        </div>
      </div>
    );
  };

  const ComparisonContent = () => (
    <div>
      {/* View Toggle */}
      <div className="flex space-x-2 mb-4">
        <button
          onClick={() => setActiveView('stats')}
          className={`px-3 py-1 rounded-md text-sm transition-colors ${
            activeView === 'stats' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Side-by-Side
        </button>
        <button
          onClick={() => setActiveView('chart')}
          className={`px-3 py-1 rounded-md text-sm transition-colors ${
            activeView === 'chart' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Chart View
        </button>
      </div>

      {activeView === 'stats' ? (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Player 1 */}
          <div className="bg-gray-900/50 rounded-lg p-4 border border-blue-500/30">
            <div className="flex items-center mb-4">
              {player1.image && !imageError1 ? (
                <img
                  src={player1.image}
                  alt={player1.name}
                  className="w-16 h-16 rounded-full object-cover border-2 border-blue-500"
                  onError={() => setImageError1(true)}
                />
              ) : (
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                  {player1.name.charAt(0)}
                </div>
              )}
              <div className="ml-3">
                <h3 className="text-white font-semibold text-lg">{player1.name}</h3>
                <p className="text-blue-400 text-sm">{player1.position} • {player1.team}</p>
                <p className="text-gray-400 text-xs mt-1">Impact Score: {player1.impact_score}</p>
              </div>
            </div>
            <div className="space-y-3">
              {Object.entries(player1.stats || {}).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-gray-300 text-sm capitalize">{key.replace('_', ' ')}</span>
                  <span className="text-white font-medium">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Player 2 */}
          <div className="bg-gray-900/50 rounded-lg p-4 border border-purple-500/30">
            <div className="flex items-center mb-4">
              {player2.image && !imageError2 ? (
                <img
                  src={player2.image}
                  alt={player2.name}
                  className="w-16 h-16 rounded-full object-cover border-2 border-purple-500"
                  onError={() => setImageError2(true)}
                />
              ) : (
                <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                  {player2.name.charAt(0)}
                </div>
              )}
              <div className="ml-3">
                <h3 className="text-white font-semibold text-lg">{player2.name}</h3>
                <p className="text-purple-400 text-sm">{player2.position} • {player2.team}</p>
                <p className="text-gray-400 text-xs mt-1">Impact Score: {player2.impact_score}</p>
              </div>
            </div>
            <div className="space-y-3">
              {Object.entries(player2.stats || {}).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-gray-300 text-sm capitalize">{key.replace('_', ' ')}</span>
                  <span className="text-white font-medium">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Bar Chart Comparison */}
          {chart_data && chart_data.type === 'bar' && Array.isArray(chart_data.data) && chart_data.data.length > 0 && (
            <div className="h-64">
              <h4 className="text-gray-300 text-sm mb-3">Performance Comparison</h4>
              <ChartErrorBoundary>
                <ResponsiveContainer width="100%" height={220} minHeight={220}>
                  <BarChart data={chart_data.data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis
                      dataKey="category"
                      tick={{ fill: '#9CA3AF', fontSize: 10 }}
                      axisLine={{ stroke: '#4B5563' }}
                      height={40}
                    />
                    <YAxis
                      tick={{ fill: '#9CA3AF', fontSize: 10 }}
                      axisLine={{ stroke: '#4B5563' }}
                      width={50}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1F2937',
                        border: '1px solid #374151',
                        borderRadius: '6px'
                      }}
                      wrapperStyle={{ outline: 'none' }}
                    />
                    <Bar dataKey="value" fill="#8B5CF6" isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartErrorBoundary>
            </div>
          )}
          
          {/* Metric Comparisons */}
          <div>
            <h4 className="text-gray-300 text-sm mb-3">Head-to-Head Metrics</h4>
            {comparison_metrics.map(metric => {
              const value1 = player1.stats?.[metric] || 0;
              const value2 = player2.stats?.[metric] || 0;
              const winner = winner_analysis[metric];
              
              return (
                <StatComparison
                  key={metric}
                  metric={metric}
                  value1={value1}
                  value2={value2}
                  winner={winner === player1.name || winner === player2.name ? winner : null}
                />
              );
            })}
          </div>
        </div>
      )}
      
      {/* Winner Summary */}
      {Object.keys(winner_analysis).length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-700">
          <h4 className="text-gray-300 text-sm mb-3 flex items-center">
            <Trophy className="w-4 h-4 text-yellow-500 mr-2" />
            Category Winners
          </h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(winner_analysis).map(([metric, winner]) => (
              <div key={metric} className="bg-yellow-500/20 text-yellow-300 px-3 py-1 rounded-full text-xs">
                <span className="capitalize">{metric.replace('_', ' ')}</span>: <span className="font-semibold">{winner}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-blue-500/30 rounded-xl overflow-hidden mb-4">
      {collapsible ? (
        <>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between p-4 bg-blue-800/30 hover:bg-blue-800/40 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <Users className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              <span className="bg-blue-600/50 text-blue-200 text-xs px-2 py-1 rounded-full">
                Head-to-Head
              </span>
            </div>
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </button>
          {isExpanded && (
            <div className="p-4">
              <ComparisonContent />
            </div>
          )}
        </>
      ) : (
        <div className="p-4">
          <div className="flex items-center space-x-3 mb-4">
            <Users className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">{title}</h3>
          </div>
          <ComparisonContent />
        </div>
      )}
    </div>
  );
};

export default ComparisonCard;