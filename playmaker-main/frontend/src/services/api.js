import axios from 'axios';

let BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

// Ensure the URL has a protocol (http:// or https://)
if (BACKEND_URL && !BACKEND_URL.startsWith('http://') && !BACKEND_URL.startsWith('https://')) {
  BACKEND_URL = `https://${BACKEND_URL}`;
}

const API = `${BACKEND_URL}/api`;

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API,
  timeout: 45000, // Increased timeout for AI responses
  // Enable compression
  headers: {
    'Accept-Encoding': 'gzip, deflate, br'
  }
});

// Add request interceptor to include auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.status, error.response?.data);
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      console.error('Authentication failed - token removed');
      // Don't redirect, let the app handle it
    }
    return Promise.reject(error);
  }
);

// Chat API
export const chatAPI = {
  // Get all user chats
  getChats: async () => {
    const response = await apiClient.get('/chats');
    // Normalize ID fields from _id to id
    return response.data.map(chat => ({
      ...chat,
      id: chat._id || chat.id
    }));
  },

  // Create new chat
  createChat: async (title = 'New Chat') => {
    const response = await apiClient.post('/chats', { title });
    // Normalize ID field from _id to id
    return {
      ...response.data,
      id: response.data._id || response.data.id
    };
  },

  // Get specific chat with messages
  getChat: async (chatId) => {
    const response = await apiClient.get(`/chats/${chatId}`);
    const data = response.data;
    // Normalize chat and message IDs
    return {
      ...data,
      chat: {
        ...data.chat,
        id: data.chat._id || data.chat.id
      },
      messages: data.messages.map(msg => ({
        ...msg,
        id: msg._id || msg.id
      }))
    };
  },

  // Send message and get AI response
  sendMessage: async (chatId, content) => {
    const response = await apiClient.post(`/chats/${chatId}/messages`, {
      content,
    });
    // Normalize message ID
    return {
      ...response.data,
      id: response.data._id || response.data.id
    };
  },

  // Update chat title
  updateChatTitle: async (chatId, title) => {
    const response = await apiClient.put(`/chats/${chatId}/title`, { title });
    // Normalize ID field
    return {
      ...response.data,
      id: response.data._id || response.data.id
    };
  },

  // Delete chat
  deleteChat: async (chatId) => {
    const response = await apiClient.delete(`/chats/${chatId}`);
    return response.data;
  },
};

// Sports API
export const sportsAPI = {
  // Get trending sports topics
  getTrending: async () => {
    const response = await apiClient.get('/sports/trending');
    return response.data;
  },

  // Get sport-specific data
  getSportData: async (sport) => {
    const response = await apiClient.get(`/sports/${sport}`);
    return response.data;
  },

  // Get sports videos
  getVideos: async () => {
    const response = await apiClient.get('/sports/videos');
    return response.data;
  },

  // Analyze sports query
  analyzeQuery: async (query, sport = null, includeContext = true) => {
    const response = await apiClient.post('/sports/analyze', {
      query,
      sport,
      include_context: includeContext,
    });
    return response.data;
  },
};

// User API
export const userAPI = {
  // Get user interests
  getInterests: async () => {
    const response = await apiClient.get('/user/interests');
    return response.data;
  },

  // Update user interests
  updateInterests: async (interests) => {
    const response = await apiClient.put('/user/interests', interests);
    return response.data;
  },

  // Get subscription status
  getSubscription: async () => {
    const response = await apiClient.get('/user/subscription');
    return response.data;
  },
};

// Pulse AI API
export const pulseAIAPI = {
  // Recognize audio and get full response
  recognize: async (audioBlob) => {
    const formData = new FormData();
    formData.append('audio_file', audioBlob, 'audio.webm');
    
    const response = await apiClient.post('/pulse-ai/recognize', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 30000, // 30 second timeout for audio processing
    });
    
    return response.data;
  },

  // Recognize audio and get only voice response
  recognizeVoiceOnly: async (audioBlob) => {
    const formData = new FormData();
    formData.append('audio_file', audioBlob, 'audio.webm');
    
    const response = await apiClient.post('/pulse-ai/recognize/voice-only', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      responseType: 'blob', // Expect audio blob response
      timeout: 30000,
    });
    
    return response.data;
  },
};

export default apiClient;