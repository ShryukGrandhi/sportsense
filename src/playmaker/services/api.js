// Playmaker API service - configured for Next.js
import axios from 'axios';

const API = '/api';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API,
  timeout: 45000,
  headers: {
    'Accept-Encoding': 'gzip, deflate, br'
  }
});

// Add request interceptor to include auth token
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
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
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
      }
      console.error('Authentication failed - token removed');
    }
    return Promise.reject(error);
  }
);

// Chat API
export const chatAPI = {
  getChats: async () => {
    const response = await apiClient.get('/chats');
    return response.data.map(chat => ({
      ...chat,
      id: chat._id || chat.id
    }));
  },

  createChat: async (title = 'New Chat') => {
    const response = await apiClient.post('/chats', { title });
    return {
      ...response.data,
      id: response.data._id || response.data.id
    };
  },

  getChat: async (chatId) => {
    const response = await apiClient.get(`/chats/${chatId}`);
    const data = response.data;
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

  sendMessage: async (chatId, content) => {
    const response = await apiClient.post(`/chats/${chatId}/messages`, {
      content,
    });
    return {
      ...response.data,
      id: response.data._id || response.data.id
    };
  },

  updateChatTitle: async (chatId, title) => {
    const response = await apiClient.put(`/chats/${chatId}/title`, { title });
    return {
      ...response.data,
      id: response.data._id || response.data.id
    };
  },

  deleteChat: async (chatId) => {
    const response = await apiClient.delete(`/chats/${chatId}`);
    return response.data;
  },
};

// Sports API
export const sportsAPI = {
  getTrending: async () => {
    const response = await apiClient.get('/sports/trending');
    return response.data;
  },

  getSportData: async (sport) => {
    const response = await apiClient.get(`/sports/${sport}`);
    return response.data;
  },

  getVideos: async () => {
    const response = await apiClient.get('/sports/videos');
    return response.data;
  },

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
  getInterests: async () => {
    const response = await apiClient.get('/user/interests');
    return response.data;
  },

  updateInterests: async (interests) => {
    const response = await apiClient.put('/user/interests', interests);
    return response.data;
  },

  getSubscription: async () => {
    const response = await apiClient.get('/user/subscription');
    return response.data;
  },
};

// Pulse AI API
export const pulseAIAPI = {
  recognize: async (audioBlob) => {
    const formData = new FormData();
    formData.append('audio_file', audioBlob, 'audio.webm');

    const response = await apiClient.post('/pulse-ai/recognize', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 30000,
    });

    return response.data;
  },

  recognizeVoiceOnly: async (audioBlob) => {
    const formData = new FormData();
    formData.append('audio_file', audioBlob, 'audio.webm');

    const response = await apiClient.post('/pulse-ai/recognize/voice-only', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      responseType: 'blob',
      timeout: 30000,
    });

    return response.data;
  },
};

export default apiClient;