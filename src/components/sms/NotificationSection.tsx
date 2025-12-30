'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui';
import { MessageSquare, Bell, Phone, Check, X } from 'lucide-react';
import clsx from 'clsx';

interface NotificationSectionProps {
    userId?: string;
}

export function NotificationSection({ userId }: NotificationSectionProps) {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [isVerified, setIsVerified] = useState(false);
    const [preferences, setPreferences] = useState({
        gameStart: true,
        gameEnd: true,
        bigPlays: true,
        scoreUpdates: false,
        playerMilestones: true,
    });

    const handleSendCode = async () => {
        if (!phoneNumber) return;
        setIsVerifying(true);
        // Mock - would call /api/sms/verify
        await new Promise(resolve => setTimeout(resolve, 1000));
    };

    const handleVerifyCode = async () => {
        if (!verificationCode) return;
        // Mock verification
        await new Promise(resolve => setTimeout(resolve, 500));
        setIsVerified(true);
        setIsVerifying(false);
    };

    const togglePreference = (key: keyof typeof preferences) => {
        setPreferences(prev => ({
            ...prev,
            [key]: !prev[key],
        }));
    };

    // Sample chat messages for the phone mockup
    const sampleMessages = [
        { from: 'playmaker', text: '🏈 Bears vs Packers is about to start!' },
        { from: 'user', text: 'Bears score' },
        { from: 'playmaker', text: 'Bears 17 - Packers 14\nQ3 8:42 remaining\nCaleb Williams: 18/24, 203 YDS, 2 TD' },
        { from: 'playmaker', text: '🔥 TOUCHDOWN! Swift rushes for 12 yards!' },
    ];

    return (
        <section className="py-16">
            <div className="max-w-7xl mx-auto px-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-12"
                >
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <MessageSquare className="w-5 h-5 text-indigo-400" />
                        <h2 className="text-3xl font-bold text-white">SMS Alerts</h2>
                    </div>
                    <p className="text-slate-400">
                        Get live updates and chat with Playmaker via text message
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                    {/* Settings Panel */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6"
                    >
                        {/* Phone Number Input */}
                        <div className="mb-8">
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Phone Number
                            </label>
                            {!isVerified ? (
                                <div className="space-y-3">
                                    <div className="flex gap-2">
                                        <input
                                            type="tel"
                                            value={phoneNumber}
                                            onChange={(e) => setPhoneNumber(e.target.value)}
                                            placeholder="+1 (555) 000-0000"
                                            className="input flex-1"
                                            disabled={isVerifying}
                                        />
                                        <Button
                                            onClick={handleSendCode}
                                            disabled={!phoneNumber || isVerifying}
                                            variant="secondary"
                                        >
                                            {isVerifying ? 'Sent!' : 'Send Code'}
                                        </Button>
                                    </div>

                                    <AnimatePresence>
                                        {isVerifying && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="flex gap-2"
                                            >
                                                <input
                                                    type="text"
                                                    value={verificationCode}
                                                    onChange={(e) => setVerificationCode(e.target.value)}
                                                    placeholder="Enter 6-digit code"
                                                    className="input flex-1"
                                                    maxLength={6}
                                                />
                                                <Button onClick={handleVerifyCode}>
                                                    Verify
                                                </Button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                                    <Check className="w-5 h-5 text-green-400" />
                                    <span className="text-green-400">{phoneNumber}</span>
                                    <button
                                        onClick={() => {
                                            setIsVerified(false);
                                            setPhoneNumber('');
                                        }}
                                        className="ml-auto text-slate-400 hover:text-white"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Notification Preferences */}
                        <div>
                            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <Bell className="w-4 h-4 text-indigo-400" />
                                Notification Preferences
                            </h3>

                            <div className="space-y-3">
                                {Object.entries(preferences).map(([key, enabled]) => (
                                    <PreferenceToggle
                                        key={key}
                                        label={formatPreferenceLabel(key)}
                                        description={getPreferenceDescription(key)}
                                        enabled={enabled}
                                        onChange={() => togglePreference(key as keyof typeof preferences)}
                                    />
                                ))}
                            </div>
                        </div>
                    </motion.div>

                    {/* Phone Mockup */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="relative"
                        style={{ perspective: '1000px' }}
                    >
                        <div
                            className="relative mx-auto w-72"
                            style={{
                                transform: 'rotateY(-10deg) rotateX(5deg)',
                            }}
                        >
                            {/* Phone Frame */}
                            <div className="bg-slate-900 rounded-[3rem] p-3 shadow-2xl border border-slate-700">
                                {/* Screen */}
                                <div className="bg-slate-800 rounded-[2.5rem] overflow-hidden">
                                    {/* Notch */}
                                    <div className="h-8 bg-slate-900 flex items-center justify-center">
                                        <div className="w-24 h-6 bg-slate-800 rounded-full" />
                                    </div>

                                    {/* Chat Content */}
                                    <div className="h-96 p-4 space-y-3 overflow-hidden">
                                        <div className="text-center">
                                            <span className="text-xs text-slate-500">Playmaker</span>
                                        </div>

                                        {sampleMessages.map((msg, i) => (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0, y: 10 }}
                                                whileInView={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.2 }}
                                                className={clsx(
                                                    'max-w-[85%] p-3 rounded-2xl text-sm',
                                                    msg.from === 'playmaker'
                                                        ? 'bg-slate-700 text-white mr-auto'
                                                        : 'bg-indigo-500 text-white ml-auto'
                                                )}
                                            >
                                                <p className="whitespace-pre-line">{msg.text}</p>
                                            </motion.div>
                                        ))}
                                    </div>

                                    {/* Input Bar */}
                                    <div className="p-3 border-t border-slate-700">
                                        <div className="bg-slate-700 rounded-full px-4 py-2 text-sm text-slate-400">
                                            Text Playmaker...
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Glow Effect */}
                            <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 blur-2xl -z-10 rounded-full" />
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}

interface PreferenceToggleProps {
    label: string;
    description: string;
    enabled: boolean;
    onChange: () => void;
}

function PreferenceToggle({ label, description, enabled, onChange }: PreferenceToggleProps) {
    return (
        <button
            onClick={onChange}
            className="w-full flex items-center justify-between p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors text-left"
        >
            <div>
                <span className="text-sm font-medium text-white">{label}</span>
                <p className="text-xs text-slate-400">{description}</p>
            </div>
            <div
                className={clsx(
                    'w-11 h-6 rounded-full relative transition-colors',
                    enabled ? 'bg-indigo-500' : 'bg-slate-600'
                )}
            >
                <motion.div
                    className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
                    animate={{ left: enabled ? 24 : 4 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
            </div>
        </button>
    );
}

function formatPreferenceLabel(key: string): string {
    const labels: Record<string, string> = {
        gameStart: 'Game Start',
        gameEnd: 'Game End',
        bigPlays: 'Big Plays',
        scoreUpdates: 'Score Updates',
        playerMilestones: 'Player Milestones',
    };
    return labels[key] || key;
}

function getPreferenceDescription(key: string): string {
    const descriptions: Record<string, string> = {
        gameStart: 'Get notified when your followed games kick off',
        gameEnd: 'Final score notifications for your teams',
        bigPlays: 'Touchdowns, interceptions, and big moments',
        scoreUpdates: 'Every scoring change (can be frequent)',
        playerMilestones: '100+ yard games, triple-doubles, etc.',
    };
    return descriptions[key] || '';
}
