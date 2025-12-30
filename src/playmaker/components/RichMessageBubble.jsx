import React from 'react';
import ReactMarkdown from 'react-markdown';
import { formatChatText } from '@/utils/formatTextContent';
import ScoresCard from './sports/ScoresCard';
import StatisticsCard from './sports/StatisticsCard';
import HighlightsCard from './sports/HighlightsCard';
import PlayerCard from './sports/PlayerCard';

const RichMessageBubble = ({ message, isUser, isTyping = false }) => {
  // Regular message bubble for user messages or non-sports responses
  if (isUser || isTyping || !message.context?.highlightly_data) {
    return (
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6`}>
        <div className={`flex max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'} items-end space-x-3`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
            isUser ? 'bg-sky-500 text-white ml-3' : 'bg-gray-700 text-gray-300 mr-3'
          }`}>
            {isUser ? 'You' : 'AI'}
            {(() => { try { console.log('[AUDIT][AI_LABEL][RichMessageBubble]', isUser ? 'user' : (message?.role || 'assistant')); } catch {} return null })()}
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
              <div className="prose prose-invert max-w-none text-gray-200 text-sm leading-relaxed space-y-3">
                <ReactMarkdown>{formatChatText(message.content)}</ReactMarkdown>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Enhanced sports data message with rich cards
  const { highlightly_data, sportradar_data } = message.context;
  const highlightlyData = highlightly_data?.data || [];
  
  return (
    <div className="mb-8">
      {/* AI Avatar and Response Text */}
      <div className="flex justify-start mb-4">
        <div className="flex max-w-[80%] flex-row items-end space-x-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold bg-gray-700 text-gray-300 mr-3">
            AI
            {(() => { try { console.log('[AUDIT][AI_LABEL][RichMessageBubble]', message?.role || 'assistant', 'label=AI (rich)'); } catch {} return null })()}
          </div>
          <div className="px-4 py-3 rounded-2xl bg-gray-800 text-gray-100 rounded-bl-md border border-gray-700">
            <div className="prose prose-invert max-w-none text-gray-200 text-sm leading-relaxed space-y-3">
              <ReactMarkdown>{formatChatText(message.content)}</ReactMarkdown>
            </div>
          </div>
        </div>
      </div>

      {/* Rich Sports Data Cards */}
      <div className="ml-11 space-y-4">
        {renderSportsCards(highlightly_data, sportradar_data)}
      </div>
    </div>
  );
};

const renderSportsCards = (highlightlyData, sportradarData) => {
  const cards = [];
  
  if (!highlightlyData || highlightlyData.error) {
    return cards;
  }

  const data = highlightlyData.data || [];
  
  // Detect data type and render appropriate cards
  
  // Highlights first
  const highlights = data.filter ? data.filter(item => item.embedUrl || item.url || item.imgUrl) : [];
  if (highlights.length > 0) {
    cards.push(
      <HighlightsCard 
        key="highlights" 
        highlights={highlights}
      />
    );
  }

  // Matches/Scores Data
  if (Array.isArray(data) && data.length > 0 && data[0].homeTeam) {
    cards.push(
      <ScoresCard 
        key="scores" 
        matches={data.slice(0, 5)} // Show first 5 matches
      />
    );
  }

  // Player Data
  if (highlightlyData.name || (data && data.name)) {
    const playerData = highlightlyData.name ? highlightlyData : data;
    cards.push(
      <PlayerCard 
        key="player" 
        playerData={playerData}
        statistics={playerData.statistics || []}
      />
    );
  }

  // Statistics Data
  if (Array.isArray(data) && data.length > 0 && data[0].statistics) {
    cards.push(
      <StatisticsCard 
        key="statistics" 
        statistics={data}
        title="Match Statistics"
      />
    );
  }

  // 5. Handle nested match statistics
  if (highlightlyData.statistics && Array.isArray(highlightlyData.statistics)) {
    cards.push(
      <StatisticsCard 
        key="match-stats" 
        statistics={highlightlyData.statistics}
        title="Key Statistics"
      />
    );
  }

  // Sportradar fallback data
  if (cards.length === 0 && sportradarData && !sportradarData.error) {
    // Add custom card for Sportradar data
    cards.push(
      <div key="sportradar" className="bg-gray-800 border border-gray-700 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Sports Data</h3>
        <pre className="text-gray-300 text-sm overflow-x-auto">
          {JSON.stringify(sportradarData, null, 2)}
        </pre>
      </div>
    );
  }

  return cards;
};

export default RichMessageBubble;
