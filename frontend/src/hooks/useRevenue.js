// frontend/src/hooks/useRevenue.js

import { useState, useEffect, useCallback, useRef } from 'react';
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
  return allRows.filter((row) => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
};

export const useRevenue = () => {
  const [data, setData]               = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [brandTotals, setBrandTotals] = useState(new Map());
  const [yearlyData, setYearlyData]   = useState([]);

  // true only during the very first fetch — never flipped back to true after that.
  // This prevents the Revenue page from hitting its loading spinner early-return
  // on every CRUD refetch, which would unmount the component mid-operation and
  // leave isSubmitting stuck true with no error on the second attempt.
  const isInitialLoad = useRef(true);

  const channelName = useRef(
    `live_sessions_${Date.now()}_${Math.random()}`
  ).current;

  const processAndSetData = useCallback((rows) => {
    let runningTotal = 0;
    const yearMap  = new Map();
    const brandMap = new Map();

    rows.forEach((item) => {
      const s   = item.revenue_shopee ?? 0;
      const t   = item.revenue_tiktok ?? 0;
      const rev = s + t;

      runningTotal += rev;

      if (item.date) {
        const year = new Date(item.date).getFullYear();
        yearMap.set(year, (yearMap.get(year) ?? 0) + rev);
      }

      if (item.brand_id) {
        const brandId = String(item.brand_id);
        brandMap.set(brandId, (brandMap.get(brandId) || 0) + rev);
      }
    });

    setTotalRevenue(runningTotal);
    setBrandTotals(brandMap);
    setYearlyData(
      Array.from(yearMap.entries())
        .map(([year, total]) => ({ year, total_revenue: total }))
        .sort((a, b) => a.year - b.year)
    );
    setData(
      rows.map((item) => ({
        id:                  item.id,
        date:                item.date,
        time:                item.time ?? null,
        period_id:           item.period_id,
        host_team_member_id: item.host_team_member_id ?? null,
        brand_id:            String(item.brand_id),
        revenue_shopee:      item.revenue_shopee  ?? 0,
        revenue_tiktok:      item.revenue_tiktok  ?? 0,
        viewers_shopee:      item.viewers_shopee  ?? 0,
        viewers_tiktok:      item.viewers_tiktok  ?? 0,
        likes_shopee:        item.likes_shopee    ?? 0,
        likes_tiktok:        item.likes_tiktok    ?? 0,
      }))
    );
  }, []);

  const fetchRevenue = useCallback(async () => {
  try {
    if (isInitialLoad.current) {
      setLoading(true);
    }

    const rows = await fetchAllRows();
    processAndSetData(rows);
    setError(null); // ← also clear stale errors
  } catch (err) {
    setError(err.message);
  } finally {
    // Always run this, not just on first load
    setLoading(false);
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
    }
  }
}, [processAndSetData]);

  // Initial fetch
  useEffect(() => {
    fetchRevenue();
  }, [fetchRevenue]);

  // Real-time subscription — silently refreshes on any live_sessions change
  useEffect(() => {
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'live_sessions' },
        () => { fetchRevenue(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [channelName, fetchRevenue]);

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





