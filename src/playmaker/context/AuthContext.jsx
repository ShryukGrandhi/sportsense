'use client';

import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

const API = '/api';

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
  const [token, setToken] = useState(null);

  // Initialize token from localStorage (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setToken(localStorage.getItem('token'));
    }
  }, []);

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
        try {
          const response = await axios.get(`${API}/auth/me`);
          setUser(response.data);
          setLoading(false);
          return;
        } catch (error) {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
          }
          setToken(null);
        }
      }

      // Auto-login with demo user
      try {
        const response = await axios.post(`${API}/auth/login`, {
          email: 'demo@sportsense.ai',
          password: 'demo123',
        });

        const { access_token, user: userData } = response.data;

        if (typeof window !== 'undefined') {
          localStorage.setItem('token', access_token);
        }
        setToken(access_token);
        setUser(userData);
      } catch (error) {
        // If auto-login fails, create demo user locally
        const demoUser = {
          _id: 'demo-user-' + Date.now(),
          username: 'Demo User',
          email: 'demo@sportsense.ai',
          interests: ['NFL', 'NBA', 'MLB'],
          subscription: 'free',
          created_at: new Date().toISOString(),
          last_active: new Date().toISOString()
        };
        const demoToken = 'demo-token-' + Date.now();

        if (typeof window !== 'undefined') {
          localStorage.setItem('token', demoToken);
        }
        setToken(demoToken);
        setUser(demoUser);
      }

      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API}/auth/login`, {
        email,
        password,
      });

      const { access_token, user: userData } = response.data;

      if (typeof window !== 'undefined') {
        localStorage.setItem('token', access_token);
      }
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
    const fakeUser = {
      _id: 'demo-user-' + Date.now(),
      username: username || 'demo',
      email: email || 'demo@sportsense.ai',
      interests: ['NFL', 'NBA', 'MLB'],
      subscription: 'free',
      created_at: new Date().toISOString(),
      last_active: new Date().toISOString()
    };

    const fakeToken = 'demo-token-' + Date.now();

    if (typeof window !== 'undefined') {
      localStorage.setItem('token', fakeToken);
    }
    setToken(fakeToken);
    setUser(fakeUser);

    return { success: true };
  };

  const logout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
    }
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