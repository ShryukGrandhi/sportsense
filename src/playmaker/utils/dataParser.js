/**
 * Data parsing utilities for sports content
 * Converts ChatAnswer API responses into structured content types for rendering
 */

import { cleanPerplexityText, cleanMarkdownArtifacts } from './textCleaner';

export const parseMessageContent = (message) => {
  // Check for new ChatAnswer format in sports_context.chat_answer
  if (message.sports_context?.chat_answer) {
    const parsed = parseChatAnswer(message.sports_context.chat_answer);
    // [AUDIT][TEXT_PARSER] ensure final text is cleaned
    if (typeof window !== 'undefined') {
      try {
        const hasStars = /\*{4,}/.test(parsed.text || '');
        // eslint-disable-next-line no-console
        console.log('[AUDIT][TEXT_PARSER] chat_answer.text cleaned', { hasStars, length: (parsed.text || '').length });
        // eslint-disable-next-line no-console
        console.log('[AUDIT][FE_PARSE] card_types', (message.sports_context?.chat_answer?.cards || []).map(c => c?.type));
      } catch { }
    }
    return parsed;
  }

  // NEW: Handle structured_content array from chat messages API (Next.js backend)
  if (message.structured_content && Array.isArray(message.structured_content) && message.structured_content.length > 0) {
    const parsed = parseChatAnswer({
      text: message.content || '',
      cards: message.structured_content
    });
    if (typeof window !== 'undefined') {
      try {
        // eslint-disable-next-line no-console
        console.log('[AUDIT][STRUCTURED_CONTENT] parsed', message.structured_content.length, 'cards');
      } catch { }
    }
    return parsed;
  }

  // Fallback to legacy parsing for backward compatibility
  if (!message || !message.context) {
    return {
      text: '', // Removed text content - showing only visual cards
      contentItems: [],
      hasStructuredContent: false
    };
  }

  const context = message.context;
  const highlightlyData = context.highlightly_data;
  const sportradarData = context.sportradar_data;

  const contentItems = [];

  // Parse Highlightly data with enhanced card type detection
  if (highlightlyData && !highlightlyData.error && highlightlyData.data) {
    const highlightlyItems = parseHighlightlyData(highlightlyData.data);
    contentItems.push(...highlightlyItems);
  }

  // Parse Sportradar data with enhanced card type detection
  if (sportradarData && !sportradarData.error && sportradarData.data) {
    const sportradarItems = parseSportradarData(sportradarData.data);
    contentItems.push(...sportradarItems);
  }

  // Filter out text type items - only visual cards
  const visualItems = contentItems.filter(item => item.type !== 'text');

  return {
    text: cleanMarkdownArtifacts(cleanPerplexityText(message?.content || '')),
    contentItems: visualItems,
    hasStructuredContent: visualItems.length > 0
  };
};

