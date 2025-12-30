// Mock data for sports-focused AI chatbot

export const mockConversations = [
  {
    id: '1',
    title: 'NBA Trade Deadline Analysis',
    messages: [
      {
        id: 'm1',
        type: 'user',
        content: 'What are the biggest moves at this NBA trade deadline?',
        timestamp: new Date('2024-02-08T10:30:00Z')
      },
      {
        id: 'm2',
        type: 'ai',
        content: 'The NBA trade deadline has been quite active! Here are the major moves:\n\n🏀 **Biggest Trades:**\n• Pascal Siakam to Indiana Pacers\n• OG Anunoby to New York Knicks\n• Dejounte Murray to New Orleans Pelicans\n\n📊 **Impact Analysis:**\nThe Pacers significantly upgraded their championship chances with Siakam, while the Knicks bolstered their defense. These moves have shifted the Eastern Conference landscape considerably.\n\nWould you like me to analyze any specific team\'s strategy?',
        timestamp: new Date('2024-02-08T10:30:15Z')
      }
    ]
  },
  {
    id: '2',
    title: 'NFL Draft Prospects 2024',
    messages: [
      {
        id: 'm3',
        type: 'user',
        content: 'Who are the top QB prospects for the 2024 NFL Draft?',
        timestamp: new Date('2024-02-10T14:20:00Z')
      },
      {
        id: 'm4',
        type: 'ai',
        content: '🏈 **Top QB Prospects for 2024 NFL Draft:**\n\n**1. Caleb Williams (USC)**\n• Heisman winner, elite arm talent\n• Mobile, creative playmaker\n• Projected #1 overall\n\n**2. Jayden Daniels (LSU)**\n• Dual-threat capability\n• Improved accuracy in 2023\n• Rising draft stock\n\n**3. Drake Maye (UNC)**\n• Strong arm, good size\n• Needs development but high ceiling\n• Likely top-5 pick\n\n**4. J.J. McCarthy (Michigan)**\n• Winner, great leadership\n• Limited college production\n• Could go higher than expected\n\nWhich team do you think needs a QB most?',
        timestamp: new Date('2024-02-10T14:20:25Z')
      }
    ]
  }
];

export const mockTrendingTopics = [
  { id: 1, title: 'NBA All-Star Weekend', category: 'Basketball', engagement: 95 },
  { id: 2, title: 'Super Bowl LVIII Recap', category: 'Football', engagement: 89 },
  { id: 3, title: 'March Madness Predictions', category: 'Basketball', engagement: 87 },
  { id: 4, title: 'MLB Spring Training', category: 'Baseball', engagement: 76 },
  { id: 5, title: 'Premier League Title Race', category: 'Soccer', engagement: 82 }
];

export const mockSuggestions = [
  'Analyze team performance',
  'Player stats comparison', 
  'Trade deadline rumors',
  'Fantasy sports advice',
  'Upcoming games preview',
  'Historical matchups'
];

export const mockUserProfile = {
  name: 'Sports Fan',
  interests: ['NBA', 'NFL', 'Fantasy Football'],
  isPro: false,
  chatCount: 24
};

// Simulate AI response delay
export const simulateTyping = (callback, delay = 1500) => {
  setTimeout(callback, delay);
};

export const generateMockResponse = (userMessage) => {
  const responses = [
    `Based on current stats and trends, here's my analysis of ${userMessage}...`,
    `That's a great sports question! Let me break down the key factors...`,
    `🏆 Here's what the data shows about ${userMessage}...`,
    `Interesting point! From a sports analytics perspective...`,
  ];
  
  return responses[Math.floor(Math.random() * responses.length)] + '\n\nWould you like me to dive deeper into any specific aspect?';
};