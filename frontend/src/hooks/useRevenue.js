// frontend/src/hooks/useRevenue.js

import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

const PAGE_SIZE = 1000;

// Fetches ALL rows without relying on a COUNT query.
// The COUNT HEAD request returns null when Supabase RLS is enabled,
// which caused the previous version to bail out immediately with [].
// This loop just keeps fetching pages until a page comes back with
// fewer than PAGE_SIZE rows — then we know we're done.
const fetchAllRows = async () => {
  const allRows = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('live_sessions')
      .select('id, date, revenue_shopee, revenue_tiktok, host_id, brand_id')
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;

    const page = data || [];
    allRows.push(...page);

    // If we got a full page there may be more; otherwise we're done
    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  console.log(`📦 useRevenue: fetched ${allRows.length} total sessions`);
  return allRows;
};

export const useRevenue = () => {
  const [data, setData]                 = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [yearlyData, setYearlyData]     = useState([]);

  useEffect(() => {
    const fetchRevenue = async () => {
      try {
        setLoading(true);

        const rows = await fetchAllRows();

        // ── TOTAL REVENUE ──────────────────────────────────────────────────
        const accurateTotal = rows.reduce(
          (sum, item) => sum + (item.revenue_shopee || 0) + (item.revenue_tiktok || 0),
          0
        );
        console.log('💰 Total revenue:', accurateTotal.toLocaleString('id-ID'));
        setTotalRevenue(accurateTotal);

        // ── YEARLY BREAKDOWN ───────────────────────────────────────────────
        const yearMap = new Map();
        rows.forEach((item) => {
          if (!item?.date) return;
          const year    = new Date(item.date).getFullYear();
          const revenue = (item.revenue_shopee || 0) + (item.revenue_tiktok || 0);
          yearMap.set(year, (yearMap.get(year) || 0) + revenue);
        });

        const calculatedYearly = Array.from(yearMap.entries())
          .map(([year, total]) => ({ year, total_revenue: total }))
          .sort((a, b) => a.year - b.year);

        console.log('📊 Yearly breakdown:', calculatedYearly);
        setYearlyData(calculatedYearly);

        // ── SESSION ROWS (for brand filtering) ────────────────────────────
        setData(
          rows.map((item) => ({
            id:             item.id,
            date:           item.date,
            host_id:        item.host_id,
            brand_id:       item.brand_id,
            revenue_shopee: item.revenue_shopee ?? 0,
            revenue_tiktok: item.revenue_tiktok ?? 0,
          }))
        );
      } catch (err) {
        console.error('useRevenue fetch error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRevenue();
  }, []);

  return { data, loading, error, totalRevenue, yearlyData };
};