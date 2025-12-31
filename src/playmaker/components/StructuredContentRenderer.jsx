import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Play, PlayCircle, Image, ExternalLink, FileText, Users, TrendingUp, Trophy, BarChart3, User } from 'lucide-react';
import ScoresCard from './sports/ScoresCard';
import StatisticsCard from './sports/StatisticsCard';
import HighlightsCard from './sports/HighlightsCard';
import PlayerCard from './sports/PlayerCard';
import TopPlayersSection from './cards/TopPlayersSection';
import ScoreCard from './cards/ScoreCard';
import NFLComparisonTable from './cards/NFLComparisonTable';
import StatsCard from './cards/StatsCard';
import ComparisonCard from './cards/ComparisonCard';
import TrendCard from './cards/TrendCard';
import MatchCard from './cards/MatchCard';

const CollapsibleSection = ({ title, children, defaultExpanded = true, icon: Icon }) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="border border-gray-700 rounded-xl overflow-hidden mb-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 bg-gray-800 hover:bg-gray-750 transition-colors"
      >
        <div className="flex items-center space-x-3">
          {Icon && <Icon className="w-5 h-5 text-sky-400" />}
          <h3 className="text-lg font-semibold text-white">{title}</h3>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>
      {isExpanded && (
        <div className="p-6 bg-gray-900">
          {children}
        </div>
      )}
    </div>
  );
};

