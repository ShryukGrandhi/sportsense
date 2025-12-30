'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Game } from '@/lib/sports/types';
import { ScoreboardCard } from '@/components/cards';
import clsx from 'clsx';
import Image from 'next/image';

interface LiveGameStripProps {
    games?: Game[];
    primaryGameId?: string;
    onSelectGame?: (game: Game) => void;
}

export function LiveGameStrip({ games = [], primaryGameId, onSelectGame }: LiveGameStripProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [selectedGame, setSelectedGame] = useState<Game | null>(null);

    useEffect(() => {
        if (primaryGameId && games.length > 0) {
            const game = games.find(g => g.id === primaryGameId);
            if (game) setSelectedGame(game);
        } else if (games.length > 0) {
            // Select first live game, or first game
            const liveGame = games.find(g => g.status === 'in_progress');
            setSelectedGame(liveGame || games[0]);
        }
    }, [games, primaryGameId]);

    const handleGameClick = (game: Game) => {
        setSelectedGame(game);
        onSelectGame?.(game);
        setIsExpanded(false);
    };

    if (games.length === 0 && !selectedGame) {
        return (
            <div className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md border-b border-slate-800">
                <div className="max-w-7xl mx-auto px-4 py-3">
                    <div className="flex items-center justify-center gap-3 text-slate-400">
                        <div className="w-2 h-2 rounded-full bg-slate-600 animate-pulse" />
                        <span className="text-sm">No live games at the moment</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="sticky top-0 z-50">
            {/* Main Strip */}
            <motion.div
                className="bg-slate-900/95 backdrop-blur-md border-b border-slate-800"
                layout
            >
                <div className="max-w-7xl mx-auto px-4">
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="w-full py-3 flex items-center justify-between hover:bg-slate-800/30 transition-colors"
                    >
                        {selectedGame ? (
                            <div className="flex items-center gap-4 flex-1">
                                {/* Live Indicator */}
                                {selectedGame.status === 'in_progress' && (
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                        <span className="text-xs font-semibold text-green-400 uppercase">Live</span>
                                    </div>
                                )}

                                {/* Teams */}
                                <div className="flex items-center gap-6">
                                    {/* Away Team */}
                                    <div className="flex items-center gap-2">
                                        <TeamLogo team={selectedGame.awayTeam} size="sm" />
                                        <span className="font-semibold text-white">
                                            {selectedGame.awayTeam.abbreviation}
                                        </span>
                                        <span className={clsx(
                                            'text-xl font-bold tabular-nums ml-2',
                                            selectedGame.score.away > selectedGame.score.home ? 'text-white' : 'text-slate-400'
                                        )}>
                                            {selectedGame.score.away}
                                        </span>
                                    </div>

                                    <span className="text-slate-500">@</span>

                                    {/* Home Team */}
                                    <div className="flex items-center gap-2">
                                        <TeamLogo team={selectedGame.homeTeam} size="sm" />
                                        <span className="font-semibold text-white">
                                            {selectedGame.homeTeam.abbreviation}
                                        </span>
                                        <span className={clsx(
                                            'text-xl font-bold tabular-nums ml-2',
                                            selectedGame.score.home > selectedGame.score.away ? 'text-white' : 'text-slate-400'
                                        )}>
                                            {selectedGame.score.home}
                                        </span>
                                    </div>
                                </div>

                                {/* Game Info */}
                                <div className="flex items-center gap-4 ml-auto text-sm">
                                    {selectedGame.clock && (
                                        <span className="font-mono text-slate-300">
                                            {selectedGame.clock.periodName} • {selectedGame.clock.time}
                                        </span>
                                    )}
                                    <span className="text-slate-500">{selectedGame.league}</span>
                                </div>
                            </div>
                        ) : (
                            <span className="text-slate-400">Select a game</span>
                        )}

                        {/* Expand Icon */}
                        <motion.svg
                            className="w-5 h-5 text-slate-400 ml-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </motion.svg>
                    </button>
                </div>
            </motion.div>

            {/* Expanded Game List */}
            <AnimatePresence>
                {isExpanded && games.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-slate-900/98 backdrop-blur-md border-b border-slate-800 overflow-hidden"
                    >
                        <div className="max-w-7xl mx-auto px-4 py-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                {games.map((game, index) => (
                                    <motion.button
                                        key={game.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        onClick={() => handleGameClick(game)}
                                        className={clsx(
                                            'text-left transition-all',
                                            selectedGame?.id === game.id && 'ring-2 ring-indigo-500 rounded-xl'
                                        )}
                                    >
                                        <ScoreboardCard game={game} compact />
                                    </motion.button>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

interface TeamLogoProps {
    team: Game['homeTeam'];
    size?: 'sm' | 'md' | 'lg';
}

function TeamLogo({ team, size = 'md' }: TeamLogoProps) {
    const sizeClasses = {
        sm: 'w-6 h-6',
        md: 'w-8 h-8',
        lg: 'w-12 h-12',
    };

    return (
        <div className={clsx(
            'rounded-md bg-slate-700/50 flex items-center justify-center overflow-hidden',
            sizeClasses[size]
        )}>
            {team.logoUrl ? (
                <Image
                    src={team.logoUrl}
                    alt={team.name}
                    width={size === 'lg' ? 40 : size === 'md' ? 28 : 20}
                    height={size === 'lg' ? 40 : size === 'md' ? 28 : 20}
                    className="object-contain"
                />
            ) : (
                <span className="text-xs font-bold text-slate-400">
                    {team.abbreviation.slice(0, 2)}
                </span>
            )}
        </div>
    );
}
