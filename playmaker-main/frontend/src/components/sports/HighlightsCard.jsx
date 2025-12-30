import React, { useState } from 'react';
import { Play, ExternalLink, Calendar, Youtube } from 'lucide-react';
import SportsCard from './SportsCard';

const VideoModal = ({ highlight, isOpen, onClose }) => {
  if (!isOpen || !highlight) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
          <h3 className="text-xl font-semibold text-white">{highlight.title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6">
          {highlight.embedUrl ? (
            <div className="aspect-video mb-4">
              <iframe
                src={highlight.embedUrl}
                className="w-full h-full rounded-lg"
                allowFullScreen
                title={highlight.title}
              />
            </div>
          ) : (
            <div className="aspect-video mb-4 bg-gray-800 rounded-lg flex items-center justify-center">
              <div className="text-center text-gray-400">
                <Play className="w-12 h-12 mx-auto mb-2" />
                <p>Video not available for embedding</p>
                {highlight.url && (
                  <a 
                    href={highlight.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sky-400 hover:text-sky-300 inline-flex items-center mt-2"
                  >
                    Watch on {highlight.source} <ExternalLink className="w-4 h-4 ml-1" />
                  </a>
                )}
              </div>
            </div>
          )}
          
          {highlight.description && (
            <div className="mb-4">
              <p className="text-gray-300">{highlight.description}</p>
            </div>
          )}
          
          <div className="flex flex-wrap gap-4 text-sm text-gray-400">
            {highlight.channel && (
              <span>Channel: {highlight.channel}</span>
            )}
            {highlight.source && (
              <span>Source: {highlight.source}</span>
            )}
            {highlight.type && (
              <span className={`px-2 py-1 rounded-full text-xs ${
                highlight.type === 'VERIFIED' 
                  ? 'bg-green-900 text-green-300' 
                  : 'bg-yellow-900 text-yellow-300'
              }`}>
                {highlight.type}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const HighlightItem = ({ highlight, onClick }) => {
  return (
    <div className="flex flex-col min-w-[280px] sm:min-w-[320px] gap-2">
      <p className="text-sm text-gray-300 truncate px-1">
        {highlight.title || highlight.matchup || 'Highlight'}
      </p>
      <div
        className="relative bg-gray-900 border border-gray-700 rounded-lg overflow-hidden hover:border-sky-500 transition-colors cursor-pointer aspect-video shadow-sm"
        onClick={onClick}
      >
        {highlight.imgUrl ? (
          <img
            src={highlight.imgUrl}
            alt={highlight.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.parentElement.innerHTML = `
                <div class=\"w-full h-full bg-gray-800 flex items-center justify-center\">\n                  <svg class=\"w-10 h-10\" fill=\"currentColor\" viewBox=\"0 0 24 24\">\n                    <path d=\"M8 5v14l11-7z\"/>\n                  </svg>\n                </div>\n              `;
            }}
          />
        ) : (
          <div className="w-full h-full bg-gray-800 flex items-center justify-center">
            <Play className="w-10 h-10 text-gray-400" />
          </div>
        )}
        <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
          <div className="bg-sky-500 rounded-full p-3">
            <Play className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>
    </div>
  );
};

const HighlightsCard = ({ highlights }) => {
  const [selectedHighlight, setSelectedHighlight] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!highlights || highlights.length === 0) {
    return null;
  }

  const openModal = (highlight) => {
    setSelectedHighlight(highlight);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedHighlight(null);
    setIsModalOpen(false);
  };

  // Order so most recent/most relevant appear first
  const toTimestamp = (h) => {
    const d = h?.date || h?.publishedAt || h?.timestamp || h?.match?.date;
    const t = d ? new Date(d).getTime() : NaN;
    return Number.isFinite(t) ? t : -1;
  };
  const hasDates = (highlights || []).some((h) => toTimestamp(h) > 0);
  const ordered = (highlights || [])
    .slice()
    .sort((a, b) => {
      if (!hasDates) return 0; // keep original if no dates
      return toTimestamp(b) - toTimestamp(a);
    });
  // If no dates, fallback to reversed original order
  // If no dates, preserve backend order (no reverse)
  const finalHighlights = hasDates ? ordered : (highlights || []);
  try {
    // eslint-disable-next-line no-console
    console.log('[AUDIT][HIGHLIGHTS_ORDER][FE_RENDER][HighlightsCard]', (finalHighlights || []).map(h => h?.title));
  } catch {}
  try {
    // Audit log for verification
    // eslint-disable-next-line no-console
    console.log('[AUDIT][HIGHLIGHTS] Reversed order applied. First item:', highlights?.at(-1)?.title);
  } catch {}

  return (
    <>
      <SportsCard title="Highlights" icon={Play} collapsible defaultExpanded>
        <div className="flex flex-row gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory">
          {finalHighlights.map((highlight, index) => (
            <HighlightItem
              key={highlight.id || highlight.url || index}
              highlight={highlight}
              onClick={() => openModal(highlight)}
            />
          ))}
        </div>
      </SportsCard>

      <VideoModal
        highlight={selectedHighlight}
        isOpen={isModalOpen}
        onClose={closeModal}
      />
    </>
  );
};

export default HighlightsCard;
