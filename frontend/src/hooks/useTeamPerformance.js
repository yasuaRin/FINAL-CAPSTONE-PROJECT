// Create a new file: frontend/src/hooks/useTeamPerformance.js
import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

export const useTeamPerformance = () => {
  const [topPerformers, setTopPerformers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTopPerformers = async () => {
      try {
        const { data, error } = await supabase
          .from('team_performance_view')
          .select('team_name, session_count, total_revenue, total_viewers, total_likes, revenue_score, viewer_score, likes_score, final_score')
          .limit(5);

        if (error) throw error;
        setTopPerformers(data || []);
      } catch (err) {
        console.error('Error fetching team performance:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTopPerformers();
  }, []);

  return { topPerformers, loading };
};