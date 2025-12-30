'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { Zap, TrendingUp, Users, Mic, ChevronRight, Trophy, BarChart3, Play, ArrowRight, Sparkles, Globe, Shield, Clock, Star } from 'lucide-react';

// Animated counter hook
function useCountUp(target: number, duration: number = 2000, start: boolean = false) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!start) return;

    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * target));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [target, duration, start]);

  return count;
}

// Intersection observer hook
function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsInView(entry.isIntersecting),
      { threshold }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isInView };
}

export default function LandingPage() {
  const [isLoaded, setIsLoaded] = useState(false);
  const statsSection = useInView();

  const userCount = useCountUp(50000, 2000, statsSection.isInView);
  const queriesCount = useCountUp(1000000, 2500, statsSection.isInView);
  const sportsCount = useCountUp(25, 1500, statsSection.isInView);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden">
      {/* Animated Background Grid */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100px_100px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,black,transparent)]" />
      </div>

      {/* Floating Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '6s', animationDelay: '2s' }} />
      </div>

      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-700 ${isLoaded ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
        <div className="bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/5">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="text-2xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-white via-white to-gray-400 bg-clip-text text-transparent">
                SPORTSENSE
              </span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <Link href="#features" className="text-sm text-gray-400 hover:text-white transition-colors duration-300">
                Features
              </Link>
              <Link href="/pricing" className="text-sm text-gray-400 hover:text-white transition-colors duration-300">
                Pricing
              </Link>
              <Link href="#sports" className="text-sm text-gray-400 hover:text-white transition-colors duration-300">
                Sports
              </Link>
            </div>
            <Link
              href="/app"
              className="group relative bg-white text-[#0a0a0a] px-6 py-2.5 text-sm font-medium overflow-hidden transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,255,255,0.3)]"
            >
              <span className="relative z-10 flex items-center gap-2">
                Launch App
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="min-h-screen flex flex-col items-center justify-center px-6 pt-20 relative">
        <div className="text-center max-w-5xl mx-auto">
          {/* Badge */}
          <div className={`transition-all duration-1000 delay-300 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 px-5 py-2.5 rounded-full text-xs uppercase tracking-wider text-indigo-300 mb-8 backdrop-blur-sm">
              <Sparkles className="w-4 h-4 animate-pulse" />
              AI-Powered Sports Intelligence
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse ml-2" />
            </div>
          </div>

          {/* Main Headline */}
          <h1 className={`text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-bold tracking-tighter mb-6 transition-all duration-1000 delay-500 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            <span className="block bg-gradient-to-b from-white via-white to-gray-500 bg-clip-text text-transparent">
              SPORTSENSE
            </span>
          </h1>

          {/* Animated Line */}
          <div className={`flex items-center justify-center gap-4 mb-8 transition-all duration-1000 delay-700 ${isLoaded ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}>
            <div className="h-px w-24 bg-gradient-to-r from-transparent to-white/50" />
            <div className="w-3 h-3 border-2 border-white/50 rotate-45" />
            <div className="h-px w-24 bg-gradient-to-l from-transparent to-white/50" />
          </div>

          {/* Tagline */}
          <p className={`text-lg sm:text-xl md:text-2xl text-gray-400 font-light mb-12 max-w-2xl mx-auto leading-relaxed transition-all duration-1000 delay-900 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            Real-time scores. <span className="text-white">AI analysis.</span> Player comparisons.
            <br />
            <span className="text-sm text-gray-500">Your ultimate sports intelligence platform.</span>
          </p>

          {/* CTA Buttons */}
          <div className={`flex flex-col sm:flex-row items-center justify-center gap-4 transition-all duration-1000 delay-1100 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            <Link
              href="/app"
              className="group relative bg-white text-[#0a0a0a] px-10 py-4 text-base font-semibold overflow-hidden transition-all duration-500 hover:shadow-[0_0_50px_rgba(255,255,255,0.4)] hover:scale-105"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <span className="relative z-10 flex items-center gap-2 group-hover:text-white transition-colors">
                Get Started Free
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-2" />
              </span>
            </Link>
            <Link
              href="/pricing"
              className="group border border-white/20 text-white px-10 py-4 text-base font-semibold transition-all duration-500 hover:border-white/60 hover:bg-white/5"
            >
              <span className="flex items-center gap-2">
                View Pricing
                <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className={`absolute bottom-8 left-1/2 transform -translate-x-1/2 transition-all duration-1000 delay-1500 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          <div className="flex flex-col items-center gap-2 text-gray-600">
            <span className="text-xs uppercase tracking-wider">Scroll to explore</span>
            <div className="w-5 h-8 border border-white/20 rounded-full flex justify-center pt-2">
              <div className="w-1 h-2 bg-white/50 rounded-full animate-bounce" />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section ref={statsSection.ref} className="py-24 px-6 border-t border-white/5 relative">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className={`text-center p-8 bg-gradient-to-b from-white/5 to-transparent border border-white/5 rounded-2xl transition-all duration-1000 ${statsSection.isInView ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
              <div className="text-5xl md:text-6xl font-bold mb-2 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                {userCount.toLocaleString()}+
              </div>
              <div className="text-gray-500 uppercase tracking-wider text-sm">Active Users</div>
            </div>
            <div className={`text-center p-8 bg-gradient-to-b from-white/5 to-transparent border border-white/5 rounded-2xl transition-all duration-1000 delay-200 ${statsSection.isInView ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
              <div className="text-5xl md:text-6xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                {(queriesCount / 1000).toFixed(0)}K+
              </div>
              <div className="text-gray-500 uppercase tracking-wider text-sm">AI Queries / Month</div>
            </div>
            <div className={`text-center p-8 bg-gradient-to-b from-white/5 to-transparent border border-white/5 rounded-2xl transition-all duration-1000 delay-400 ${statsSection.isInView ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
              <div className="text-5xl md:text-6xl font-bold mb-2 bg-gradient-to-r from-pink-400 to-orange-400 bg-clip-text text-transparent">
                {sportsCount}+
              </div>
              <div className="text-gray-500 uppercase tracking-wider text-sm">Leagues Covered</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-full text-xs uppercase tracking-wider text-gray-400 mb-6">
              <Zap className="w-3 h-3" />
              Features
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
              <span className="bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                Powerful Features
              </span>
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">Everything you need for comprehensive sports intelligence</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Trophy, title: 'Live Scores', desc: 'Real-time scores from NFL, NBA, MLB, NHL, and Soccer leagues worldwide.', color: 'from-amber-500 to-orange-500' },
              { icon: BarChart3, title: 'AI Analysis', desc: 'Deep AI-powered insights on players, teams, and game statistics.', color: 'from-blue-500 to-cyan-500' },
              { icon: Users, title: 'Player Compare', desc: 'Compare players side-by-side with comprehensive stat breakdowns.', color: 'from-purple-500 to-pink-500' },
              { icon: Mic, title: 'Voice AI', desc: 'Ask questions using voice with our Pulse AI voice recognition.', color: 'from-green-500 to-emerald-500' },
            ].map((feature, idx) => (
              <div
                key={idx}
                className="group relative bg-gradient-to-b from-white/5 to-transparent border border-white/5 rounded-2xl p-8 transition-all duration-500 hover:border-white/20 hover:shadow-[0_0_50px_rgba(255,255,255,0.1)] hover:-translate-y-2"
              >
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} p-0.5 mb-6 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3`}>
                  <div className="w-full h-full bg-[#0a0a0a] rounded-xl flex items-center justify-center">
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-3 text-white group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-300 group-hover:bg-clip-text transition-all">
                  {feature.title}
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sports Coverage */}
      <section id="sports" className="py-24 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-full text-xs uppercase tracking-wider text-gray-400 mb-6">
              <Globe className="w-3 h-3" />
              Coverage
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">All Major Sports</h2>
            <p className="text-gray-500">Comprehensive coverage across leagues worldwide</p>
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            {['NFL', 'NBA', 'MLB', 'NHL', 'NCAA', 'Premier League', 'La Liga', 'Champions League', 'MLS', 'Serie A'].map((sport, idx) => (
              <div
                key={sport}
                className="group bg-white/5 border border-white/10 px-8 py-4 rounded-xl hover:border-white/30 hover:bg-white/10 transition-all duration-500 cursor-pointer hover:scale-105"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <span className="text-sm font-medium uppercase tracking-wider group-hover:text-white transition-colors">{sport}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-6 border-t border-white/5 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 via-transparent to-transparent" />
        <div className="max-w-3xl mx-auto text-center relative">
          <h2 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">
            Ready to dominate <br />
            <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">your sports knowledge?</span>
          </h2>
          <p className="text-gray-400 mb-10 text-lg leading-relaxed">
            Join thousands of sports fans using SportSense for real-time insights, AI-powered analysis, and comprehensive coverage.
          </p>
          <Link
            href="/app"
            className="group inline-flex items-center gap-3 bg-white text-[#0a0a0a] px-12 py-5 text-lg font-semibold transition-all duration-500 hover:shadow-[0_0_60px_rgba(255,255,255,0.4)] hover:scale-105"
          >
            Launch App Free
            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-2" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-xl font-bold tracking-tight">SPORTSENSE</div>
          <div className="flex items-center gap-8 text-sm text-gray-500">
            <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
            <Link href="#features" className="hover:text-white transition-colors">Features</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
          </div>
          <div className="text-sm text-gray-600">
            © 2024 SportSense. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
