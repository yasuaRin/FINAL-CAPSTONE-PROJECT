// frontend/src/hooks/useBrands.js
import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

export const useBrands = () => {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBrands = async () => {
    try {
      setLoading(true);
      console.log('Fetching brands from Supabase...');
      
      const { data, error: brandsError } = await supabase
        .from('brands')
        .select('*')
        .order('brand_name');

      if (brandsError) throw brandsError;
      
      console.log(`Fetched ${data?.length || 0} brands`);
      setBrands(data || []);
    } catch (err) {
      console.error('Error fetching brands:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createBrand = async (brandData) => {
    try {
      const { data, error } = await supabase
        .from('brands')
        .insert([brandData])
        .select()
        .single();

      if (error) throw error;
      
      setBrands(prev => [...prev, data]);
      return data;
    } catch (err) {
      console.error('Error creating brand:', err);
      throw err;
    }
  };

  const updateBrand = async (id, updates) => {
    try {
      const { data, error } = await supabase
        .from('brands')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setBrands(prev => prev.map(brand => 
        brand.id === id ? data : brand
      ));
      return data;
    } catch (err) {
      console.error('Error updating brand:', err);
      throw err;
    }
  };

  const deleteBrand = async (id) => {
    try {
      const { error } = await supabase
        .from('brands')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setBrands(prev => prev.filter(brand => brand.id !== id));
    } catch (err) {
      console.error('Error deleting brand:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  return { 
    brands, 
    loading, 
    error, 
    refetch: fetchBrands,
    createBrand,
    updateBrand,
    deleteBrand
  };
};