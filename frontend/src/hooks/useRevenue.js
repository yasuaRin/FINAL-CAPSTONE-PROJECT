// frontend/src/hooks/useRevenue.js

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';

const PAGE_SIZE = 500;

const fetchAllRows = async () => {
  const { count: totalCount, error: countError } = await supabase
    .from('live_sessions')
    .select('*', { count: 'exact', head: true });

  if (countError) throw countError;
  if (!totalCount) return [];

  const allRows = [];
  let from = 0;

  while (allRows.length < totalCount) {
    const { data, error } = await supabase
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
        host_team_member_id,
        brand_id,
        period_id
      `)
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;

    const page = data || [];

    if (page.length === 0) break;

    allRows.push(...page);
    from += page.length;
  }

  const seen = new Set();
  const unique = allRows.filter((row) => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });

  return unique;
};

export const useRevenue = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [brandTotals, setBrandTotals] = useState(new Map());
  const [yearlyData, setYearlyData] = useState([]);

  const fetchRevenue = useCallback(async () => {
    try {
      setLoading(true);

      const rows = await fetchAllRows();

      let runningTotal = 0;
      const yearMap = new Map();
      const brandMap = new Map();

      rows.forEach((item) => {
        const s = item.revenue_shopee ?? 0;
        const t = item.revenue_tiktok ?? 0;
        const rev = s + t;

        runningTotal += rev;

        if (item.date) {
          const year = new Date(item.date).getFullYear();
          yearMap.set(year, (yearMap.get(year) ?? 0) + rev);
        }

        if (item.brand_id) {
          const brandId = String(item.brand_id);
          const currentRevenue = brandMap.get(brandId) || 0;
          brandMap.set(brandId, currentRevenue + rev);
        }
      });

      setTotalRevenue(runningTotal);
      setBrandTotals(brandMap);

      const calculatedYearly = Array.from(yearMap.entries())
        .map(([year, total]) => ({ year, total_revenue: total }))
        .sort((a, b) => a.year - b.year);

      setYearlyData(calculatedYearly);

      setData(
        rows.map((item) => ({
          id: item.id,
          date: item.date,
          time: item.time ?? null,
          period_id: item.period_id,
          host_team_member_id: item.host_team_member_id ?? null,
          brand_id: String(item.brand_id),
          revenue_shopee: item.revenue_shopee ?? 0,
          revenue_tiktok: item.revenue_tiktok ?? 0,
          viewers_shopee: item.viewers_shopee ?? 0,
          viewers_tiktok: item.viewers_tiktok ?? 0,
          likes_shopee: item.likes_shopee ?? 0,
          likes_tiktok: item.likes_tiktok ?? 0,
        }))
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRevenue();
  }, [fetchRevenue]);

  return {
    data,
    loading,
    error,
    totalRevenue,
    brandTotals,
    yearlyData,
    refetch: fetchRevenue,
  };
};