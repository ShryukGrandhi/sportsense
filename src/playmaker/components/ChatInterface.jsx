import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, Paperclip, Sparkles, Image, MapPin } from 'lucide-react';
import { Button } from './ui/button';
import { useChatMessages } from '../hooks/useChat';
import { useAuth } from '../context/AuthContext';
import { chatAPI } from '../services/api';
import RichMessageBubble from './RichMessageBubble';

const MessageBubble = ({ message, isUser, isTyping = false }) => {
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6`}>
      <div className={`flex max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'} items-end space-x-3`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
          isUser ? 'bg-sky-500 text-white ml-3' : 'bg-gray-700 text-gray-300 mr-3'
        }`}>
          {isUser ? 'You' : 'AI'}
        </div>
        <div className={`px-4 py-3 rounded-2xl ${
          isUser 
            ? 'bg-sky-500 text-white rounded-br-md' 
            : 'bg-gray-800 text-gray-100 rounded-bl-md border border-gray-700'
        }`}>
          {isTyping ? (
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
            </div>
          ) : (
            <div className="whitespace-pre-wrap">{message.content}</div>
          )}
        </div>
      </div>
    </div>
  );
};

const CategoryPill = ({ label, isActive, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-3 rounded-full text-sm font-medium transition-all duration-200 ${
        isActive 
          ? 'bg-white text-gray-900' 
          : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-600'
      }`}
    >
      {label}
    </button>
  );
};

