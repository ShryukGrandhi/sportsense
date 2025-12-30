'use client';

import React, { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Play, Image as ImageIcon, ExternalLink, FileText, BarChart3, User, ChevronDown, ChevronUp, PlayCircle, Trophy, TrendingUp } from 'lucide-react';
import { formatChatText } from '@/utils/formatTextContent';

// Collapsible Section Component
function CollapsibleSection({
    title,
    children,
    defaultExpanded = true,
    icon: Icon
}: {
    title: string;
    children: React.ReactNode;
    defaultExpanded?: boolean;
    icon?: React.ComponentType<{ className?: string }>;
}) {
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
}

// Video Carousel Component
function VideoCarousel({ videos }: { videos: VideoItem[] }) {
    const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);

    if (!videos || videos.length === 0) return null;

    return (
        <>
            <div className="flex flex-row gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory">
                {videos.map((video, index) => (
                    <div key={video.id || video.url || index} className="flex flex-col min-w-[300px] gap-2 snap-start">
                        <p className="text-sm text-gray-300 truncate px-1">
                            {video.title || 'Highlight'}
                        </p>
                        <div
                            className="relative aspect-video bg-gray-800 rounded-lg overflow-hidden border border-gray-700 hover:border-sky-500 transition-colors cursor-pointer shadow-sm"
                            onClick={() => setSelectedVideo(video)}
                        >
                            {video.thumbnail ? (
                                <img
                                    src={video.thumbnail}
                                    alt={video.title}
                                    className="w-full h-full object-cover"
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
                                onClick={() => setSelectedVideo(null)}
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
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

// Image Gallery Component
function ImageGallery({ images }: { images: ImageItem[] }) {
    const [selectedImage, setSelectedImage] = useState<ImageItem | null>(null);

    if (!images || images.length === 0) return null;

    return (
        <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {images.map((image, index) => (
                    <div
                        key={image.id || index}
                        className="group cursor-pointer"
                        onClick={() => setSelectedImage(image)}
                    >
                        <div className="aspect-square bg-gray-800 rounded-lg overflow-hidden border border-gray-700 hover:border-sky-500 transition-colors">
                            <img
                                src={image.url}
                                alt={image.title || `Image ${index + 1}`}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
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
                            onClick={() => setSelectedImage(null)}
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
                    </div>
                </div>
            )}
        </>
    );
}

// Type definitions
interface VideoItem {
    id?: string;
    url?: string;
    title?: string;
    thumbnail?: string;
    description?: string;
    source?: string;
    duration?: string;
}

interface ImageItem {
    id?: string;
    url: string;
    title?: string;
    description?: string;
}

interface TeamData {
    name: string;
    logo?: string;
    score?: number;
    stats?: Record<string, number>;
    topPlayers?: PlayerData[];
}

interface PlayerData {
    name: string;
    position?: string;
    team?: string;
    logo?: string;
    statistics?: { displayName: string; value: string | number }[];
    imageUrl?: string;
    impact_score?: number;
}

interface ContentItem {
    type: string;
    title?: string;
    data?: unknown;
    items?: unknown[];
    teams?: TeamData[];
    headers?: string[];
    rows?: (string | number)[][];
    meta?: Record<string, unknown>;
    collapsible?: boolean;
    player_name?: string;
    team?: string;
    position?: string;
    image_url?: string;
    stats?: unknown;
    content?: string;
}

interface StructuredContentRendererProps {
    contentItems?: ContentItem[];
    activeMediaTab?: string;
}

// Main StructuredContentRenderer Component
export function StructuredContentRenderer({
    contentItems = [],
    activeMediaTab = 'All'
}: StructuredContentRendererProps) {
    // Filter content items based on active media tab
    const filterContentByTab = (tab: string, items: ContentItem[]) => {
        const mapping: Record<string, ContentItem[]> = {
            All: items,
            Videos: items.filter(i => ['highlight_video', 'videos'].includes(i.type)),
            Images: items.filter(i => ['image_gallery', 'images'].includes(i.type)),
            Stats: items.filter(i => ['scorecard', 'statistics', 'stats'].includes(i.type)),
            Players: items.filter(i => ['player', 'top_player', 'comparison'].includes(i.type)),
        };
        return mapping[tab] || [];
    };

    const filteredItems = useMemo(() =>
        filterContentByTab(activeMediaTab, contentItems || []),
        [activeMediaTab, contentItems]
    );

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

    return (
        <div className="space-y-4">
            {filteredItems.map((item, index) => {
                const { type, title = '', data, collapsible = true } = item;

                switch (type) {
                    case 'highlight_video':
                    case 'videos':
                        return (
                            <CollapsibleSection key={index} title={title || 'Highlights'} icon={PlayCircle}>
                                <VideoCarousel videos={(item.items || data) as VideoItem[]} />
                            </CollapsibleSection>
                        );

                    case 'image_gallery':
                    case 'images':
                        return collapsible ? (
                            <CollapsibleSection key={index} title={title || 'Images'} icon={ImageIcon}>
                                <ImageGallery images={(item.items || data) as ImageItem[]} />
                            </CollapsibleSection>
                        ) : (
                            <ImageGallery key={index} images={(item.items || data) as ImageItem[]} />
                        );

                    case 'scorecard':
                        return (
                            <CollapsibleSection key={index} title={title || 'Scores'} icon={Trophy}>
                                <div className="bg-slate-800/50 rounded-lg p-4">
                                    {item.teams && item.teams.length >= 2 && (
                                        <div className="flex items-center justify-between">
                                            <div className="text-center flex-1">
                                                <div className="text-xl font-bold text-white">{item.teams[0].name}</div>
                                                <div className="text-3xl font-bold text-indigo-400">{item.teams[0].score || 0}</div>
                                            </div>
                                            <div className="text-gray-500 text-xl px-4">vs</div>
                                            <div className="text-center flex-1">
                                                <div className="text-xl font-bold text-white">{item.teams[1].name}</div>
                                                <div className="text-3xl font-bold text-purple-400">{item.teams[1].score || 0}</div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </CollapsibleSection>
                        );

                    case 'statistics':
                    case 'stats':
                        return collapsible ? (
                            <CollapsibleSection key={index} title={title || 'Statistics'} icon={BarChart3}>
                                {item.headers && item.rows ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b border-gray-700">
                                                    {item.headers.map((header, i) => (
                                                        <th key={i} className="text-left text-gray-300 font-medium p-2 text-sm">
                                                            {header}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {item.rows.map((row, i) => (
                                                    <tr key={i} className="border-b border-gray-800 hover:bg-gray-800/50">
                                                        {row.map((cell, j) => (
                                                            <td key={j} className="text-gray-200 p-2 text-sm">
                                                                {cell}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <pre className="text-gray-300 text-sm overflow-x-auto">
                                        {JSON.stringify(data, null, 2)}
                                    </pre>
                                )}
                            </CollapsibleSection>
                        ) : null;

                    case 'player':
                    case 'top_player':
                        return (
                            <CollapsibleSection key={index} title={title || 'Players'} icon={User}>
                                {item.teams ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {item.teams.map((team, teamIndex) => (
                                            <div key={teamIndex} className="bg-gray-800/50 rounded-lg p-4">
                                                <h4 className="text-white font-semibold mb-3">{team.name}</h4>
                                                <div className="space-y-2">
                                                    {team.topPlayers?.map((player, playerIndex) => (
                                                        <div key={playerIndex} className="flex items-center justify-between p-2 bg-gray-700/50 rounded">
                                                            <span className="text-white text-sm">{player.name}</span>
                                                            <span className="text-gray-400 text-xs">{player.position}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="bg-gray-800/50 rounded-lg p-4">
                                        <h4 className="text-white font-semibold">{item.player_name}</h4>
                                        <p className="text-gray-400 text-sm">{item.team} - {item.position}</p>
                                    </div>
                                )}
                            </CollapsibleSection>
                        );

                    case 'text':
                        return (
                            <div key={index} className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                                <div className="prose prose-invert max-w-none text-gray-200 text-sm leading-relaxed space-y-3">
                                    <ReactMarkdown>{formatChatText(item.content || '')}</ReactMarkdown>
                                </div>
                            </div>
                        );

                    case 'trend':
                        return (
                            <CollapsibleSection key={index} title={title || 'Trends'} icon={TrendingUp}>
                                <div className="text-gray-300 text-sm">
                                    {JSON.stringify(data, null, 2)}
                                </div>
                            </CollapsibleSection>
                        );

                    default:
                        return (
                            <div key={index} className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                                <h3 className="text-white font-medium mb-3">{title || type}</h3>
                                <pre className="text-gray-300 text-sm overflow-x-auto">
                                    {JSON.stringify(data || item, null, 2)}
                                </pre>
                            </div>
                        );
                }
            })}
        </div>
    );
}

export default StructuredContentRenderer;
