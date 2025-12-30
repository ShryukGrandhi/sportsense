import React, { useState, useEffect, lazy, Suspense } from 'react';
import "./App.css";
import { AuthProvider, useAuth } from './context/AuthContext';
import TopBar from './components/TopBar';

// Lazy load heavy components for better initial load time
const PerplexityChatInterface = lazy(() => import('./components/PerplexityChatInterface'));
const AuthModal = lazy(() => import('./components/AuthModal'));
const PlayerComparison = lazy(() => import('./components/PlayerComparison'));
const Settings = lazy(() => import('./components/Settings'));
const PulseAI = lazy(() => import('./components/PulseAI'));

const MainApp = () => {
  const { isAuthenticated, loading } = useAuth();
  const [activeChatId, setActiveChatId] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPlayerComparison, setShowPlayerComparison] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPulseAI, setShowPulseAI] = useState(false);

  const handleNewChat = () => {
    setActiveChatId(null);
    setShowPlayerComparison(false);
    setShowSettings(false);
    setShowPulseAI(false);
  };

  const handleChatSelect = (chatId) => {
    setActiveChatId(chatId);
    setShowPlayerComparison(false);
    setShowSettings(false);
    setShowPulseAI(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-white text-sm uppercase tracking-wider">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        <div className="flex items-center justify-center min-h-screen px-4">
          <div className="text-center max-w-2xl">
            <div className="mb-12">
              <div className="mb-6">
                <h1 className="text-7xl font-extrabold tracking-tight text-white mb-3 text-center">
                  PLAYMAKER
                </h1>
                <div className="h-1 w-24 bg-white mx-auto"></div>
              </div>
              <p className="text-lg text-gray-400 font-light tracking-wide uppercase letter-spacing-wider">
                Sports Intelligence Platform
              </p>
            </div>
            
            <button
              onClick={() => {
                try { console.log('[AUDIT][LOGIN] Manual trigger only'); } catch { }
                setShowAuthModal(true);
              }}
              className="bg-white text-[#0a0a0a] px-10 py-4 text-base font-semibold tracking-wide uppercase transition-all duration-300 hover:bg-gray-100 hover:scale-[1.02] active:scale-[0.98] mb-12"
            >
              Get Started
            </button>

            {/* Demo Credentials Display */}
            <div className="mt-16 pt-8 border-t border-gray-800">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-4">Demo Access</p>
              <div className="text-sm text-gray-400 space-y-1 font-mono">
                <p>Email: <span className="text-white">test@example.com</span></p>
                <p>Password: <span className="text-white">password123</span></p>
              </div>
              <p className="text-xs text-gray-600 mt-4 italic">
                * Run <code className="bg-[#111111] px-2 py-1 rounded">python -m backend.seed_demo_user</code> to create the demo user
              </p>
            </div>
          </div>
        </div>

        <Suspense fallback={<div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center"><div className="text-white">Loading...</div></div>}>
          <AuthModal
            isOpen={showAuthModal}
            onClose={() => setShowAuthModal(false)}
          />
        </Suspense>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Top Bar */}
      <TopBar
        activeChatId={activeChatId}
        onChatSelect={handleChatSelect}
        onNewChat={handleNewChat}
        onShowSettings={() => {
          setShowSettings(true);
          setShowPlayerComparison(false);
          setShowPulseAI(false);
        }}
      />

      {/* Main Content */}
      <main className="h-[calc(100vh-65px)] overflow-hidden bg-[#0a0a0a] relative">
        {showSettings ? (
          <Suspense fallback={
            <div className="flex items-center justify-center h-full page-transition">
              <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <div className="text-white text-sm uppercase tracking-wider">Loading Settings...</div>
              </div>
            </div>
          }>
            <div className="h-full overflow-hidden page-transition">
              <Settings onClose={() => setShowSettings(false)} />
            </div>
          </Suspense>
        ) : showPulseAI ? (
          <Suspense fallback={
            <div className="flex items-center justify-center h-full page-transition">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <div className="text-white text-sm uppercase tracking-wider">Loading Pulse AI...</div>
              </div>
            </div>
          }>
            <div className="h-full overflow-hidden page-transition">
              <PulseAI onClose={() => setShowPulseAI(false)} />
            </div>
          </Suspense>
        ) : showPlayerComparison ? (
          <Suspense fallback={
            <div className="flex items-center justify-center h-full page-transition">
              <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <div className="text-white text-sm uppercase tracking-wider">Loading Comparison...</div>
              </div>
            </div>
          }>
            <div className="h-full overflow-hidden page-transition">
              <PlayerComparison onClose={() => setShowPlayerComparison(false)} />
            </div>
          </Suspense>
        ) : (
          <Suspense fallback={
            <div className="flex items-center justify-center h-full page-transition">
              <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <div className="text-white text-sm uppercase tracking-wider">Loading Chat...</div>
              </div>
            </div>
          }>
            <div className="page-transition">
              <PerplexityChatInterface
                activeChatId={activeChatId}
                onChatCreate={handleChatSelect}
                onShowPlayerComparison={() => setShowPlayerComparison(true)}
              />
            </div>
          </Suspense>
        )}

        {/* Floating Action Buttons */}
        {!showPlayerComparison && !showSettings && !showPulseAI && (
          <>
            {/* Player Comparison Button */}
            <button
              onClick={() => setShowPlayerComparison(true)}
              className="fixed bottom-6 right-6 w-14 h-14 bg-white text-[#0a0a0a] flex items-center justify-center transition-all duration-300 hover:bg-gray-100 hover:scale-110 active:scale-95 z-40 rounded-full shadow-lg animate-float"
              aria-label="Compare Players"
              title="Compare Players"
              style={{ transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
            >
              <svg className="w-6 h-6 transition-transform duration-300 group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </button>

            {/* Pulse AI Button */}
            <button
              onClick={() => setShowPulseAI(true)}
              className="fixed bottom-6 right-[88px] w-14 h-14 bg-[#111111] border border-white text-white flex items-center justify-center transition-all duration-300 hover:bg-[#1a1a1a] hover:scale-110 active:scale-95 z-40 rounded-full shadow-lg animate-float-reverse group"
              aria-label="Pulse AI"
              title="Pulse AI - Recognize Sports Audio"
              style={{ transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
            >
              <svg className="w-6 h-6 transition-transform duration-300 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </button>
          </>
        )}
      </main>
    </div>
  );
};

function App() {
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = 'SportsSense';
    }
  }, []);
  return (
    <div className="App">
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </div>
  );
}

export default App;
