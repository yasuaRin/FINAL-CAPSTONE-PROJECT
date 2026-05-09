// frontend/src/hooks/useBrands.js
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../services/supabase";

const CACHE_KEY = 'brands_data';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useBrands() {
  const [brands, setBrands] = useState([]);
  const [kpis, setKpis] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const isMounted = useRef(true);

  const fetchAll = useCallback(async () => {
    try {
      // Check cache first
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        const { brands: cachedBrands, kpis: cachedKpis, timestamp } = JSON.parse(cached);
        const isExpired = Date.now() - timestamp > CACHE_DURATION;
        
        if (!isExpired && cachedBrands?.length > 0) {
          console.log('📦 Using cached brands data');
          if (isMounted.current) {
            setBrands(cachedBrands);
            setKpis(cachedKpis);
            setIsLoading(false);
          }
          return;
        }
      }

      setIsLoading(true);
      setError(null);

      // Fetch brands metadata
      const { data: brandsData, error: brandsErr } = await supabase
        .from("brands")
        .select("brand_id, brand_name, brand_category, brand_status, brand_created_at")
        .order("brand_created_at", { ascending: true });

      if (brandsErr) throw new Error(brandsErr.message);

      // Get revenue per brand
      const { data: brandRevenue } = await supabase
        .from('live_sessions')
        .select('brand_id, revenue_shopee, revenue_tiktok');

      const revenueMap = new Map();
      (brandRevenue || []).forEach(item => {
        const brandId = item.brand_id;
        const revenue = (item.revenue_shopee || 0) + (item.revenue_tiktok || 0);
        revenueMap.set(brandId, (revenueMap.get(brandId) || 0) + revenue);
      });

      // Get risk levels
      const { data: riskData } = await supabase
        .from("risk_monitor")
        .select("brand_id, risk_level, risk_score, reasons");

      const riskMap = new Map((riskData || []).map(r => [r.brand_id, r]));

      // Build enriched brands
      const enrichedBrands = (brandsData || []).map(brand => {
        const totalRevenue = revenueMap.get(brand.brand_id) || 0;
        const risk = riskMap.get(brand.brand_id);
        
        return {
          ...brand,
          totalRevenue,
          healthScore: totalRevenue > 0 ? Math.min(100, Math.round(totalRevenue / 100000000)) : 0,
          growth: 0,
          sessionCount: 0,
          platformBreakdown: {},
          dominantPlatform: "—",
          risk_level: risk?.risk_level ?? null,
          risk_score: risk?.risk_score ?? null,
          risk_reasons: risk?.reasons ?? [],
        };
      });

      // Calculate KPIs
      const activeCount = enrichedBrands.filter(b => b.brand_status === "active").length;
      const atRiskCount = enrichedBrands.filter(b => b.risk_level === "High").length;
      const totalRev = enrichedBrands.reduce((acc, b) => acc + b.totalRevenue, 0);
      const avgHealth = enrichedBrands.length > 0
        ? Math.round(enrichedBrands.reduce((acc, b) => acc + b.healthScore, 0) / enrichedBrands.length)
        : 0;

      const newKpis = {
        totalBrands: enrichedBrands.length,
        activeCount,
        atRiskCount,
        churnedCount: 0,
        totalRevenue: totalRev,
        avgHealthScore: avgHealth,
      };

      // Save to cache
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({
        brands: enrichedBrands,
        kpis: newKpis,
        timestamp: Date.now()
      }));

      if (isMounted.current) {
        setBrands(enrichedBrands);
        setKpis(newKpis);
      }

    } catch (err) {
      console.error("[useBrands] Error:", err);
      if (isMounted.current) setError(err.message);
    } finally {
      if (isMounted.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    fetchAll();
    return () => { isMounted.current = false; };
  }, [fetchAll]);

  // Rest of your CRUD operations...
  const createBrand = useCallback(async (payload) => {
    const { data, error } = await supabase
      .from("brands")
      .insert([{
        brand_name: payload.brand_name.trim(),
        brand_category: payload.brand_category?.trim() || null,
        brand_status: payload.brand_status || "active",
      }])
      .select()
      .single();

    if (error) throw new Error(error.message);
    // Clear cache after mutation
    sessionStorage.removeItem(CACHE_KEY);
    await fetchAll();
    return data;
  }, [fetchAll]);

  const updateBrand = useCallback(async (brandId, payload) => {
    const { data, error } = await supabase
      .from("brands")
      .update({
        brand_name: payload.brand_name.trim(),
        brand_category: payload.brand_category?.trim() || null,
        brand_status: payload.brand_status,
      })
      .eq("brand_id", brandId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    sessionStorage.removeItem(CACHE_KEY);
    await fetchAll();
    return data;
  }, [fetchAll]);

  const deleteBrand = useCallback(async (brandId) => {
  try {
    console.log('====================');
    console.log('DELETE START');
    console.log('Brand ID:', brandId);

    // STEP 1
    const sessionCheck = await supabase
      .from("live_sessions")
      .select("id", { count: "exact", head: true })
      .eq("brand_id", brandId);

    console.log('SESSION CHECK:', sessionCheck);

    if (sessionCheck.error) {
      console.error('COUNT ERROR:', sessionCheck.error);
      throw sessionCheck.error;
    }

    // STEP 2
    if (sessionCheck.count > 0) {
      console.log('Updating to churned...');

      const updateResult = await supabase
        .from("brands")
        .update({
          brand_status: "churned",
        })
        .eq("brand_id", brandId);

      console.log('UPDATE RESULT:', updateResult);

      if (updateResult.error) {
        console.error('UPDATE ERROR:', updateResult.error);
        throw updateResult.error;
      }
    }

    // STEP 3
    else {
      console.log('Deleting permanently...');

      const deleteResult = await supabase
        .from("brands")
        .delete()
        .eq("brand_id", brandId);

      console.log('DELETE RESULT:', deleteResult);

      if (deleteResult.error) {
        console.error('DELETE ERROR:', deleteResult.error);
        throw deleteResult.error;
      }
    }

    // STEP 4
    sessionStorage.removeItem(CACHE_KEY);

    console.log('CACHE CLEARED');

    await fetchAll();

    console.log('REFETCH DONE');
    console.log('DELETE SUCCESS');

  } catch (err) {
    console.error('FULL DELETE ERROR:', err);
    alert(err.message || 'Delete failed');
    throw err;
  }
}, [fetchAll]);

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
    return (data || []).map(s => ({
      date: s.date,
      revenue: (s.revenue_shopee || 0) + (s.revenue_tiktok || 0),
      viewers: (s.viewers_shopee || 0) + (s.viewers_tiktok || 0),
      likes: (s.likes_shopee || 0) + (s.likes_tiktok || 0),
      platform: s.platforms?.platform_name || "Unknown",
    }));
  }, []);

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
  };
}