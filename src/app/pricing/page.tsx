'use client';

import React from 'react';
import Link from 'next/link';
import { Check, X, Zap, Crown, Star } from 'lucide-react';

const plans = [
    {
        name: 'Free',
        price: '$0',
        period: 'forever',
        description: 'Perfect for casual sports fans',
        features: [
            { name: '10 AI chats per day', included: true },
            { name: 'Basic live scores', included: true },
            { name: 'NFL, NBA, MLB coverage', included: true },
            { name: 'Player comparisons', included: false },
            { name: 'Voice AI (Pulse)', included: false },
            { name: 'Advanced analytics', included: false },
            { name: 'Priority support', included: false },
        ],
        cta: 'Get Started',
        href: '/app',
        popular: false,
    },
    {
        name: 'Pro',
        price: '$9.99',
        period: '/month',
        description: 'For dedicated sports enthusiasts',
        features: [
            { name: 'Unlimited AI chats', included: true },
            { name: 'Real-time live scores', included: true },
            { name: 'All leagues & sports', included: true },
            { name: 'Player comparisons', included: true },
            { name: 'Voice AI (Pulse)', included: true },
            { name: 'Advanced analytics', included: false },
            { name: 'Priority support', included: false },
        ],
        cta: 'Start Pro Trial',
        href: '/app?plan=pro',
        popular: true,
    },
    {
        name: 'Elite',
        price: '$24.99',
        period: '/month',
        description: 'For professionals & analysts',
        features: [
            { name: 'Everything in Pro', included: true },
            { name: 'Advanced analytics', included: true },
            { name: 'Historical data access', included: true },
            { name: 'API access', included: true },
            { name: 'Custom alerts', included: true },
            { name: 'Priority support', included: true },
            { name: 'Early feature access', included: true },
        ],
        cta: 'Start Elite Trial',
        href: '/app?plan=elite',
        popular: false,
    },
];

export default function PricingPage() {
    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white">
            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/90 backdrop-blur-sm border-b border-[#1a1a1a]">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link href="/" className="text-2xl font-bold tracking-tight">SPORTSENSE</Link>
                    <div className="flex items-center gap-6">
                        <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors uppercase tracking-wider">
                            Home
                        </Link>
                        <Link
                            href="/app"
                            className="bg-white text-[#0a0a0a] px-6 py-2 text-sm font-medium uppercase tracking-wider hover:bg-gray-100 transition-colors"
                        >
                            Launch App
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Header */}
            <section className="pt-32 pb-16 px-6">
                <div className="max-w-4xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 bg-[#111111] border border-[#1a1a1a] px-4 py-2 text-xs uppercase tracking-wider text-gray-400 mb-8">
                        <Crown className="w-3 h-3" />
                        Simple, transparent pricing
                    </div>
                    <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
                        Choose Your Plan
                    </h1>
                    <p className="text-xl text-gray-400 font-light max-w-2xl mx-auto">
                        Start free and upgrade as you grow. No hidden fees, cancel anytime.
                    </p>
                </div>
            </section>

            {/* Pricing Cards */}
            <section className="pb-24 px-6">
                <div className="max-w-6xl mx-auto">
                    <div className="grid md:grid-cols-3 gap-6">
                        {plans.map((plan) => (
                            <div
                                key={plan.name}
                                className={`relative bg-[#111111] border p-8 transition-all hover:scale-[1.02] ${plan.popular ? 'border-white' : 'border-[#1a1a1a] hover:border-white/20'
                                    }`}
                            >
                                {plan.popular && (
                                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                                        <div className="bg-white text-[#0a0a0a] px-4 py-1 text-xs font-medium uppercase tracking-wider flex items-center gap-1">
                                            <Star className="w-3 h-3" />
                                            Most Popular
                                        </div>
                                    </div>
                                )}

                                <div className="text-center mb-8">
                                    <h3 className="text-xl font-medium mb-2 uppercase tracking-wider">{plan.name}</h3>
                                    <div className="flex items-baseline justify-center gap-1 mb-2">
                                        <span className="text-4xl font-bold">{plan.price}</span>
                                        <span className="text-gray-500 text-sm">{plan.period}</span>
                                    </div>
                                    <p className="text-gray-500 text-sm">{plan.description}</p>
                                </div>

                                <div className="space-y-4 mb-8">
                                    {plan.features.map((feature, idx) => (
                                        <div key={idx} className="flex items-center gap-3">
                                            {feature.included ? (
                                                <Check className="w-4 h-4 text-white" />
                                            ) : (
                                                <X className="w-4 h-4 text-gray-600" />
                                            )}
                                            <span className={feature.included ? 'text-white text-sm' : 'text-gray-600 text-sm'}>
                                                {feature.name}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                <Link
                                    href={plan.href}
                                    className={`block w-full py-4 text-center text-sm font-medium uppercase tracking-wider transition-all ${plan.popular
                                            ? 'bg-white text-[#0a0a0a] hover:bg-gray-100'
                                            : 'border border-[#1a1a1a] text-white hover:border-white'
                                        }`}
                                >
                                    {plan.cta}
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* FAQ Section */}
            <section className="py-24 px-6 border-t border-[#1a1a1a]">
                <div className="max-w-3xl mx-auto">
                    <h2 className="text-3xl font-light mb-12 text-center tracking-tight">Frequently Asked Questions</h2>

                    <div className="space-y-6">
                        <div className="bg-[#111111] border border-[#1a1a1a] p-6">
                            <h3 className="text-white font-medium mb-2">Can I cancel anytime?</h3>
                            <p className="text-gray-500 text-sm">Yes, you can cancel your subscription at any time. You'll continue to have access until the end of your billing period.</p>
                        </div>

                        <div className="bg-[#111111] border border-[#1a1a1a] p-6">
                            <h3 className="text-white font-medium mb-2">What sports are covered?</h3>
                            <p className="text-gray-500 text-sm">We cover NFL, NBA, MLB, NHL, NCAA, Premier League, La Liga, Champions League, MLS, and more leagues worldwide.</p>
                        </div>

                        <div className="bg-[#111111] border border-[#1a1a1a] p-6">
                            <h3 className="text-white font-medium mb-2">Is there a free trial?</h3>
                            <p className="text-gray-500 text-sm">Yes! Pro and Elite plans include a 7-day free trial. No credit card required to start.</p>
                        </div>

                        <div className="bg-[#111111] border border-[#1a1a1a] p-6">
                            <h3 className="text-white font-medium mb-2">How does the AI chat work?</h3>
                            <p className="text-gray-500 text-sm">Our AI is trained on sports data and can answer questions about scores, standings, player stats, game analysis, and more in real-time.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 px-6 border-t border-[#1a1a1a]">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="text-xl font-bold tracking-tight">SPORTSENSE</div>
                    <div className="text-sm text-gray-600">
                        © 2024 SportSense. All rights reserved.
                    </div>
                </div>
            </footer>
        </div>
    );
}