const VideoCarousel = ({ videos }) => {
  const [selectedVideo, setSelectedVideo] = useState(null);

  const openVideoModal = (video) => {
    setSelectedVideo(video);
  };

  const closeVideoModal = () => {
    setSelectedVideo(null);
  };

  // Order so most recent/most relevant appear first
  const toTimestamp = (v) => {
    const d = v?.date || v?.publishedAt || v?.timestamp || v?.match?.date;
    const t = d ? new Date(d).getTime() : NaN;
    return Number.isFinite(t) ? t : -1;
  };
  const hasDates = (videos || []).some((v) => toTimestamp(v) > 0);
  const ordered = (videos || [])
    .slice()
    .sort((a, b) => {
      if (!hasDates) return 0; // keep original if no dates
      return toTimestamp(b) - toTimestamp(a);
    });
  // If no dates, fallback to reversed original order
  // If no dates, preserve backend order (no reverse)
  const finalVideos = hasDates ? ordered : (videos || []);
  try {
    // eslint-disable-next-line no-console
    console.log('[AUDIT][HIGHLIGHTS_ORDER][FE_RENDER][VideoCarousel]', (finalVideos || []).map(v => v?.title));
  } catch { }

  return (
    <>
      <div className="flex flex-row gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory">
        {finalVideos.map((video, index) => (
          <div key={video.id || video.url || index} className="flex flex-col min-w-[300px] gap-2 snap-start">
            <p className="text-sm text-gray-300 truncate px-1">
              {video.title || (video.match?.homeTeam?.name && video.match?.awayTeam?.name
                ? `${video.match.homeTeam.name} vs ${video.match.awayTeam.name}`
                : 'Highlight')}
            </p>
            <div
              className="relative aspect-video bg-gray-800 rounded-lg overflow-hidden border border-gray-700 hover:border-sky-500 transition-colors cursor-pointer shadow-sm"
              onClick={() => openVideoModal(video)}
            >
              {video.thumbnail ? (
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-800">
                  <Play className="w-12 h-12 text-gray-400" />
                </div>
              )}
              <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                <div className="bg-sky-500 rounded-full p-3">
                  <Play className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Video Modal */}
      {selectedVideo && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-700">
              <h3 className="text-xl font-semibold text-white">{selectedVideo.title}</h3>
              <button
                onClick={closeVideoModal}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              {selectedVideo.url ? (
                <div className="aspect-video mb-4">
                  {selectedVideo.url.includes('embed') ? (
                    <iframe
                      src={selectedVideo.url}
                      className="w-full h-full rounded-lg"
                      allowFullScreen
                      title={selectedVideo.title}
                    />
                  ) : (
                    <video
                      controls
                      className="w-full h-full rounded-lg"
                      poster={selectedVideo.thumbnail}
                    >
                      <source src={selectedVideo.url} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                  )}
                </div>
              ) : (
                <div className="aspect-video mb-4 bg-gray-800 rounded-lg flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <Play className="w-12 h-12 mx-auto mb-2" />
                    <p>Video not available</p>
                  </div>
                </div>
              )}

              {selectedVideo.description && (
                <p className="text-gray-300 mb-4">{selectedVideo.description}</p>
              )}

              <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                {selectedVideo.source && (
                  <span>Source: {selectedVideo.source}</span>
                )}
                {selectedVideo.duration && (
                  <span>Duration: {selectedVideo.duration}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const ImageGallery = ({ images }) => {
  const [selectedImage, setSelectedImage] = useState(null);

  const openImageModal = (image) => {
    setSelectedImage(image);
  };

  const closeImageModal = () => {
    setSelectedImage(null);
  };

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {images.map((image, index) => (
          <div
            key={image.id || index}
            className="group cursor-pointer"
            onClick={() => openImageModal(image)}
          >
            <div className="aspect-square bg-gray-800 rounded-lg overflow-hidden border border-gray-700 hover:border-sky-500 transition-colors">
              <img
                src={image.url}
                alt={image.title || `Image ${index + 1}`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                onError={(e) => {
                  e.target.parentElement.innerHTML = `
                    <div class="w-full h-full flex items-center justify-center text-gray-400">
                      <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                      </svg>
                    </div>
                  `;
                }}
              />
            </div>
            {image.title && (
              <p className="text-sm text-gray-400 mt-2 line-clamp-2">{image.title}</p>
            )}
          </div>
        ))}
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-4xl max-h-[90vh] w-full">
            <button
              onClick={closeImageModal}
              className="absolute top-4 right-4 bg-black bg-opacity-50 text-white rounded-full p-2 hover:bg-opacity-75 transition-colors z-10"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <img
              src={selectedImage.url}
              alt={selectedImage.title}
              className="w-full h-full object-contain rounded-lg"
            />

            {selectedImage.title && (
              <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-75 text-white p-4 rounded-lg">
                <h3 className="font-semibold">{selectedImage.title}</h3>
                {selectedImage.description && (
                  <p className="text-gray-300 text-sm mt-1">{selectedImage.description}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

const StructuredContentRenderer = ({ contentItems = [], activeMediaTab = 'All' }) => {
  // Filter content items based on active media tab
  const filterContentByTab = (tab, items) => {
    const mapping = {
      All: items,
      Videos: items.filter(i => ['highlight_video', 'videos'].includes(i.type)),
      Images: items.filter(i => ['image_gallery', 'images'].includes(i.type)),
      Stats: items.filter(i => ['scorecard', 'statistics', 'stats'].includes(i.type)),
      Players: items.filter(i => ['player', 'top_player', 'comparison', 'stat-comparison'].includes(i.type)),
    };
    return mapping[tab] || [];
  };

  try {
    // eslint-disable-next-line no-console
    console.log('[AUDIT][TABS] activeTab=', activeMediaTab, 'types=', (contentItems || []).map(ci => ci?.type));
  } catch { }

  useEffect(() => {
    try {
      // eslint-disable-next-line no-console
      console.log('[AUDIT][RENDER_TRIGGER]', { tab: activeMediaTab, itemCount: (contentItems || []).length });
      // eslint-disable-next-line no-console
      console.log('[AUDIT][ITEM_TYPES]', (contentItems || []).map(i => i?.type));
    } catch { }
  }, [activeMediaTab, contentItems]);

  const filteredItems = filterContentByTab(activeMediaTab, contentItems || []);

  if (!filteredItems || filteredItems.length === 0) {
    if (activeMediaTab !== 'All') {
      return (
        <div className="text-center py-8 text-gray-500">
          <p>No {activeMediaTab.toLowerCase()} content available for this query.</p>
        </div>
      );
    }
    return null;
  }

  try {
    // eslint-disable-next-line no-console
    console.log('[AUDIT][FE_RENDER] rendering card types', (filteredItems || []).map(i => i?.type));
  } catch { }

  return (
    <div className="space-y-4">
      {filteredItems.map((item, index) => {
        const { type, title = '', data, collapsible = true } = item;

        // Render based on content type with lazy loading for media
        switch (type) {
          case 'top_player': {
            if (typeof window !== 'undefined') {
              // Frontend audit: inspect what the card carries
              // eslint-disable-next-line no-console
              console.groupCollapsed('[AUDIT][TOP] render top_player');
              // eslint-disable-next-line no-console
              console.log('item.teams:', item?.teams);
              // eslint-disable-next-line no-console
              console.log('teams[0]:', item?.teams?.[0]);
              // eslint-disable-next-line no-console
              console.log('teams[1]:', item?.teams?.[1]);
              // eslint-disable-next-line no-console
              console.groupEnd();
            }
            // Normalize teams to ensure a topPlayers list exists; if only a single 'player' exists, wrap it
            const normalizedTeams = (item.teams || []).map((t) => {
              if (Array.isArray(t?.topPlayers) && t.topPlayers.length > 0) return t;
              const single = t?.player
                ? [{
                  name: t.player.playerName || 'Top Player',
                  position: t.player.playerPosition,
                  team: t.name,
                  logo: t.logo,
                  statistics: [{ displayName: t.player.name, value: t.player.value }],
                  impact_score: Number(t.player.value) || 0
                }]
                : [];
              return { ...t, topPlayers: single };
            });

            const section = (
              <TopPlayersSection teams={normalizedTeams} />
            );

            return collapsible ? (
              <CollapsibleSection key={index} title={title || 'Top Players'} icon={User}>
                {section}
              </CollapsibleSection>
            ) : (
              <div key={index}>{section}</div>
            );
          }
          case 'scorecard': {
            const sport = (item?.meta?.sport || '').toLowerCase();
            const isFootball = sport === 'nfl' || sport === 'ncaa' || sport === 'american_football';
            if (collapsible) {
              return (
                <CollapsibleSection key={index} title={title} icon={Trophy}>
                  {isFootball ? (
                    <NFLComparisonTable card={item} />
                  ) : (
                    <ScoreCard teams={item.teams} title={title} collapsible={false} meta={item.meta} />
                  )}
                </CollapsibleSection>
              );
            }
            return isFootball ? (
              <NFLComparisonTable key={index} card={item} />
            ) : (
              <ScoreCard key={index} teams={item.teams} title={title} collapsible={false} meta={item.meta} />
            );
          }

          case 'statistics':
            return collapsible ? (
              <CollapsibleSection key={index} title={title} icon={BarChart3}>
                <StatsCard headers={item.headers} rows={item.rows} title={title} collapsible={false} />
              </CollapsibleSection>
            ) : (
              <StatsCard key={index} headers={item.headers} rows={item.rows} title={title} collapsible={false} />
            );

          case 'standings': {
            // Rich standings card with team logos and comprehensive stats
            const standings = item.data || [];
            const verified = item.verified;
            const source = item.source;

            return (
              <CollapsibleSection key={index} title={title} icon={Trophy}>
                <div className="space-y-4">
                  {/* Verification badge */}
                  {verified && (
                    <div className="flex items-center gap-2 text-emerald-400 text-xs bg-emerald-900/30 rounded-lg px-3 py-2 w-fit">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      <span>Verified from {source}</span>
                    </div>
                  )}

                  {/* Standings table with horizontal scroll */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-700">
                          <th className="text-left py-3 px-2 text-gray-400 font-medium text-xs w-8">#</th>
                          <th className="text-left py-3 px-2 text-gray-400 font-medium text-xs">Team</th>
                          <th className="text-center py-3 px-2 text-gray-400 font-medium text-xs">W</th>
                          <th className="text-center py-3 px-2 text-gray-400 font-medium text-xs">L</th>
                          <th className="text-center py-3 px-2 text-gray-400 font-medium text-xs">PCT</th>
                          <th className="text-center py-3 px-2 text-gray-400 font-medium text-xs">GB</th>
                          <th className="text-center py-3 px-2 text-gray-400 font-medium text-xs">STRK</th>
                          <th className="text-center py-3 px-2 text-gray-400 font-medium text-xs hidden md:table-cell">HOME</th>
                          <th className="text-center py-3 px-2 text-gray-400 font-medium text-xs hidden md:table-cell">AWAY</th>
                          <th className="text-center py-3 px-2 text-gray-400 font-medium text-xs hidden lg:table-cell">L10</th>
                          <th className="text-center py-3 px-2 text-gray-400 font-medium text-xs hidden lg:table-cell">DIFF</th>
                        </tr>
                      </thead>
                      <tbody>
                        {standings.map((team, idx) => {
                          // Color-code streak
                          const streakClass = team.streak?.startsWith('W')
                            ? 'text-emerald-400'
                            : team.streak?.startsWith('L')
                              ? 'text-red-400'
                              : 'text-gray-400';

                          // Color-code diff
                          const diffVal = parseFloat(team.diff) || 0;
                          const diffClass = diffVal > 0 ? 'text-emerald-400' : diffVal < 0 ? 'text-red-400' : 'text-gray-400';

                          return (
                            <tr
                              key={idx}
                              className={`border-b border-gray-800 hover:bg-gray-800/50 transition-colors ${idx < 6 ? 'bg-blue-900/10' : idx < 10 ? 'bg-gray-800/20' : ''}`}
                            >
                              <td className="py-3 px-2 text-gray-500 font-medium">{team.rank}</td>
                              <td className="py-3 px-2">
                                <div className="flex items-center gap-3">
                                  {team.logo ? (
                                    <img
                                      src={team.logo}
                                      alt={team.team}
                                      className="w-8 h-8 object-contain"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-gray-400 text-xs">
                                      {team.team?.charAt(0)}
                                    </div>
                                  )}
                                  <span className="text-white font-medium">{team.team}</span>
                                </div>
                              </td>
                              <td className="py-3 px-2 text-center text-white font-semibold">{team.wins}</td>
                              <td className="py-3 px-2 text-center text-gray-400">{team.losses}</td>
                              <td className="py-3 px-2 text-center text-white">{team.pct}</td>
                              <td className="py-3 px-2 text-center text-gray-400">{team.gb}</td>
                              <td className={`py-3 px-2 text-center font-medium ${streakClass}`}>{team.streak}</td>
                              <td className="py-3 px-2 text-center text-gray-400 hidden md:table-cell">{team.home}</td>
                              <td className="py-3 px-2 text-center text-gray-400 hidden md:table-cell">{team.away}</td>
                              <td className="py-3 px-2 text-center text-gray-400 hidden lg:table-cell">{team.l10}</td>
                              <td className={`py-3 px-2 text-center font-medium hidden lg:table-cell ${diffClass}`}>
                                {diffVal > 0 ? '+' : ''}{team.diff}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Legend */}
                  <div className="flex flex-wrap gap-4 text-xs text-gray-500 mt-4">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-blue-900/30 rounded"></div>
                      <span>Playoff Position (Top 6)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-gray-800/50 rounded"></div>
                      <span>Play-In (7-10)</span>
                    </div>
                  </div>
                </div>
              </CollapsibleSection>
            );
          }

          case 'highlight_video':
            // Bordered container with inline icon + "Highlights" label
            return (
              <CollapsibleSection key={index} title={title || 'Highlights'} icon={PlayCircle}>
                <VideoCarousel videos={item.items || data} loading="lazy" />
              </CollapsibleSection>
            );

          case 'image_gallery':
            return collapsible ? (
              <CollapsibleSection key={index} title={title} icon={Image}>
                <ImageGallery images={item.items || data} loading="lazy" />
              </CollapsibleSection>
            ) : (
              <ImageGallery key={index} images={item.items || data} loading="lazy" />
            );

          case 'player': {
            // If roster-style items array exists, render compact roster grid
            if (Array.isArray(item.items) && item.items.length > 0) {
              const roster = (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {item.items.map((p, idx) => (
                    <div key={idx} className="bg-gray-800 border border-gray-700 rounded-lg p-3 hover:border-sky-500 transition-colors">
                      <div className="flex flex-col items-center text-center">
                        <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-700">
                          {p.imageUrl ? (
                            <img src={p.imageUrl} alt={p.name || 'Player'} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <User className="w-8 h-8" />
                            </div>
                          )}
                        </div>
                        <div className="mt-2 text-sm font-semibold text-white truncate max-w-[120px]">{p.name || 'Player'}</div>
                        {p.position && (
                          <div className="text-xs text-gray-400">{p.position}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );
              return collapsible ? (
                <CollapsibleSection key={index} title={title || 'Team Roster'} icon={User}>
                  {roster}
                </CollapsibleSection>
              ) : (
                <div key={index}>{roster}</div>
              );
            }

            // Fallback to single player profile card
            return collapsible ? (
              <CollapsibleSection key={index} title={title} icon={User}>
                <PlayerCard
                  playerData={{
                    name: item.player_name,
                    team: item.team,
                    position: item.position,
                    statistics: item.stats,
                    photo: item.image_url
                  }}
                  statistics={item.stats}
                  season_stats={item.season_stats}
                  performance_chart={item.performance_chart}
                  impact_score={item.impact_score}
                  radar_chart_data={item.radar_chart_data}
                />
              </CollapsibleSection>
            ) : (
              <PlayerCard
                key={index}
                playerData={{
                  name: item.player_name,
                  team: item.team,
                  position: item.position,
                  statistics: item.stats,
                  photo: item.image_url
                }}
                statistics={item.stats}
                season_stats={item.season_stats}
                performance_chart={item.performance_chart}
                impact_score={item.impact_score}
                radar_chart_data={item.radar_chart_data}
              />
            );
          }

          case 'stat-comparison':
          case 'comparison': {
            // Support both flat 'players' and nested 'data.players' structures
            const players = item.players || (data && data.players) || (item.data && item.data.players);

            return collapsible ? (
              <CollapsibleSection key={index} title={title || "Comparison"} icon={Users}>
                <ComparisonCard
                  players={players}
                  comparison_metrics={item.comparison_metrics || data?.statKeys}
                  chart_data={item.chart_data}
                  winner_analysis={item.winner_analysis}
                  title={title || "Comparison"}
                  collapsible={false}
                  key_insight={item.key_insight}
                />
              </CollapsibleSection>
            ) : (
              <ComparisonCard
                key={index}
                players={players}
                comparison_metrics={item.comparison_metrics || data?.statKeys}
                chart_data={item.chart_data}
                winner_analysis={item.winner_analysis}
                title={title || "Comparison"}
                collapsible={false}
                key_insight={item.key_insight}
              />
            );
          }

          case 'trend':
            return collapsible ? (
              <CollapsibleSection key={index} title={title} icon={TrendingUp}>
                <TrendCard
                  metric_name={item.metric_name}
                  time_period={item.time_period}
                  trend_data={item.trend_data}
                  chart_type={item.chart_type}
                  prediction={item.prediction}
                  title={title}
                  collapsible={false}
                />
              </CollapsibleSection>
            ) : (
              <TrendCard
                key={index}
                metric_name={item.metric_name}
                time_period={item.time_period}
                trend_data={item.trend_data}
                chart_type={item.chart_type}
                prediction={item.prediction}
                title={title}
                collapsible={false}
              />
            );

          case 'match':
            return collapsible ? (
              <CollapsibleSection key={index} title={title} icon={Trophy}>
                <MatchCard
                  id={item.id}
                  league={item.league}
                  season={item.season}
                  round={item.round}
                  date={item.date}
                  time={item.time}
                  homeTeam={item.homeTeam}
                  awayTeam={item.awayTeam}
                  state={item.state}
                  venue={item.venue}
                  week={item.week}
                  meta={item.meta}
                  title={title}
                  collapsible={false}
                />
              </CollapsibleSection>
            ) : (
              <MatchCard
                key={index}
                id={item.id}
                league={item.league}
                season={item.season}
                round={item.round}
                date={item.date}
                time={item.time}
                homeTeam={item.homeTeam}
                awayTeam={item.awayTeam}
                state={item.state}
                venue={item.venue}
                week={item.week}
                meta={item.meta}
                title={title}
                collapsible={false}
              />
            );

          case 'text':
            // Text content removed - showing only visual cards
            return null;

          // Legacy support for existing types
          case 'scores':
            return collapsible ? (
              <CollapsibleSection key={index} title={title} icon={Trophy}>
                <ScoresCard matches={data} />
              </CollapsibleSection>
            ) : (
              <ScoresCard key={index} matches={data} />
            );

          case 'stats':
            return collapsible ? (
              <CollapsibleSection key={index} title={title} icon={BarChart3}>
                <StatisticsCard statistics={data} title={title} />
              </CollapsibleSection>
            ) : (
              <StatisticsCard key={index} statistics={data} title={title} />
            );

          case 'videos':
            // Restore bordered section container for generic videos
            return (
              <CollapsibleSection key={index} title={title} icon={PlayCircle}>
                <VideoCarousel videos={data} loading="lazy" />
              </CollapsibleSection>
            );

          case 'images':
            return collapsible ? (
              <CollapsibleSection key={index} title={title} icon={Image}>
                <ImageGallery images={data} loading="lazy" />
              </CollapsibleSection>
            ) : (
              <ImageGallery key={index} images={data} loading="lazy" />
            );

          default:
            return (
              <div key={index} className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <h3 className="text-white font-medium mb-3">{title}</h3>
                <pre className="text-gray-300 text-sm overflow-x-auto">
                  {JSON.stringify(data || item, null, 2)}
                </pre>
              </div>
            );
        }
      })}
    </div>
  );
};

export default StructuredContentRenderer;
