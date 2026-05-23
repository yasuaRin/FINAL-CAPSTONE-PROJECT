// frontend/src/hooks/useBrands.js
//
// FIX: Removed the independent fetchAllSessionRevenue() loop.
// Revenue totals per brand now come from useRevenue's brandTotals Map,
// passed in as an argument to fetchAll(). This guarantees both hooks
// use the exact same numbers — one fetch, one source of truth.
//
// USAGE in components:
//   const { brandTotals } = useRevenue();
//   const { brands }      = useBrands(brandTotals);

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../services/supabase";

const CACHE_KEY      = 'brands_data';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useBrands(brandTotals = new Map()) {
  const [brands, setBrands]       = useState([]);
  const [kpis, setKpis]           = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]         = useState(null);
  const isMounted                 = useRef(true);

  const fetchAll = useCallback(async (totalsMap = brandTotals) => {
    try {
      // ── Cache check ──────────────────────────────────────────────────────
      // Only use cache if we don't have fresh brandTotals being passed in.
      // If brandTotals has data, skip cache so revenue numbers are always live.
      if (totalsMap.size === 0) {
        const cached = sessionStorage.getItem(CACHE_KEY);
        if (cached) {
          const { brands: cachedBrands, kpis: cachedKpis, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_DURATION && cachedBrands?.length > 0) {
            // console.log('📦 Using cached brands data');
            if (isMounted.current) {
              setBrands(cachedBrands);
              setKpis(cachedKpis);
              setIsLoading(false);
            }
            return;
          }
        }
      }

      setIsLoading(true);
      setError(null);

      // ── Fetch brands meta + risk — NO session revenue fetch here ─────────
      const [
        { data: brandsData, error: brandsErr },
        { data: riskData },
      ] = await Promise.all([
        supabase
          .from("brands")
          .select("brand_id, brand_name, brand_category, brand_status, brand_created_at")
          .order("brand_created_at", { ascending: true }),
        supabase
          .from("risk_monitor")
          .select("brand_id, risk_level, risk_score, reasons"),
      ]);

      if (brandsErr) throw new Error(brandsErr.message);

      const riskMap = new Map((riskData || []).map((r) => [r.brand_id, r]));

      // ── Enrich brands — revenue comes from brandTotals (useRevenue) ──────
      const enrichedBrands = (brandsData || []).map((brand) => {
        // Use the Map passed from useRevenue — same integers, same fetch
        const totalRevenue = totalsMap.get(brand.brand_id) || 0;
        const risk         = riskMap.get(brand.brand_id);
        return {
          ...brand,
          totalRevenue,
          healthScore:       totalRevenue > 0 ? Math.min(100, Math.round(totalRevenue / 100_000_000)) : 0,
          growth:            0,
          sessionCount:      0,
          platformBreakdown: {},
          dominantPlatform:  "—",
          risk_level:        risk?.risk_level ?? null,
          risk_score:        risk?.risk_score ?? null,
          risk_reasons:      risk?.reasons    ?? [],
        };
      });

      // ── KPIs ─────────────────────────────────────────────────────────────
      const activeCount = enrichedBrands.filter((b) => b.brand_status === "active").length;
      const atRiskCount = enrichedBrands.filter((b) => b.risk_level === "High").length;
      // Sum from brandTotals directly — not from enrichedBrands — to match useRevenue exactly
      const totalRev    = Array.from(totalsMap.values()).reduce((acc, v) => acc + v, 0);
      const avgHealth   = enrichedBrands.length > 0
        ? Math.round(enrichedBrands.reduce((acc, b) => acc + b.healthScore, 0) / enrichedBrands.length)
        : 0;

      const newKpis = {
        totalBrands:    enrichedBrands.length,
        activeCount,
        atRiskCount,
        churnedCount:   0,
        totalRevenue:   totalRev,
        avgHealthScore: avgHealth,
      };

      // ── Cache — only when brandTotals is available ────────────────────────
      if (totalsMap.size > 0) {
        sessionStorage.removeItem(CACHE_KEY); // evict stale entry before writing fresh one
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({
          brands: enrichedBrands, kpis: newKpis, timestamp: Date.now(),
        }));
      }

      if (isMounted.current) {
        setBrands(enrichedBrands);
        setKpis(newKpis);
      }
    } catch (err) {
     // console.error("[useBrands] Error:", err);
      if (isMounted.current) setError(err.message);
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  }, [brandTotals]);

  useEffect(() => {
    isMounted.current = true;
    // Re-run whenever brandTotals arrives or updates from useRevenue
    fetchAll(brandTotals);
    return () => { isMounted.current = false; };
  }, [fetchAll, brandTotals]);

  // ── CRUD ─────────────────────────────────────────────────────────────────
  const createBrand = useCallback(async (payload) => {
    const { data, error } = await supabase
      .from("brands")
      .insert([{
        brand_name:     payload.brand_name.trim(),
        brand_category: payload.brand_category?.trim() || null,
        brand_status:   payload.brand_status || "active",
      }])
      .select()
      .single();
    if (error) throw new Error(error.message);
    sessionStorage.removeItem(CACHE_KEY);
    await fetchAll(brandTotals);
    return data;
  }, [fetchAll, brandTotals]);

  const updateBrand = useCallback(async (brandId, payload) => {
    const { data, error } = await supabase
      .from("brands")
      .update({
        brand_name:     payload.brand_name.trim(),
        brand_category: payload.brand_category?.trim() || null,
        brand_status:   payload.brand_status,
      })
      .eq("brand_id", brandId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    sessionStorage.removeItem(CACHE_KEY);
    await fetchAll(brandTotals);
    return data;
  }, [fetchAll, brandTotals]);

  const deleteBrand = useCallback(async (brandId) => {
    try {
      const sessionCheck = await supabase
        .from("live_sessions")
        .select("id", { count: "exact", head: true })
        .eq("brand_id", brandId);

      if (sessionCheck.error) throw sessionCheck.error;

      if (sessionCheck.count > 0) {
        const updateResult = await supabase
          .from("brands")
          .update({ brand_status: "churned" })
          .eq("brand_id", brandId);
        if (updateResult.error) throw updateResult.error;
      } else {
        const deleteResult = await supabase
          .from("brands")
          .delete()
          .eq("brand_id", brandId);
        if (deleteResult.error) throw deleteResult.error;
      }

      sessionStorage.removeItem(CACHE_KEY);
      await fetchAll(brandTotals);
    } catch (err) {
      // console.error('FULL DELETE ERROR:', err);
      alert(err.message || 'Delete failed');
      throw err;
    }
  }, [fetchAll, brandTotals]);

  const getBrandSessions = useCallback(async (brandId) => {
    const { data, error } = await supabase
      .from("live_sessions")
      .select(`
        date,
        revenue_shopee,
        revenue_tiktok,
        viewers_shopee,
        viewers_tiktok,
        likes_shopee,
        likes_tiktok,
        platforms(platform_name)
      `)
      .eq("brand_id", brandId)
      .order("date", { ascending: true })
      .limit(100);
    if (error) throw error;
    return (data || []).map((s) => ({
      date:     s.date,
      revenue:  (s.revenue_shopee || 0) + (s.revenue_tiktok || 0),
      viewers:  (s.viewers_shopee || 0) + (s.viewers_tiktok || 0),
      likes:    (s.likes_shopee   || 0) + (s.likes_tiktok   || 0),
      platform: s.platforms?.platform_name || "Unknown",
    }));
  }, []);

  return {
    brands,
    kpis,
    isLoading,
    loading: isLoading,
    error,
    refetch:         fetchAll,
    createBrand,
    updateBrand,
    deleteBrand,
    getBrandSessions,
  };
}