import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Image } from 'lucide-react';

const ImageGallery = ({ images, title = "Images", collapsible = true }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);

  if (!images || images.length === 0) {
    return null;
  }

  const ImageModal = ({ image, isOpen, onClose }) => {
    if (!isOpen || !image) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
        <div className="relative max-w-4xl max-h-[90vh] w-full">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 bg-black bg-opacity-50 text-white rounded-full p-2 hover:bg-opacity-75 transition-colors z-10"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <img 
            src={image.url} 
            alt={image.title}
            className="w-full h-full object-contain rounded-lg"
          />
          
          {image.title && (
            <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-75 text-white p-4 rounded-lg">
              <h3 className="font-semibold">{image.title}</h3>
              {image.description && (
                <p className="text-gray-300 text-sm mt-1">{image.description}</p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 border border-green-500/30 rounded-xl overflow-hidden mb-4">
        {collapsible ? (
          <>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full flex items-center justify-between p-4 bg-green-800/30 hover:bg-green-800/40 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <Image className="w-5 h-5 text-green-400" />
                <h3 className="text-lg font-semibold text-white">{title}</h3>
                <span className="bg-green-600/50 text-green-200 text-xs px-2 py-1 rounded-full">
                  {images.length} images
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
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {images.map((image, index) => (
                    <div 
                      key={image.id || index}
                      className="group cursor-pointer"
                      onClick={() => setSelectedImage(image)}
                    >
                      <div className="aspect-square bg-gray-800 rounded-lg overflow-hidden border border-gray-700 hover:border-green-500 transition-colors">
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
              </div>
            )}
          </>
        ) : (
          <div className="p-4">
            <div className="flex items-center space-x-3 mb-4">
              <Image className="w-5 h-5 text-green-400" />
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              <span className="bg-green-600/50 text-green-200 text-xs px-2 py-1 rounded-full">
                {images.length} images
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {images.map((image, index) => (
                <div 
                  key={image.id || index}
                  className="group cursor-pointer"
                  onClick={() => setSelectedImage(image)}
                >
                  <div className="aspect-square bg-gray-800 rounded-lg overflow-hidden border border-gray-700 hover:border-green-500 transition-colors">
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
          </div>
        )}
      </div>

      <ImageModal
        image={selectedImage}
        isOpen={!!selectedImage}
        onClose={() => setSelectedImage(null)}
      />
    </>
  );
};

export default ImageGallery;