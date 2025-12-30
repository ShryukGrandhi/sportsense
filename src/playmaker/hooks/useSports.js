import { useState, useEffect } from 'react';
import { sportsAPI } from '../services/api';

export const useTrending = () => {
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadTrending = async () => {
    try {
      setLoading(true);
      const data = await sportsAPI.getTrending();
      setTrending(data.topics);
      setError(null);
    } catch (err) {
      setError('Failed to load trending topics');
      console.error('Error loading trending:', err);
      // Fallback to mock data
      setTrending([
        {
          id: '1',
          title: 'NFL Trade Deadline Analysis',
          sport: 'NFL',
          type: 'news',
          engagement: 1250,
          trending_score: 95.5,
          source: 'ESPN',
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          title: 'NBA MVP Race Heating Up',
          sport: 'NBA', 
          type: 'analysis',
          engagement: 980,
          trending_score: 87.2,
          source: 'The Athletic',
          created_at: new Date().toISOString()
        },
        {
          id: '3',
          title: 'College Football Playoff Rankings',
          sport: 'Football',
          type: 'news',
          engagement: 850,
          trending_score: 78.9,
          source: 'Sports Illustrated',
          created_at: new Date().toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrending();
  }, []);

  return {
    trending,
    loading,
    error,
    reload: loadTrending,
  };
};

export const useSportData = (sport) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadSportData = async () => {
    if (!sport) return;

    try {
      setLoading(true);
      const sportData = await sportsAPI.getSportData(sport);
      setData(sportData);
      setError(null);
    } catch (err) {
      setError(`Failed to load ${sport} data`);
      console.error(`Error loading ${sport} data:`, err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSportData();
  }, [sport]);

  return {
    data,
    loading,
    error,
    reload: loadSportData,
  };
};
