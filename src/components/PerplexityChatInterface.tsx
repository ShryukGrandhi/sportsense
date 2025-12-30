'use client';

import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { Send, Mic } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { formatChatText } from '@/utils/formatTextContent';
import { StructuredContentRenderer } from './StructuredContentRenderer';

interface Message {
    id: string;
    type: 'user' | 'assistant';
    content: string;
    cards?: ContentItem[];
    source?: string;
    timestamp?: Date;
}

interface ContentItem {
    type: string;
    title?: string;
    data?: unknown;
    items?: unknown[];
}

interface PerplexityChatInterfaceProps {
    onSendMessage?: (message: string) => Promise<{
        text: string;
        cards?: ContentItem[];
    }>;
    initialMessages?: Message[];
}

// Category Pill Component
const CategoryPill = memo(({ label, isActive, onClick }: { label: string; isActive: boolean; onClick: () => void }) => {
    return (
        <button
            onClick={onClick}
            className={`px-6 py-2.5 text-xs font-medium tracking-wider uppercase transition-all duration-200 border ${isActive
                ? 'bg-white text-[#0a0a0a] border-white'
                : 'bg-transparent text-gray-500 border-[#1a1a1a] hover:border-white/30 hover:text-white'
                }`}
        >
            {label}
        </button>
    );
});
CategoryPill.displayName = 'CategoryPill';

// Sport Suggestions
function getSportSuggestions(sport: string) {
    const suggestions: Record<string, { title: string; query: string; description: string }[]> = {
        'NFL': [
            { title: 'Latest Scores', query: 'Show me the latest NFL scores from this week', description: 'Current game results' },
            { title: 'Standings', query: 'What are the current NFL standings by division?', description: 'Team rankings and records' },
            { title: 'Player Stats', query: 'Show me the top NFL players this season', description: 'Leading performers' },
        ],
        'NBA': [
            { title: 'Latest Scores', query: 'Show me the latest NBA scores from last night', description: 'Current game results' },
            { title: 'Standings', query: 'What are the current NBA standings by conference?', description: 'Team rankings and records' },
            { title: 'Player Stats', query: 'Show me the top NBA scorers this season', description: 'Leading performers' },
        ],
        'MLB': [
            { title: 'Latest Scores', query: 'Show me the latest MLB scores from yesterday', description: 'Current game results' },
            { title: 'Standings', query: 'What are the current MLB standings by division?', description: 'Team rankings and records' },
            { title: 'Player Stats', query: 'Show me the top MLB hitters and pitchers', description: 'Leading performers' },
        ],
        'Soccer': [
            { title: 'Premier League', query: 'Show me the latest Premier League scores and standings', description: 'English top flight' },
            { title: 'Champions League', query: 'Show me the latest Champions League results', description: 'European competition' },
            { title: 'Transfer News', query: 'What are the latest soccer transfer rumors?', description: 'Player transfers' },
        ],
    };
    return suggestions[sport] || [];
}

