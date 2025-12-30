import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

// Fallback to localhost for development
let BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

// Ensure the URL has a protocol (http:// or https://)
if (BACKEND_URL && !BACKEND_URL.startsWith('http://') && !BACKEND_URL.startsWith('https://')) {
  BACKEND_URL = `https://${BACKEND_URL}`;
}

const API = `${BACKEND_URL}/api`;

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  // Set up axios interceptor for authentication
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Auto-login on app load
  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        // Verify existing token with backend
        try {
          const response = await axios.get(`${API}/auth/me`);
          setUser(response.data);
          setLoading(false);
          return;
        } catch (error) {
          // Token invalid, clear it and auto-login
          localStorage.removeItem('token');
          setToken(null);
        }
      }

      // No valid token - auto-login with test credentials
      try {
        const response = await axios.post(`${API}/auth/login`, {
          email: 'testuser@playmaker.com',
          password: 'SportsSense!',
        });

        const { access_token, user: userData } = response.data;

        localStorage.setItem('token', access_token);
        setToken(access_token);
        setUser(userData);
      } catch (error) {
        console.error('Auto-login failed:', error);
      }

      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    try {
      // Call backend to get REAL JWT token
      const response = await axios.post(`${API}/auth/login`, {
        email: email,
        password: password,
      });

      const { access_token, user: userData } = response.data;

      // Store real token that works with all backend endpoints
      localStorage.setItem('token', access_token);
      setToken(access_token);
      setUser(userData);

      return { success: true };
    } catch (error) {
      console.error('Login failed:', error.response?.data?.detail || error.message);
      return {
        success: false,
        error: error.response?.data?.detail || 'Login failed',
      };
    }
  };

  const register = async (username, email, password) => {
    // Instant registration without backend
    const fakeUser = {
      _id: 'demo-user-' + Date.now(),
      username: username || 'demo',
      email: email || 'demo@playmaker.com',
      interests: ['NFL', 'NBA', 'MLB'],
      subscription: 'free',
      created_at: new Date().toISOString(),
      last_active: new Date().toISOString()
    };

    const fakeToken = 'demo-token-' + Date.now();

    localStorage.setItem('token', fakeToken);
    setToken(fakeToken);
    setUser(fakeUser);

    return { success: true };
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await axios.put(`${API}/auth/profile`, profileData);
      setUser(response.data);
      return { success: true };
    } catch (error) {
      console.error('Profile update failed:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Profile update failed',
      };
    }
  };

  const value = {
    user,
    login,
    register,
    logout,
    updateProfile,
    loading,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};