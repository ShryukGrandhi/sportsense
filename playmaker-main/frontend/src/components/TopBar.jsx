import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, ChevronDown, LogOut, Settings, User as UserIcon, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../hooks/useChat';

const TopBar = ({ activeChatId, onChatSelect, onNewChat, onShowSettings }) => {
  const { user, logout } = useAuth();
  const { chats, loading } = useChat();
  const [showChatDropdown, setShowChatDropdown] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const chatDropdownRef = useRef(null);
  const userMenuRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (chatDropdownRef.current && !chatDropdownRef.current.contains(event.target)) {
        setShowChatDropdown(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentChat = chats.find(chat => chat.id === activeChatId);

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-[#1a1a1a] bg-[#0a0a0a]">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 border-2 border-white flex items-center justify-center">
          <span className="text-white font-bold text-xs">P</span>
        </div>
        <span className="text-white font-bold text-sm tracking-wide uppercase">PLAYMAKER</span>
      </div>

      {/* Chat Selector Dropdown */}
      <div className="flex-1 max-w-md mx-8 relative" ref={chatDropdownRef}>
        <button
          onClick={() => setShowChatDropdown(!showChatDropdown)}
          className="w-full flex items-center justify-between px-4 py-2 bg-[#111111] border border-[#1a1a1a] hover:border-white/30 transition-colors"
        >
          <div className="flex items-center gap-3 min-w-0">
            <MessageSquare className="w-4 h-4 text-white flex-shrink-0" />
            <span className="text-white text-sm font-light truncate">
              {currentChat ? currentChat.title : 'New Chat'}
            </span>
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${showChatDropdown ? 'rotate-180' : ''}`} />
        </button>

        {/* Chat Dropdown */}
        {showChatDropdown && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-[#111111] border border-[#1a1a1a] z-50 max-h-96 overflow-y-auto">
            {/* New Chat Button */}
            <button
              onClick={() => {
                onNewChat();
                setShowChatDropdown(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#0a0a0a] transition-colors border-b border-[#1a1a1a]"
            >
              <MessageSquare className="w-4 h-4 text-white" />
              <span className="text-white text-sm font-light">New Chat</span>
            </button>

            {/* Chat List */}
            {loading ? (
              <div className="px-4 py-6 text-center text-gray-600 text-xs uppercase tracking-wider">
                Loading...
              </div>
            ) : chats.length > 0 ? (
              chats.slice(0, 20).map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => {
                    onChatSelect(chat.id);
                    setShowChatDropdown(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-[#0a0a0a] transition-colors text-left ${
                    activeChatId === chat.id ? 'bg-[#0a0a0a]' : ''
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
                  <span className="text-white text-sm font-light truncate flex-1">
                    {chat.title}
                  </span>
                </button>
              ))
            ) : (
              <div className="px-4 py-6 text-center text-gray-600 text-xs uppercase tracking-wider">
                No chats yet
              </div>
            )}
          </div>
        )}
      </div>

      {/* User Menu */}
      <div className="relative" ref={userMenuRef}>
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="flex items-center gap-3 px-3 py-2 hover:bg-[#111111] transition-colors"
        >
          <div className="w-8 h-8 border border-white flex items-center justify-center">
            <span className="text-white text-xs font-medium">
              {user?.username?.charAt(0)?.toUpperCase() || 'U'}
            </span>
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
        </button>

        {/* User Dropdown Menu */}
        {showUserMenu && (
          <div className="absolute top-full right-0 mt-1 bg-[#111111] border border-[#1a1a1a] z-50 min-w-[180px]">
            <div className="px-4 py-3 border-b border-[#1a1a1a]">
              <p className="text-white text-sm font-medium">{user?.username || 'User'}</p>
              <p className="text-gray-600 text-xs uppercase tracking-wider mt-0.5">
                {user?.email || ''}
              </p>
            </div>
            
            <button
              onClick={() => {
                setShowUserMenu(false);
                if (onShowSettings) {
                  onShowSettings();
                }
              }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#0a0a0a] transition-colors text-left"
            >
              <Settings className="w-4 h-4 text-gray-600" />
              <span className="text-white text-sm font-light">Settings</span>
            </button>

            <button
              onClick={() => {
                logout();
                setShowUserMenu(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#0a0a0a] transition-colors text-left"
            >
              <LogOut className="w-4 h-4 text-gray-600" />
              <span className="text-white text-sm font-light">Logout</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default TopBar;

