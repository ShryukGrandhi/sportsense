import { useState, useEffect, useCallback } from 'react';
import { chatAPI } from '../services/api';

export const useChat = () => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadChats = useCallback(async () => {
    try {
      setLoading(true);
      const userChats = await chatAPI.getChats();
      setChats(userChats);
      setError(null);
    } catch (err) {
      setError('Failed to load chats');
      console.error('Error loading chats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createChat = useCallback(async (title = 'New Chat') => {
    try {
      const newChat = await chatAPI.createChat(title);
      setChats(prev => [newChat, ...prev]);
      return newChat;
    } catch (err) {
      setError('Failed to create chat');
      console.error('Error creating chat:', err);
      throw err;
    }
  }, []);

  const deleteChat = useCallback(async (chatId) => {
    try {
      await chatAPI.deleteChat(chatId);
      setChats(prev => prev.filter(chat => chat.id !== chatId));
    } catch (err) {
      setError('Failed to delete chat');
      console.error('Error deleting chat:', err);
      throw err;
    }
  }, []);

  const updateChatTitle = useCallback(async (chatId, title) => {
    try {
      const updatedChat = await chatAPI.updateChatTitle(chatId, title);
      setChats(prev => prev.map(chat =>
        chat.id === chatId ? updatedChat : chat
      ));
      return updatedChat;
    } catch (err) {
      setError('Failed to update chat title');
      console.error('Error updating chat title:', err);
      throw err;
    }
  }, []);

  useEffect(() => {
    loadChats();
  }, []);

  return {
    chats,
    loading,
    error,
    loadChats,
    createChat,
    deleteChat,
    updateChatTitle,
  };
};

export const useChatMessages = (chatId) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const loadMessages = async () => {
    // Messages stored in local state only - no backend loading
    return;
  };

  const sendMessage = useCallback(async (content, currentChatId = chatId) => {
    if (!content.trim()) {
      return;
    }

    try {
      setSending(true);

      // Add user message immediately
      const userMessage = {
        id: Date.now() + '-user',
        role: 'user',
        content: content.trim(),
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, userMessage]);

      let activeChatId = currentChatId;

      // If no chat ID, create one first
      if (!activeChatId) {
        try {
          const newChat = await chatAPI.createChat(content.trim().substring(0, 50));
          activeChatId = newChat.id;
        } catch (err) {
          console.error('Failed to create chat:', err);
          throw new Error('Failed to start new conversation');
        }
      }

      // Send message using authenticated API
      const response = await chatAPI.sendMessage(activeChatId, content.trim());

      // Add AI response
      const aiMessage = {
        id: response.id,
        role: 'assistant',
        content: response.content,
        chat_answer: response.chat_answer,
        timestamp: response.timestamp || new Date().toISOString(),
        sports_context: response.sports_context
      };

      setMessages(prev => [...prev, aiMessage]);
      setError(null);

      return {
        message: aiMessage,
        chatId: activeChatId
      };

    } catch (err) {
      console.error('❌ Message send error:', err);
      setError('Failed to send message');

      // Add error message
      const errorMessage = {
        id: Date.now() + '-error',
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);

      throw err;
    } finally {
      setSending(false);
    }
  }, [chatId]);



  useEffect(() => {
    // Messages stored in local state - no need to load from backend
  }, [chatId]);

  return {
    messages,
    loading,
    sending,
    error,
    loadMessages,
    sendMessage,
  };
};