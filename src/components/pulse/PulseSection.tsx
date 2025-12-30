'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Radio, Loader2 } from 'lucide-react';
import clsx from 'clsx';

type PulseState = 'idle' | 'listening' | 'matching' | 'result';

interface PulseSectionProps {
    onPulseResult?: (result: unknown) => void;
}

export function PulseSection({ onPulseResult }: PulseSectionProps) {
    const [state, setState] = useState<PulseState>('idle');
    const [result, setResult] = useState<unknown>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const startListening = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                stream.getTracks().forEach(track => track.stop());
                await processAudio();
            };

            setState('listening');
            mediaRecorder.start();

            // Auto-stop after 6 seconds
            setTimeout(() => {
                if (mediaRecorder.state === 'recording') {
                    mediaRecorder.stop();
                }
            }, 6000);
        } catch (error) {
            console.error('Microphone access denied:', error);
            setState('idle');
        }
    }, []);

    const stopListening = useCallback(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
    }, []);

    const processAudio = async () => {
        setState('matching');

        try {
            // Create form data with audio
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.webm');

            const response = await fetch('/api/pulse', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (data.success && data.data) {
                setResult(data.data);
                setState('result');
                onPulseResult?.(data.data);
            } else {
                // Fallback to JSON request (for demo without actual audio processing)
                const jsonResponse = await fetch('/api/pulse', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ favoriteLeagues: ['NFL', 'NBA'] }),
                });

                const jsonData = await jsonResponse.json();
                if (jsonData.success && jsonData.data) {
                    setResult(jsonData.data);
                    setState('result');
                    onPulseResult?.(jsonData.data);
                } else {
                    setState('idle');
                }
            }
        } catch (error) {
            console.error('Pulse processing error:', error);
            setState('idle');
        }
    };

    const handlePulseClick = () => {
        if (state === 'idle') {
            startListening();
        } else if (state === 'listening') {
            stopListening();
        } else if (state === 'result') {
            setState('idle');
            setResult(null);
        }
    };

    return (
        <section className="py-16 relative overflow-hidden">
            {/* Background Effect */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-indigo-500/10 via-transparent to-transparent rounded-full blur-3xl" />
            </div>

            <div className="max-w-7xl mx-auto px-4 text-center relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <Radio className="w-5 h-5 text-indigo-400" />
                        <h2 className="text-3xl font-bold text-white">Pulse</h2>
                    </div>
                    <p className="text-slate-400 mb-12">
                        Tap the mic and let Playmaker identify the game you're watching
                    </p>
                </motion.div>

                {/* Pulse Button Container */}
                <div className="relative w-64 h-64 mx-auto mb-8">
                    {/* Expanding Rings */}
                    <AnimatePresence>
                        {state === 'listening' && (
                            <>
                                {[...Array(3)].map((_, i) => (
                                    <motion.div
                                        key={i}
                                        className="absolute inset-0 rounded-full border-2 border-indigo-400"
                                        initial={{ scale: 1, opacity: 0.6 }}
                                        animate={{ scale: 2.5, opacity: 0 }}
                                        transition={{
                                            duration: 2,
                                            delay: i * 0.4,
                                            repeat: Infinity,
                                            ease: 'easeOut',
                                        }}
                                    />
                                ))}
                            </>
                        )}
                    </AnimatePresence>

                    {/* Progress Ring for Matching */}
                    {state === 'matching' && (
                        <motion.div
                            className="absolute inset-0 rounded-full"
                            initial={{ rotate: 0 }}
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                        >
                            <svg className="w-full h-full" viewBox="0 0 100 100">
                                <circle
                                    cx="50"
                                    cy="50"
                                    r="48"
                                    fill="none"
                                    stroke="rgba(99, 102, 241, 0.2)"
                                    strokeWidth="2"
                                />
                                <circle
                                    cx="50"
                                    cy="50"
                                    r="48"
                                    fill="none"
                                    stroke="url(#gradient)"
                                    strokeWidth="2"
                                    strokeDasharray="75 226"
                                    strokeLinecap="round"
                                />
                                <defs>
                                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#6366f1" />
                                        <stop offset="100%" stopColor="#a855f7" />
                                    </linearGradient>
                                </defs>
                            </svg>
                        </motion.div>
                    )}

                    {/* Main Button */}
                    <motion.button
                        onClick={handlePulseClick}
                        className={clsx(
                            'absolute inset-8 rounded-full flex items-center justify-center transition-shadow',
                            'focus:outline-none focus:ring-4 focus:ring-indigo-500/30',
                            state === 'idle' && 'bg-gradient-to-br from-slate-800 to-slate-900 hover:from-slate-700',
                            state === 'listening' && 'bg-gradient-to-br from-indigo-500 to-purple-600',
                            state === 'matching' && 'bg-gradient-to-br from-slate-800 to-slate-900',
                            state === 'result' && 'bg-gradient-to-br from-green-500 to-emerald-600'
                        )}
                        animate={
                            state === 'idle'
                                ? {
                                    boxShadow: [
                                        '0 0 20px rgba(99, 102, 241, 0.3)',
                                        '0 0 40px rgba(99, 102, 241, 0.5)',
                                        '0 0 20px rgba(99, 102, 241, 0.3)',
                                    ],
                                }
                                : {}
                        }
                        transition={
                            state === 'idle'
                                ? { duration: 3, repeat: Infinity, ease: 'easeInOut' }
                                : {}
                        }
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        {state === 'matching' ? (
                            <Loader2 className="w-12 h-12 text-indigo-400 animate-spin" />
                        ) : state === 'result' ? (
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', stiffness: 300 }}
                            >
                                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </motion.div>
                        ) : (
                            <Mic className={clsx(
                                'w-12 h-12',
                                state === 'listening' ? 'text-white' : 'text-indigo-400'
                            )} />
                        )}
                    </motion.button>

                    {/* Waveform Visualization */}
                    {state === 'listening' && (
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full mt-8 flex items-center justify-center gap-1">
                            {[...Array(12)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    className="w-1 bg-indigo-400 rounded-full"
                                    animate={{
                                        height: [4, 20 + Math.random() * 20, 4],
                                    }}
                                    transition={{
                                        duration: 0.5,
                                        delay: i * 0.05,
                                        repeat: Infinity,
                                        ease: 'easeInOut',
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* State Label */}
                <motion.p
                    key={state}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={clsx(
                        'text-sm font-medium',
                        state === 'idle' && 'text-slate-400',
                        state === 'listening' && 'text-indigo-400',
                        state === 'matching' && 'text-purple-400',
                        state === 'result' && 'text-green-400'
                    )}
                >
                    {state === 'idle' && 'Tap to identify a game'}
                    {state === 'listening' && 'Listening... tap to stop'}
                    {state === 'matching' && 'Matching audio to games...'}
                    {state === 'result' && 'Game identified! Tap for new search'}
                </motion.p>

                {/* Result Display */}
                <AnimatePresence>
                    {state === 'result' && result && (
                        <PulseResult result={result} />
                    )}
                </AnimatePresence>
            </div>
        </section>
    );
}

function PulseResult({ result }: { result: unknown }) {
    const data = result as {
        game?: {
            homeTeam: { name: string; abbreviation: string };
            awayTeam: { name: string; abbreviation: string };
            score: { home: number; away: number };
            status: string;
        };
        confidence?: number;
        matchReason?: string;
    };

    if (!data.game) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.4 }}
            className="mt-8 max-w-md mx-auto"
        >
            <div className="bg-slate-800/80 rounded-2xl border border-slate-700 p-6 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-semibold text-green-400 uppercase">Match Found</span>
                    <span className="text-xs text-slate-400">
                        {data.confidence ? `${(data.confidence * 100).toFixed(0)}% confidence` : ''}
                    </span>
                </div>

                <div className="flex items-center justify-center gap-4 text-xl font-bold">
                    <span className="text-white">{data.game.awayTeam.abbreviation}</span>
                    <span className="text-2xl text-slate-400">{data.game.score.away}</span>
                    <span className="text-slate-500">-</span>
                    <span className="text-2xl text-slate-400">{data.game.score.home}</span>
                    <span className="text-white">{data.game.homeTeam.abbreviation}</span>
                </div>

                {data.matchReason && (
                    <p className="text-xs text-slate-500 mt-3 text-center">{data.matchReason}</p>
                )}
            </div>
        </motion.div>
    );
}
