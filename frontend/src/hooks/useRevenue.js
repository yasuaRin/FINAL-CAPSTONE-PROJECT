import { useState, useEffect } from 'react';
import { api } from '../services/api';

export const useRevenue = (filters = {}) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRevenue = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams(filters).toString();
      const response = await api.get(`/revenue/read?${params}`);
      setData(response.data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRevenue();
  }, [JSON.stringify(filters)]);

  const createRevenue = async (revenueData) => {
    try {
      const response = await api.post('/revenue/create', revenueData);
      await fetchRevenue();
      return { success: true, data: response.data.data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const updateRevenue = async (id, updates) => {
    try {
      const response = await api.put(`/revenue/update/${id}`, updates);
      await fetchRevenue();
      return { success: true, data: response.data.data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const deleteRevenue = async (id) => {
    try {
      await api.delete(`/revenue/delete/${id}`);
      await fetchRevenue();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  return {
    data,
    loading,
    error,
    createRevenue,
    updateRevenue,
    deleteRevenue,
    refetch: fetchRevenue
  };
};