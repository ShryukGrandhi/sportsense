import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Trophy, Clock, MapPin, Calendar, Users } from 'lucide-react';

const TeamLogo = ({ src, alt, className = "h-12 w-12" }) => {
  const [imageError, setImageError] = useState(false);
  
  const fallbackLogo = (
    <div className={`${className} bg-gray-700 rounded-full flex items-center justify-center border-2 border-gray-600`}>
      <Trophy className="w-6 h-6 text-gray-400" />
    </div>
  );

  if (imageError || !src) {
    return fallbackLogo;
  }

  return (
    <img 
      src={src} 
      alt={alt} 
      className={`${className} rounded-full border-2 border-gray-600 object-cover`}
      onError={() => setImageError(true)}
      loading="lazy"
    />
  );
};

const MatchStatusBadge = ({ state }) => {
  const getStatusConfig = (state) => {
    switch (state?.toLowerCase()) {
      case 'live':
      case 'inprogress':
        return { 
          color: 'bg-red-600 text-red-100', 
          icon: '🔴', 
          text: 'LIVE' 
        };
      case 'finished':
      case 'final':
      case 'closed':
        return { 
          color: 'bg-gray-600 text-gray-100', 
          icon: '✓', 
          text: 'FINAL' 
        };
      case 'scheduled':
      case 'upcoming':
        return { 
          color: 'bg-blue-600 text-blue-100', 
          icon: '📅', 
          text: 'UPCOMING' 
        };
      default:
        return { 
          color: 'bg-gray-600 text-gray-300', 
          icon: '?', 
          text: state?.toUpperCase() || 'UNKNOWN' 
        };
    }
  };

  const config = getStatusConfig(state);
  
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
      <span className="mr-1">{config.icon}</span>
      {config.text}
    </span>
  );
};

const MatchCard = ({ 
  id,
  league = "NFL", 
  season, 
  round, 
  date, 
  time,
  homeTeam, 
  awayTeam, 
  state,
  venue,
  week,
  meta = {},
  title = "NFL Match", 
  collapsible = true 
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!homeTeam || !awayTeam) {
    return null;
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return 'TBD';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    try {
      return new Date(`1970-01-01T${timeStr}:00`).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return timeStr;
    }
  };

  const ScoreDisplay = () => (
    <div className="flex items-center justify-center space-x-8">
      {/* Home Team */}
      <div className="flex flex-col items-center space-y-2 min-w-[120px]">
        <TeamLogo 
          src={homeTeam.logo} 
          alt={homeTeam.name} 
          className="h-16 w-16"
        />
        <div className="text-center">
          <div className="text-white font-semibold text-lg">{homeTeam.abbreviation}</div>
          <div className="text-gray-400 text-sm">{homeTeam.name}</div>
        </div>
      </div>

      {/* Score */}
      <div className="text-center">
        {state?.score?.current ? (
          <div className="text-3xl font-bold text-white">{state.score.current}</div>
        ) : (
          <div className="text-xl text-gray-400">vs</div>
        )}
        <MatchStatusBadge state={state?.description} />
      </div>

      {/* Away Team */}
      <div className="flex flex-col items-center space-y-2 min-w-[120px]">
        <TeamLogo 
          src={awayTeam.logo} 
          alt={awayTeam.name} 
          className="h-16 w-16"
        />
        <div className="text-center">
          <div className="text-white font-semibold text-lg">{awayTeam.abbreviation}</div>
          <div className="text-gray-400 text-sm">{awayTeam.name}</div>
        </div>
      </div>
    </div>
  );

  const MatchDetails = () => (
    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-3">
        <div className="flex items-center space-x-2 text-gray-300">
          <Calendar className="w-4 h-4" />
          <span className="text-sm">
            {formatDate(date)} {time && `at ${formatTime(time)}`}
          </span>
        </div>
        
        {venue && (
          <div className="flex items-center space-x-2 text-gray-300">
            <MapPin className="w-4 h-4" />
            <span className="text-sm">{venue}</span>
          </div>
        )}
        
        {state?.period && (
          <div className="flex items-center space-x-2 text-gray-300">
            <Clock className="w-4 h-4" />
            <span className="text-sm">
              Period {state.period} {state.clock && `• ${state.clock}`}
            </span>
          </div>
        )}
      </div>
      
      <div className="space-y-3">
        <div className="text-gray-300">
          <span className="text-sm font-medium">{league}</span>
          {season && <span className="text-sm ml-2">• Season {season}</span>}
          {week && <span className="text-sm ml-2">• Week {week}</span>}
        </div>
        
        {round && (
          <div className="text-gray-300">
            <span className="text-sm">{round}</span>
          </div>
        )}
        
        {state?.report && (
          <div className="text-gray-300">
            <span className="text-sm">{state.report}</span>
          </div>
        )}
      </div>
    </div>
  );

  const MatchContent = () => (
    <div>
      <ScoreDisplay />
      <MatchDetails />
      
      {/* Additional metadata */}
      {meta && Object.keys(meta).length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="grid grid-cols-2 gap-4 text-sm">
            {meta.broadcast && (
              <div>
                <span className="text-gray-400">Broadcast:</span>
                <span className="text-white ml-2">{meta.broadcast}</span>
              </div>
            )}
            {meta.weather && (
              <div>
                <span className="text-gray-400">Weather:</span>
                <span className="text-white ml-2">{meta.weather}</span>
              </div>
            )}
            {meta.competition && (
              <div>
                <span className="text-gray-400">Competition:</span>
                <span className="text-white ml-2">{meta.competition}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-gradient-to-br from-orange-900/20 to-red-900/20 border border-orange-500/30 rounded-xl overflow-hidden mb-4">
      {collapsible ? (
        <>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between p-4 bg-orange-800/30 hover:bg-orange-800/40 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <Trophy className="w-5 h-5 text-orange-400" />
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              <span className="bg-orange-600/50 text-orange-200 text-xs px-2 py-1 rounded-full">
                {league}
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
              <MatchContent />
            </div>
          )}
        </>
      ) : (
        <div className="p-4">
          <div className="flex items-center space-x-3 mb-4">
            <Trophy className="w-5 h-5 text-orange-400" />
            <h3 className="text-lg font-semibold text-white">{title}</h3>
          </div>
          <MatchContent />
        </div>
      )}
    </div>
  );
};

export default MatchCard;