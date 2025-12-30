import React, { useState } from 'react';
import { Trophy as TrophyIcon } from 'lucide-react';

// Helper function to format stat labels
const formatStatLabel = (key) => {
  const labelMap = {
    'c_att': 'CMP/ATT',
    'yds': 'YDS',
    'td': 'TD',
    'car': 'CAR',
    'rec': 'REC',
    'tgts': 'TGT',
    'passing_yds': 'PASS YDS',
    'rushing_yds': 'RUSH YDS',
    'receptions': 'REC',
    'targets': 'TGT',
    'touchdowns': 'TD',
    'yards': 'YDS',
    'carries': 'CAR',
    'c/att': 'CMP/ATT',
    'comp/att': 'CMP/ATT'
  };

  return labelMap[key.toLowerCase()] || key.toUpperCase();
};

// Calculate efficiency metrics based on position
const calculateEfficiency = (player) => {
  const stats = player.stats || {};
  const position = player.playerPosition;

  if (position === 'QB') {
    // Parse completion percentage from c_att (e.g., "21/31")
    const cAtt = stats.c_att || stats['c/att'] || stats['comp/att'];
    if (typeof cAtt === 'string' && cAtt.includes('/')) {
      const [comp, att] = cAtt.split('/').map(Number);
      const pct = ((comp / att) * 100).toFixed(1);
      return {
        label: 'Completion %',
        value: `${pct}%`,
        rating: pct >= 65 ? 'good' : pct >= 55 ? 'average' : 'poor'
      };
    }
  } else if (position === 'RB') {
    // Calculate yards per carry
    const yards = stats.yds || stats.yards || 0;
    const carries = stats.car || stats.carries || 0;
    if (carries > 0) {
      const ypc = (yards / carries).toFixed(1);
      return {
        label: 'Yards/Carry',
        value: ypc,
        rating: ypc >= 4.5 ? 'good' : ypc >= 3.5 ? 'average' : 'poor'
      };
    }
  } else if (position === 'WR' || position === 'TE') {
    // Calculate yards per reception and catch rate
    const yards = stats.yds || stats.yards || 0;
    const receptions = stats.rec || stats.receptions || 0;
    const targets = stats.tgts || stats.targets || 0;

    if (receptions > 0 && targets > 0) {
      const ypr = (yards / receptions).toFixed(1);
      const catchRate = ((receptions / targets) * 100).toFixed(0);
      return {
        label: 'YPR / Catch Rate',
        value: `${ypr} / ${catchRate}%`,
        rating: ypr >= 12 && catchRate >= 70 ? 'good' : ypr >= 8 && catchRate >= 60 ? 'average' : 'poor'
      };
    }
  }

  return null;
};

