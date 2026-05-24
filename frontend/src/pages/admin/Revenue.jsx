// frontend/src/pages/admin/Revenue.jsx

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, X, AlertTriangle, Plus, Users, SlidersHorizontal, ChevronDown
} from 'lucide-react';

// CHANGED: removed DateRangeSelector import.
// ADDED:   SortByButton — the same shared component used by Dashboard.
import { SortByButton } from '../../components/layout/SortByButton';
import { useRevenue } from '../../hooks/useRevenue';
import { useBrands } from '../../hooks/useBrands';
import { useTeam } from '../../hooks/useTeam';
import { supabase } from '../../services/supabase';

import {
  subDays, isWithinInterval, startOfDay, endOfDay,
  parseISO, format,
} from 'date-fns';

import RevenueBrandsPanel from '../../components/revenue/RevenueBrandsPanel';
import RevenueSessionsTable from '../../components/revenue/RevenueSessionsTable';

const formatCurrency = (value) => `Rp ${(value || 0).toLocaleString('id-ID')}`;
const sid = (v) => (v == null ? '' : String(v));

// ── Parse "YYYY-MM-DD" or ISO strings as LOCAL midnight, not UTC midnight.
//    Prevents WIB (UTC+7) timezone shifts from moving dates to the wrong day.
const parseLocalDateStr = (str) => {
  if (!str) return null;
  const datePart = typeof str === 'string' ? str.split('T')[0] : str;
  const parts = datePart.split('-').map(Number);
  if (parts.length < 3 || parts.some(isNaN)) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
};

// Rows per page options
const LIMIT_OPTIONS = [10, 20, 30, 40, 50, 100, 200, 500, 1000, null];

