import React, { useState } from 'react';
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import ChartErrorBoundary from '../ChartErrorBoundary';

const TrendCard = ({ 
  metric_name, 
  time_period, 
  trend_data = [], 
  chart_type = "line", 
  prediction, 
  title = "Performance Trend", 
  collapsible = true 
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // Validate and sanitize trend data
  if (!trend_data || !Array.isArray(trend_data) || trend_data.length === 0) {
    return null;
  }

  // Ensure all data points have valid values
  const sanitizedData = trend_data.map((item, index) => ({
    period: item?.period || `Period ${index + 1}`,
    value: typeof item?.value === 'number' ? item.value : parseFloat(item?.value) || 0
  })).filter(item => !isNaN(item.value));

  if (sanitizedData.length === 0) {
    return null;
  }

  // Calculate trend direction
  const firstValue = sanitizedData[0]?.value || 0;
  const lastValue = sanitizedData[sanitizedData.length - 1]?.value || 0;
  const trendDirection = lastValue > firstValue ? 'up' : 'down';
  const trendPercentage = firstValue !== 0 ? ((lastValue - firstValue) / firstValue * 100) : 0;

  const TrendIcon = trendDirection === 'up' ? TrendingUp : TrendingDown;
  const trendColor = trendDirection === 'up' ? 'text-green-400' : 'text-red-400';

  const ChartComponent = () => {
    if (chart_type === 'bar') {
      return (
        <ResponsiveContainer width="100%" height={256} minHeight={256}>
          <BarChart data={sanitizedData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="period"
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
              formatter={(value) => [value, metric_name]}
              wrapperStyle={{ outline: 'none' }}
            />
            <Bar dataKey="value" fill="#06B6D4" isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={256} minHeight={256}>
        <LineChart data={sanitizedData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="period"
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
            formatter={(value) => [value, metric_name]}
            wrapperStyle={{ outline: 'none' }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#06B6D4"
            strokeWidth={3}
            dot={{ fill: '#06B6D4', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: '#06B6D4', strokeWidth: 2, fill: '#0891B2' }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  const TrendContent = () => (
    <div>
      {/* Trend Summary */}
      <div className="flex items-center justify-between mb-4 p-3 bg-gray-900/50 rounded-lg border border-gray-700">
        <div className="flex items-center space-x-3">
          <TrendIcon className={`w-5 h-5 ${trendColor}`} />
          <div>
            <p className="text-white font-medium">{metric_name}</p>
            <p className="text-gray-400 text-sm">{time_period}</p>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-lg font-bold ${trendColor}`}>
            {trendDirection === 'up' ? '+' : ''}{trendPercentage.toFixed(1)}%
          </p>
          <p className="text-gray-400 text-xs">
            {firstValue} → {lastValue}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-64 mb-4">
        <ChartErrorBoundary>
          <ChartComponent />
        </ChartErrorBoundary>
      </div>

      {/* Key Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        {(() => {
          const values = sanitizedData.map(d => d.value);
          const max = Math.max(...values);
          const min = Math.min(...values);
          const avg = values.reduce((a, b) => a + b, 0) / values.length;
          const latest = values[values.length - 1];

          return [
            { label: 'Latest', value: latest, color: 'text-blue-400' },
            { label: 'Average', value: avg.toFixed(1), color: 'text-gray-300' },
            { label: 'Peak', value: max, color: 'text-green-400' },
            { label: 'Low', value: min, color: 'text-red-400' }
          ];
        })().map(stat => (
          <div key={stat.label} className="text-center p-3 bg-gray-900/30 rounded-lg">
            <p className="text-gray-400 text-xs mb-1">{stat.label}</p>
            <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Prediction */}
      {prediction && (
        <div className="mt-4 p-4 bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-lg border border-purple-500/30">
          <h4 className="text-purple-300 text-sm font-medium mb-2 flex items-center">
            <BarChart3 className="w-4 h-4 mr-2" />
            Performance Prediction
          </h4>
          <div className="grid grid-cols-2 gap-4">
            {prediction.next_value && (
              <div>
                <p className="text-gray-400 text-xs">Predicted Next</p>
                <p className="text-white font-semibold">{prediction.next_value}</p>
              </div>
            )}
            {prediction.confidence && (
              <div>
                <p className="text-gray-400 text-xs">Confidence</p>
                <p className="text-purple-300 font-semibold">{prediction.confidence}%</p>
              </div>
            )}
          </div>
          {prediction.insight && (
            <p className="text-gray-300 text-sm mt-2">{prediction.insight}</p>
          )}
        </div>
      )}

      {/* Period Details */}
      <div className="mt-4">
        <h4 className="text-gray-300 text-sm mb-2">Period Breakdown</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {sanitizedData.map((period, index) => (
            <div key={index} className="bg-gray-800 rounded p-2 text-center">
              <p className="text-gray-400 text-xs">{period.period}</p>
              <p className="text-white font-medium">{period.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-gradient-to-br from-cyan-900/20 to-blue-900/20 border border-cyan-500/30 rounded-xl overflow-hidden mb-4">
      {collapsible ? (
        <>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between p-4 bg-cyan-800/30 hover:bg-cyan-800/40 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <TrendingUp className="w-5 h-5 text-cyan-400" />
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              <span className={`text-xs px-2 py-1 rounded-full ${
                trendDirection === 'up' 
                  ? 'bg-green-600/50 text-green-200' 
                  : 'bg-red-600/50 text-red-200'
              }`}>
                {trendDirection === 'up' ? 'Trending Up' : 'Trending Down'}
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
              <TrendContent />
            </div>
          )}
        </>
      ) : (
        <div className="p-4">
          <div className="flex items-center space-x-3 mb-4">
            <TrendingUp className="w-5 h-5 text-cyan-400" />
            <h3 className="text-lg font-semibold text-white">{title}</h3>
          </div>
          <TrendContent />
        </div>
      )}
    </div>
  );
};

export default TrendCard;