// NEW: Parse ChatAnswer format from backend
export const parseChatAnswer = (chatAnswer) => {
  if (!chatAnswer || !chatAnswer.cards) {
    return {
      text: cleanMarkdownArtifacts(cleanPerplexityText(chatAnswer?.text || '')),
      contentItems: [],
      hasStructuredContent: false
    };
  }

  const contentItems = chatAnswer.cards.map(card => {
    switch (card.type) {
      case 'top_player': {
        const teams = Array.isArray(card.teams) ? card.teams : [];
        const mirrored = teams.map(t => ({
          ...t,
          topPlayers: Array.isArray(t.topPlayers)
            ? t.topPlayers
            : (t.player ? [t.player] : [])
        }));
        if (typeof window !== 'undefined') {
          // eslint-disable-next-line no-console
          console.groupCollapsed('[AUDIT][TOP] parse top_player');
          // eslint-disable-next-line no-console
          console.log('raw teams:', teams);
          // eslint-disable-next-line no-console
          console.log('mirrored topPlayers:', mirrored.map(x => x.topPlayers));
          // eslint-disable-next-line no-console
          console.groupEnd();
        }
        return {
          type: 'top_player',
          title: card.title || 'Top Players',
          teams: mirrored,
          meta: card.meta || {},
          collapsible: true
        };
      }
      case 'top_player':
        return {
          type: 'top_player',
          title: card.title || 'Top Players',
          teams: card.teams || [],
          meta: card.meta || {},
          collapsible: true
        };
      case 'scorecard':
        return {
          type: 'scorecard',
          title: card.title || 'Scores',
          teams: card.teams || [],
          meta: card.meta || {},
          collapsible: true
        };

      case 'statistics':
        return {
          type: 'statistics',
          title: card.title || 'Statistics',
          headers: card.headers || [],
          rows: card.rows || [],
          collapsible: true
        };

      case 'highlight_video':
        try {
          const first5 = (card.items || []).slice(0, 5).map(v => (v && (v.title || v.name)) || '');
          // eslint-disable-next-line no-console
          console.log('[AUDIT][HIGHLIGHTS_ORDER][fe] card_title=', card.title || 'Highlights', 'first5=', first5);
        } catch (e) { }
        return {
          type: 'highlight_video',
          title: card.title || 'Highlights',
          items: card.items || [],
          collapsible: true
        };

      case 'image_gallery':
        return {
          type: 'image_gallery',
          title: card.title || 'Images',
          items: card.items || [],
          collapsible: true
        };

      case 'player':
        return {
          type: 'player',
          title: card.title || 'Player Profile',
          // Roster-style support (Team Roster): items array
          items: Array.isArray(card.items) ? card.items : undefined,
          // Single player profile support
          player_name: card.player_name,
          team: card.team,
          position: card.position,
          stats: card.stats || {},
          image_url: card.image_url,
          season_stats: card.season_stats || {},
          performance_chart: card.performance_chart,
          impact_score: card.impact_score,
          radar_chart_data: card.radar_chart_data || [],
          collapsible: true
        };

      case 'comparison':
        return {
          type: 'comparison',
          title: card.title || 'Player Comparison',
          players: card.players || [],
          comparison_metrics: card.comparison_metrics || [],
          chart_data: card.chart_data || null,
          winner_analysis: card.winner_analysis || {},
          collapsible: true
        };

      case 'trend':
        return {
          type: 'trend',
          title: card.title || 'Performance Trend',
          metric_name: card.metric_name,
          time_period: card.time_period,
          trend_data: card.trend_data || [],
          chart_type: card.chart_type || 'line',
          prediction: card.prediction,
          collapsible: true
        };

      case 'stat-comparison':
        return {
          type: 'stat-comparison',
          title: card.title || 'Player Comparison',
          players: card.data?.players || [],
          comparison_metrics: card.data?.statKeys || [],
          collapsible: true
        };

      case 'match':
        return {
          type: 'match',
          id: card.id,
          league: card.league,
          season: card.season,
          round: card.round,
          date: card.date,
          homeTeam: card.homeTeam,
          awayTeam: card.awayTeam,
          state: card.state,
          time: card.time,
          venue: card.venue,
          week: card.week,
          meta: card.meta || {},
          collapsible: true
        };

      case 'text':
        return {
          type: 'text',
          content: card.content || '',
          collapsible: false
        };

      default:
        return {
          type: 'text',
          content: JSON.stringify(card),
          collapsible: false
        };
    }
  });

  try {
    const hv = (contentItems || []).filter(ci => ci?.type === 'highlight_video');
    // eslint-disable-next-line no-console
    console.log('[AUDIT][PARSE_CHATANSWER]', hv);
  } catch { }

  // Filter out all text type items and invalid cards
  const visualItems = contentItems
    .filter(item => item && item.type !== 'text')
    // Filter out empty scorecards
    .filter(item => {
      if (item.type === 'scorecard') {
        return item.teams && item.teams.length > 0;
      }
      if (item.type === 'scores') {
        return item.data && item.data.length > 0;
      }
      return true;
    });

  return {
    text: cleanMarkdownArtifacts(cleanPerplexityText(chatAnswer?.text || message?.content || '')),
    contentItems: visualItems,
    hasStructuredContent: visualItems.length > 0
  };
};