const NFLComparisonTable = ({ card }) => {
  if (!card || !card.teams || card.teams.length < 2) return null;

  const [home, away] = card.teams;
  const hs = home.stats || {};
  const as = away.stats || {};

  // Team logo component with fallback
  const TeamLogo = ({ team }) => {
    const [imageError, setImageError] = useState(false);
    const teamName = team?.name || 'Team';
    const initials = teamName.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);

    if (imageError || !team?.logo) {
      return (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs">
          {initials}
        </div>
      );
    }

    return (
      <img
        src={team.logo}
        alt={teamName}
        className="w-8 h-8 rounded-full object-cover border-2 border-sky-500/50"
        onError={() => setImageError(true)}
      />
    );
  };

  const rows = [
    { label: 'Score', key: 'score', isTeamProp: true },  // Score is on team object, not stats
    { label: 'Touchdowns', key: 'touchdowns' },
    { label: 'Total Yards', key: 'yards' },
  ];

  const renderStat = (team, statsObj, key, isTeamProp) => {
    // If it's a team-level property (like score), get it from the team object
    const val = isTeamProp ? team?.[key] : statsObj?.[key];

    if (val === null || val === undefined) return '-';

    // Don't show 0 for stats that haven't been provided (except for score)
    if (Number(val) === 0 && !isTeamProp) return '-';

    return val;
  };

  // Check if we have player data
  const homePlayers = home.players || [];
  const awayPlayers = away.players || [];
  const hasPlayers = homePlayers.length > 0 || awayPlayers.length > 0;

  return (
    <div className="bg-gradient-to-b from-gray-900/80 to-gray-950/90 rounded-2xl p-5 border border-gray-800 shadow-lg backdrop-blur-md">
      <div className="h-1 bg-gradient-to-r from-sky-500 via-blue-500 to-teal-400 rounded-t-xl mb-3" />
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-sky-400 flex items-center gap-2">
          <TrophyIcon className="w-5 h-5 text-sky-400" />
          Team Comparison
        </h3>
        <span className="text-sm text-gray-400">{card.meta?.status || 'Scheduled'}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm text-gray-200">
          <thead className="border-b border-gray-800">
            <tr className="text-gray-400 uppercase tracking-wide text-xs">
              <th className="py-3 px-2 text-left font-semibold">Team</th>
              {rows.map((r) => (
                <th key={r.key} className="py-3 px-2 text-left font-semibold">{r.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="bg-gray-900/60 hover:bg-sky-950/40 transition-colors">
              <td className="py-3 px-2">
                <div className="flex items-center gap-2">
                  <TeamLogo team={home} />
                  <span className="font-semibold text-sky-300">{home.name}</span>
                </div>
              </td>
              {rows.map((r) => (
                <td key={r.key} className="py-3 px-2 text-gray-100">
                  {renderStat(home, hs, r.key, r.isTeamProp)}
                </td>
              ))}
            </tr>
            <tr className="bg-gray-950/60 hover:bg-sky-950/40 transition-colors">
              <td className="py-3 px-2">
                <div className="flex items-center gap-2">
                  <TeamLogo team={away} />
                  <span className="font-semibold text-sky-300">{away.name}</span>
                </div>
              </td>
              {rows.map((r) => (
                <td key={r.key} className="py-3 px-2 text-gray-100">
                  {renderStat(away, as, r.key, r.isTeamProp)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Top Players Section */}
      {hasPlayers && (
        <div className="mt-6 pt-6 border-t border-gray-800">
          <h4 className="text-md font-semibold text-sky-400 mb-6 flex items-center gap-2">
            <TrophyIcon className="w-4 h-4" />
            Top Players
          </h4>
          <div className="space-y-6">
            {/* Home Team Players */}
            {homePlayers.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <TeamLogo team={home} />
                  <h5 className="text-sm font-bold text-gray-200">{home.name}</h5>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {homePlayers.map((player, idx) => {
                    const efficiency = calculateEfficiency(player);
                    const ratingColors = {
                      good: 'from-green-500/20 to-emerald-600/20 border-green-500/50',
                      average: 'from-yellow-500/20 to-amber-600/20 border-yellow-500/50',
                      poor: 'from-red-500/20 to-rose-600/20 border-red-500/50'
                    };

                    return (
                      <div key={idx} className="bg-gradient-to-br from-blue-900/30 to-blue-950/50 rounded-xl p-4 border border-blue-800/50 hover:border-blue-600/50 transition-all">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="flex-1">
                            <div className="font-bold text-blue-300 text-base">{player.playerName}</div>
                            <div className="text-xs text-blue-400/70 uppercase tracking-wider font-semibold">{player.playerPosition}</div>
                          </div>
                        </div>

                        <div className="mb-3">
                          <div className="text-[10px] text-blue-400/60 uppercase tracking-wide mb-1">Game Stats</div>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(player.stats || {}).slice(0, 3).map(([key, value]) => {
                              const label = formatStatLabel(key);
                              return (
                                <div key={key} className="bg-blue-800/40 rounded-lg px-3 py-2 border border-blue-700/50">
                                  <div className="text-[10px] text-blue-400/70 uppercase">{label}</div>
                                  <div className="text-white font-bold text-sm">{value}</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {efficiency && (
                          <div className={`bg-gradient-to-r ${ratingColors[efficiency.rating]} rounded-lg px-3 py-2 border`}>
                            <div className="text-[10px] text-gray-300 uppercase tracking-wide">{efficiency.label}</div>
                            <div className="text-white font-bold text-lg">{efficiency.value}</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Away Team Players */}
            {awayPlayers.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <TeamLogo team={away} />
                  <h5 className="text-sm font-bold text-gray-200">{away.name}</h5>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {awayPlayers.map((player, idx) => {
                    const efficiency = calculateEfficiency(player);
                    const ratingColors = {
                      good: 'from-green-500/20 to-emerald-600/20 border-green-500/50',
                      average: 'from-yellow-500/20 to-amber-600/20 border-yellow-500/50',
                      poor: 'from-red-500/20 to-rose-600/20 border-red-500/50'
                    };

                    return (
                      <div key={idx} className="bg-gradient-to-br from-purple-900/30 to-purple-950/50 rounded-xl p-4 border border-purple-800/50 hover:border-purple-600/50 transition-all">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="flex-1">
                            <div className="font-bold text-purple-300 text-base">{player.playerName}</div>
                            <div className="text-xs text-purple-400/70 uppercase tracking-wider font-semibold">{player.playerPosition}</div>
                          </div>
                        </div>

                        <div className="mb-3">
                          <div className="text-[10px] text-purple-400/60 uppercase tracking-wide mb-1">Game Stats</div>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(player.stats || {}).slice(0, 3).map(([key, value]) => {
                              const label = formatStatLabel(key);
                              return (
                                <div key={key} className="bg-purple-800/40 rounded-lg px-3 py-2 border border-purple-700/50">
                                  <div className="text-[10px] text-purple-400/70 uppercase">{label}</div>
                                  <div className="text-white font-bold text-sm">{value}</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {efficiency && (
                          <div className={`bg-gradient-to-r ${ratingColors[efficiency.rating]} rounded-lg px-3 py-2 border`}>
                            <div className="text-[10px] text-gray-300 uppercase tracking-wide">{efficiency.label}</div>
                            <div className="text-white font-bold text-lg">{efficiency.value}</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NFLComparisonTable;
