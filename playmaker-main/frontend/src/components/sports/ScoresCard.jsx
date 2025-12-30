import React from 'react';
import { Trophy, Clock, MapPin } from 'lucide-react';
import SportsCard from './SportsCard';

const ScoreDisplay = ({ homeTeam, awayTeam, score, status, date, venue }) => {
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'finished':
      case 'full time':
        return 'text-green-400';
      case 'live':
      case 'in play':
      case 'first half':
      case 'second half':
        return 'text-red-400 animate-pulse';
      case 'scheduled':
      case 'not started':
        return 'text-gray-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2 text-sm text-gray-400">
          <Clock className="w-4 h-4" />
          <span>{date}</span>
          {venue && (
            <>
              <MapPin className="w-4 h-4 ml-2" />
              <span>{venue}</span>
            </>
          )}
        </div>
        <span className={`text-sm font-medium ${getStatusColor(status)}`}>
          {status}
        </span>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center space-x-3">
              {homeTeam?.logo && (
                <img 
                  src={homeTeam.logo} 
                  alt={homeTeam.name}
                  className="w-8 h-8 rounded-full bg-gray-800"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              )}
              <span className="text-white font-medium">{homeTeam?.name || 'Home Team'}</span>
            </div>
            <span className="text-2xl font-bold text-white">
              {score?.current ? score.current.split(' - ')[0] : '0'}
            </span>
          </div>
          
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center space-x-3">
              {awayTeam?.logo && (
                <img 
                  src={awayTeam.logo} 
                  alt={awayTeam.name}
                  className="w-8 h-8 rounded-full bg-gray-800"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              )}
              <span className="text-white font-medium">{awayTeam?.name || 'Away Team'}</span>
            </div>
            <span className="text-2xl font-bold text-white">
              {score?.current ? score.current.split(' - ')[1] : '0'}
            </span>
          </div>
        </div>
      </div>
      
      {score?.penalties && (
        <div className="mt-2 pt-2 border-t border-gray-700">
          <div className="text-center text-sm text-gray-400">
            Penalties: {score.penalties}
          </div>
        </div>
      )}
    </div>
  );
};

const ScoresCard = ({ matches }) => {
  if (!matches || matches.length === 0) {
    return null;
  }

  return (
    <SportsCard title="Scores" icon={Trophy}>
      <div className="space-y-4">
        {matches.map((match, index) => (
          <ScoreDisplay
            key={match.id || index}
            homeTeam={match.homeTeam}
            awayTeam={match.awayTeam}
            score={match.state?.score}
            status={match.state?.description}
            date={match.date ? new Date(match.date).toLocaleDateString() : 'TBD'}
            venue={match.venue?.name}
          />
        ))}
      </div>
    </SportsCard>
  );
};

export default ScoresCard;