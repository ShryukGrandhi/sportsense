import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { Send, Paperclip, Image, MapPin, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { useChatMessages } from '../hooks/useChat';
import { useAuth } from '../context/AuthContext';
import { chatAPI } from '../services/api';
import PerplexityStyleMessage from './PerplexityStyleChat';

const PerplexityChatInterface = memo(({ activeChatId, onChatCreate, onShowPlayerComparison }) => {

const getSportSuggestions = (sport) => {
  const suggestions = {
    'NFL': [
      { title: 'Latest Scores', query: 'Show me the latest NFL scores from this week', description: 'Current game results' },
      { title: 'Standings', query: 'What are the current NFL standings by division?', description: 'Team rankings and records' },
      { title: 'Upcoming Games', query: 'What NFL games are scheduled for this weekend?', description: 'Next week\'s schedule' },
      { title: 'Player Stats', query: 'Show me the top NFL players this season', description: 'Leading performers' },
      { title: 'Trade News', query: 'What are the latest NFL trade rumors and news?', description: 'Transfer updates' },
      { title: 'Injuries', query: 'Show me the latest NFL injury reports', description: 'Player status updates' }
    ],
    'NBA': [
      { title: 'Latest Scores', query: 'Show me the latest NBA scores from last night', description: 'Current game results' },
      { title: 'Standings', query: 'What are the current NBA standings by conference?', description: 'Team rankings and records' },
      { title: 'Upcoming Games', query: 'What NBA games are on tonight?', description: 'Today\'s schedule' },
      { title: 'Player Stats', query: 'Show me the top NBA scorers this season', description: 'Leading performers' },
      { title: 'Trade News', query: 'What are the latest NBA trade rumors and news?', description: 'Transfer updates' },
      { title: 'Playoffs', query: 'Show me the current NBA playoff picture', description: 'Playoff standings' }
    ],
    'MLB': [
      { title: 'Latest Scores', query: 'Show me the latest MLB scores from yesterday', description: 'Current game results' },
      { title: 'Standings', query: 'What are the current MLB standings by division?', description: 'Team rankings and records' },
      { title: 'Upcoming Games', query: 'What MLB games are scheduled for today?', description: 'Today\'s schedule' },
      { title: 'Player Stats', query: 'Show me the top MLB hitters and pitchers', description: 'Leading performers' },
      { title: 'Trade News', query: 'What are the latest MLB trade rumors and news?', description: 'Transfer updates' },
      { title: 'Playoff Race', query: 'Show me the current MLB playoff standings', description: 'Playoff picture' }
    ],
    'NCAA': [
      { title: 'Football Scores', query: 'Show me the latest NCAA football scores', description: 'College football results' },
      { title: 'Basketball Scores', query: 'Show me the latest NCAA basketball scores', description: 'College basketball results' },
      { title: 'Rankings', query: 'What are the current NCAA football and basketball rankings?', description: 'Top 25 polls' },
      { title: 'Upcoming Games', query: 'What NCAA games are scheduled for this weekend?', description: 'Weekend schedule' },
      { title: 'March Madness', query: 'Show me the current NCAA basketball tournament bracket', description: 'Tournament updates' },
      { title: 'Recruiting', query: 'What are the latest NCAA recruiting news and commitments?', description: 'Recruit updates' }
    ],
    'NHL': [
      { title: 'Latest Scores', query: 'Show me the latest NHL scores from last night', description: 'Current game results' },
      { title: 'Standings', query: 'What are the current NHL standings by division?', description: 'Team rankings and records' },
      { title: 'Upcoming Games', query: 'What NHL games are on tonight?', description: 'Today\'s schedule' },
      { title: 'Player Stats', query: 'Show me the top NHL goal scorers and points leaders', description: 'Leading performers' },
      { title: 'Trade News', query: 'What are the latest NHL trade rumors and news?', description: 'Transfer updates' },
      { title: 'Playoffs', query: 'Show me the current NHL playoff standings', description: 'Playoff picture' }
    ],
    'Soccer': [
      { title: 'Premier League', query: 'Show me the latest Premier League scores and standings', description: 'English top flight' },
      { title: 'La Liga', query: 'Show me the latest La Liga scores and standings', description: 'Spanish top flight' },
      { title: 'Champions League', query: 'Show me the latest Champions League results', description: 'European competition' },
      { title: 'World Cup', query: 'Show me the latest international soccer news', description: 'National teams' },
      { title: 'Transfer News', query: 'What are the latest soccer transfer rumors and news?', description: 'Player transfers' },
      { title: 'MLS', query: 'Show me the latest MLS scores and standings', description: 'Major League Soccer' }
    ]
  };

  return suggestions[sport] || [];
};

const CategoryPill = memo(({ label, isActive, onClick }) => {
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

  const [inputValue, setInputValue] = useState('');
  const [activeCategory, setActiveCategory] = useState('Trending');
  const { user } = useAuth();
  const { messages, loading, sending, sendMessage } = useChatMessages(activeChatId);
  const messagesEndRef = useRef(null);
  const [userTriggeredScroll, setUserTriggeredScroll] = useState(false);

  const categories = ['Trending', 'NFL', 'NBA', 'MLB', 'NCAA', 'NHL', 'Soccer'];

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Only scroll when user explicitly sends a message
  useEffect(() => {
    if (userTriggeredScroll) {
      scrollToBottom();
      setUserTriggeredScroll(false);
    }
  }, [messages, userTriggeredScroll, scrollToBottom]);

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [inputValue]);

  const handleSendMessage = useCallback(async (messageText = inputValue) => {
    setUserTriggeredScroll(true);

    if (!messageText.trim()) {
      return;
    }

    try {
      // Send message and get response (which might include new chat ID)
      const result = await sendMessage(messageText.trim());

      setInputValue('');

      // If we created a new chat (activeChatId was null), notify parent
      if (!activeChatId && result && result.chatId) {
        onChatCreate(result.chatId);
      }
    } catch (error) {
      console.error('❌ Send message error:', error);
      alert('Something went wrong: ' + error.message);
    }
  }, [inputValue, activeChatId, sendMessage, onChatCreate]);

  const handleCategoryClick = async (category) => {
    setActiveCategory(category);

    // If it's a sport category, send a sport-specific query
    if (['NFL', 'NBA', 'MLB', 'NCAA', 'NHL', 'Soccer'].includes(category)) {
      const sportQueries = {
        'NFL': 'Show me the latest NFL scores and standings',
        'NBA': 'What are the current NBA standings and recent scores?',
        'MLB': 'Show me MLB scores and current standings',
        'NCAA': 'What are the latest NCAA football and basketball scores?',
        'NHL': 'Show me NHL scores and standings',
        'Soccer': 'What are the latest soccer scores from major leagues?'
      };

      const query = sportQueries[category];
      setInputValue(query);

      // Auto-send the query
      setTimeout(() => {
        handleSendMessage(query);
      }, 100);
    }
  };

  const isWelcomeScreen = !activeChatId && messages.length === 0 && !loading;
  const showMessages = activeChatId || messages.length > 0;

  // Debug logging
  console.log({
    activeChatId,
    messagesLength: messages.length,
    isWelcomeScreen,
    showMessages,
    loading,
    sending
  });

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a] overflow-hidden">
      {/* Welcome Screen */}
      {isWelcomeScreen && (
        <div className="flex-1 flex flex-col items-center justify-center px-8 py-16 max-w-5xl mx-auto w-full animate-slide-up">
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {getSportSuggestions(activeCategory).map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setInputValue(suggestion.query);
                      setTimeout(() => handleSendMessage(suggestion.query), 100);
                    }}
                    className="p-5 bg-[#111111] hover:bg-[#1a1a1a] border border-[#1a1a1a] hover:border-white/20 text-left transition-all duration-300 group hover:scale-[1.02] active:scale-[0.98] animate-slide-up"
                    style={{
                      animationDelay: `${index * 50}ms`,
                    }}
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
          {/* Messages Container */}
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden" data-testid="messages" style={{ WebkitOverflowScrolling: 'touch' }}>
            <div className="max-w-4xl mx-auto px-8 py-12">
              {loading && messages.length === 0 ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-gray-600 flex items-center space-x-2 text-sm uppercase tracking-wider">
                    <div className="w-1 h-1 bg-white rounded-full animate-bounce"></div>
                    <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <span className="ml-3">Loading...</span>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((message) => (
                    <PerplexityStyleMessage
                      key={message.id}
                      message={message}
                      isUser={message.type === 'user'}
                    />
                  ))}
                  {sending && (
                    <PerplexityStyleMessage message={{}} isUser={false} isTyping={true} />
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
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
});

export default PerplexityChatInterface;
