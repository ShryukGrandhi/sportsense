import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles } from 'lucide-react';
import StructuredContentRenderer from './StructuredContentRenderer';

const SimpleChatInterface = () => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);  // Store session ID for context
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    
    // Add user message to chat
    const newUserMessage = {
      id: Date.now(),
      content: userMessage,
      role: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, newUserMessage]);
    setIsLoading(true);

    try {
      // Call the public chatbot API
      const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';
      const response = await fetch(`${BACKEND_URL}/api/chatbot/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: userMessage,
          session_id: sessionId  // Include session_id for context continuity
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Store session_id from response for future queries
      if (data.session_id && !sessionId) {
        setSessionId(data.session_id);
        console.log('🔗 Session started:', data.session_id);
      }

      // Add AI response to chat
      const aiMessage = {
        id: Date.now() + 1,
        content: data.response || data.text_response || 'Sorry, I could not process your request.',
        role: 'assistant',
        timestamp: new Date(),
        sources: data.sources || [],
        cards: data.chat_answer?.cards || []  // Extract cards from chat_answer
      };

      setMessages(prev => [...prev, aiMessage]);
      
    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage = {
        id: Date.now() + 1,
        content: 'Sorry, I encountered an error. Please try again.',
        role: 'assistant',
        timestamp: new Date(),
        isError: true
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatMessage = (content) => {
    return content.split('\n').map((line, index) => (
      <React.Fragment key={index}>
        {line}
        {index < content.split('\n').length - 1 && <br />}
      </React.Fragment>
    ));
  };

  return (
    <div className="h-full flex flex-col bg-gray-950">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-900/50">
        <div className="flex items-center space-x-4">
          <h1 className="text-lg font-semibold text-white">PLAYMAKER Sports AI</h1>
          <div className="flex items-center space-x-2 text-sm text-gray-400">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span>AI Online</span>
          </div>
        </div>
        <div className="text-sm text-gray-400">Just Ask.</div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-sky-400 to-blue-600 rounded-full flex items-center justify-center mb-6">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-semibold text-white mb-2">Welcome to PLAYMAKER</h2>
            <p className="text-gray-400 mb-8 max-w-md">
              Your AI-powered sports companion. Ask me about scores, stats, players, teams, or any sports-related questions!
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl">
              <button
                onClick={() => setInputValue("What are the latest NBA scores?")}
                className="p-4 bg-gray-800 hover:bg-gray-700 rounded-lg text-left transition-colors"
              >
                <div className="text-white font-medium">Latest Scores</div>
                <div className="text-gray-400 text-sm">Get current game results</div>
              </button>
              <button
                onClick={() => setInputValue("Tell me about LeBron James stats")}
                className="p-4 bg-gray-800 hover:bg-gray-700 rounded-lg text-left transition-colors"
              >
                <div className="text-white font-medium">Player Stats</div>
                <div className="text-gray-400 text-sm">Learn about your favorite players</div>
              </button>
              <button
                onClick={() => setInputValue("What NFL games are this weekend?")}
                className="p-4 bg-gray-800 hover:bg-gray-700 rounded-lg text-left transition-colors"
              >
                <div className="text-white font-medium">Upcoming Games</div>
                <div className="text-gray-400 text-sm">Check the schedule</div>
              </button>
              <button
                onClick={() => setInputValue("Who won the last World Cup?")}
                className="p-4 bg-gray-800 hover:bg-gray-700 rounded-lg text-left transition-colors"
              >
                <div className="text-white font-medium">Sports History</div>
                <div className="text-gray-400 text-sm">Explore past events</div>
              </button>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`mb-6 flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-sky-500 text-white'
                  : message.isError
                  ? 'bg-red-900/50 text-red-200 border border-red-700'
                  : 'bg-gray-800 text-white border border-gray-700'
              }`}
            >
              <div className="text-sm">
                {formatMessage(message.content)}
              </div>

              {/* Render data cards if present */}
              {message.cards && message.cards.length > 0 && (
                <div className="mt-4">
                  <StructuredContentRenderer contentItems={message.cards} activeMediaTab="All" />
                </div>
              )}

              {message.sources && message.sources.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-600">
                  <div className="text-xs text-gray-400">
                    Sources: {message.sources.join(', ')}
                  </div>
                </div>
              )}
              <div className="text-xs text-gray-400 mt-1">
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="mb-6 flex justify-start">
            <div className="bg-gray-800 text-white border border-gray-700 rounded-2xl px-4 py-3">
              <div className="flex items-center space-x-2">
                <div className="animate-spin w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full"></div>
                <span className="text-sm text-gray-300">AI is thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-800 bg-gray-900/50 p-6">
        <div className="flex items-end space-x-4">
          <div className="flex-1 relative">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about sports scores, stats, teams, players..."
              className="w-full px-4 py-3 pr-12 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-400 resize-none focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400"
              rows={1}
              disabled={isLoading}
            />
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            className="bg-sky-500 hover:bg-sky-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white p-3 rounded-xl transition-all duration-200"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SimpleChatInterface;
