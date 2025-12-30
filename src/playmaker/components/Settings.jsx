import React, { useState } from 'react';
import { X, Bell, Crown, User, CreditCard, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Settings = ({ onClose }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('account');

  return (
    <div className="h-full bg-[#0a0a0a] overflow-y-auto animate-slide-up" style={{ maxHeight: '100%' }}>
      <div className="max-w-4xl mx-auto px-8 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-3xl font-light text-white tracking-wide mb-2">Settings</h1>
            <p className="text-xs text-gray-600 uppercase tracking-wider">Manage your account and preferences</p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#111111] transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          )}
        </div>

        <div className="flex gap-8">
          {/* Sidebar */}
          <div className="w-48 flex-shrink-0">
            <div className="space-y-1">
              <button
                onClick={() => setActiveTab('account')}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${activeTab === 'account'
                    ? 'bg-[#111111] text-white border-l-2 border-white'
                    : 'text-gray-600 hover:text-white hover:bg-[#111111]'
                  }`}
              >
                <User className="w-4 h-4" />
                <span>Account</span>
              </button>

              <button
                onClick={() => setActiveTab('notifications')}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${activeTab === 'notifications'
                    ? 'bg-[#111111] text-white border-l-2 border-white'
                    : 'text-gray-600 hover:text-white hover:bg-[#111111]'
                  }`}
              >
                <Bell className="w-4 h-4" />
                <span>Notifications</span>
              </button>

              <button
                onClick={() => setActiveTab('subscription')}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${activeTab === 'subscription'
                    ? 'bg-[#111111] text-white border-l-2 border-white'
                    : 'text-gray-600 hover:text-white hover:bg-[#111111]'
                  }`}
              >
                <Crown className="w-4 h-4" />
                <span>Subscription</span>
              </button>

              <button
                onClick={() => setActiveTab('privacy')}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${activeTab === 'privacy'
                    ? 'bg-[#111111] text-white border-l-2 border-white'
                    : 'text-gray-600 hover:text-white hover:bg-[#111111]'
                  }`}
              >
                <Shield className="w-4 h-4" />
                <span>Privacy</span>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
            {activeTab === 'account' && (
              <div className="space-y-8">
                <div className="bg-[#111111] border border-[#1a1a1a] p-8">
                  <h2 className="text-lg font-light text-white mb-6 uppercase tracking-wider">Account Information</h2>
                  <div className="space-y-6">
                    <div>
                      <label className="text-xs text-gray-600 uppercase tracking-wider mb-2 block">Username</label>
                      <input
                        type="text"
                        value={user?.username || ''}
                        className="w-full bg-[#0a0a0a] border border-[#1a1a1a] text-white px-4 py-3 text-sm focus:border-white focus:outline-none"
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 uppercase tracking-wider mb-2 block">Email</label>
                      <input
                        type="email"
                        value={user?.email || ''}
                        className="w-full bg-[#0a0a0a] border border-[#1a1a1a] text-white px-4 py-3 text-sm focus:border-white focus:outline-none"
                        readOnly
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-8">
                <div className="bg-[#111111] border border-[#1a1a1a] p-8">
                  <h2 className="text-lg font-light text-white mb-6 uppercase tracking-wider">Notification Preferences</h2>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-white text-sm font-medium mb-1">Game Scores</h3>
                        <p className="text-gray-600 text-xs">Get notified when your favorite teams play</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-[#1a1a1a] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-white peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-white"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-white text-sm font-medium mb-1">Trade Updates</h3>
                        <p className="text-gray-600 text-xs">Receive updates on player trades and news</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-[#1a1a1a] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-white peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-white"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-white text-sm font-medium mb-1">Injury Reports</h3>
                        <p className="text-gray-600 text-xs">Stay updated on player injuries</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" />
                        <div className="w-11 h-6 bg-[#1a1a1a] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-white peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-white"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'subscription' && (
              <div className="space-y-8">
                {/* Current Plan */}
                <div className="bg-[#111111] border border-[#1a1a1a] p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-lg font-light text-white mb-2 uppercase tracking-wider">Current Plan</h2>
                      <p className="text-xs text-gray-600 uppercase tracking-wider">Free</p>
                    </div>
                  </div>
                </div>

                {/* Upgrade to Pro */}
                <div className="bg-[#111111] border border-white p-12">
                  <div className="text-center mb-8">
                    <div className="w-20 h-20 border-2 border-white flex items-center justify-center mx-auto mb-6">
                      <Crown className="w-10 h-10 text-white" />
                    </div>
                    <h2 className="text-3xl font-light text-white mb-4 tracking-wide">Upgrade to Pro</h2>
                    <p className="text-sm text-gray-500 mb-8 leading-relaxed max-w-md mx-auto">
                      Get unlimited chats, priority support, advanced analytics, and exclusive features
                    </p>
                  </div>

                  <div className="space-y-4 mb-8 max-w-md mx-auto">
                    <div className="flex items-start gap-4">
                      <div className="w-1.5 h-1.5 bg-white mt-2"></div>
                      <div>
                        <h3 className="text-white text-sm font-medium mb-1">Unlimited Conversations</h3>
                        <p className="text-gray-600 text-xs">No limits on AI interactions</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-1.5 h-1.5 bg-white mt-2"></div>
                      <div>
                        <h3 className="text-white text-sm font-medium mb-1">Priority Support</h3>
                        <p className="text-gray-600 text-xs">Faster response times and dedicated help</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-1.5 h-1.5 bg-white mt-2"></div>
                      <div>
                        <h3 className="text-white text-sm font-medium mb-1">Advanced Analytics</h3>
                        <p className="text-gray-600 text-xs">Deep insights and data visualizations</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-1.5 h-1.5 bg-white mt-2"></div>
                      <div>
                        <h3 className="text-white text-sm font-medium mb-1">Ad-Free Experience</h3>
                        <p className="text-gray-600 text-xs">Clean, uninterrupted interface</p>
                      </div>
                    </div>
                  </div>

                  <div className="text-center">
                    <a
                      href="/pricing"
                      className="inline-block bg-white text-[#0a0a0a] px-12 py-4 text-sm font-medium uppercase tracking-wider transition-all hover:bg-gray-100 hover:scale-[1.02]"
                    >
                      Upgrade to Pro
                    </a>
                    <p className="text-xs text-gray-600 mt-4 uppercase tracking-wider">7-day free trial available</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'privacy' && (
              <div className="space-y-8">
                <div className="bg-[#111111] border border-[#1a1a1a] p-8">
                  <h2 className="text-lg font-light text-white mb-6 uppercase tracking-wider">Privacy & Security</h2>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-white text-sm font-medium mb-2">Data Usage</h3>
                      <p className="text-gray-600 text-xs leading-relaxed mb-4">
                        Your chat data is stored securely and used only to improve your experience. We never share your data with third parties.
                      </p>
                    </div>
                    <div>
                      <h3 className="text-white text-sm font-medium mb-2">Account Security</h3>
                      <p className="text-gray-600 text-xs leading-relaxed mb-4">
                        Your account is protected with industry-standard encryption. Change your password regularly for best security.
                      </p>
                      <button className="border border-[#1a1a1a] px-6 py-2 text-white text-xs uppercase tracking-wider hover:border-white transition-colors">
                        Change Password
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;

