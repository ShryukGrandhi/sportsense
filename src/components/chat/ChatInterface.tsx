'use client';

import { useState, useRef, useEffect, FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui';
import { PlayerCard, ScoreboardCard, ComparisonCard } from '../cards';
import { VisualCard, ChatMessage, Game, PlayerGameStats, StatComparisonCardData } from '@/lib/sports/types';
import clsx from 'clsx';
import { Send, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatInterfaceProps {
    onSendMessage?: (message: string) => Promise<{
        text: string;
        visualContext?: VisualCard[];
    }>;
}

export function ChatInterface({ onSendMessage }: ChatInterfaceProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [visualCards, setVisualCards] = useState<VisualCard[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            if (onSendMessage) {
                const response = await onSendMessage(input);

                const assistantMessage: ChatMessage = {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: response.text,
                    visualContext: response.visualContext,
                    timestamp: new Date(),
                };

                setMessages(prev => [...prev, assistantMessage]);

                if (response.visualContext) {
                    setVisualCards(response.visualContext);
                }
            } else {
                // Mock response for demo
                const mockResponse: ChatMessage = {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: "I'm Playmaker, your AI sports assistant! Ask me about any live game, team, or player stats.",
                    timestamp: new Date(),
                };
                setMessages(prev => [...prev, mockResponse]);
            }
        } catch (error) {
            console.error('Chat error:', error);
            const errorMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: "Sorry, I couldn't process that request. Please try again!",
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <section className="min-h-[80vh] py-8">
            <div className="max-w-7xl mx-auto px-4">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    {/* Chat Panel */}
                    <div className="lg:col-span-2 flex flex-col">
                        <div className="mb-4">
                            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                <Sparkles className="w-6 h-6 text-indigo-400" />
                                Ask Playmaker
                            </h2>
                            <p className="text-slate-400 text-sm mt-1">
                                Get live scores, player stats, and game insights
                            </p>
                        </div>

                        {/* Messages Container */}
                        <div className="flex-1 bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden flex flex-col min-h-[400px]">
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {messages.length === 0 && (
                                    <div className="text-center py-12">
                                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                                            <Sparkles className="w-8 h-8 text-white" />
                                        </div>
                                        <p className="text-slate-400">
                                            Try asking: "How are the Bears doing?" or "Show me Lakers stats"
                                        </p>
                                    </div>
                                )}

                                <AnimatePresence mode="popLayout">
                                    {messages.map((message, index) => (
                                        <ChatBubble key={message.id} message={message} index={index} />
                                    ))}
                                </AnimatePresence>

                                {isLoading && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="flex gap-2 justify-start"
                                    >
                                        <div className="bg-slate-800 rounded-2xl px-4 py-2 flex gap-1">
                                            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    </motion.div>
                                )}

                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input Form */}
                            <form onSubmit={handleSubmit} className="p-4 border-t border-slate-800">
                                <div className="flex gap-2">
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        placeholder="Ask about any game, team, or player..."
                                        className="input flex-1"
                                        disabled={isLoading}
                                    />
                                    <Button
                                        type="submit"
                                        disabled={!input.trim() || isLoading}
                                        icon={<Send className="w-4 h-4" />}
                                    >
                                        Send
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* Visual Canvas */}
                    <div className="lg:col-span-3">
                        <VisualCanvas cards={visualCards} />
                    </div>
                </div>
            </div>
        </section>
    );
}

interface ChatBubbleProps {
    message: ChatMessage;
    index: number;
}

function ChatBubble({ message, index }: ChatBubbleProps) {
    const isUser = message.role === 'user';

    return (
        <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, delay: index * 0.05 }}
            className={clsx('flex', isUser ? 'justify-end' : 'justify-start')}
        >
            <div
                className={clsx(
                    'max-w-[85%] rounded-2xl px-4 py-2.5',
                    isUser
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white'
                        : 'bg-transparent text-slate-100 min-w-[300px] w-full p-0 flex-1'
                )}
            >
                {isUser ? (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {message.content}
                    </p>
                ) : (
                    <div className="bg-slate-950 rounded-2xl border border-indigo-500/20 shadow-xl overflow-hidden min-w-[350px]">
                        {/* Widget Header */}
                        <div className="bg-slate-900/50 px-4 py-2 border-b border-indigo-500/10 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                            <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">Live Analysis</span>
                        </div>
                        <div className="p-4 text-sm space-y-2">
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    h3: ({ node, ...props }) => (
                                        <div className="bg-slate-900 rounded-lg px-3 py-2 font-bold text-indigo-300 mt-2 mb-2 flex items-center gap-2 border border-slate-800">
                                            <span {...props} />
                                        </div>
                                    ),
                                    p: ({ node, ...props }) => <p className="leading-relaxed text-slate-300" {...props} />,
                                    ul: ({ node, ...props }) => <ul className="space-y-2 my-2" {...props} />,
                                    li: ({ node, children, ...props }) => (
                                        <li className="flex gap-2 items-start bg-slate-900/30 p-2 rounded-lg border border-white/5" {...props}>
                                            <span className="text-indigo-500 mt-1 text-[0.6rem]">●</span>
                                            <span className="flex-1">{children}</span>
                                        </li>
                                    ),
                                    strong: ({ node, ...props }) => <span className="font-semibold text-white" {...props} />
                                }}
                            >
                                {message.content}
                            </ReactMarkdown>
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

interface VisualCanvasProps {
    cards: VisualCard[];
}

function VisualCanvas({ cards }: VisualCanvasProps) {
    if (cards.length === 0) {
        return (
            <div className="h-full min-h-[400px] rounded-xl border border-dashed border-slate-700 flex items-center justify-center bg-slate-900/20">
                <div className="text-center">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-xl bg-slate-800/50 flex items-center justify-center">
                        <Sparkles className="w-10 h-10 text-slate-600 opacity-50" />
                    </div>
                    <p className="text-slate-500 font-medium">
                        Visual Insights
                    </p>
                    <p className="text-slate-600 text-xs mt-1">
                        Ask comparisons or stats to see cards
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <AnimatePresence mode="popLayout">
                {cards.map((card, index) => (
                    <motion.div
                        key={card.id || index}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                    >
                        {card.type === 'scoreboard' && (
                            <ScoreboardCard
                                game={(card.data as { game: Game }).game}
                                showDetails
                                delay={index}
                            />
                        )}
                        {card.type === 'player' && (
                            <PlayerCard
                                player={(card.data as { player: PlayerGameStats }).player}
                                game={(card.data as { game?: Game }).game}
                                delay={index}
                            />
                        )}
                        {(card.type === 'stat-comparison' || card.type === 'comparison' as any) && (
                            <ComparisonCard
                                data={card.data as StatComparisonCardData}
                                delay={index}
                            />
                        )}
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}
