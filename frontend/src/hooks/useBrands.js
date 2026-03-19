import { useState, useEffect } from 'react';
import { api } from '../services/api';

export const useBrands = () => {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBrands = async () => {
    try {
      setLoading(true);
      const response = await api.get('/brands/read');
      setBrands(response.data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  const createBrand = async (brandData) => {
    try {
      const response = await api.post('/brands/create', brandData);
      await fetchBrands();
      return { success: true, data: response.data.data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const updateBrand = async (id, updates) => {
    try {
      const response = await api.put(`/brands/update/${id}`, updates);
      await fetchBrands();
      return { success: true, data: response.data.data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const deleteBrand = async (id) => {
    try {
      await api.delete(`/brands/delete/${id}`);
      await fetchBrands();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  return { brands, loading, error, createBrand, updateBrand, deleteBrand, refetch: fetchBrands };
};