const ChatInterface = ({ activeChatId, onChatCreate }) => {
  const { user } = useAuth();
  const [inputValue, setInputValue] = useState('');
  const [activeCategory, setActiveCategory] = useState('Trending');
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const messagesEndRef = useRef(null);

  const { messages, loading, sending, sendMessage, loadMessages } = useChatMessages(activeChatId);

  const categories = ['Trending', 'NFL', 'NBA', 'Football', 'Baseball'];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending]);

  const handleSendMessage = async (messageText = inputValue) => {
    
    if (!messageText.trim()) {
      return;
    }

    try {
      let chatId = activeChatId;
      
      // Create new chat if we don't have one
      if (!chatId) {
        setIsCreatingChat(true);
        try {
          const newChat = await chatAPI.createChat();
          chatId = newChat._id || newChat.id; // Handle both _id and id fields
          onChatCreate(chatId);
          setIsCreatingChat(false);
        } catch (chatError) {
          console.error('❌ Chat creation failed:', chatError);
          setIsCreatingChat(false);
          alert('Failed to create chat: ' + chatError.message);
          return;
        }
      }

      // Send message
      try {
        await sendMessage(messageText.trim(), chatId); // Pass the current chatId explicitly
        setInputValue('');
      } catch (messageError) {
        console.error('❌ Message send failed:', messageError);
        alert('Failed to send message: ' + messageError.message);
      }
      
    } catch (error) {
      console.error('❌ Complete error in handleSendMessage:', error);
      setIsCreatingChat(false);
      alert('Something went wrong: ' + error.message);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const isWelcomeScreen = !activeChatId && messages.length === 0 && !isCreatingChat;
  const showMessages = activeChatId && messages.length > 0;

  // Debug logging
    activeChatId,
    messagesLength: messages.length,
    isWelcomeScreen,
    showMessages,
    isCreatingChat,
    sending,
    loading
  });

  return (
    <div className="flex flex-col h-full min-h-0 relative">
      {/* Welcome Screen */}
      {isWelcomeScreen && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-32">
          {/* Logo and Title */}
          <div className="text-center mb-8">
            <h1 className="text-6xl font-bold bg-gradient-to-r from-sky-400 to-blue-600 bg-clip-text text-transparent mb-4">
              PLAYMAKER
            </h1>
            <p className="text-xl text-sky-400 font-medium">
              Where AI Meets Sports Fans
            </p>
          </div>
          
          {/* Category Pills */}
          <div className="flex flex-wrap gap-3 mb-12 justify-center">
            {categories.map((category) => (
              <CategoryPill
                key={category}
                label={category}
                isActive={activeCategory === category}
                onClick={() => setActiveCategory(category)}
              />
            ))}
          </div>

          {/* Centered Input Area */}
          <div className="w-full max-w-4xl mt-16">
            <div className="relative">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="JUST ASK."
                rows={4}
                className="w-full bg-gray-800 border-gray-700 text-white pl-6 pr-40 py-6 text-lg rounded-3xl focus:border-sky-500 focus:ring-sky-500 focus:ring-1 resize-none min-h-[80px] leading-relaxed placeholder-transparent"
                style={{ lineHeight: '1.6' }}
                disabled={isCreatingChat || sending}
              />
              
              {/* Custom Placeholder with PLAYMAKER styling */}
              {!inputValue && (
                <div className="absolute left-6 top-6 pointer-events-none">
                  <span className="text-2xl font-bold bg-gradient-to-r from-sky-400 to-blue-600 bg-clip-text text-transparent">
                    JUST ASK.
                  </span>
                </div>
              )}
              
              {/* Input Controls */}
              <div className="absolute right-4 bottom-4 flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="p-3 h-10 w-10 text-gray-400 hover:text-sky-400 hover:bg-gray-700 rounded-xl"
                >
                  <Image size={20} />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="p-3 h-10 w-10 text-gray-400 hover:text-sky-400 hover:bg-gray-700 rounded-xl"
                >
                  <Paperclip size={20} />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="p-3 h-10 w-10 text-gray-400 hover:text-sky-400 hover:bg-gray-700 rounded-xl"
                >
                  <MapPin size={20} />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="p-3 h-10 w-10 text-gray-400 hover:text-sky-400 hover:bg-gray-700 rounded-xl"
                >
                  <Mic size={20} />
                </Button>
                <button
                  onClick={() => {
                    handleSendMessage();
                  }}
                  disabled={!inputValue.trim() || isCreatingChat || sending}
                  className="bg-sky-500 hover:bg-sky-600 text-white p-3 h-10 w-10 rounded-xl transition-all duration-200 disabled:opacity-50"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
            
            {/* Bottom indicator */}
            <div className="flex justify-center mt-6">
              <div className="w-3 h-3 bg-gray-600 rounded-full"></div>
            </div>
          </div>
        </div>
      )}

      {/* Messages Area */}
      {showMessages && (
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 pb-32" data-testid="messages">
          {loading && messages.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-400">Loading messages...</div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <RichMessageBubble
                  key={message.id}
                  message={message}
                  isUser={message.type === 'user'}
                />
              ))}
              {sending && (
                <RichMessageBubble message={{}} isUser={false} isTyping={true} />
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      )}

      {/* Input Area - Only show at bottom when NOT in welcome screen mode */}
      {!isWelcomeScreen && (
        <div className="absolute bottom-0 left-0 right-0 p-8 bg-gray-950/95 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto">
            <div className="relative">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="JUST ASK."
                rows={4}
                className="w-full bg-gray-800 border-gray-700 text-white pl-6 pr-40 py-6 text-lg rounded-3xl focus:border-sky-500 focus:ring-sky-500 focus:ring-1 resize-none min-h-[80px] leading-relaxed placeholder-transparent"
                style={{ lineHeight: '1.6' }}
                disabled={sending || isCreatingChat}
              />
              
              {/* Custom Placeholder with PLAYMAKER styling */}
              {!inputValue && (
                <div className="absolute left-6 top-6 pointer-events-none">
                  <span className="text-2xl font-bold bg-gradient-to-r from-sky-400 to-blue-600 bg-clip-text text-transparent">
                    JUST ASK.
                  </span>
                </div>
              )}
              
              {/* Input Controls */}
              <div className="absolute right-4 bottom-4 flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="p-3 h-10 w-10 text-gray-400 hover:text-sky-400 hover:bg-gray-700 rounded-xl"
                >
                  <Image size={20} />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="p-3 h-10 w-10 text-gray-400 hover:text-sky-400 hover:bg-gray-700 rounded-xl"
                >
                  <Paperclip size={20} />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="p-3 h-10 w-10 text-gray-400 hover:text-sky-400 hover:bg-gray-700 rounded-xl"
                >
                  <MapPin size={20} />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="p-3 h-10 w-10 text-gray-400 hover:text-sky-400 hover:bg-gray-700 rounded-xl"
                >
                  <Mic size={20} />
                </Button>
                <button
                  onClick={() => {
                    handleSendMessage();
                  }}
                  disabled={!inputValue.trim() || sending || isCreatingChat}
                  className="bg-sky-500 hover:bg-sky-600 text-white p-3 h-10 w-10 rounded-xl transition-all duration-200 disabled:opacity-50"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
            
            {/* Status indicators */}
            <div className="flex justify-center items-center mt-6 space-x-4">
              <div className="w-3 h-3 bg-gray-600 rounded-full"></div>
              {sending && <div className="text-xs text-gray-400">AI is thinking...</div>}
              {isCreatingChat && <div className="text-xs text-gray-400">Creating chat...</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatInterface;