// Message Component
function PerplexityStyleMessage({ message, isUser, isTyping = false, activeMediaTab }: {
    message: Message;
    isUser: boolean;
    isTyping?: boolean;
    activeMediaTab: string;
}) {
    if (isUser) {
        return (
            <div className="mb-12">
                <h2 className="text-3xl font-light text-white leading-tight mb-8 tracking-tight">
                    {message.content}
                </h2>
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

    const hasCards = message.cards && message.cards.length > 0;

    return (
        <div className="mb-16">
            {/* AI Avatar and Header */}
            <div className="flex space-x-3 items-center text-gray-600 text-xs uppercase tracking-wider mb-6">
                <div className="w-5 h-5 border border-white flex items-center justify-center text-white text-[10px] font-medium">
                    AI
                </div>
                {message.source && (
                    <span className="text-gray-600">• {message.source}</span>
                )}
            </div>

            {/* Text Content */}
            {message.content && (
                <div className="mb-6">
                    <div className="prose prose-invert max-w-none text-white text-base leading-relaxed space-y-4 font-light">
                        <ReactMarkdown>{formatChatText(message.content)}</ReactMarkdown>
                    </div>
                </div>
            )}

            {/* Structured Content */}
            {hasCards && (
                <div className="border border-[#1a1a1a] overflow-hidden">
                    <div className="p-8 bg-[#0a0a0a]">
                        <StructuredContentRenderer
                            contentItems={message.cards}
                            activeMediaTab={activeMediaTab}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

// Main PerplexityChatInterface Component
export function PerplexityChatInterface({ onSendMessage, initialMessages = [] }: PerplexityChatInterfaceProps) {
    const [messages, setMessages] = useState<Message[]>(initialMessages);
    const [inputValue, setInputValue] = useState('');
    const [activeCategory, setActiveCategory] = useState('Trending');
    const [activeMediaTab, setActiveMediaTab] = useState('All');
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const categories = ['Trending', 'NFL', 'NBA', 'MLB', 'Soccer'];
    const mediaTabs = ['All', 'Videos', 'Images', 'Stats', 'Players'];

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    }, [inputValue]);

    const handleSendMessage = useCallback(async (messageText = inputValue) => {
        if (!messageText.trim() || sending) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            type: 'user',
            content: messageText.trim(),
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setSending(true);

        try {
            if (onSendMessage) {
                const response = await onSendMessage(messageText.trim());

                const assistantMessage: Message = {
                    id: (Date.now() + 1).toString(),
                    type: 'assistant',
                    content: response.text,
                    cards: response.cards,
                    timestamp: new Date(),
                };

                setMessages(prev => [...prev, assistantMessage]);
            } else {
                // Mock response
                const mockMessage: Message = {
                    id: (Date.now() + 1).toString(),
                    type: 'assistant',
                    content: "I'm Playmaker, your AI sports assistant! Ask me about any live game, team, or player stats.",
                    timestamp: new Date(),
                };
                setMessages(prev => [...prev, mockMessage]);
            }
        } catch (error) {
            console.error('Send message error:', error);
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                type: 'assistant',
                content: 'Sorry, something went wrong. Please try again.',
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setSending(false);
        }
    }, [inputValue, sending, onSendMessage]);

    const handleCategoryClick = async (category: string) => {
        setActiveCategory(category);

        if (['NFL', 'NBA', 'MLB', 'Soccer'].includes(category)) {
            const sportQueries: Record<string, string> = {
                'NFL': 'Show me the latest NFL scores and standings',
                'NBA': 'What are the current NBA standings and recent scores?',
                'MLB': 'Show me MLB scores and current standings',
                'Soccer': 'What are the latest soccer scores from major leagues?'
            };

            const query = sportQueries[category];
            if (query) {
                setInputValue(query);
                setTimeout(() => handleSendMessage(query), 100);
            }
        }
    };

    const isWelcomeScreen = messages.length === 0 && !sending;
    const showMessages = messages.length > 0;

    return (
        <div className="h-full flex flex-col bg-[#0a0a0a] overflow-hidden">
            {/* Welcome Screen */}
            {isWelcomeScreen && (
                <div className="flex-1 flex flex-col items-center justify-center px-8 py-16 max-w-5xl mx-auto w-full">
                    {/* Logo and Title */}
                    <div className="text-center mb-20">
                        <h1 className="text-5xl font-light text-white mb-4 tracking-tight">
                            Ask anything about sports
                        </h1>
                        <div className="w-16 h-px bg-white mx-auto mb-6"></div>
                        <p className="text-sm text-gray-500 uppercase tracking-wider font-light">
                            Real-time data • AI-powered insights
                        </p>
                    </div>

                    {/* Category Pills */}
                    <div className="flex flex-wrap gap-2 mb-20 justify-center">
                        {categories.map((category) => (
                            <CategoryPill
                                key={category}
                                label={category}
                                isActive={activeCategory === category}
                                onClick={() => handleCategoryClick(category)}
                            />
                        ))}
                    </div>

                    {/* Sport-specific suggestions */}
                    {activeCategory !== 'Trending' && (
                        <div className="mb-16 max-w-4xl w-full">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {getSportSuggestions(activeCategory).map((suggestion, index) => (
                                    <button
                                        key={index}
                                        onClick={() => {
                                            setInputValue(suggestion.query);
                                            setTimeout(() => handleSendMessage(suggestion.query), 100);
                                        }}
                                        className="p-5 bg-[#111111] hover:bg-[#1a1a1a] border border-[#1a1a1a] hover:border-white/20 text-left transition-all duration-300 group hover:scale-[1.02] active:scale-[0.98]"
                                    >
                                        <div className="text-white text-sm font-medium mb-2 group-hover:text-white transition-colors uppercase tracking-wide">
                                            {suggestion.title}
                                        </div>
                                        <div className="text-gray-600 text-xs leading-relaxed">
                                            {suggestion.description}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Large Input */}
                    <div className="w-full max-w-3xl">
                        <div className="relative">
                            <textarea
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder=""
                                rows={3}
                                className="w-full bg-[#111111] border border-[#1a1a1a] text-white pl-6 pr-14 py-5 text-base focus:border-white focus:outline-none resize-none min-h-[80px] leading-relaxed placeholder-transparent font-light"
                                disabled={sending}
                            />

                            {/* Custom Placeholder */}
                            {!inputValue && (
                                <div className="absolute left-6 top-5 pointer-events-none">
                                    <span className="text-base text-gray-600 uppercase tracking-wider font-light">
                                        Type your question...
                                    </span>
                                </div>
                            )}

                            {/* Send Button */}
                            <div className="absolute right-4 bottom-4">
                                <button
                                    onClick={() => handleSendMessage()}
                                    disabled={!inputValue.trim() || sending}
                                    className="bg-white text-[#0a0a0a] p-2.5 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100"
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Chat Area */}
            {showMessages && (
                <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                    {/* Media Tabs */}
                    <div className="flex space-x-1 border-b border-[#1a1a1a] px-8 pt-4 overflow-x-auto">
                        {mediaTabs.map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveMediaTab(tab)}
                                className={`pb-2 px-4 text-xs font-medium tracking-wider uppercase whitespace-nowrap transition-colors ${activeMediaTab === tab
                                        ? "text-white border-b border-white"
                                        : "text-gray-600 hover:text-gray-400"
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {/* Messages Container */}
                    <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
                        <div className="max-w-4xl mx-auto px-8 py-12">
                            {messages.map((message) => (
                                <PerplexityStyleMessage
                                    key={message.id}
                                    message={message}
                                    isUser={message.type === 'user'}
                                    activeMediaTab={activeMediaTab}
                                />
                            ))}
                            {sending && (
                                <PerplexityStyleMessage
                                    message={{ id: 'typing', type: 'assistant', content: '' }}
                                    isUser={false}
                                    isTyping={true}
                                    activeMediaTab={activeMediaTab}
                                />
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    </div>

                    {/* Bottom Input Area */}
                    <div className="border-t border-[#1a1a1a] bg-[#0a0a0a]">
                        <div className="max-w-4xl mx-auto px-8 py-6">
                            <div className="relative">
                                <textarea
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    placeholder="Ask a follow up..."
                                    rows={2}
                                    className="w-full bg-[#111111] border border-[#1a1a1a] text-white pl-5 pr-14 py-4 text-sm focus:border-white focus:outline-none resize-none leading-relaxed placeholder-gray-600 font-light"
                                    disabled={sending}
                                />

                                {/* Send Button */}
                                <div className="absolute right-3 bottom-3">
                                    <button
                                        onClick={() => handleSendMessage()}
                                        disabled={!inputValue.trim() || sending}
                                        className="bg-white text-[#0a0a0a] p-2 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100"
                                    >
                                        <Send className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Status indicators */}
                            <div className="flex justify-center items-center mt-4">
                                {sending && (
                                    <div className="flex items-center space-x-2 text-xs text-gray-600 uppercase tracking-wider">
                                        <div className="w-1 h-1 bg-white rounded-full animate-pulse"></div>
                                        <span>Processing...</span>
                                    </div>
                                )}
                                {!sending && messages.length > 0 && (
                                    <div className="text-xs text-gray-600 uppercase tracking-wider">
                                        Press Enter to send
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default PerplexityChatInterface;
