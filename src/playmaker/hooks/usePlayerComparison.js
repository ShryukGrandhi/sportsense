import { useState, useCallback } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export const usePlayerComparison = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [comparisonData, setComparisonData] = useState(null);

  const searchPlayers = useCallback(async (query, sport = 'NFL', limit = 10) => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/players/search`, {
        params: { query, sport, limit },
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      return response.data;
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 'Failed to search players';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const comparePlayers = useCallback(async (playerIds, sport = 'NFL') => {
    if (!playerIds || playerIds.length < 2) {
      const errorMessage = 'At least 2 players required for comparison';
      setError(errorMessage);
      throw new Error(errorMessage);
    }

    if (playerIds.length > 4) {
      const errorMessage = 'Maximum 4 players can be compared';
      setError(errorMessage);
      throw new Error(errorMessage);
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/api/players/compare`,
        {
          player_ids: playerIds,
          sport: sport
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      setComparisonData(response.data);
      return response.data;
    } catch (err) {
      const errorMessage = err.response?.data?.detail || 'Failed to compare players';
      setError(errorMessage);
      setComparisonData(null);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const resetComparison = useCallback(() => {
    setComparisonData(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    loading,
    error,
    comparisonData,
    searchPlayers,
    comparePlayers,
    resetComparison
  };
};

export default usePlayerComparison;
