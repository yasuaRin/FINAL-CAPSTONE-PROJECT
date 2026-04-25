// frontend/src/hooks/useTeam.js
import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

export const useTeam = () => {
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTeam = async () => {
    try {
      setLoading(true);
      console.log('Fetching team from Supabase...');
      
      const { data, error: teamError } = await supabase
        .from('staff')
        .select('*')
        .order('name');

      if (teamError) throw teamError;
      
      console.log(`Fetched ${data?.length || 0} team members`);
      setTeam(data || []);
    } catch (err) {
      console.error('Error fetching team:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  return { 
    team, 
    loading, 
    error, 
    refetch: fetchTeam 
  };
};