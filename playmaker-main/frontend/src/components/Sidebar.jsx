import React, { useState, memo, useCallback } from 'react';
import {
  Plus,
  TrendingUp,
  Bell,
  Crown,
  User,
  Download,
  MessageSquare,
  Settings,
  LogOut,
  Activity,
  Users
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../hooks/useChat';

const SidebarItem = memo(({ icon: Icon, label, isActive = false, badge = null, onClick, isExpanded }) => {
  return (
    <div className="relative mx-2">
      <button
        onClick={onClick}
        className={`w-full flex items-center space-x-4 px-4 py-3 transition-all duration-200 ease-out group ${isActive
            ? 'text-white bg-[#1a1a1a]'
            : 'text-gray-500 hover:text-white hover:bg-[#111111]'
          }`}
      >
        <Icon size={18} className="flex-shrink-0" />
        <div className={`flex items-center justify-between flex-1 transition-all duration-200 ease-out ${isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-3 pointer-events-none'
          }`}>
          <span className="text-xs font-medium tracking-wide uppercase truncate">{label}</span>
          {badge && (
            <span className="ml-auto text-[10px] text-gray-600 bg-[#0a0a0a] px-1.5 py-0.5 rounded">
              {badge}
            </span>
          )}
        </div>
      </button>
      {/* Active indicator - left border */}
      {isActive && (
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-white transition-all duration-200 ease-out"></div>
      )}
    </div>
  );
});

const TrendingItem = memo(({ topic, isExpanded }) => {
  return (
    <div className={`flex items-center space-x-3 px-4 py-2.5 hover:bg-[#111111] cursor-pointer transition-colors duration-150 ${!isExpanded ? 'justify-center' : ''
      }`}>
      <div className="w-1 h-1 bg-white flex-shrink-0"></div>
      {isExpanded && (
        <div className="flex-1 min-w-0">
          <p className="text-xs text-white truncate font-medium">{topic.title}</p>
          <p className="text-[10px] text-gray-600 uppercase tracking-wide mt-0.5">{topic.sport}</p>
        </div>
      )}
    </div>
  );
});

const ChatHistoryItem = memo(({ chat, isExpanded, isActive, onClick }) => {
  return (
    <div className="relative mx-2">
      <button
        onClick={onClick}
        className={`w-full flex items-center space-x-3 px-4 py-2 transition-all duration-200 ease-out ${isActive
            ? 'text-white bg-[#1a1a1a]'
            : 'text-gray-500 hover:text-white hover:bg-[#111111]'
          } ${!isExpanded ? 'justify-center' : ''}`}
      >
        <MessageSquare size={14} className="flex-shrink-0" />
        <span className={`text-xs truncate text-left font-medium transition-all duration-200 ease-out ${isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-3 pointer-events-none'
          }`}>
          {chat.title}
        </span>
      </button>
      {/* Active indicator - left border */}
      {isActive && (
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-white transition-all duration-200 ease-out"></div>
      )}
    </div>
  );
});

const Sidebar = memo(({ activeSection, onSectionChange, activeChatId, onChatSelect }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { user, logout } = useAuth();
  const { chats, loading: chatsLoading } = useChat();

  const handleMouseEnter = useCallback(() => setIsExpanded(true), []);
  const handleMouseLeave = useCallback(() => setIsExpanded(false), []);

  // Mock trending topics - in real app this would come from useTrending hook
  const mockTrendingTopics = [
    { id: 1, title: 'NFL Trade Deadline Analysis', sport: 'NFL', engagement: 95 },
    { id: 2, title: 'NBA All-Star Weekend', sport: 'NBA', engagement: 89 },
    { id: 3, title: 'March Madness Predictions', sport: 'Basketball', engagement: 87 },
    { id: 4, title: 'MLB Spring Training', sport: 'Baseball', engagement: 76 },
    { id: 5, title: 'Premier League Title Race', sport: 'Soccer', engagement: 82 }
  ];

  return (
    <div
      className={`fixed left-0 top-0 h-full bg-[#111111] border-r border-[#1a1a1a] transition-all duration-300 ease-out z-50 ${isExpanded ? 'w-64' : 'w-[72px]'
        }`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-6 border-b border-[#1a1a1a]">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 border-2 border-white flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-xs">P</span>
            </div>
            <div className={`transition-all duration-200 ease-out ${isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-3 pointer-events-none'
              }`}>
              <h2 className="text-white font-bold text-sm tracking-wide uppercase mb-0.5">PLAYMAKER</h2>
              <p className="text-[10px] text-gray-600 uppercase tracking-wider">Sports</p>
            </div>
          </div>
        </div>

        {/* Main Navigation */}
        <div className="flex-1 p-2 space-y-1 flex flex-col justify-between">
          <div className="space-y-1">
            <SidebarItem
              icon={Plus}
              label="New Chat"
              isActive={activeSection === 'new-chat'}
              onClick={() => onSectionChange('new-chat')}
              isExpanded={isExpanded}
            />

            <SidebarItem
              icon={TrendingUp}
              label="Trending"
              isActive={activeSection === 'trending'}
              onClick={() => onSectionChange('trending')}
              isExpanded={isExpanded}
            />

            <SidebarItem
              icon={Users}
              label="Compare Players"
              isActive={activeSection === 'compare'}
              onClick={() => onSectionChange('compare')}
              isExpanded={isExpanded}
            />

            <SidebarItem
              icon={Bell}
              label="Notifications"
              badge="3"
              isActive={activeSection === 'notifications'}
              onClick={() => onSectionChange('notifications')}
              isExpanded={isExpanded}
            />

            <SidebarItem
              icon={Crown}
              label="PRO"
              isActive={activeSection === 'pro'}
              onClick={() => onSectionChange('pro')}
              isExpanded={isExpanded}
            />

            <SidebarItem
              icon={Activity}
              label="Pulse AI"
              isActive={activeSection === 'pulse-ai'}
              onClick={() => onSectionChange('pulse-ai')}
              isExpanded={isExpanded}
            />

            {/* Chat History */}
            {isExpanded && (
              <div className="pt-6">
                <h3 className="text-[10px] font-medium text-gray-600 uppercase tracking-wider mb-3 px-4">
                  Recent
                </h3>
                <div className="space-y-0.5 max-h-40 overflow-y-auto">
                  {chatsLoading ? (
                    <div className="px-4 py-4 text-center text-gray-600 text-xs">
                      Loading...
                    </div>
                  ) : chats.length > 0 ? (
                    chats.slice(0, 10).map((chat) => (
                      <ChatHistoryItem
                        key={chat.id}
                        chat={chat}
                        isExpanded={isExpanded}
                        isActive={activeChatId === chat.id}
                        onClick={() => onChatSelect(chat.id)}
                      />
                    ))
                  ) : (
                    <div className="px-4 py-4 text-center text-gray-600 text-xs">
                      No chats yet
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Trending Topics */}
            {isExpanded && activeSection === 'trending' && (
              <div className="pt-6">
                <h3 className="text-[10px] font-medium text-gray-600 uppercase tracking-wider mb-3 px-4">
                  Hot Topics
                </h3>
                <div className="space-y-0.5 max-h-48 overflow-y-auto">
                  {mockTrendingTopics.map((topic) => (
                    <TrendingItem
                      key={topic.id}
                      topic={topic}
                      isExpanded={isExpanded}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Icons - aligned with input box */}
          <div className="space-y-1 pb-20">
            <SidebarItem
              icon={User}
              label="Account"
              isActive={activeSection === 'account'}
              onClick={() => onSectionChange('account')}
              isExpanded={isExpanded}
            />

            <SidebarItem
              icon={Download}
              label="Install App"
              onClick={() => onSectionChange('install')}
              isExpanded={isExpanded}
            />
          </div>
        </div>

        {/* Bottom User Profile */}
        <div className="p-4 border-t border-[#1a1a1a]">
          <div className={`transition-all duration-200 ease-out ${isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-3 pointer-events-none'
            }`}>
            <div className="flex items-center space-x-3 px-2 py-2">
              <div className="w-8 h-8 border border-white flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-medium">
                  {user?.username?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white truncate font-medium uppercase tracking-wide">{user?.username || 'User'}</p>
                <p className="text-[10px] text-gray-600 uppercase tracking-wider mt-0.5">
                  {chats.length} chats
                </p>
              </div>
              <button
                onClick={logout}
                className="text-gray-600 hover:text-white transition-colors p-1.5"
                title="Logout"
              >
                <LogOut size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default Sidebar;