const Revenue = () => {
  // SortByButton will fetch actual date bounds from Supabase and set allData.
  // The wide initial range ensures all sessions are shown before that happens.
  const [dateRange, setDateRange] = useState({
    start: subDays(new Date(), 365 * 10),
    end: new Date(),
    preset: 'allData',
  });

  const [insightBrandId, setInsightBrandId]   = useState('All');
  const [notification, setNotification]       = useState(null);
  const [tableFilter, setTableFilter]         = useState({ brandId: 'All', period: 'All' });
  const [editingSession, setEditingSession]   = useState(null);
  const [sessionToDelete, setSessionToDelete] = useState(null);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [searchTerm, setSearchTerm]           = useState('');

  const [sessionFormData, setSessionFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    time: format(new Date(), 'HH:mm'),
    brandId: '',
    platform: 'TikTok',
    viewers: 0,
    revenue: 0,
    period_id: '',
    host_team_member_id: '',
  });

  const sortCol = 'date';
  const sortDir = 'desc';

  const [rowLimit, setRowLimit]       = useState(25);
  const [periodsData, setPeriodsData] = useState([]);

  const [globalFilterOpen, setGlobalFilterOpen] = useState(false);
  const globalFilterRef = useRef(null);
  const fileInputRef    = useRef(null);

  const { data: revenueData, loading, refetch: refetchRevenue, brandTotals } = useRevenue();
  const { brands } = useBrands(brandTotals);
  const { team }   = useTeam();

  // Modal states for staff detail
  const [selectedStaffForDetail, setSelectedStaffForDetail] = useState(null);
  const [showStaffDetailModal, setShowStaffDetailModal] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      if (globalFilterRef.current && !globalFilterRef.current.contains(e.target)) {
        setGlobalFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const fetchPeriods = async () => {
      try {
        const { data, error } = await supabase
          .from('periods')
          .select('period_id, period_name, period_start_date, period_end_date')
          .order('period_id');
        if (!error && data) setPeriodsData(data);
      } catch {
        // silently handle
      }
    };
    fetchPeriods();
  }, []);

  const periodMap = useMemo(() => {
    const map = {};
    periodsData.forEach(p => {
      map[p.period_id] = {
        id: p.period_id,
        name: p.period_name || `Period ${p.period_id}`,
        startDate: p.period_start_date,
        endDate: p.period_end_date,
      };
    });
    return map;
  }, [periodsData]);

  const brandsList = useMemo(() => {
    if (!brands) return [];
    return brands
      .map(b => ({ id: sid(b.brand_id), name: b.brand_name, totalRevenue: brandTotals.get(sid(b.brand_id)) || 0 }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [brands, brandTotals]);

  const teamMap = useMemo(() => {
    const m = {};
    (team || []).forEach(t => { m[sid(t.id)] = t.name; });
    return m;
  }, [team]);

  const revenueLogs = useMemo(() => {
    if (!revenueData) return [];
    return revenueData.map(i => ({
      id: sid(i.id),
      brandId: sid(i.brand_id),
      hostId: sid(i.host_team_member_id),
      date: i.date,
      time: i.time || '',
      period_id: i.period_id,
      platform:
        i.revenue_shopee > 0 && i.revenue_tiktok > 0 ? 'Multi'
        : i.revenue_shopee > 0 ? 'Shopee' : 'TikTok',
      revenue: (i.revenue_shopee ?? 0) + (i.revenue_tiktok ?? 0),
      viewers: (i.viewers_shopee ?? 0) + (i.viewers_tiktok ?? 0),
      likes: (i.likes_shopee ?? 0) + (i.likes_tiktok ?? 0),
    }));
  }, [revenueData]);

  const brandMap = useMemo(() => {
    const m = {};
    brandsList.forEach(b => { m[b.id] = b.name; });
    return m;
  }, [brandsList]);

  // ── DATE FILTERING using local date parsing to avoid UTC boundary shifts ──
  const dateFilteredLogs = useMemo(() => {
    if (!dateRange.start || !dateRange.end) return revenueLogs;
    const rangeStart = startOfDay(dateRange.start);
    const rangeEnd   = endOfDay(dateRange.end);
    return revenueLogs.filter(l => {
      try {
        const date = parseLocalDateStr(l.date);
        if (!date) return false;
        return isWithinInterval(date, { start: rangeStart, end: rangeEnd });
      } catch {
        return false;
      }
    });
  }, [revenueLogs, dateRange]);

  const rangeRevenue         = useMemo(() => dateFilteredLogs.reduce((s, l) => s + l.revenue, 0), [dateFilteredLogs]);
  const totalSessionsInRange = dateFilteredLogs.length;
  const avgRevenueInRange    = totalSessionsInRange === 0 ? 0 : rangeRevenue / totalSessionsInRange;

  const allTimeRevenue = useMemo(() => {
    let t = 0; brandTotals.forEach(v => { t += v; }); return t;
  }, [brandTotals]);

  const topPlatform = useMemo(() => {
    const stats = { TikTok: 0, Shopee: 0, Multi: 0 };
    dateFilteredLogs.forEach(l => { stats[l.platform] += l.revenue; });
    const entries = Object.entries(stats).filter(([, r]) => r > 0);
    if (!entries.length) return { name: 'N/A', revenue: 0 };
    const [name, revenue] = entries.reduce((p, c) => (p[1] > c[1] ? p : c));
    return { name, revenue };
  }, [dateFilteredLogs]);

  // Add this state near other useState declarations
const [topPerformersFromView, setTopPerformersFromView] = useState([]);
const [loadingPerformers, setLoadingPerformers] = useState(false);

// Add this useEffect to fetch from the view
useEffect(() => {
  const fetchTopPerformers = async () => {
    setLoadingPerformers(true);
    try {
      const { data, error } = await supabase
        .from('team_performance_view')
        .select('team_name, session_count, total_revenue, total_viewers, total_likes, revenue_score, viewer_score, likes_score, final_score')
        .limit(5);

      if (error) throw error;
      
      // Transform to match your existing format
      const transformedData = (data || []).map(item => ({
        staffId: item.team_name,
        staffName: item.team_name,
        sessionCount: item.session_count,
        totalRevenue: item.total_revenue,
        totalViewers: item.total_viewers,
        totalLikes: item.total_likes,
        revenueScore: item.revenue_score,
        viewerScore: item.viewer_score,
        likesScore: item.likes_score,
        finalScore: item.final_score,
        avgRevenuePerSession: item.session_count > 0 ? item.total_revenue / item.session_count : 0,
        avgViewersPerSession: item.session_count > 0 ? item.total_viewers / item.session_count : 0,
        avgLikesPerSession: item.session_count > 0 ? item.total_likes / item.session_count : 0,
        revenuePerViewer: item.total_viewers > 0 ? item.total_revenue / item.total_viewers : 0,
      }));
      
      setTopPerformersFromView(transformedData);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoadingPerformers(false);
    }
  };
  
  fetchTopPerformers();
}, []);

  const brandPerformanceInsights = useMemo(() => {
    const map = {};
    brandsList.forEach(b => {
      map[b.id] = { id: b.id, name: b.name, totalRevenue: 0, peakRevenue: 0, peakPeriod: '', peakPeriodId: null, peakRange: '', overallStartDate: null, overallEndDate: null, overallRange: '', hasSessions: false, sessionCount: 0, periodRevenue: {} };
    });
    dateFilteredLogs.forEach(log => {
      const b = map[log.brandId];
      if (!b) return;
      b.totalRevenue += log.revenue; b.sessionCount++; b.hasSessions = true;
      const ld = parseLocalDateStr(log.date);
      if (ld) {
        if (!b.overallStartDate || ld < b.overallStartDate) b.overallStartDate = ld;
        if (!b.overallEndDate   || ld > b.overallEndDate)   b.overallEndDate   = ld;
      }
      const pk = `period_${log.period_id}`;
      if (!b.periodRevenue[pk]) b.periodRevenue[pk] = { periodId: log.period_id, revenue: 0, sessions: [] };
      b.periodRevenue[pk].revenue += log.revenue;
      b.periodRevenue[pk].sessions.push({ date: log.date, revenue: log.revenue });
      if (log.revenue > b.peakRevenue) b.peakRevenue = log.revenue;
    });
    Object.values(map).forEach(b => {
      if (b.overallStartDate && b.overallEndDate)
        b.overallRange = `${format(b.overallStartDate, 'dd MMM yyyy')} - ${format(b.overallEndDate, 'dd MMM yyyy')}`;
      if (b.hasSessions && Object.keys(b.periodRevenue).length > 0) {
        let best = null, bestRev = 0;
        Object.values(b.periodRevenue).forEach(p => { if (p.revenue > bestRev) { bestRev = p.revenue; best = p; } });
        if (best) {
          b.peakPeriodId = best.periodId; b.peakPeriod = `Period ${best.periodId}`; b.bestPeriodRevenue = bestRev;
          const pi = periodMap[best.periodId];
          if (pi?.startDate && pi?.endDate) {
            b.peakRange = `${format(parseISO(pi.startDate), 'dd MMM yyyy')} - ${format(parseISO(pi.endDate), 'dd MMM yyyy')}`;
          } else {
            const dates = best.sessions.map(s => parseLocalDateStr(s.date)).filter(Boolean).sort((a, b) => a - b);
            if (dates.length > 0) {
              b.peakRange = `${format(dates[0], 'dd MMM yyyy')} - ${format(dates[dates.length - 1], 'dd MMM yyyy')}`;
            }
          }
        }
      }
    });
    let results = Object.values(map);
    if (insightBrandId !== 'All') results = results.filter(b => b.id === insightBrandId);
    return results.sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [dateFilteredLogs, brandsList, insightBrandId, periodMap]);

  const sessionIntelligence = useMemo(() => {
    let rows = dateFilteredLogs.map(log => ({
      ...log,
      brandName: brandMap[log.brandId] || 'Unknown Brand',
      staffName: teamMap[log.hostId] || '—',
      period: `Period ${log.period_id}`,
      time: log.time || '',
    }));
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      rows = rows.filter(r =>
        r.brandName.toLowerCase().includes(q) ||
        r.staffName.toLowerCase().includes(q) ||
        r.platform.toLowerCase().includes(q)
      );
    }
    if (tableFilter.brandId !== 'All') rows = rows.filter(r => r.brandId === tableFilter.brandId);
    if (tableFilter.period  !== 'All') rows = rows.filter(r => r.period === tableFilter.period);
    rows.sort((a, b) => {
      const av = sortCol === 'date' ? new Date(a.date).getTime() : a[sortCol];
      const bv = sortCol === 'date' ? new Date(b.date).getTime() : b[sortCol];
      return sortDir === 'asc' ? av - bv : bv - av;
    });
    return rows;
  }, [dateFilteredLogs, brandMap, teamMap, searchTerm, tableFilter, sortCol, sortDir]);

  const visibleSessions = useMemo(
    () => rowLimit === null ? sessionIntelligence : sessionIntelligence.slice(0, rowLimit),
    [sessionIntelligence, rowLimit]
  );

  const uniquePeriods = useMemo(() => {
    const periods = new Set();
    dateFilteredLogs.forEach(log => { periods.add(`Period ${log.period_id}`); });
    return Array.from(periods).sort((a, b) => {
      const numA = parseInt(a.split(' ')[1]);
      const numB = parseInt(b.split(' ')[1]);
      return numA - numB;
    });
  }, [dateFilteredLogs]);

  // ── Brand change handler for SortByButton ────────────────────────────────
  // SortByButton passes null for "all brands", Revenue uses 'All' internally.
  const handleSortByBrandChange = (brandId) => {
    handleGlobalBrand(brandId || 'All');
  };

  const handleGlobalBrand = (brandId) => {
    setInsightBrandId(brandId);
    setTableFilter(prev => ({ ...prev, brandId }));
    setGlobalFilterOpen(false);
  };

  const handleGlobalPeriod = (period) => {
    setTableFilter(prev => ({ ...prev, period }));
    setGlobalFilterOpen(false);
  };

  const resetGlobalFilters = () => {
    setInsightBrandId('All');
    setTableFilter({ brandId: 'All', period: 'All' });
    setRowLimit(25);
    setGlobalFilterOpen(false);
  };

  // CHANGED: brand is now handled by SortByButton, so only period and rows
  // count toward the Filters badge.
  const globalActiveCount = [
    tableFilter.period !== 'All',
    rowLimit !== 25,
  ].filter(Boolean).length;

  const notify = (msg) => { setNotification(msg); setTimeout(() => setNotification(null), 3500); };

  const resetForm = () => setSessionFormData({
    date: format(new Date(), 'yyyy-MM-dd'),
    time: format(new Date(), 'HH:mm'),
    brandId: brandsList[0]?.id || '',
    platform: 'TikTok',
    viewers: 0,
    revenue: 0,
    period_id: periodsData[0]?.period_id || '',
    host_team_member_id: team?.[0] ? sid(team[0].id) : '',
  });

  const handleCreateSession = async () => {
    if (!sessionFormData.brandId)   return notify('Please select a brand');
    if (!sessionFormData.period_id) return notify('Please select a period');
    try {
      let platformId = null;
      try {
        const { data: platRow } = await supabase
          .from('platforms')
          .select('platform_id')
          .ilike('platform_name', sessionFormData.platform)
          .maybeSingle();
        platformId = platRow?.platform_id ?? null;
      } catch {
        // platform_id stays null
      }

      const isShopee = ['Shopee', 'Multi'].includes(sessionFormData.platform);
      const isTikTok = ['TikTok', 'Multi'].includes(sessionFormData.platform);

      const { error } = await supabase.from('live_sessions').insert([{
        date:           sessionFormData.date,
        time:           sessionFormData.time || '00:00',
        revenue_shopee: isShopee ? Number(sessionFormData.revenue)  : 0,
        revenue_tiktok: isTikTok ? Number(sessionFormData.revenue)  : 0,
        viewers_shopee: isShopee ? Number(sessionFormData.viewers)  : 0,
        viewers_tiktok: isTikTok ? Number(sessionFormData.viewers)  : 0,
        likes_shopee:   0,
        likes_tiktok:   0,
        period_id:      sessionFormData.period_id,
        host_team_member_id:        sessionFormData.host_team_member_id || null,
        brand_id:       sessionFormData.brandId,
        platform_id:    platformId,
      }]);

      if (error) throw error;      
      setShowSessionModal(false);
      resetForm();
      await refetchRevenue();
      notify(' Session created');
    } catch (err) {
      notify(`❌ Failed: ${err.message || 'Unknown error'}`);
    }
  };

  const handleUpdateSession = async () => {
    if (!sessionFormData.brandId)   return notify('Please select a brand');
    if (!sessionFormData.period_id) return notify('Please select a period');
    try {
      const isShopee = ['Shopee', 'Multi'].includes(sessionFormData.platform);
      const isTikTok = ['TikTok', 'Multi'].includes(sessionFormData.platform);
      const { error } = await supabase.from('live_sessions').update({
        date:           sessionFormData.date,
        time:           sessionFormData.time || '00:00',
        revenue_shopee: isShopee ? Number(sessionFormData.revenue) : 0,
        revenue_tiktok: isTikTok ? Number(sessionFormData.revenue) : 0,
        viewers_shopee: isShopee ? Number(sessionFormData.viewers) : 0,
        viewers_tiktok: isTikTok ? Number(sessionFormData.viewers) : 0,
        brand_id:       sessionFormData.brandId,
        period_id:      sessionFormData.period_id,
        host_team_member_id:        sessionFormData.host_team_member_id || null,
      }).eq('id', editingSession.id);
      if (error) throw error;
      setShowSessionModal(false);
      setEditingSession(null);
      resetForm();
      await refetchRevenue();
      notify(' Session updated');
    } catch (err) {
      notify(`❌ Failed: ${err.message || 'Unknown error'}`);
    }
  };

  const confirmDelete = async () => {
    try {
      const { error } = await supabase.from('live_sessions').delete().eq('id', sessionToDelete.id);
      if (error) throw error;
      setSessionToDelete(null);
      await refetchRevenue();
      notify('Session deleted');
    } catch (err) {
      notify(`❌ Failed: ${err.message || 'Unknown error'}`);
    }
  };

  const handleDeleteSession = (id) => {
    const session = sessionIntelligence.find(x => x.id === id);
    if (session) setSessionToDelete(session);
  };

  const openEditModal = (session) => {
    setEditingSession(session);
    setSessionFormData({
      date:      session.date,
      time:      session.time || format(new Date(), 'HH:mm'),
      brandId:   session.brandId,
      platform:  session.platform,
      viewers:   session.viewers,
      revenue:   session.revenue,
      period_id: session.period_id || '',
      host_team_member_id: session.hostId || '',
    });
    setShowSessionModal(true);
  };

  const handleHallOfFameClick = (brandId, period) => {
    document.getElementById('session-intelligence')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setInsightBrandId(brandId);
    setTableFilter({ brandId, period });
    notify(`Showing sessions for ${period}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div id="revenue-report-container" className="space-y-6 pb-16 relative min-w-0 overflow-x-hidden">
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 20, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-4 left-1/2 z-[100] bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/10"
          >
            <div className="bg-emerald-500 rounded-full p-1"><CheckCircle2 size={16} /></div>
            <span className="text-sm font-bold tracking-tight">{notification}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Revenue</h1>
          <p className="text-muted-foreground mt-1 text-sm">Track performance, analyze trends, and monitor platform distribution.</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <SortByButton
            brands={brands}
            onBrandChange={handleSortByBrandChange}
            selectedBrand={insightBrandId !== 'All' ? insightBrandId : null}
            onDateRangeChange={setDateRange}
            dateRange={dateRange}
          />

          {/* Filters — Period and Rows only (brand handled by SortByButton above) */}
          <div className="relative" ref={globalFilterRef}>
            <button
              onClick={() => setGlobalFilterOpen(p => !p)}
              className={`relative flex items-center gap-2 h-10 px-4 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all ${
                globalFilterOpen
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border bg-muted/20 text-foreground hover:border-primary/40'
              }`}
            >
              <SlidersHorizontal size={14} />
              Filters
              {globalActiveCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary text-white text-[9px] font-black flex items-center justify-center">
                  {globalActiveCount}
                </span>
              )}
              <ChevronDown size={12} className={`transition-transform ${globalFilterOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {globalFilterOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.98 }}
                  transition={{ duration: 0.14 }}
                  className="absolute right-0 top-full mt-2 z-50 w-[280px] bg-card border border-border rounded-2xl shadow-xl"
                >
                  <div className="p-4 space-y-4">
                    {/* Period Dropdown */}
                    <div>
                      <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">Period</label>
                      <select
                        value={tableFilter.period}
                        onChange={(e) => handleGlobalPeriod(e.target.value)}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs font-medium outline-none focus:ring-1 focus:ring-primary/20"
                      >
                        <option value="All">All Periods</option>
                        {Array.from({ length: 25 }, (_, i) => i + 1).map(period => (
                          <option key={`filter-period-${period}`} value={`Period ${period}`}>Period {period}</option>
                        ))}
                      </select>
                    </div>

                    <div className="border-t border-border/60" />

                    {/* Rows per page Dropdown */}
                    <div>
                      <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">Rows per page</label>
                      <select
                        value={rowLimit === null ? 'All' : rowLimit}
                        onChange={(e) => setRowLimit(e.target.value === 'All' ? null : parseInt(e.target.value))}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs font-medium outline-none focus:ring-1 focus:ring-primary/20"
                      >
                        {LIMIT_OPTIONS.map(opt => (
                          <option key={opt === null ? 'All' : opt} value={opt === null ? 'All' : opt}>
                            {opt === null ? 'All' : opt}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={resetGlobalFilters}
                      className="w-full py-2 rounded-lg border border-border/60 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:bg-muted/20 transition-all mt-2"
                    >
                      Reset all filters
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <input type="file" ref={fileInputRef} className="hidden" accept=".csv,.xlsx,.json" />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 min-w-0">
        <div className="bg-card p-5 rounded-2xl border border-border shadow-sm min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
            Revenue <span className="font-normal normal-case text-[9px] text-muted-foreground/50">(range)</span>
          </p>
          <p className="text-xl sm:text-2xl font-bold text-foreground leading-tight break-all">{formatCurrency(rangeRevenue)}</p>
          <div className="mt-2 pt-3 border-t border-border/40 flex items-center gap-1.5 flex-wrap">
            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">All-time</span>
            <span className="text-[11px] font-bold text-foreground break-all">{formatCurrency(allTimeRevenue)}</span>
          </div>
        </div>

                 <div className="bg-card p-5 rounded-2xl border border-border shadow-sm min-w-0">
          <div className="flex items-center gap-2 mb-3">
            <Users size={12} className="text-primary shrink-0" />
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Top Performers</p>
          </div>
          <div className="space-y-2">
            {topPerformersFromView.length === 0 ? (
              <p className="text-xs text-muted-foreground">No data in range</p>
            ) : (
              topPerformersFromView.map((staff, i) => (
                <div 
                  key={staff.staffId} 
                  className="flex items-center justify-between gap-2 min-w-0 cursor-pointer hover:bg-muted/50 p-1 rounded-lg transition-colors"
                  onClick={() => {
                    setSelectedStaffForDetail(staff);
                    setShowStaffDetailModal(true);
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-[8px] font-black text-muted-foreground/50 w-3 shrink-0">{i + 1}</span>
                    <span className="text-[11px] font-bold text-primary truncate hover:underline">{staff.staffName}</span>
                  </div>
                  <span className="text-[9px] font-bold text-foreground truncate">
                  See details
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-card p-5 rounded-2xl border border-border shadow-sm min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
            Top Platform <span className="font-normal normal-case text-[9px] text-muted-foreground/50">(range)</span>
          </p>
          <p className="text-xl sm:text-2xl font-bold text-foreground">{topPlatform.name}</p>
          <div className="mt-2 pt-3 border-t border-border/40 flex items-center gap-1.5 flex-wrap">
            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Revenue</span>
            <span className="text-[11px] font-bold text-foreground break-all">{formatCurrency(topPlatform.revenue)}</span>
          </div>
        </div>

        <div className="bg-card p-5 rounded-2xl border border-border shadow-sm min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
            Live Sessions <span className="font-normal normal-case text-[9px] text-muted-foreground/50">(range)</span>
          </p>
          <p className="text-xl sm:text-2xl font-bold text-foreground">{totalSessionsInRange.toLocaleString()}</p>
          <div className="mt-2 pt-3 border-t border-border/40 flex items-center gap-1.5 flex-wrap">
            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Avg / session</span>
            <span className="text-[11px] font-bold text-foreground break-all">{formatCurrency(Math.round(avgRevenueInRange))}</span>
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12 min-w-0">
        <RevenueBrandsPanel
          brandsList={brandsList}
          insightBrandId={insightBrandId}
          brandPerformanceInsights={brandPerformanceInsights}
          handleHallOfFameClick={handleHallOfFameClick}
          formatCurrency={formatCurrency}
        />
        <RevenueSessionsTable
          visibleSessions={visibleSessions}
          sessionIntelligence={sessionIntelligence}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          tableFilter={tableFilter}
          setTableFilter={setTableFilter}
          sortCol={sortCol}
          sortDir={sortDir}
          rowLimit={rowLimit}
          setRowLimit={setRowLimit}
          openEditModal={openEditModal}
          handleDeleteSession={handleDeleteSession}
          formatCurrency={formatCurrency}
          parseISO={parseISO}
          format={format}
          resetForm={resetForm}
          setShowSessionModal={setShowSessionModal}
          uniquePeriods={uniquePeriods}
          loading={loading}
        />
      </div>

      {/* Add/Edit Session Modal */}
      <AnimatePresence>
        {showSessionModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-card w-full max-w-md rounded-3xl border border-border shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="px-6 py-4 border-b border-border bg-muted/20 flex items-center justify-between sticky top-0">
                <h3 className="text-xs font-bold uppercase tracking-[0.2em]">
                  {editingSession ? 'Edit Record' : 'Record New Session'}
                </h3>
                <button onClick={() => { setShowSessionModal(false); setEditingSession(null); }} className="p-2 hover:bg-muted rounded-full">
                  <X size={16} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Date</label>
                    <input
                      type="date"
                      value={sessionFormData.date}
                      onChange={e => setSessionFormData(p => ({ ...p, date: e.target.value }))}
                      className="w-full bg-muted/40 border border-border rounded-xl px-4 py-3 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Time</label>
                    <input
                      type="time"
                      value={sessionFormData.time}
                      onChange={e => setSessionFormData(p => ({ ...p, time: e.target.value }))}
                      className="w-full bg-muted/40 border border-border rounded-xl px-4 py-3 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Brand *</label>
                    <select
                      value={sessionFormData.brandId}
                      onChange={e => setSessionFormData(p => ({ ...p, brandId: e.target.value }))}
                      className="w-full bg-muted/40 border border-border rounded-xl px-4 py-3 text-xs"
                    >
                      <option value="" disabled>Select Brand</option>
                      {brandsList.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Channel</label>
                    <select
                      value={sessionFormData.platform}
                      onChange={e => setSessionFormData(p => ({ ...p, platform: e.target.value }))}
                      className="w-full bg-muted/40 border border-border rounded-xl px-4 py-3 text-xs"
                    >
                      <option value="TikTok">TikTok</option>
                      <option value="Shopee">Shopee</option>
                      <option value="Multi">Multi-Platform</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Period *</label>
                    <select
                      value={sessionFormData.period_id}
                      onChange={e => setSessionFormData(p => ({ ...p, period_id: e.target.value }))}
                      className="w-full bg-muted/40 border border-border rounded-xl px-4 py-3 text-xs"
                    >
                      <option value="" disabled>Select Period</option>
                      {periodsData.map((p, idx) => (
                        <option key={`modal-period-${p.period_id}-${idx}`} value={p.period_id}>
                          {p.period_name || `Period ${p.period_id}`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Host</label>
                    <select
                      value={sessionFormData.host_team_member_id}
                      onChange={e => setSessionFormData(p => ({ ...p, host_team_member_id: e.target.value }))}
                      className="w-full bg-muted/40 border border-border rounded-xl px-4 py-3 text-xs"
                    >
                      <option value="">No host</option>
                      {(team || []).map(t => (
                        <option key={sid(t.id)} value={sid(t.id)}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Viewers</label>
                    <input
                      type="number" min="0"
                      value={sessionFormData.viewers}
                      onChange={e => setSessionFormData(p => ({ ...p, viewers: parseInt(e.target.value) || 0 }))}
                      className="w-full bg-muted/40 border border-border rounded-xl px-4 py-3 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Revenue (Rp)</label>
                    <input
                      type="number" min="0"
                      value={sessionFormData.revenue}
                      onChange={e => setSessionFormData(p => ({ ...p, revenue: parseInt(e.target.value) || 0 }))}
                      className="w-full bg-muted/40 border border-border rounded-xl px-4 py-3 text-xs font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 bg-muted/20 border-t border-border flex items-center justify-end gap-3 sticky bottom-0">
                <button
                  onClick={() => { setShowSessionModal(false); setEditingSession(null); }}
                  className="px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase text-muted-foreground hover:bg-muted transition-all"
                >
                  Discard
                </button>
                <button
                  onClick={editingSession ? handleUpdateSession : handleCreateSession}
                  className="px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase bg-primary text-white hover:bg-primary/90 transition-all"
                >
                  {editingSession ? 'Update' : 'Commit'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {sessionToDelete && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card w-full max-w-sm rounded-[32px] border border-border shadow-2xl p-8 text-center"
            >
              <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-lg font-bold mb-2">Delete Session?</h3>
              <p className="text-xs text-muted-foreground mb-8">
                This will permanently remove the record for <span className="text-foreground font-bold">{sessionToDelete.brandName}</span>.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setSessionToDelete(null)} className="px-6 py-3 rounded-2xl text-[10px] font-bold uppercase text-muted-foreground hover:bg-muted transition-all">Cancel</button>
                <button onClick={confirmDelete} className="px-6 py-3 rounded-2xl text-[10px] font-bold uppercase bg-red-500 text-white hover:bg-red-600 transition-all">Delete</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
            {/* Staff Detail Modal - Smaller Version */}
      <AnimatePresence>
        {showStaffDetailModal && selectedStaffForDetail && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-card w-full max-w-sm rounded-2xl border border-border shadow-2xl overflow-hidden"
            >
              {/* Header - Smaller */}
              <div className="px-4 py-3 border-b border-border bg-primary/10">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-foreground">{selectedStaffForDetail.staffName}</h3>
                    <p className="text-[9px] text-muted-foreground mt-0.5">Performance Details</p>
                  </div>
                </div>
              </div>

              {/* Content - Compact */}
              <div className="p-4 space-y-3">
                {/* Session Count & Score - Side by side */}
                <div className="flex items-center justify-between pb-2 border-b border-border/40">
                  <div>
                    <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">Sessions</p>
                    <p className="text-lg font-bold text-foreground">{selectedStaffForDetail.sessionCount.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">Score</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-bold text-primary">{selectedStaffForDetail.finalScore}</span>
                      <span className="text-[8px] text-muted-foreground">/100</span>
                    </div>
                  </div>
                </div>

                {/* 3-column mini stats */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-muted/30 rounded-lg p-2">
                    <p className="text-[8px] text-muted-foreground">Revenue</p>
                    <p className="text-[10px] font-bold text-foreground truncate">{formatCurrency(Math.round(selectedStaffForDetail.totalRevenue / 1000000))}M</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-2">
                    <p className="text-[8px] text-muted-foreground">Viewers</p>
                    <p className="text-[10px] font-bold text-foreground">{(selectedStaffForDetail.totalViewers / 1000).toFixed(0)}K</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-2">
                    <p className="text-[8px] text-muted-foreground">Likes</p>
                    <p className="text-[10px] font-bold text-foreground">{(selectedStaffForDetail.totalLikes / 1000).toFixed(0)}K</p>
                  </div>
                </div>

                {/* Efficiency - Single line */}
                <div className="flex items-center justify-between bg-muted/20 rounded-lg px-3 py-2">
                  <span className="text-[8px] font-bold text-muted-foreground">💰 Revenue/Viewer</span>
                  <span className="text-[10px] font-bold text-foreground">{formatCurrency(Math.round(selectedStaffForDetail.revenuePerViewer))}</span>
                </div>

                {/* Score Breakdown - Progress bars only */}
                <div className="space-y-2 pt-1">
                  <div>
                    <div className="flex justify-between text-[7px] mb-0.5">
                      <span>Revenue</span>
                      <span>{selectedStaffForDetail.revenueScore}%</span>
                    </div>
                    <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${selectedStaffForDetail.revenueScore}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[7px] mb-0.5">
                      <span>Viewers</span>
                      <span>{selectedStaffForDetail.viewerScore}%</span>
                    </div>
                    <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${selectedStaffForDetail.viewerScore}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[7px] mb-0.5">
                      <span>Likes</span>
                      <span>{selectedStaffForDetail.likesScore}%</span>
                    </div>
                    <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500 rounded-full" style={{ width: `${selectedStaffForDetail.likesScore}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer - Smaller */}
              <div className="p-3 bg-muted/20 border-t border-border">
                <button 
                  onClick={() => setShowStaffDetailModal(false)}
                  className="w-full py-2 rounded-xl text-[9px] font-bold uppercase bg-primary text-white hover:bg-primary/90 transition-all"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Revenue;