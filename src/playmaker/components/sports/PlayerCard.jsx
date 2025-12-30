import React, { useState } from 'react';
import { User, Calendar, MapPin, Trophy, TrendingUp, Star } from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import ChartErrorBoundary from '../ChartErrorBoundary';

// Unified stats grid used across tabs
const StatsGrid = ({ stats = [] }) => {
  if (!Array.isArray(stats) || stats.length === 0) {
    return (
      <div className="text-center py-6 text-slate-400 text-sm">No statistics available</div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {stats.map((s, i) => {
          const label = s.label || s.displayName || s.name || `Stat ${i + 1}`;
          const value = s.value ?? '-';
          const valueDisplay = (value && typeof value === 'object')
            ? (value.value ?? JSON.stringify(value))
            : value;
          return (
            <div key={i} className="bg-gray-900/50 rounded-lg p-2 sm:p-3 min-w-0">
              <div className="text-xs sm:text-sm text-slate-400 whitespace-normal break-words" title={String(label)}>
                {label}
              </div>
              <div className="text-sm sm:text-base md:text-lg font-semibold text-white mt-1 whitespace-normal break-words">
                {valueDisplay ?? '-'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Player header with responsive avatar and info
const PlayerInfoSection = ({ player }) => {
  const [imgError, setImgError] = useState(false);
  const avatarSrc = !imgError ? (player.photo || player.logo) : null;
  return (
    <div className="flex items-start gap-4 mb-4 flex-wrap">
      <div className="flex-shrink-0">
        {avatarSrc ? (
          <img
            src={avatarSrc}
            alt={player.name || 'Player'}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-contain bg-slate-800 p-1 border-2 border-sky-400"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-slate-800 p-1 flex items-center justify-center border-2 border-sky-400">
            <User className="w-8 h-8 text-gray-400" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-[200px]">
        <h4 className="text-base sm:text-lg lg:text-xl font-bold text-white mb-1 break-words">{player.name}</h4>
        <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
          {player.age && (
            <div className="flex items-center gap-1 text-gray-300">
              <Calendar className="w-3.5 h-3.5 text-sky-400" />
              <span>Age: {player.age}</span>
            </div>
          )}
          {player.position && (
            <div className="flex items-center gap-1 text-gray-300">
              <Trophy className="w-3.5 h-3.5 text-sky-400" />
              <span>{player.position}</span>
            </div>
          )}
          {player.nationality && (
            <div className="flex items-center gap-1 text-gray-300">
              <MapPin className="w-3.5 h-3.5 text-sky-400" />
              <span>{player.nationality}</span>
            </div>
          )}
          {player.currentTeam && (
            <div className="flex items-center gap-1 text-gray-300">
              <User className="w-3.5 h-3.5 text-sky-400" />
              <span>{player.currentTeam}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Removed old progress-bar stat item in favor of StatsGrid for clarity and consistency

const CareerSection = ({ career }) => {
  if (!career || career.length === 0) return null;

  return (
    <div className="space-y-3">
      <h5 className="text-white font-medium flex items-center">
        <Trophy className="w-4 h-4 mr-2 text-sky-400" />
        Career History
      </h5>
      <div className="space-y-2">
        {career.map((club, index) => (
          <div key={index} className="flex justify-between items-center py-2 px-3 bg-gray-900 rounded-lg">
            <div>
              <span className="text-white text-sm">{club.team}</span>
              {club.league && (
                <span className="text-gray-400 text-xs ml-2">({club.league})</span>
              )}
            </div>
            <span className="text-gray-400 text-sm">
              {club.period || `${club.startYear} - ${club.endYear || 'Present'}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Removed legacy PlayerStatsSection; replaced by StatsGrid usage across tabs

const PlayerCard = ({ 
  playerData, 
  statistics = [], 
  season_stats = {}, 
  performance_chart, 
  impact_score, 
  radar_chart_data = [], 
  title = "Player Profile"
}) => {
  const [activeTab, setActiveTab] = useState('profile');
  
  if (!playerData) {
    return null;
  }

  const TabButton = ({ id, label, isActive, onClick, icon: Icon }) => (
    <button
      onClick={() => onClick(id)}
      className={`flex items-center space-x-2 px-4 py-2 rounded-t-lg transition-colors ${
        isActive
          ? 'bg-blue-600 text-white'
          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
      }`}
    >
      {Icon && <Icon className="w-4 h-4" />}
      <span className="text-sm font-medium">{label}</span>
    </button>
  );

  // Unify stats once for all sections
  const unifiedStats = (() => {
    const map = new Map();

    // Helper to normalize label keys (case-insensitive, whitespace-insensitive)
    const normalizeKey = (key = '') =>
      key.toString().trim().toLowerCase().replace(/\s+/g, '');

    try {
      // 1) Add from object first (playerData.statistics)
      const obj = playerData?.statistics;
      if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
        Object.entries(obj).forEach(([k, v]) => {
          const label = String(k).replace(/([A-Z])/g, ' $1').trim();
          const normKey = normalizeKey(label);
          if (!map.has(normKey)) {
            map.set(normKey, { label, value: v });
          }
        });
      }

      // 2) Add from array (statistics[]), overriding if same key
      if (Array.isArray(statistics)) {
        statistics.forEach((s) => {
          if (!s) return;
          const key = String(s.displayName || s.name || s.label || '').trim();
          if (!key) return;
          const normKey = normalizeKey(key);
          map.set(normKey, { label: key, value: s.value });
        });
      }
    } catch (e) {
      console.warn('⚠️ Unified stats merge failed:', e);
    }

    return Array.from(map.values());
  })();

  const ProfileContent = () => (
    <div className="flex flex-col sm:flex-row flex-wrap gap-4">
      {/* Basic Info + Impact */}
      <div className="flex-1 min-w-[260px]">
        <PlayerInfoSection player={playerData} />
        <div className="mt-3 border-t border-slate-700/30 pt-3">
          <div className="flex flex-wrap gap-4">
            {/* Impact Score Panel */}
            {impact_score !== null && impact_score !== undefined && (
              <div className="flex-1 min-w-[160px] sm:min-w-[180px] md:min-w-[200px] p-4 bg-gradient-to-r from-yellow-900/30 to-orange-900/30 rounded-lg border border-yellow-500/30">
                <div className="flex flex-col items-center justify-center text-center gap-1">
                  <div className="flex items-center justify-center gap-2">
                    <Star className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
                    <span className="text-yellow-300 text-sm sm:text-base font-medium">Impact Score</span>
                  </div>
                  <div className="text-base sm:text-lg font-bold text-yellow-400">{impact_score}</div>
                  <div className="text-[10px] sm:text-xs text-yellow-300">Overall Performance Rating</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Current Season Stats */}
      <div className="flex-1 min-w-[260px]">
        <div className="mt-3 sm:mt-0">
          <div className="text-sm sm:text-base font-medium text-slate-300 mb-2">Current Season Stats</div>
          <StatsGrid stats={unifiedStats} />
        </div>
      </div>
    </div>
  );

  const SkillsContent = () => (
    <div className="space-y-4 sm:space-y-6">
      {/* Radar Chart */}
      {radar_chart_data && Array.isArray(radar_chart_data) && radar_chart_data.length > 0 && (
        <div>
          <div className="text-sm sm:text-base font-medium text-slate-300 mb-2">Skills Breakdown</div>
          <div className="h-80">
            <ChartErrorBoundary>
              <ResponsiveContainer width="100%" height={320} minHeight={320}>
                <RadarChart data={radar_chart_data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <PolarGrid stroke="#374151" />
                  <PolarAngleAxis dataKey="skill" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                  <PolarRadiusAxis angle={0} domain={[0, 100]} tick={{ fill: '#9CA3AF', fontSize: 10 }} />
                  <Radar name="Rating" dataKey="rating" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.2} strokeWidth={2} isAnimationActive={false} />
                </RadarChart>
              </ResponsiveContainer>
            </ChartErrorBoundary>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
            {radar_chart_data.map((skill, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-800 rounded">
                <span className="text-gray-300 text-sm">{skill.skill}</span>
                <span className="text-blue-400 font-semibold">{skill.rating}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Career Statistics */}
      {season_stats && Object.keys(season_stats).length > 0 && (
        <div className="border-t border-slate-700/40 pt-3">
          <div className="text-sm sm:text-base font-medium text-slate-300 mb-2">Career Statistics</div>
          <div className="overflow-x-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(season_stats).map(([key, value]) => (
                <div key={key} className="text-center p-3 bg-gray-900/50 rounded-lg border border-gray-700">
                  <div className="text-sm sm:text-base md:text-lg font-semibold text-white">{value}</div>
                  <div className="text-xs sm:text-sm text-gray-400 capitalize mt-1">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const TrendsContent = () => (
    <div className="space-y-4 sm:space-y-6">
      {/* Performance Trend Chart */}
      {performance_chart && performance_chart.data && Array.isArray(performance_chart.data) && performance_chart.data.length > 0 && (
        <div>
          <div className="text-sm sm:text-base font-medium text-slate-300 mb-2">Performance Trend</div>
          <div className="h-64 overflow-x-auto">
            <ChartErrorBoundary>
              <ResponsiveContainer width="100%" height={256} minHeight={256}>
                <LineChart data={performance_chart.data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey={performance_chart.xKey || "period"} tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={{ stroke: '#4B5563' }} height={40} />
                  <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} axisLine={{ stroke: '#4B5563' }} width={50} />
                  <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '6px' }} wrapperStyle={{ outline: 'none' }} />
                  <Line type="monotone" dataKey={performance_chart.yKey || "value"} stroke="#10B981" strokeWidth={3} dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }} activeDot={{ r: 6, stroke: '#10B981', strokeWidth: 2, fill: '#059669' }} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartErrorBoundary>
          </div>
        </div>
      )}

      {/* Detailed Statistics */}
      {unifiedStats && unifiedStats.length > 0 && (
        <div>
          <div className="text-sm sm:text-base font-medium text-slate-300 mb-2">Detailed Statistics</div>
          <StatsGrid stats={unifiedStats} />
        </div>
      )}
    </div>
  );

  // Outer container without an extra card header (CollapsibleSection wraps this component)
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-1 mb-6 border-b border-gray-700 pb-2">
        <TabButton 
          id="profile" 
          label="Profile" 
          isActive={activeTab === 'profile'} 
          onClick={setActiveTab}
          icon={User}
        />
        {radar_chart_data && radar_chart_data.length > 0 && (
          <TabButton 
            id="skills" 
            label="Skills" 
            isActive={activeTab === 'skills'} 
            onClick={setActiveTab}
            icon={Trophy}
          />
        )}
        {performance_chart && (
          <TabButton 
            id="trends" 
            label="Trends" 
            isActive={activeTab === 'trends'} 
            onClick={setActiveTab}
            icon={TrendingUp}
          />
        )}
      </div>

      {/* Tab Content */}
      {activeTab === 'profile' && <ProfileContent />}
      {activeTab === 'skills' && <SkillsContent />}
      {activeTab === 'trends' && <TrendsContent />}
    </div>
  );
};

export default PlayerCard;
