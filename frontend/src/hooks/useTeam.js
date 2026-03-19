import { useState, useEffect } from 'react';
import { api } from '../services/api';

export const useTeam = () => {
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTeam = async () => {
    try {
      setLoading(true);
      const response = await api.get('/team/read');
      setTeam(response.data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  const createMember = async (memberData) => {
    try {
      const response = await api.post('/team/create', memberData);
      await fetchTeam();
      return { success: true, data: response.data.data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const updateMember = async (id, updates) => {
    try {
      const response = await api.put(`/team/update/${id}`, updates);
      await fetchTeam();
      return { success: true, data: response.data.data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const deleteMember = async (id) => {
    try {
      await api.delete(`/team/delete/${id}`);
      await fetchTeam();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  return { team, loading, error, createMember, updateMember, deleteMember, refetch: fetchTeam };
};