// Enhanced Highlightly data parsing with improved card type detection
export const parseHighlightlyData = (data) => {
  const contentItems = [];

  if (!data) return contentItems;

  try {
    if (Array.isArray(data)) {
      // Multiple items - detect content type based on data structure
      data.forEach((item, index) => {
        const parsedItem = parseHighlightlyItem(item, index);
        if (parsedItem) contentItems.push(parsedItem);
      });
    } else if (typeof data === 'object') {
      // Single item
      const parsedItem = parseHighlightlyItem(data, 0);
      if (parsedItem) contentItems.push(parsedItem);
    }
  } catch (error) {
    console.warn('Error parsing Highlightly data:', error);
    // Safe fallback - return as text card
    return [{
      type: 'text',
      content: JSON.stringify(data, null, 2),
      collapsible: false
    }];
  }

  return contentItems;
};

// Helper function to parse individual Highlightly items
const parseHighlightlyItem = (item, index) => {
  if (!item || typeof item !== 'object') return null;

  // Check for match/game data → scorecard
  if (item.home || item.homeTeam || item.away || item.awayTeam || item.score) {
    return {
      type: 'scorecard',
      title: `Match ${index + 1}`,
      teams: [
        {
          name: (item.home || item.homeTeam)?.name || 'Home',
          score: item.home_score || item.homeScore || 0,
          logo: (item.home || item.homeTeam)?.logo
        },
        {
          name: (item.away || item.awayTeam)?.name || 'Away',
          score: item.away_score || item.awayScore || 0,
          logo: (item.away || item.awayTeam)?.logo
        }
      ],
      meta: {
        date: item.date,
        status: item.status || item.state?.description,
        venue: item.venue?.name || item.venue,
        league: item.league?.name || item.competition?.name
      },
      collapsible: true
    };
  }

  // Check for player data → player profile
  if (item.name && (item.position || item.team || item.statistics || item.stats)) {
    return {
      type: 'player',
      title: `${item.name} Profile`,
      player_name: item.name,
      team: item.team?.name || item.team,
      position: item.position,
      stats: item.statistics || item.stats || {},
      image_url: item.photo || item.image || item.logo,
      collapsible: true
    };
  }

  // Check for video/highlights → highlight_video
  if (item.video || item.highlights || item.clips || (item.type && item.type.includes('video'))) {
    const videoItems = [];

    // Handle various video data structures
    if (item.video) {
      if (Array.isArray(item.video)) {
        videoItems.push(...item.video);
      } else {
        videoItems.push(item.video);
      }
    }

    if (item.highlights) {
      if (Array.isArray(item.highlights)) {
        videoItems.push(...item.highlights);
      } else {
        videoItems.push(item.highlights);
      }
    }

    return {
      type: 'highlight_video',
      title: item.title || `Highlights ${index + 1}`,
      items: videoItems.map(video => ({
        url: video.url || video.link || video.src,
        title: video.title || video.name,
        thumbnail: video.thumbnail || video.preview,
        duration: video.duration
      })),
      collapsible: true
    };
  }

  // Check for images/logos → image_gallery
  if (item.images || item.photos || item.logo || (item.type && item.type.includes('image'))) {
    const imageItems = [];

    // Handle various image data structures
    if (item.images) {
      if (Array.isArray(item.images)) {
        imageItems.push(...item.images);
      } else {
        imageItems.push(item.images);
      }
    }

    if (item.photos) {
      if (Array.isArray(item.photos)) {
        imageItems.push(...item.photos);
      } else {
        imageItems.push(item.photos);
      }
    }

    if (item.logo) {
      imageItems.push({ url: item.logo, title: 'Team Logo' });
    }

    if (imageItems.length > 0) {
      return {
        type: 'image_gallery',
        title: item.title || `Images ${index + 1}`,
        items: imageItems.map(img => ({
          url: typeof img === 'string' ? img : (img.url || img.src),
          title: typeof img === 'object' ? (img.title || img.name) : '',
          alt: typeof img === 'object' ? img.alt : ''
        })),
        collapsible: true
      };
    }
  }

  // Check for odds/betting → statistics
  if (item.odds || item.betting || item.moneyline || item.spread) {
    return {
      type: 'statistics',
      title: 'Betting Odds',
      headers: ['Type', 'Home', 'Away'],
      rows: [
        ['Moneyline', item.odds?.home || item.moneyline?.home || '-', item.odds?.away || item.moneyline?.away || '-'],
        ['Spread', item.spread?.home || '-', item.spread?.away || '-'],
        ['Total', item.total || '-', '-']
      ].filter(row => row[1] !== '-' || row[2] !== '-'),
      collapsible: true
    };
  }

  // Check for statistics/rankings → statistics
  if (item.statistics || item.stats || item.rankings || item.standings) {
    const statsData = item.statistics || item.stats || item.rankings || item.standings;

    if (Array.isArray(statsData)) {
      return {
        type: 'statistics',
        title: item.title || 'Statistics',
        headers: ['Rank', 'Team/Player', 'Points', 'Record'],
        rows: statsData.slice(0, 10).map((stat, idx) => [
          idx + 1,
          stat.name || stat.team || stat.player || 'N/A',
          stat.points || stat.value || stat.score || '-',
          stat.record || stat.wins + '-' + stat.losses || '-'
        ]),
        collapsible: true
      };
    }
  }

  // Fallback - if we can't classify it, return as text
  return {
    type: 'text',
    content: JSON.stringify(item, null, 2),
    collapsible: false
  };
};

