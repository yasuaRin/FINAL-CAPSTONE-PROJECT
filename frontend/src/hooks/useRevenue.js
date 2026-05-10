// frontend/src/hooks/useRevenue.js
//
// FIX: Three pagination bugs fixed:
// 1. TERMINATION: was `page.length < PAGE_SIZE` — breaks early if server max_rows < PAGE_SIZE
//    Now uses count-first approach: paginate until allRows.length >= totalCount
// 2. ADVANCEMENT: was `from += PAGE_SIZE` — could skip rows if server returns fewer than PAGE_SIZE
//    Now uses `from += page.length` (actual rows received)
// 3. NULL COALESCING: was `item.revenue_shopee || 0` — `||` treats 0 as falsy
//    Now uses `?? 0` (nullish coalescing) — correct for 0-value rows
//
// PAGE_SIZE reduced from 1000 → 500 to stay safely under any project-level max_rows setting.

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';

const PAGE_SIZE = 500;

const fetchAllRows = async () => {
  // ── Step 1: Get exact row count first ────────────────────────────────────
  // This single lightweight HEAD request tells us exactly how many rows exist,
  // so we can use count-based termination instead of page-size-based guessing.
  const { count: totalCount, error: countError } = await supabase
    .from('live_sessions')
    .select('*', { count: 'exact', head: true });

  if (countError) throw countError;
  if (!totalCount) return [];

  console.log(`📊 useRevenue: expecting ${totalCount} total sessions`);

  const allRows = [];
  let from = 0;

  // ── Step 2: Paginate until we have all rows ───────────────────────────────
  // Termination: allRows.length >= totalCount (not page.length < PAGE_SIZE).
  // Advancement: from += page.length (actual received, not assumed PAGE_SIZE).
  // This handles any server-side max_rows setting transparently.
  while (allRows.length < totalCount) {
    const { data, error } = await supabase
      .from('live_sessions')
      .select(`
        id,
        date,
        revenue_shopee,
        revenue_tiktok,
        viewers_shopee,
        viewers_tiktok,
        likes_shopee,
        likes_tiktok,
        host_id,
        brand_id
      `)
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;

    const page = data || [];

    if (page.length === 0) {
      // Server returned nothing — guard against infinite loop
      console.warn(`⚠️ useRevenue: pagination ended early at ${allRows.length}/${totalCount}`);
      break;
    }

    allRows.push(...page);
    from += page.length; // advance by ACTUAL received count, not PAGE_SIZE
  }

  console.log(`📦 useRevenue: fetched ${allRows.length}/${totalCount} sessions`);

  if (allRows.length < totalCount) {
    console.warn(`⚠️ useRevenue: fetched ${allRows.length} but expected ${totalCount} — check Supabase max_rows setting`);
  }

  // ── Step 3: Deduplicate by id ─────────────────────────────────────────────
  const seen = new Set();
  const unique = allRows.filter((row) => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
  if (unique.length !== allRows.length) {
    console.warn(`⚠️ removed ${allRows.length - unique.length} duplicate rows`);
  }

  console.log(`✅ useRevenue: ${unique.length} unique rows`);
  return unique;
};

export const useRevenue = () => {
  const [data, setData]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [brandTotals, setBrandTotals]   = useState(new Map());
  const [yearlyData, setYearlyData]     = useState([]);

  const fetchRevenue = useCallback(async () => {
    try {
      setLoading(true);

      const rows = await fetchAllRows();

      let runningTotal = 0;
      const yearMap  = new Map();
      const brandMap = new Map();

      rows.forEach((item) => {
        // ── FIX: use ?? not || so genuine 0-revenue rows aren't coerced ──
        const s   = item.revenue_shopee ?? 0;
        const t   = item.revenue_tiktok ?? 0;
        const rev = s + t;

        runningTotal += rev;

        if (item.date) {
          const year = new Date(item.date).getFullYear();
          yearMap.set(year, (yearMap.get(year) ?? 0) + rev);
        }

        if (item.brand_id) {
          brandMap.set(item.brand_id, (brandMap.get(item.brand_id) ?? 0) + rev);
        }
      });

      console.log('💰 Total revenue:', runningTotal.toLocaleString('id-ID'));
      console.log('📊 Brand count with revenue:', brandMap.size);

      setTotalRevenue(runningTotal);
      setBrandTotals(brandMap);

      const calculatedYearly = Array.from(yearMap.entries())
        .map(([year, total]) => ({ year, total_revenue: total }))
        .sort((a, b) => a.year - b.year);

      console.log('📊 Yearly breakdown:', calculatedYearly);
      setYearlyData(calculatedYearly);

      setData(
        rows.map((item) => ({
          id:             item.id,
          date:           item.date,
          host_id:        item.host_id,
          brand_id:       item.brand_id,
          revenue_shopee: item.revenue_shopee ?? 0,
          revenue_tiktok: item.revenue_tiktok ?? 0,
          viewers_shopee: item.viewers_shopee ?? 0,
          viewers_tiktok: item.viewers_tiktok ?? 0,
          likes_shopee:   item.likes_shopee   ?? 0,
          likes_tiktok:   item.likes_tiktok   ?? 0,
        }))
      );
    } catch (err) {
      console.error('useRevenue fetch error:', err);
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