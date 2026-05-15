// frontend/src/hooks/useTeam.js

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';

const CACHE_KEY = 'team_data';
const CACHE_DURATION = 5 * 60 * 1000;

export const useTeam = () => {
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalStaff, setTotalStaff] = useState(0);
  const [activeStaff, setActiveStaff] = useState(0);

  const fetchTeam = useCallback(async () => {
    try {
      // Check cache first
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp, totals } = JSON.parse(cached);
        const isExpired = Date.now() - timestamp > CACHE_DURATION;
        if (!isExpired && data?.length > 0) {
          setTeam(data);
          setTotalStaff(totals.total);
          setActiveStaff(totals.active);
          setLoading(false);
          return;
        }
      }

      setLoading(true);

      // Query the unified team_members table
      const { data: teamMembers, error: teamError } = await supabase
        .from('team_members')
        .select('id, name, email, phone, avatar_url, role, role_description, status, join_date, created_at')
        .order('created_at', { ascending: false });

      if (teamError) throw teamError;

      // Transform to match expected format
      const allMembers = (teamMembers || []).map(member => ({
        id: member.id,
        _table: 'team_members',
        name: member.name,
        email: member.email || '',
        phone: member.phone || '',
        role: member.role,
        status: member.status === 'active' ? 'active' : 'inactive',
        avatar: member.avatar_url,
        roleDescription: member.role_description || (
          member.role === 'super_admin' ? 'Super Admin' :
          member.role === 'admin' ? 'Admin' :
          'Staff'
        ),
        joinDate: member.join_date,
        createdAt: member.created_at,
      }));

      const total = allMembers.length;
      const active = allMembers.filter(m => m.status === 'active').length;

      setTeam(allMembers);
      setTotalStaff(total);
      setActiveStaff(active);

      // Cache the data
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({
        data: allMembers,
        totals: { total, active },
        timestamp: Date.now()
      }));

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  return {
    team,
    loading,
    error,
    refetch: fetchTeam,
    totalStaff,
    activeStaff
  };
};