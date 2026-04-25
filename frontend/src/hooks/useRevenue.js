// frontend/src/hooks/useRevenue.js
import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

export const useRevenue = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRevenue = async () => {
    try {
      setLoading(true);
      console.log('Fetching revenue from Supabase...');
      
      // Fetch ALL live sessions directly from Supabase
      const { data: revenueData, error: revenueError } = await supabase
        .from('live_sessions')
        .select(`
          id,
          date,
          time,
          revenue_shopee,
          revenue_tiktok,
          viewers_shopee,
          viewers_tiktok,
          likes_shopee,
          likes_tiktok,
          host_id,
          brand_id,
          platform_id,
          period_id
        `)
        .order('date', { ascending: false });

      if (revenueError) {
        console.error('Supabase error:', revenueError);
        throw revenueError;
      }

      console.log(`Fetched ${revenueData?.length || 0} revenue records`);
      
      // Transform data to match what dashboard expects
      const transformedData = revenueData?.map(item => ({
        id: item.id,
        date: item.date,
        time: item.time,
        host_id: item.host_id,
        brand_id: item.brand_id,
        platform_id: item.platform_id,
        revenue_shopee: item.revenue_shopee || 0,
        revenue_tiktok: item.revenue_tiktok || 0,
        viewers_shopee: item.viewers_shopee || 0,
        viewers_tiktok: item.viewers_tiktok || 0,
        likes_shopee: item.likes_shopee || 0,
        likes_tiktok: item.likes_tiktok || 0,
        period_id: item.period_id,
        total_revenue: (item.revenue_shopee || 0) + (item.revenue_tiktok || 0)
      })) || [];

      setData(transformedData);
    } catch (err) {
      console.error('Error fetching revenue:', err);
      setError(err.message);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRevenue();
  }, []);

  return {
    data,
    loading,
    error,
    refetch: fetchRevenue
  };
};