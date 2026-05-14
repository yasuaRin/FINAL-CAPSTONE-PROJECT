// frontend/src/hooks/useTeam.js
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';

const CACHE_KEY = 'team_data';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const useTeam = () => {
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTeam = useCallback(async () => {
    try {
      // Check cache first
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        const isExpired = Date.now() - timestamp > CACHE_DURATION;
        if (!isExpired && data?.length > 0) {
          console.log('📦 Using cached team data');
          setTeam(data);
          setLoading(false);
          return;
        }
      }

      setLoading(true);

      const { data, error: teamError } = await supabase
        .from('team_members')
        .select('id, name, email, phone, role, status, old_staff_id')
        .limit(200);

      if (teamError) throw teamError;

      setTeam(data || []);

      // Save to cache
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({
        data: data || [],
        timestamp: Date.now()
      }));
    } catch (err) {
      console.error('Error fetching team:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  return { team, loading, error, refetch: fetchTeam };
};