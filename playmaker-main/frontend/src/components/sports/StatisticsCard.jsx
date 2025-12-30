import React from 'react';
import { BarChart3, TrendingUp } from 'lucide-react';
import SportsCard from './SportsCard';

const StatRow = ({ label, homeValue, awayValue, homeTeam, awayTeam }) => {
  const homeNum = parseFloat(homeValue) || 0;
  const awayNum = parseFloat(awayValue) || 0;
  const total = homeNum + awayNum;
  
  const homePercentage = total > 0 ? (homeNum / total) * 100 : 50;
  const awayPercentage = total > 0 ? (awayNum / total) * 100 : 50;

  return (
    <div className="space-y-2">
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
};

const PlayerStatRow = ({ stat }) => {
  const percentage = stat.value && typeof stat.value === 'string' && stat.value.includes('%') 
    ? parseFloat(stat.value) 
    : Math.min(parseFloat(stat.value) * 10, 100); // Scale non-percentage values

  return (
    <div className="flex justify-between items-center p-3 bg-gray-900 rounded-lg">
      <span className="text-gray-300 text-sm">{stat.displayName || stat.name}</span>
      <div className="flex items-center space-x-3">
        <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-sky-400 to-sky-600 transition-all duration-500"
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
        <span className="text-white font-medium text-sm min-w-[3rem] text-right">
          {stat.value}
        </span>
      </div>
    </div>
  );
};

const StatisticsCard = ({ statistics, matchStats, playerStats, title = "Key Statistics" }) => {
  // Handle different data formats
  const renderMatchStatistics = () => {
    if (!statistics || statistics.length === 0) return null;

    // Assume statistics is an array with team statistics
    const homeTeamStats = statistics[0];
    const awayTeamStats = statistics[1] || statistics[0];

    if (!homeTeamStats?.statistics) return null;

    const statLabels = ['Shots accuracy', 'Ball Possession', 'Passes Completed', 'Fouls', 'Corners'];
    
    return (
      <div className="space-y-4">
        {homeTeamStats.statistics.map((homeStat, index) => {
          const awayStat = awayTeamStats.statistics[index];
          return (
            <StatRow
              key={index}
              label={homeStat.displayName || homeStat.name || statLabels[index] || `Statistic ${index + 1}`}
              homeValue={homeStat.value}
              awayValue={awayStat?.value}
              homeTeam={homeTeamStats.team?.name}
              awayTeam={awayTeamStats.team?.name}
            />
          );
        })}
      </div>
    );
  };

  const renderPlayerStatistics = () => {
    if (!playerStats || playerStats.length === 0) return null;

    return (
      <div className="space-y-3">
        <h4 className="text-white font-medium">Player Performance</h4>
        {playerStats.map((stat, index) => (
          <PlayerStatRow key={index} stat={stat} />
        ))}
      </div>
    );
  };

  const renderCustomStats = () => {
    if (!matchStats) return null;

    return (
      <div className="grid grid-cols-2 gap-4">
        {Object.entries(matchStats).map(([key, value]) => (
          <div key={key} className="bg-gray-900 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-sky-400">{value}</div>
            <div className="text-sm text-gray-400 capitalize">
              {key.replace(/([A-Z])/g, ' $1').trim()}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const hasData = statistics?.length > 0 || playerStats?.length > 0 || matchStats;

  if (!hasData) return null;

  return (
    <SportsCard title={title} icon={BarChart3} collapsible defaultExpanded>
      <div className="space-y-6">
        {renderMatchStatistics()}
        {renderPlayerStatistics()}
        {renderCustomStats()}
      </div>
    </SportsCard>
  );
};

export default StatisticsCard;