import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { formatChatText } from '@/utils/formatTextContent';
import { Send, Mic, Paperclip, Image, MapPin, Play, PlayCircle, ExternalLink, FileText, BarChart3, User } from 'lucide-react';
import { Button } from './ui/button';
import { parseMessageContent, extractMediaCounts } from '../utils/dataParser';
import StructuredContentRenderer from './StructuredContentRenderer';
import VideoGallery from './VideoGallery';

// Global media tab state to persist across messages
let globalMediaTab = 'All';

const PerplexityStyleMessage = ({ message, isUser, isTyping = false }) => {
  const [activeTab, setActiveTab] = useState('response');
  const [activeMediaTab, setActiveMediaTab] = useState(globalMediaTab);

  // Update global state when media tab changes
  const handleMediaTabChange = (tab) => {
    try { console.log('[AUDIT][TAB_CLICK]', tab); } catch { }
    setActiveMediaTab(tab);
    globalMediaTab = tab;
    try {
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('mediaTabChange', { detail: { tab } }));
      }
    } catch { }
  };

  useEffect(() => {
    try { console.log('[AUDIT][TAB_STATE]', activeMediaTab); } catch { }
  }, [activeMediaTab]);

  // Listen for global media tab changes so assistant messages react to header clicks
  useEffect(() => {
    const onMediaTabChange = (e) => {
      const tab = e?.detail?.tab;
      if (tab) {
        setActiveMediaTab(tab);
      }
    };
    try { window.addEventListener('mediaTabChange', onMediaTabChange); } catch { }
    return () => { try { window.removeEventListener('mediaTabChange', onMediaTabChange); } catch { } };
  }, []);

  if (isUser) {
    // User query as title header
    return (
      <div className="mb-12">
        <h2 className="text-3xl font-light text-white leading-tight mb-8 tracking-tight">
          {message.content}
        </h2>

        {/* Media Tabs - Horizontal filter under query title */}
        <div className="flex space-x-1 border-b border-[#1a1a1a] mb-8 overflow-x-auto pb-1">
          {["All", "Videos", "Images", "Stats", "Players"].map(tab => (
            <button
              key={tab}
              onClick={() => handleMediaTabChange(tab)}
              className={`pb-2 px-4 text-xs font-medium tracking-wider uppercase whitespace-nowrap transition-colors ${activeMediaTab === tab
                ? "text-white border-b border-white"
                : "text-gray-600 hover:text-gray-400"
                }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (isTyping) {
    return (
      <div className="mb-12">
        <div className="flex space-x-3 items-center text-gray-600 text-xs uppercase tracking-wider mb-4">
          <div className="w-5 h-5 border border-white flex items-center justify-center text-white text-[10px] font-medium">
            AI
          </div>
          {(() => { try { console.log('[AUDIT][AI_LABEL]', 'role=assistant', 'label=AI (typing)'); } catch { } return null })()}
          <span>Processing...</span>
        </div>
        <div className="flex space-x-1.5">
          <div className="w-1 h-1 bg-white rounded-full animate-bounce"></div>
          <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
    );
  }

  // Parse the message content into structured data
  const parsedContent = React.useMemo(() => parseMessageContent(message), [message]);
  const { text, contentItems, hasStructuredContent } = parsedContent;

  // [AUDIT][TEXT_PARSER] Log final text payload before rendering
  try {
    const hasFourStars = /\*{4,}/.test(text || '');
    // eslint-disable-next-line no-console
    console.log('[AUDIT][TEXT_PARSER] final_text_before_render', { hasFourStars, length: (text || '').length });
  } catch { }
  // [AUDIT][TEXT_POSTPROC] Verify markdown artifacts removed
  try {
    // eslint-disable-next-line no-console
    console.log('[AUDIT][TEXT_POSTPROC]', (text || '').slice(0, 200));
  } catch { }

  // Extract media counts for tabs
  const mediaCounts = React.useMemo(() => extractMediaCounts(contentItems), [contentItems]);

  // Prioritize highlights at the top of the response view
  const highlightItems = React.useMemo(() => (contentItems || []).filter((i) => i.type === 'highlight_video'), [contentItems]);
  const hasHighlights = highlightItems.length > 0;
  // Remaining items after removing highlights
  const remainingItems = React.useMemo(() => (contentItems || []).filter((i) => i.type !== 'highlight_video'), [contentItems]);
  try {
    // eslint-disable-next-line no-console
    console.log('[AUDIT][LAYOUT] Highlights prioritized: videos rendered before summary and stats');
  } catch { }

  // Aggregate videos for the VideoGallery (used when activeMediaTab === 'Videos')
  const aggregatedVideos = React.useMemo(() => {
    const all = [];
    (contentItems || []).forEach((item) => {
      if (item && (item.type === 'highlight_video' || item.type === 'videos')) {
        const arr = item.items || item.data || [];
        if (Array.isArray(arr)) all.push(...arr);
      }
    });
    // Optional ordering similar to VideosTab
    const toTimestamp = (v) => {
      const d = v?.date || v?.publishedAt || v?.timestamp || v?.match?.date;
      const t = d ? new Date(d).getTime() : NaN;
      return Number.isFinite(t) ? t : -1;
    };
    const hasDates = all.some((v) => toTimestamp(v) > 0);
    return hasDates ? all.slice().sort((a, b) => toTimestamp(b) - toTimestamp(a)) : all;
  }, [contentItems]);

  return (
    <div className="mb-16">
      {/* AI Avatar and Header (hidden above highlights) */}
      {!hasHighlights && (
        <div className="flex space-x-3 items-center text-gray-600 text-xs uppercase tracking-wider mb-6">
          <div className="w-5 h-5 border border-white flex items-center justify-center text-white text-[10px] font-medium">
            AI
          </div>
          {(() => { try { console.log('[AUDIT][AI_LABEL]', message?.role || 'assistant', 'label=AI (header)'); } catch { } return null })()}
          {/* Removed label to avoid "AI Answer" above highlights */}
          {message.source && (
            <span className="text-gray-600">• {message.source}</span>
          )}
        </div>
      )}

      {/* 1) Highlights first (if present) - only on All tab */}
      {activeMediaTab === 'All' && hasHighlights && (
        <div className="mb-6">
          <StructuredContentRenderer contentItems={highlightItems} activeMediaTab={'All'} />
        </div>
      )}

      {/* AI Narrative removed - showing only visual cards */}

      {/* Summary paragraph removed - showing only visual cards */}

      {/* Structured Content or Tabs */}
      {hasStructuredContent ? (
        <div className="border border-[#1a1a1a] overflow-hidden">
          {/* Tab Headers */}
          <div className="flex bg-[#111111] border-b border-[#1a1a1a]">
            <button
              onClick={() => setActiveTab('response')}
              className={`px-5 py-3 text-xs font-medium tracking-wider uppercase transition-colors ${activeTab === 'response'
                ? 'text-white border-b border-white bg-[#0a0a0a]'
                : 'text-gray-600 hover:text-white hover:bg-[#111111]'
                }`}
            >
              <FileText className="w-4 h-4 inline mr-2" />
              Data
            </button>

            {mediaCounts.images > 0 && (
              <button
                onClick={() => setActiveTab('images')}
                className={`px-5 py-3 text-xs font-medium tracking-wider uppercase transition-colors ${activeTab === 'images'
                  ? 'text-white border-b border-white bg-[#0a0a0a]'
                  : 'text-gray-600 hover:text-white hover:bg-[#111111]'
                  }`}
              >
                <Image className="w-3.5 h-3.5 inline mr-2" />
                Images ({mediaCounts.images})
              </button>
            )}

            {mediaCounts.videos > 0 && (
              <button
                onClick={() => setActiveTab('videos')}
                className={`px-5 py-3 text-xs font-medium tracking-wider uppercase transition-colors ${activeTab === 'videos'
                  ? 'text-white border-b border-white bg-[#0a0a0a]'
                  : 'text-gray-600 hover:text-white hover:bg-[#111111]'
                  }`}
              >
                <Play className="w-3.5 h-3.5 inline mr-2" />
                Videos ({mediaCounts.videos})
              </button>
            )}

            {mediaCounts.sources > 0 && (
              <button
                onClick={() => setActiveTab('sources')}
                className={`px-5 py-3 text-xs font-medium tracking-wider uppercase transition-colors ${activeTab === 'sources'
                  ? 'text-white border-b border-white bg-[#0a0a0a]'
                  : 'text-gray-600 hover:text-white hover:bg-[#111111]'
                  }`}
              >
                <ExternalLink className="w-3.5 h-3.5 inline mr-2" />
                Sources ({mediaCounts.sources})
              </button>
            )}
          </div>

          {/* Tab Content */}
          <div className="p-8 bg-[#0a0a0a]">
            {activeTab === 'response' && (
              activeMediaTab === 'Videos' ? (
                <VideoGallery videos={aggregatedVideos} />
              ) : (
                <StructuredContentRenderer
                  contentItems={remainingItems}
                  activeMediaTab={activeMediaTab}
                />
              )
            )}

            {activeTab === 'images' && (
              <ImagesTab contentItems={contentItems.filter(item => ['images', 'image_gallery'].includes(item.type))} />
            )}

            {activeTab === 'videos' && (
              <VideosTab contentItems={contentItems.filter(item => ['videos', 'highlight_video'].includes(item.type))} />
            )}

            {activeTab === 'sources' && (
              <SourcesTab message={message} contentItems={contentItems} />
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

const ImagesTab = ({ contentItems }) => {
  const allImages = [];

  try {
    // eslint-disable-next-line no-console
    console.log('[AUDIT][TABS] ImagesTab types=', (contentItems || []).map(ci => ci?.type));
  } catch { }

  contentItems.forEach(item => {
    if ((item.type === 'images' || item.type === 'image_gallery')) {
      const arr = item.items || item.data || [];
      if (Array.isArray(arr)) allImages.push(...arr);
    }
  });

  if (allImages.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8">
        <Image className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No images available</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {allImages.map((image, index) => (
        <div key={index} className="group cursor-pointer">
          <div className="aspect-square bg-gray-800 rounded-lg overflow-hidden border border-gray-700 hover:border-sky-500 transition-colors">
            <img
              src={image.url}
              alt={image.title || `Image ${index + 1}`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
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
  );
};

const VideosTab = ({ contentItems }) => {
  const allVideos = [];

  try {
    // eslint-disable-next-line no-console
    console.log('[AUDIT][TABS] VideosTab types=', (contentItems || []).map(ci => ci?.type));
  } catch { }

  contentItems.forEach(item => {
    if (item.type === 'videos' || item.type === 'highlight_video') {
      const arr = item.items || item.data || [];
      if (Array.isArray(arr)) allVideos.push(...arr);
    }
  });

  if (allVideos.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8">
        <Play className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No videos available</p>
      </div>
    );
  }

  // Order so newest/relevant appear first
  const toTimestamp = (v) => {
    const d = v?.date || v?.publishedAt || v?.timestamp || v?.match?.date;
    const t = d ? new Date(d).getTime() : NaN;
    return Number.isFinite(t) ? t : -1;
  };
  const hasDates = allVideos.some((v) => toTimestamp(v) > 0);
  const ordered = allVideos
    .slice()
    .sort((a, b) => {
      if (!hasDates) return 0; // keep original order if no dates
      return toTimestamp(b) - toTimestamp(a);
    });
  // If no dates, preserve backend order (no reverse)
  const finalVideos = hasDates ? ordered : allVideos;
  try {
    // eslint-disable-next-line no-console
    console.log('[AUDIT][HIGHLIGHTS_ORDER][FE_RENDER][VideosTab]', (finalVideos || []).map(v => v?.title));
  } catch { }
  try {
    // eslint-disable-next-line no-console
    console.log('[AUDIT][VIDEOS_TAB] Reversed order applied. First item:', allVideos.at(-1)?.title);
  } catch { }

  return (
    <div className="space-y-4">
      {finalVideos.map((video, index) => (
        <div key={index} className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-sky-500 transition-colors">
          <div className="flex space-x-4">
            <div className="flex-shrink-0">
              <div className="w-32 h-20 bg-gray-700 rounded-lg flex items-center justify-center relative overflow-hidden">
                {video.thumbnail ? (
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Play className="w-8 h-8 text-gray-400" />
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                  <Play className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-medium text-sm mb-1 line-clamp-2">
                {video.title || `Video ${index + 1}`}
              </h3>
              <p className="text-gray-400 text-xs mb-2 line-clamp-2">
                {video.description || 'Sports highlight video'}
              </p>
              <div className="flex items-center space-x-3 text-xs text-gray-500">
                {video.duration && (
                  <span>{video.duration}</span>
                )}
                {video.source && (
                  <span>• {video.source}</span>
                )}
                <a
                  href={video.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-400 hover:text-sky-300 flex items-center"
                >
                  Watch <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const SourcesTab = ({ message, contentItems }) => {
  // Use sources from the API response
  const apiSources = message.sources || [];
  const dataInfo = message.data_info || {};

  // Build source list from actual API data
  const sources = [];

  // Add sources from API response
  if (apiSources.includes('ESPN Standings API')) {
    sources.push({
      title: 'ESPN Standings API',
      description: 'Live NBA/NFL/MLB/NHL standings data',
      url: 'https://www.espn.com/nba/standings',
      domain: 'espn.com',
      verified: true
    });
  }

  if (apiSources.includes('ESPN') || apiSources.includes('ESPN Live') || apiSources.some(s => s.includes('ESPN'))) {
    sources.push({
      title: 'ESPN Scoreboard API',
      description: `Live game scores and stats (${dataInfo.espn_games || 0} games fetched)`,
      url: 'https://www.espn.com/nfl/scoreboard',
      domain: 'espn.com',
      verified: true
    });
  }

  if (apiSources.includes('Google News RSS')) {
    sources.push({
      title: 'Google News',
      description: `Latest sports news (${dataInfo.news_articles || 0} articles)`,
      url: 'https://news.google.com',
      domain: 'news.google.com',
      verified: true
    });
  }

  // Add generic AI source if Gemini was used
  if (sources.length > 0) {
    sources.push({
      title: 'Gemini 2.0 Flash',
      description: 'AI-powered structured content generation',
      url: '#',
      domain: 'Google AI',
      verified: false
    });
  }

  // Add data info timestamp
  const fetchedAt = dataInfo.fetched_at ? new Date(dataInfo.fetched_at).toLocaleString() : null;

  return (
    <div className="space-y-4">
      {/* Data verification status */}
      {fetchedAt && (
        <div className="bg-emerald-900/30 border border-emerald-500/30 rounded-lg p-3">
          <div className="flex items-center gap-2 text-emerald-400 text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="font-medium">Data Verified</span>
          </div>
          <p className="text-gray-400 text-xs mt-1">Last updated: {fetchedAt}</p>
        </div>
      )}

      {/* Source list */}
      <div className="space-y-3">
        {sources.map((source, index) => (
          <div key={index} className="border border-gray-700 rounded-lg p-4 hover:border-sky-500 transition-colors">
            <div className="flex items-start space-x-3">
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${source.verified ? 'bg-emerald-900/50 text-emerald-400' : 'bg-gray-700 text-gray-300'}`}>
                {source.verified ? '✓' : index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-white font-medium text-sm">
                    {source.title}
                  </h3>
                  {source.verified && (
                    <span className="bg-emerald-600/20 text-emerald-400 text-xs px-2 py-0.5 rounded-full">
                      Verified
                    </span>
                  )}
                </div>
                <p className="text-gray-400 text-xs mb-2 line-clamp-2">
                  {source.description}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-xs">
                    {source.domain}
                  </span>
                  {source.url !== '#' && (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-400 hover:text-sky-300 text-xs flex items-center"
                    >
                      Visit <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {sources.length === 0 && (
          <div className="text-gray-500 text-sm text-center py-4">
            No data sources available for this response.
          </div>
        )}
      </div>
    </div>
  );
};

export default PerplexityStyleMessage;
