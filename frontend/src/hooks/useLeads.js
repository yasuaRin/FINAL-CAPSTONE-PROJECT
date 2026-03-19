import { useState, useEffect } from 'react';
import { api } from '../services/api';

export const useLeads = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const response = await api.get('/leads/read');
      setLeads(response.data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const convertLead = async (leadData) => {
    try {
      const response = await api.post('/leads/convert', leadData);
      return { success: true, data: response.data.data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  return { leads, loading, error, convertLead, refetch: fetchLeads };
};