export const parseSportradarData = (data) => {
  const items = [];

  if (!data) return items;

  // Handle different Sportradar data types
  if (typeof data === 'object') {
    // Game/match data
    if (data.games || data.matches) {
      const games = data.games || data.matches;
      items.push({
        type: 'scores',
        title: 'Game Results',
        data: games.map(game => ({
          id: game.id,
          homeTeam: { name: game.home?.name || game.home_team },
          awayTeam: { name: game.away?.name || game.away_team },
          score: { current: `${game.home_points || 0} - ${game.away_points || 0}` },
          status: game.status,
          date: game.scheduled || game.date
        })),
        collapsible: true
      });
    }

    // Player statistics
    if (data.player || data.statistics) {
      items.push({
        type: 'stats',
        title: 'Player Statistics',
        data: data.statistics || data.player?.statistics || [],
        collapsible: true
      });
    }

    // League standings
    if (data.standings) {
      items.push({
        type: 'table',
        title: 'League Standings',
        data: data.standings,
        collapsible: true
      });
    }
  }

  return items;
};

// Content type classification for rendering decisions
export const getContentType = (contentItem) => {
  switch (contentItem.type) {
    case 'scores':
      return 'card'; // Render as ScoresCard
    case 'stats':
      return 'table'; // Render as StatisticsCard  
    case 'player':
      return 'profile'; // Render as PlayerCard
    case 'videos':
      return 'carousel'; // Render as video carousel
    case 'images':
      return 'gallery'; // Render as image gallery
    case 'table':
      return 'table'; // Render as data table
    default:
      return 'text'; // Render as plain text
  }
};

// Check if content should be rendered with structured components
export const shouldRenderAsStructured = (message) => {
  const parsed = parseMessageContent(message);
  return parsed.hasStructuredContent;
};

// Extract media URLs for tab counting
export const extractMediaCounts = (contentItems) => {
  const counts = {
    images: 0,
    videos: 0,
    sources: 0
  };

  contentItems.forEach(item => {
    if (item.type === 'images' || item.type === 'image_gallery') {
      const arr = item.items || item.data || [];
      counts.images += Array.isArray(arr) ? arr.length : 0;
    }
    if (item.type === 'videos' || item.type === 'highlight_video') {
      const arr = item.items || item.data || [];
      counts.videos += Array.isArray(arr) ? arr.length : 0;
    }
    // Count sources from all items
    counts.sources += 1;
  });

  return counts;
};
