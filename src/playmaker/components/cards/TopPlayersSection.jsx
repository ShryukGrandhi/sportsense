import React from 'react';

const TopPlayersSection = ({ teams }) => {
  if (typeof window !== 'undefined') {
    // eslint-disable-next-line no-console
    console.groupCollapsed('[AUDIT][TOP] TopPlayersSection props');
    // eslint-disable-next-line no-console
    console.log('teams:', teams);
    // eslint-disable-next-line no-console
    console.log('team[0].topPlayers:', teams?.[0]?.topPlayers);
    // eslint-disable-next-line no-console
    console.log('team[1].topPlayers:', teams?.[1]?.topPlayers);
    // eslint-disable-next-line no-console
    console.groupEnd();
  }
  if (!teams || !Array.isArray(teams) || teams.length === 0) return null;

  return (
    <div className="space-y-8">
      <h2 className="text-lg font-semibold text-slate-200 mb-2 flex items-center gap-2">
        <i className="ph ph-users-three text-sky-400" /> Top Players
      </h2>

      {teams.map((team, teamIndex) => {
        const topPlayers = (team.topPlayers || []).slice(0, 2); // limit to top 2
        if (topPlayers.length === 0) return null;

        // Helper: shorten stat names for cleaner UI
        const shortenStatName = (name = "") => {
          const map = {
            "Passing Yards": "Pass Yds",
            "Passing Touchdowns": "Pass TDs",
            "Interceptions Thrown": "INTs",
            "Rushing Yards": "Rush Yds",
            "Rushing Touchdowns": "Rush TDs",
            "Rushing Attempts": "Rush Att",
            "Receiving Yards": "Rec Yds",
            "Receiving Touchdowns": "Rec TDs",
            "Receptions": "Recs",
            "Total Touchdowns": "Tot TDs",
          };
          return map[name] || name;
        };

        return (
          <div key={team.name || teamIndex} className="mb-10">
            {/* Team Header */}
            <div className="flex items-center gap-2 mb-4 border-b border-blue-900/40 pb-2">
              {team.logo && (
                <img src={team.logo} alt={team.name} className="w-5 h-5 object-contain" />
              )}
              <h3 className="text-lg font-semibold text-blue-300 tracking-wide">
                {team.name}
              </h3>
            </div>

            {/* Player Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {topPlayers.map((player, pIndex) => (
                <div
                  key={`${team.name || teamIndex}-${pIndex}`}
                  className="bg-primary/40 border border-blue-800/40 rounded-2xl p-5 flex flex-col justify-between \
                       shadow-[0_0_20px_rgba(0,0,60,0.2)] hover:shadow-[0_0_30px_rgba(0,60,255,0.3)] \
                       transition-all duration-200"
                >
                  {/* Player Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-blue-900/60 flex items-center justify-center border border-blue-700/60 shadow-inner">
                      <img
                        src={team.logo}
                        alt={player.playerName}
                        className="w-8 h-8 object-contain"
                      />
                    </div>
                    <div>
                      <div className="text-base font-semibold text-blue-200 leading-tight">
                        {player.playerName}
                      </div>
                      <div className="text-xs text-blue-400/80">{player.playerPosition}</div>
                    </div>
                  </div>

                  {/* Impact Score */}
                  <div className="rounded-xl bg-gradient-to-r from-blue-700/30 to-blue-500/20 border border-blue-400/20 \
                            text-center py-3 mb-4 shadow-inner shadow-blue-900/40">
                    <div className="text-xs uppercase text-blue-300 tracking-wide mb-1">
                      Impact Score
                    </div>
                    <div className="text-2xl font-bold text-cyan-300">{player.value || player.impact_score || 0}</div>
                    <div className="text-[11px] text-blue-400/70 mt-1">
                      Overall Performance Rating
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div>
                    <div className="text-xs font-medium text-blue-300 mb-2 uppercase tracking-wide">
                      Current Game Stats
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      {(() => {
                        // Convert stats object to categories array if needed
                        let categories = player.categories || [];
                        if (player.stats && typeof player.stats === 'object' && !Array.isArray(player.stats)) {
                          categories = Object.entries(player.stats)
                            .filter(([key, value]) => value > 0)
                            .map(([key, value]) => ({ name: key, value }))
                            .slice(0, 3);
                        }
                        return categories.slice(0, 3).map((stat, sIndex) => (
                          <div
                            key={sIndex}
                            className="bg-blue-900/40 border border-blue-800/50 rounded-lg py-2"
                          >
                            <div className="text-[11px] text-blue-400/70 break-words tracking-wide">
                              {shortenStatName(stat.name)}
                            </div>
                            <div className="text-base font-semibold text-blue-100">
                              {stat.value || "-"}
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TopPlayersSection;
