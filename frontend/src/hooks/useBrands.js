/**
 * useBrands.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Custom React Hook — Brands Data Layer
 *
 * DEFENCE EXPLANATION:
 * This hook is the SINGLE source of truth for all brand data in the app.
 * It fetches from Supabase directly (no backend proxy needed for reads),
 * handles loading/error states, and exposes CRUD operations.
 *
 * DATA SOURCES:
 *   - brands table          → brand metadata (name, category, status)
 *   - live_sessions table   → revenue per brand (joined for KPIs)
 *   - periods table         → period context for trend data
 *
 * USAGE:
 *   const { brands, kpis, isLoading, error, createBrand,
 *           updateBrand, deleteBrand, refetch } = useBrands();
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../services/supabase";

// ── Helper: sum revenue across shopee + tiktok safely ────────────────────────
function sumRevenue(sessions) {
  return sessions.reduce((acc, s) => {
    return acc + (s.revenue_shopee || 0) + (s.revenue_tiktok || 0);
  }, 0);
}

// ── Helper: format large numbers to readable string ──────────────────────────
export function formatRevenue(value) {
  if (!value && value !== 0) return "—";
  if (value >= 1_000_000_000) return `Rp ${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000)     return `Rp ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000)         return `Rp ${(value / 1_000).toFixed(0)}K`;
  return `Rp ${value.toLocaleString()}`;
}

// ── Helper: compute health score (0–100) from sessions data ──────────────────
// Defence: Health Score = weighted formula of revenue consistency + session frequency
// A brand with high, consistent revenue scores higher than one with sporadic spikes.
function computeHealthScore(sessions) {
  if (!sessions || sessions.length === 0) return 0;
  const revenues = sessions.map(s => (s.revenue_shopee || 0) + (s.revenue_tiktok || 0));
  const avgRevenue = revenues.reduce((a, b) => a + b, 0) / revenues.length;
  const maxRevenue = Math.max(...revenues);
  const consistency = maxRevenue > 0 ? avgRevenue / maxRevenue : 0; // 0–1
  const frequency   = Math.min(sessions.length / 30, 1);            // 0–1, cap at 30 sessions
  const score       = Math.round((consistency * 0.6 + frequency * 0.4) * 100);
  return Math.max(0, Math.min(100, score));
}

// ── Helper: compute period-over-period growth rate ────────────────────────────
function computeGrowth(sessions) {
  if (!sessions || sessions.length < 2) return 0;

  // Group by period_id
  const byPeriod = {};
  sessions.forEach(s => {
    if (!byPeriod[s.period_id]) byPeriod[s.period_id] = 0;
    byPeriod[s.period_id] += (s.revenue_shopee || 0) + (s.revenue_tiktok || 0);
  });

  const periods = Object.keys(byPeriod).sort((a, b) => Number(a) - Number(b));
  if (periods.length < 2) return 0;

  const latest = byPeriod[periods[periods.length - 1]];
  const prev   = byPeriod[periods[periods.length - 2]];
  if (prev === 0) return 0;

  return Math.round(((latest - prev) / prev) * 100);
}

export function useBrands() {
  const [brands,    setBrands]    = useState([]);
  const [kpis,      setKpis]      = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState(null);

  // ── Main fetch function ─────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 1. Fetch all brands
      const { data: brandsData, error: brandsErr } = await supabase
        .from("brands")
        .select("brand_id, brand_name, brand_category, brand_status, brand_created_at")
        .order("brand_created_at", { ascending: true });

      if (brandsErr) throw new Error(brandsErr.message);

      // 2. Fetch all live_sessions with period info for revenue calculation
      const { data: sessionsData, error: sessionsErr } = await supabase
        .from("live_sessions")
        .select("brand_id, period_id, revenue_shopee, revenue_tiktok, platform_id, date, platforms(platform_name)");

      if (sessionsErr) throw new Error(sessionsErr.message);

      // 3. Enrich each brand with revenue + health metrics
      const enrichedBrands = (brandsData || []).map(brand => {
        const brandSessions = sessionsData.filter(s => s.brand_id === brand.brand_id);
        const totalRevenue  = sumRevenue(brandSessions);
        const healthScore   = computeHealthScore(brandSessions);
        const growth        = computeGrowth(brandSessions);
        const sessionCount  = brandSessions.length;

        // Platform breakdown: count sessions per platform
        const platformBreakdown = {};
        brandSessions.forEach(s => {
          const name = s.platforms?.platform_name || "Unknown";
          platformBreakdown[name] = (platformBreakdown[name] || 0) + 1;
        });

        // Determine dominant platform
        const dominantPlatform = Object.entries(platformBreakdown)
          .sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

        return {
          ...brand,
          totalRevenue,
          healthScore,
          growth,
          sessionCount,
          platformBreakdown,
          dominantPlatform,
        };
      });

      // 4. Compute agency-wide KPIs
      const activeCount  = enrichedBrands.filter(b => b.brand_status === "active").length;
      const atRiskCount  = enrichedBrands.filter(b => b.brand_status === "at_risk").length;
      const churnedCount = enrichedBrands.filter(b => b.brand_status === "churned").length;
      const totalRev     = enrichedBrands.reduce((acc, b) => acc + b.totalRevenue, 0);
      const avgHealth    = enrichedBrands.length > 0
        ? Math.round(enrichedBrands.reduce((acc, b) => acc + b.healthScore, 0) / enrichedBrands.length)
        : 0;

      setBrands(enrichedBrands);
      setKpis({
        totalBrands:  enrichedBrands.length,
        activeCount,
        atRiskCount,
        churnedCount,
        totalRevenue: totalRev,
        avgHealthScore: avgHealth,
      });

    } catch (err) {
      setError(err.message);
      console.error("[useBrands] Error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── CREATE brand ────────────────────────────────────────────────────────────
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
    await fetchAll(); // Refresh the full list after mutation
    return data;
  }, [fetchAll]);

  // ── UPDATE brand ────────────────────────────────────────────────────────────
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
    await fetchAll();
    return data;
  }, [fetchAll]);

  // ── DELETE brand ────────────────────────────────────────────────────────────
  // Defence: We do NOT hard delete brands that have live_sessions linked to them.
  // Instead we set status to "churned" to preserve historical data integrity.
  const deleteBrand = useCallback(async (brandId) => {
    // Check if brand has sessions first
    const { count } = await supabase
      .from("live_sessions")
      .select("id", { count: "exact", head: true })
      .eq("brand_id", brandId);

    if (count > 0) {
      // Soft delete — mark as churned, preserve data
      const { error } = await supabase
        .from("brands")
        .update({ brand_status: "churned" })
        .eq("brand_id", brandId);
      if (error) throw new Error(error.message);
    } else {
      // Hard delete — brand has no sessions, safe to remove
      const { error } = await supabase
        .from("brands")
        .delete()
        .eq("brand_id", brandId);
      if (error) throw new Error(error.message);
    }

    await fetchAll();
  }, [fetchAll]);

  // ── Fetch individual sessions for a brand (for charts/details panel) ──────
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
      .order("date", { ascending: true });

    if (error) throw error;

    return (data || []).map(s => ({
      date: s.date,
      revenue: (s.revenue_shopee || 0) + (s.revenue_tiktok || 0),
      viewers: (s.viewers_shopee || 0) + (s.viewers_tiktok || 0),
      likes: (s.likes_shopee || 0) + (s.likes_tiktok || 0),
      platform: s.platforms?.platform_name || "Unknown",
    }));
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // END ADDITION
  // ═══════════════════════════════════════════════════════════════════════════

  return {
    brands,
    kpis,
    isLoading,
    error,
    refetch: fetchAll,
    createBrand,
    updateBrand,
    deleteBrand,
    getBrandSessions,  
  }
};