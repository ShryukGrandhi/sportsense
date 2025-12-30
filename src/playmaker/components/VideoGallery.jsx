import React from 'react';

const VideoGallery = ({ videos = [] }) => {
  if (!videos.length) {
    return (
      <div className="text-gray-400 text-sm p-6 text-center">
        No videos available.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
      {videos.map((video, idx) => (
        <div
          key={idx}
          className="bg-[#11121A] rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-all"
        >
          <img
            src={video.thumbnail || video.image || ''}
            alt={video.title || 'Video'}
            className="w-full h-48 object-cover"
          />
          <div className="p-3">
            <h3 className="text-sm font-semibold text-white truncate">
              {video.title || 'Untitled'}
            </h3>
            <p className="text-xs text-gray-400 mb-1">
              {video.source || 'Source unavailable'}
            </p>
            {video.url && (
              <a
                href={video.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 text-xs hover:underline"
              >
                Watch ▶
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default VideoGallery;
