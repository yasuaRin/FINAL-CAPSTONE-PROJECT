// frontend/src/pages/admin/Revenue.jsx

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, X, AlertTriangle, Plus, Users, SlidersHorizontal, ChevronDown
} from 'lucide-react';

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

const parseLocalDateStr = (str) => {
  if (!str) return null;
  const datePart = typeof str === 'string' ? str.split('T')[0] : str;
  const parts = datePart.split('-').map(Number);
  if (parts.length < 3 || parts.some(isNaN)) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
};

const normalizePeriodId = (raw) => {
  if (raw == null) return null;
  if (typeof raw === 'number') return raw;
  const str = String(raw).replace(/[^0-9]/g, '');
  const n = parseInt(str, 10);
  return isNaN(n) ? null : n;
};

const LIMIT_OPTIONS = [10, 20, 30, 40, 50, 100, 200, 500, 1000, null];

const PLATFORM_OPTIONS = [
  { value: 'TikTok',  label: 'TikTok' },
  { value: 'Shopee',  label: 'Shopee' },
  { value: 'Multi',   label: 'Multi-Platform' },
];

const Revenue = () => {
  const [dateRange, setDateRange] = useState({
    start: subDays(new Date(), 365 * 10),
    end: new Date(),
    preset: 'allData',
  });

  const [insightBrandId, setInsightBrandId] = useState('All');
  const [notification, setNotification] = useState(null);
  const [tableFilter, setTableFilter] = useState({ brandId: 'All', period: 'All' });
  const [editingSession, setEditingSession] = useState(null);
  const [sessionToDelete, setSessionToDelete] = useState(null);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState(null);

  const [sessionFormData, setSessionFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    time: format(new Date(), 'HH:mm'),
    brandId: '',
    platform: 'TikTok',
    viewers: 0,
    revenue: 0,
    period_id: '',
    period_start_date: '',
    period_end_date: '',
    host_team_member_id: '',
  });

  const sortCol = 'date';
  const sortDir = 'desc';

  const [rowLimit, setRowLimit] = useState(25);
  const [periodsData, setPeriodsData] = useState([]);

  const [selectedStaffForDetail, setSelectedStaffForDetail] = useState(null);
  const [showStaffDetailModal, setShowStaffDetailModal] = useState(false);
  const [topPerformersFromView, setTopPerformersFromView] = useState([]);
  const [loadingPerformers, setLoadingPerformers] = useState(false);

  const [openDropdown, setOpenDropdown] = useState(null);
  const [hoveredMetric, setHoveredMetric] = useState(null);

  const fileInputRef = useRef(null);
  const notificationTimeoutRef = useRef(null);
  const dropdownRef = useRef(null);
  const modalRef = useRef(null);

  // ========== CUSTOM HOOKS ==========
  const { data: revenueData, loading, refetch: refetchRevenue, brandTotals } = useRevenue();
  const { brands } = useBrands(brandTotals);
  const { team } = useTeam();

  // Fetch user role
  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.id) {
          setCurrentUserRole(null);
          return;
        }
        
        const { data, error } = await supabase
          .from('team_members')
          .select('role')
          .eq('auth_user_id', user.id)
          .single();
          
        if (error) {
          console.error('Error fetching user role:', error);
          setCurrentUserRole(null);
          return;
        }
        
        setCurrentUserRole(data?.role || null);
      } catch (err) {
        console.error('Error in role fetch:', err);
        setCurrentUserRole(null);
      }
    };
    fetchUserRole();
  }, []);

  const canDelete = currentUserRole !== 'admin';

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (showSessionModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showSessionModal]);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && showSessionModal) {
        closeSessionModal();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showSessionModal]);

  useEffect(() => {
    fetchPeriods();
  }, []);

  const fetchPeriods = async () => {
    try {
      const { data, error } = await supabase
        .from('periods')
        .select('period_id, period_name, period_start_date, period_end_date, brand_id')
        .order('period_id');
      if (!error && data) {
        const uniquePeriodsMap = new Map();
        data.forEach(p => {
          const key = `${p.period_id}-${p.brand_id}`;
          if (!uniquePeriodsMap.has(key)) {
            uniquePeriodsMap.set(key, p);
          }
        });
        setPeriodsData(Array.from(uniquePeriodsMap.values()));
      }
    } catch {
      // silently handle
    }
  };

  // ===== NEW: saves/updates the period date range whenever a session is
  // created or edited. Previously period_start_date / period_end_date were
  // captured in the form but never persisted anywhere, so the range never
  // showed up in the Live Session table.
  //
  // Uses a single upsert() keyed on the real composite primary key
  // (period_id, brand_id) instead of a select-then-insert/update, and
  // surfaces failures via notify() instead of a swallowed console.warn —
  // so a DB error (e.g. a permissions/RLS rule blocking writes to
  // `periods`) is no longer silent. Both dates are required before
  // attempting the save since period_start_date / period_end_date are
  // NOT NULL columns in the periods table. =====
  const upsertPeriod = async (periodId, brandId, startDate, endDate) => {
    if (!periodId || !brandId) return;
    if (!startDate || !endDate) return; // DB requires both dates, skip if either is missing

    try {
      const { error } = await supabase
        .from('periods')
        .upsert(
          {
            period_id: periodId,
            brand_id: brandId,
            period_name: `Period ${periodId}`,
            period_start_date: startDate,
            period_end_date: endDate,
          },
          { onConflict: 'period_id,brand_id' }
        );

      if (error) throw error;
    } catch (err) {
      console.error('Could not save period date range:', err);
      notify(`Session saved, but the period date range failed to save: ${err.message || 'Unknown error'}`, true);
    }
  };

  useEffect(() => {
    const fetchTopPerformers = async () => {
      setLoadingPerformers(true);
      try {
        const { data, error } = await supabase
          .from('team_performance_view')
          .select('team_name, session_count, total_revenue, total_viewers, total_likes, revenue_score, viewer_score, likes_score, final_score')
          .limit(5);

        if (error) throw error;

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

  const periodMap = useMemo(() => {
    const map = {};
    periodsData.forEach(p => {
      const normalizedId = normalizePeriodId(p.period_id);
      const brandId = sid(p.brand_id);
      const key = `${normalizedId}-${brandId}`;
      map[key] = {
        id: normalizedId,
        brandId: brandId,
        name: p.period_name || `Period ${normalizedId}`,
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
      id: i.id,
      _rawId: i.id,
      brandId: sid(i.brand_id),
      hostId: sid(i.host_team_member_id),
      date: i.date,
      time: i.time || '',
      period_id: normalizePeriodId(i.period_id),
      platform: i.revenue_shopee > 0 && i.revenue_tiktok > 0 ? 'Multi'
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

  const dateFilteredLogs = useMemo(() => {
    if (!dateRange.start || !dateRange.end) return revenueLogs;
    const rangeStart = startOfDay(dateRange.start);
    const rangeEnd = endOfDay(dateRange.end);
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

  const rangeRevenue = useMemo(() => dateFilteredLogs.reduce((s, l) => s + l.revenue, 0), [dateFilteredLogs]);
  const totalSessionsInRange = dateFilteredLogs.length;
  const avgRevenueInRange = totalSessionsInRange === 0 ? 0 : rangeRevenue / totalSessionsInRange;

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
        if (!b.overallEndDate || ld > b.overallEndDate) b.overallEndDate = ld;
      }
      const pk = `period_${log.period_id}`;
      if (!b.periodRevenue[pk]) b.periodRevenue[pk] = { periodId: log.period_id, revenue: 0, sessions: [] };
      b.periodRevenue[pk].revenue += log.revenue;
      b.periodRevenue[pk].sessions.push({ date: log.date, revenue: log.revenue });
      if (log.revenue > b.peakRevenue) b.peakRevenue = log.revenue;
    });
    Object.values(map).forEach(b => {
     const allPeriods = Object.values(periodMap).filter(
  p =>
    p.brandId === b.id && p.startDate && p.endDate
);

if (allPeriods.length > 0) {
  const starts = allPeriods
    .map(p => parseISO(p.startDate))
    .sort((a, b) => a - b);

  const ends = allPeriods
    .map(p => parseISO(p.endDate))
    .sort((a, b) => b - a);

  b.overallRange =
    `${format(starts[0], 'dd MMM yyyy')} - ${format(ends[0], 'dd MMM yyyy')}`;
}
      if (b.hasSessions && Object.keys(b.periodRevenue).length > 0) {
        let best = null, bestRev = 0;
        Object.values(b.periodRevenue).forEach(p => { if (p.revenue > bestRev) { bestRev = p.revenue; best = p; } });
        if (best) {
          b.peakPeriodId = best.periodId; b.peakPeriod = `Period ${best.periodId}`; b.bestPeriodRevenue = bestRev;
          const key = `${best.periodId}-${b.id}`;
          const pi = periodMap[key];
          if (pi?.startDate && pi?.endDate) {
            b.peakRange = `${format(parseISO(pi.startDate), 'dd MMM yyyy')} - ${format(parseISO(pi.endDate), 'dd MMM yyyy')}`;
          }if (pi?.startDate && pi?.endDate) {
    b.peakRange =
      `${format(parseISO(pi.startDate),'dd MMM yyyy')} - ${format(parseISO(pi.endDate),'dd MMM yyyy')}`;
}
        }
      }
    });
    let results = Object.values(map);
   if (insightBrandId !== 'All') results = results.filter(b => b.id === insightBrandId);
    return results.sort((a, b) => {
      if (a.hasSessions !== b.hasSessions) return a.hasSessions ? 1 : -1;
      return b.totalRevenue - a.totalRevenue;
    });
  }, [dateFilteredLogs, brandsList, insightBrandId, periodMap]);

  const sessionIntelligence = useMemo(() => {
    let rows = dateFilteredLogs.map(log => {
      const periodId = log.period_id;
      const periodDisplay = (periodId !== null && periodId !== undefined) ? `Period ${periodId}` : 'No Period';
      const key = `${periodId}-${log.brandId}`;
      const periodInfo = periodId !== null && periodId !== undefined ? periodMap[key] : null;
      const periodRange = periodInfo?.startDate && periodInfo?.endDate
        ? `${format(parseISO(periodInfo.startDate), 'dd MMM')} – ${format(parseISO(periodInfo.endDate), 'dd MMM yyyy')}`
        : '';
      return {
        ...log,
        brandName: brandMap[log.brandId] || 'Unknown Brand',
        staffName: teamMap[log.hostId] || '—',
        period: periodDisplay,
        periodRange,
        time: log.time || '',
      };
    });
    
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      rows = rows.filter(r =>
        r.brandName.toLowerCase().includes(q) ||
        r.staffName.toLowerCase().includes(q) ||
        r.platform.toLowerCase().includes(q)
      );
    }
    
    if (tableFilter.brandId && tableFilter.brandId !== 'All') {
      rows = rows.filter(r => r.brandId === tableFilter.brandId);
    }
    
    if (tableFilter.period && tableFilter.period !== 'All') {
      rows = rows.filter(r => r.period === tableFilter.period);
    }
    
    rows.sort((a, b) => {
      const av = sortCol === 'date' ? new Date(a.date).getTime() : a[sortCol];
      const bv = sortCol === 'date' ? new Date(b.date).getTime() : b[sortCol];
      return sortDir === 'asc' ? av - bv : bv - av;
    });
    
    return rows;
  }, [dateFilteredLogs, brandMap, teamMap, periodMap, searchTerm, tableFilter.brandId, tableFilter.period, sortCol, sortDir]);

  const visibleSessions = useMemo(
    () => rowLimit === null ? sessionIntelligence : sessionIntelligence.slice(0, rowLimit),
    [sessionIntelligence, rowLimit]
  );

  const uniquePeriods = useMemo(() => {
    const periods = new Set();
    dateFilteredLogs.forEach(log => {
      const periodId = log.period_id;
      if (periodId !== null && periodId !== undefined) {
        periods.add(`Period ${periodId}`);
      }
    });
    return Array.from(periods).sort((a, b) => {
      const numA = parseInt(a.split(' ')[1]);
      const numB = parseInt(b.split(' ')[1]);
      return numA - numB;
    });
  }, [dateFilteredLogs]);

  const handleGlobalBrand = (brandId) => {
    setInsightBrandId(brandId);
    setTableFilter(prev => ({ ...prev, brandId: brandId || 'All' }));
    
    if (brandId && brandId !== 'All') {
      const brand = brandsList.find(b => b.id === brandId);
      notify(`Filtering by brand: ${brand?.name || 'Brand'}`);
    } else {
      notify('Showing all brands');
    }
  };

  const handleGlobalPeriod = (period) => {
    setTableFilter(prev => ({ ...prev, period: period || 'All' }));
    
    if (period && period !== 'All') {
      notify(`Filtering by period: ${period}`);
    } else {
      notify('Showing all periods');
    }
  };

  const resetGlobalFilters = () => {
    setInsightBrandId('All');
    setTableFilter({ brandId: 'All', period: 'All' });
    setRowLimit(25);
    notify('All filters cleared - showing all sessions');
  };

  const notify = (msg, isError = false) => {
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
    }
    setNotification(msg);
    notificationTimeoutRef.current = setTimeout(() => {
      setNotification(null);
      notificationTimeoutRef.current = null;
    }, 7000);
  };

  const resetForm = () => {
    setSessionFormData({
      date: format(new Date(), 'yyyy-MM-dd'),
      time: format(new Date(), 'HH:mm'),
      brandId: brandsList[0]?.id || '',
      platform: 'TikTok',
      viewers: 0,
      revenue: 0,
      period_id: '',
      period_start_date: '',
      period_end_date: '',
      host_team_member_id: team?.[0] ? sid(team[0].id) : '',
    });
  };

  const refreshDataWithRetry = async (retries = 3, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
      try {
        await refetchRevenue();
        await fetchPeriods();
        return true;
      } catch (err) {
        console.warn(`Refresh attempt ${i + 1} failed:`, err);
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    return false;
  };

  const closeSessionModal = () => {
    setShowSessionModal(false);
    setEditingSession(null);
    setOpenDropdown(null);
  };

  const handleCreateSession = async () => {
    if (isSubmitting) return;
    if (!sessionFormData.brandId) { notify('Please select a brand'); return; }
    if (!sessionFormData.period_id) { notify('Please enter a period number'); return; }
    
    setIsSubmitting(true);
    try {
      let platformId = null;
      try {
        const { data: platRow } = await supabase
          .from('platforms')
          .select('platform_id')
          .ilike('platform_name', sessionFormData.platform)
          .maybeSingle();
        platformId = platRow?.platform_id ?? null;
      } catch (err) {
        console.warn('Platform lookup failed:', err);
      }

      const isShopee = ['Shopee', 'Multi'].includes(sessionFormData.platform);
      const isTikTok = ['TikTok', 'Multi'].includes(sessionFormData.platform);
      
      // Ensure period_id is a valid integer
      const periodId = parseInt(sessionFormData.period_id, 10);
      if (isNaN(periodId) || periodId < 1) {
        notify('Please enter a valid period number (1, 2, 3, etc.)');
        return;
      }

      // NEW: persist the period's date range (if the user filled it in) so it
      // shows up in the Live Session table / brand insights.
      await upsertPeriod(
        periodId,
        sessionFormData.brandId,
        sessionFormData.period_start_date,
        sessionFormData.period_end_date
      );

      const { error } = await supabase.from('live_sessions').insert([{
        date: sessionFormData.date,
        time: sessionFormData.time || '00:00',
        revenue_shopee: isShopee ? Number(sessionFormData.revenue) : 0,
        revenue_tiktok: isTikTok ? Number(sessionFormData.revenue) : 0,
        viewers_shopee: isShopee ? Number(sessionFormData.viewers) : 0,
        viewers_tiktok: isTikTok ? Number(sessionFormData.viewers) : 0,
        likes_shopee: 0,
        likes_tiktok: 0,
        period_id: periodId,
        host_team_member_id: sessionFormData.host_team_member_id || null,
        brand_id: sessionFormData.brandId,
        platform_id: platformId,
      }]);

      if (error) throw error;

      setShowSessionModal(false);
      resetForm();
      setIsRefreshing(true);   
      const refreshed = await refreshDataWithRetry();
      setIsRefreshing(false);  
      if (refreshed) {
        notify('Session created successfully');
      } else {
        notify('Session created but data refresh may be delayed. Please refresh the page manually.', true);
      }
    } catch (err) {
      console.error('Create error:', err);
      notify(`Failed: ${err.message || 'Unknown error'}`, true);
    } finally {
      setIsSubmitting(false);
      setEditingSession(null);
      setOpenDropdown(null);
    }
  };

  const handleUpdateSession = async () => {
    if (isSubmitting) return;
    
    if (!editingSession) {
      console.error('No editing session data');
      notify('Error: No session selected for editing', true);
      return;
    }
    
    if (!sessionFormData.brandId) { notify('Please select a brand'); return; }
    if (!sessionFormData.period_id) { notify('Please enter a period number'); return; }
    
    setIsSubmitting(true);
    try {
      const isShopee = ['Shopee', 'Multi'].includes(sessionFormData.platform);
      const isTikTok = ['TikTok', 'Multi'].includes(sessionFormData.platform);

      let platformId = null;
      const { data: platRow, error: platformError } = await supabase
        .from('platforms')
        .select('platform_id')
        .ilike('platform_name', sessionFormData.platform)
        .maybeSingle();
      if (platformError) throw platformError;
      platformId = platRow?.platform_id;
      if (!platformId) throw new Error('Platform ID not found');

      const sessionId = editingSession.id || editingSession._rawId;
      if (!sessionId) {
        console.error('No session ID found in editingSession:', editingSession);
        throw new Error('Session ID not found');
      }

      // Ensure period_id is a valid integer
      const periodId = parseInt(sessionFormData.period_id, 10);
      if (isNaN(periodId) || periodId < 1) {
        notify('Please enter a valid period number (1, 2, 3, etc.)');
        return;
      }

      // NEW: persist the period's date range (if the user filled it in) so it
      // shows up in the Live Session table / brand insights.
      await upsertPeriod(
        periodId,
        sessionFormData.brandId,
        sessionFormData.period_start_date,
        sessionFormData.period_end_date
      );

      const { data, error } = await supabase
        .from('live_sessions')
        .update({
          date: sessionFormData.date,
          time: sessionFormData.time || '00:00',
          revenue_shopee: isShopee ? Number(sessionFormData.revenue) : 0,
          revenue_tiktok: isTikTok ? Number(sessionFormData.revenue) : 0,
          viewers_shopee: isShopee ? Number(sessionFormData.viewers) : 0,
          viewers_tiktok: isTikTok ? Number(sessionFormData.viewers) : 0,
          likes_shopee: 0,
          likes_tiktok: 0,
          brand_id: sessionFormData.brandId,
          period_id: periodId,
          host_team_member_id: sessionFormData.host_team_member_id || null,
          platform_id: platformId,
        })
        .eq('id', sessionId)
        .select();

      if (error) throw error;
      
      if (!data || data.length === 0) {
        throw new Error('No rows updated. The session may have been deleted or you lack permission.');
      }

      setShowSessionModal(false);
      setEditingSession(null);
      resetForm();
      setIsRefreshing(true);
      const refreshed = await refreshDataWithRetry();
      setIsRefreshing(false);     
      if (refreshed) {
        notify('Session updated successfully');
      } else {
        notify('Session updated but data refresh may be delayed. Please refresh the page manually.', true);
      }
    } catch (err) {
      console.error('UPDATE ERROR:', err);
      notify(`Update failed: ${err.message || 'Unknown error'}`, true);
    } finally {
      setIsSubmitting(false);
      setOpenDropdown(null);
    }
  };

  const confirmDelete = async () => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      const matchId = sessionToDelete?._rawId ?? sessionToDelete?.id;
      if (!matchId) throw new Error('Session ID not found');

      const { error } = await supabase
        .from('live_sessions')
        .delete()
        .eq('id', matchId);

      if (error) throw error;
      setSessionToDelete(null);
      setIsRefreshing(true);
      const refreshed = await refreshDataWithRetry();
      setIsRefreshing(false);
      if (refreshed) {
        notify('Session deleted successfully');
      } else {
        notify('Session deleted but data refresh may be delayed. Please refresh the page manually.', true);
      }
    } catch (err) {
      console.error('DELETE ERROR:', err);
      notify(err.message, true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSession = (session) => {
    if (!canDelete) {
      notify('You do not have permission to delete sessions.');
      return;
    }
    const originalSession = revenueData?.find(item => String(item.id) === String(session.id));
    setSessionToDelete({ ...session, _rawId: originalSession?.id ?? session.id });
  };

  const openEditModal = async (session) => {
    const originalSession = revenueData?.find((item) => String(item.id) === String(session.id));
    if (!originalSession) { 
      notify('Error: Could not find original session data', true); 
      return; 
    }
    
    // Fetch period data for this session
    let periodStartDate = '';
    let periodEndDate = '';
    if (session.period_id) {
      try {
        const { data, error } = await supabase
          .from('periods')
          .select('period_start_date, period_end_date')
          .eq('period_id', parseInt(session.period_id, 10))
          .eq('brand_id', session.brandId)
          .maybeSingle();
        
        if (!error && data) {
          periodStartDate = data.period_start_date || '';
          periodEndDate = data.period_end_date || '';
        }
      } catch (err) {
        console.warn('Could not fetch period dates:', err);
      }
    }
    
    setEditingSession({ 
      ...session, 
      _rawId: originalSession.id,
      id: originalSession.id
    });
    
    setSessionFormData({
      date: session.date,
      time: session.time || format(new Date(), 'HH:mm'),
      brandId: session.brandId,
      platform: session.platform,
      viewers: session.viewers,
      revenue: session.revenue,
      period_id: session.period_id != null ? String(session.period_id) : '',
      period_start_date: periodStartDate,
      period_end_date: periodEndDate,
      host_team_member_id: session.hostId || '',
    });
    
    setShowSessionModal(true);
  };

  const handleHallOfFameClick = (brandId, period) => {
    const sessionsElement = document.getElementById('session-intelligence');
    if (sessionsElement) {
      sessionsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    setInsightBrandId(brandId);
    setTableFilter({ brandId: brandId, period: period || 'All' });
    
    const brand = brandsList.find(b => b.id === brandId);
    const brandName = brand?.name || 'Brand';
    notify(`Showing ${brandName} sessions${period && period !== 'All' ? ` for ${period}` : ''}`);
  };

  const handleSetTableFilter = (updater) => {
    setTableFilter(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (next.brandId === 'All' && prev.brandId !== 'All') {
        setInsightBrandId('All');
      }
      return next;
    });
  };

  const dropdownTriggerCls = (isOpen) =>
    `w-full bg-muted/40 border rounded-xl px-3 py-2.5 text-xs text-left flex items-center justify-between transition-all ${
      isOpen ? 'border-[#2563eb] ring-1 ring-[#2563eb]/20' : 'border-border'
    }`;

  const dropdownOptionCls = (isSelected) =>
    `w-full text-left px-3 py-2 text-xs transition-colors ${
      isSelected
        ? 'bg-[#2563eb]/10 text-[#2563eb] font-semibold'
        : 'hover:bg-muted/50 text-foreground'
    }`;

  if (loading || isRefreshing) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-3 border-[#2563eb] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Key Metric Card component
  const KeyMetricCardItem = ({ title, value, children, isHovered, onHover }) => (
    <div 
      className="bg-card p-5 rounded-2xl border border-border shadow-sm min-w-0 transition-all cursor-pointer"
      style={{
        transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), border-color 0.2s ease, background 0.2s ease",
        transform: isHovered ? "translateY(-4px) scale(1.02)" : "translateY(0) scale(1)",
        boxShadow: isHovered ? "0 12px 32px rgba(239,68,68,0.15), 0 4px 12px rgba(0,0,0,0.08)" : "none",
        borderColor: isHovered ? "#ef4444" : "var(--border)",
        backgroundColor: "var(--card)",
      }}
      onMouseEnter={onHover}
      onMouseLeave={onHover}
    >
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
        {title}
      </p>
      <p className="text-base sm:text-lg font-bold text-foreground leading-tight break-all">{value}</p>
      {children}
    </div>
  );

  return (
    <div id="revenue-report-container" className="space-y-6 pb-12 relative">
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 20, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-4 left-1/2 z-[100] bg-[#0a0f1a] border border-white/10 px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3"
          >
            <div className={`rounded-full p-1 ${notification.includes('Failed') || notification.includes('error') || notification.includes('permission') ? 'bg-red-500' : 'bg-emerald-500'}`}>
              <CheckCircle2 size={16} className="text-white" />
            </div>
            <span className="text-sm font-bold tracking-tight text-white">{notification}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">Analytics</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Revenue</h1>
          <p className="text-muted-foreground mt-1 font-light text-xs">Track performance, analyze trends, and monitor platform distribution.</p>
        </div>
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KeyMetricCardItem 
          title="Revenue (range)" 
          value={formatCurrency(rangeRevenue)}
          isHovered={hoveredMetric === 'revenue'}
          onHover={() => setHoveredMetric(hoveredMetric === 'revenue' ? null : 'revenue')}
        />

        <KeyMetricCardItem 
          title="Top Performers"
          value=""
          isHovered={hoveredMetric === 'performers'}
          onHover={() => setHoveredMetric(hoveredMetric === 'performers' ? null : 'performers')}
        >
          <div className="space-y-2 mt-2 pt-3 border-t border-border/40">
            {topPerformersFromView.length === 0 ? (
              <p className="text-xs text-muted-foreground">No data in range</p>
            ) : (
              topPerformersFromView.map((staff, i) => (
                <div
                  key={staff.staffId}
                  className="flex items-center justify-between gap-2 min-w-0 cursor-pointer hover:bg-muted/50 p-1 rounded-lg transition-colors"
                  onClick={() => { setSelectedStaffForDetail(staff); setShowStaffDetailModal(true); }}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-[8px] font-black text-muted-foreground/50 w-3 shrink-0">{i + 1}</span>
                    <span className="text-[11px] font-bold text-[#2563eb] truncate hover:underline">{staff.staffName}</span>
                  </div>
                  <span className="text-[9px] font-bold text-foreground truncate">See details</span>
                </div>
              ))
            )}
          </div>
        </KeyMetricCardItem>

        <KeyMetricCardItem 
          title="Top Platform (range)" 
          value={topPlatform.name}
          isHovered={hoveredMetric === 'platform'}
          onHover={() => setHoveredMetric(hoveredMetric === 'platform' ? null : 'platform')}
        >
          <div className="mt-2 pt-3 border-t border-border/40 flex items-center gap-1.5 flex-wrap">
            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Revenue</span>
            <span className="text-[11px] font-bold text-foreground break-all">{formatCurrency(topPlatform.revenue)}</span>
          </div>
        </KeyMetricCardItem>

        <KeyMetricCardItem 
          title="Live Sessions (range)" 
          value={totalSessionsInRange.toLocaleString()}
          isHovered={hoveredMetric === 'sessions'}
          onHover={() => setHoveredMetric(hoveredMetric === 'sessions' ? null : 'sessions')}
        >
          <div className="mt-2 pt-3 border-t border-border/40 flex items-center gap-1.5 flex-wrap">
            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Avg / session</span>
            <span className="text-[11px] font-bold text-foreground break-all">{formatCurrency(Math.round(avgRevenueInRange))}</span>
          </div>
        </KeyMetricCardItem>
      </div>

      {/* Main Content */}
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
          setTableFilter={handleSetTableFilter}
          sortCol={sortCol}
          sortDir={sortDir}
          rowLimit={rowLimit}
          setRowLimit={setRowLimit}
          openEditModal={openEditModal}
          handleDeleteSession={handleDeleteSession}
          canDelete={canDelete}
          formatCurrency={formatCurrency}
          parseISO={parseISO}
          format={format}
          resetForm={resetForm}
          setShowSessionModal={setShowSessionModal}
          uniquePeriods={uniquePeriods}
          loading={loading}
        />
      </div>

      {/* Session Modal */}
      <AnimatePresence>
        {showSessionModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={closeSessionModal} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative z-10 bg-card w-full max-w-lg rounded-2xl border border-border shadow-2xl my-8 mx-auto overflow-hidden"
              ref={modalRef}
            >
              <div className="sticky top-0 z-10 px-5 py-4 border-b border-border bg-card">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-foreground">
                    {editingSession ? 'Edit Session Record' : 'Record New Session'}
                  </h3>
                  <button
                    onClick={closeSessionModal}
                    disabled={isSubmitting}
                    className="p-1.5 hover:bg-muted rounded-full transition-colors disabled:opacity-50"
                  >
                    <X size={18} />
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {editingSession ? 'Update existing session data' : 'Add a new live session record'}
                </p>
              </div>

              <div className="overflow-y-auto max-h-[calc(90vh-140px)] px-5 py-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">Date</label>
                    <input
                      type="date"
                      value={sessionFormData.date}
                      onChange={e => setSessionFormData(p => ({
                        ...p,
                        date: e.target.value,
                      }))}
                      disabled={isSubmitting}
                      className="w-full bg-muted/40 border border-border rounded-xl px-4 py-2.5 text-sm disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">Time</label>
                    <input
                      type="time"
                      value={sessionFormData.time}
                      onChange={e => setSessionFormData(p => ({ ...p, time: e.target.value }))}
                      disabled={isSubmitting}
                      className="w-full bg-muted/40 border border-border rounded-xl px-4 py-2.5 text-sm disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">Brand <span className="text-[#2563eb]">*</span></label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => !isSubmitting && setOpenDropdown(prev => prev === 'brand' ? null : 'brand')}
                        disabled={isSubmitting}
                        className={dropdownTriggerCls(openDropdown === 'brand')}
                      >
                        <span className={sessionFormData.brandId ? 'text-foreground' : 'text-muted-foreground truncate'}>
                          {sessionFormData.brandId ? (brandsList.find(b => b.id === sessionFormData.brandId)?.name || 'Unknown') : 'Select Brand'}
                        </span>
                        <ChevronDown size={14} className={`text-muted-foreground transition-transform flex-shrink-0 ml-2 ${openDropdown === 'brand' ? 'rotate-180' : ''}`} />
                      </button>
                      {openDropdown === 'brand' && !isSubmitting && (
                        <div className="absolute top-full left-0 right-0 mt-1 z-[200] bg-card border border-border rounded-xl shadow-xl overflow-y-auto max-h-[200px]">
                          {brandsList.map(b => (
                            <button key={b.id} type="button" onClick={() => { 
                              setSessionFormData(p => ({ ...p, brandId: b.id })); 
                              setOpenDropdown(null); 
                            }} className={dropdownOptionCls(sessionFormData.brandId === b.id)}>
                              <span className="truncate">{b.name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">Channel</label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => !isSubmitting && setOpenDropdown(prev => prev === 'platform' ? null : 'platform')}
                        disabled={isSubmitting}
                        className={dropdownTriggerCls(openDropdown === 'platform')}
                      >
                        <span className="text-foreground truncate">{PLATFORM_OPTIONS.find(p => p.value === sessionFormData.platform)?.label || 'Select Channel'}</span>
                        <ChevronDown size={14} className={`text-muted-foreground transition-transform flex-shrink-0 ml-2 ${openDropdown === 'platform' ? 'rotate-180' : ''}`} />
                      </button>
                      {openDropdown === 'platform' && !isSubmitting && (
                        <div className="absolute top-full left-0 right-0 mt-1 z-[200] bg-card border border-border rounded-xl shadow-xl overflow-y-auto max-h-[180px]">
                          {PLATFORM_OPTIONS.map(p => (
                            <button key={p.value} type="button" onClick={() => { setSessionFormData(prev => ({ ...prev, platform: p.value })); setOpenDropdown(null); }} className={dropdownOptionCls(sessionFormData.platform === p.value)}>
                              {p.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Period with date range fields */}
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5 sm:col-span-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">
                        Period <span className="text-[#2563eb]">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        placeholder="Period #"
                        value={sessionFormData.period_id}
                        onChange={e => {
                          const value = e.target.value;
                          setSessionFormData(p => ({ 
                            ...p, 
                            period_id: value 
                          }));
                        }}
                        disabled={isSubmitting}
                        className="w-full bg-muted/40 border border-border rounded-xl px-4 py-2.5 text-sm disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb]"
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">Period Start</label>
                      <input
                        type="date"
                        value={sessionFormData.period_start_date}
                        onChange={e => setSessionFormData(p => ({ 
                          ...p, 
                          period_start_date: e.target.value,
                          period_end_date: p.period_end_date && p.period_end_date < e.target.value ? e.target.value : p.period_end_date
                        }))}
                        disabled={isSubmitting}
                        className="w-full bg-muted/40 border border-border rounded-xl px-4 py-2.5 text-sm disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb]"
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">Period End</label>
                      <input
                        type="date"
                        min={sessionFormData.period_start_date || undefined}
                        value={sessionFormData.period_end_date}
                        onChange={e => setSessionFormData(p => ({ ...p, period_end_date: e.target.value }))}
                        disabled={isSubmitting}
                        className="w-full bg-muted/40 border border-border rounded-xl px-4 py-2.5 text-sm disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb]"
                      />
                    </div>
                  </div>
                  <p className="text-[9px] text-muted-foreground">
                    Enter period number and its date range. The date range will be stored in the periods table.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">Host</label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => !isSubmitting && setOpenDropdown(prev => prev === 'host' ? null : 'host')}
                        disabled={isSubmitting}
                        className={dropdownTriggerCls(openDropdown === 'host')}
                      >
                        <span className={sessionFormData.host_team_member_id ? 'text-foreground' : 'text-muted-foreground truncate'}>
                          {sessionFormData.host_team_member_id ? ((team || []).find(t => sid(t.id) === sessionFormData.host_team_member_id)?.name || 'Unknown') : 'No host'}
                        </span>
                        <ChevronDown size={14} className={`text-muted-foreground transition-transform flex-shrink-0 ml-2 ${openDropdown === 'host' ? 'rotate-180' : ''}`} />
                      </button>
                      {openDropdown === 'host' && !isSubmitting && (
                        <div className="absolute top-full left-0 right-0 mt-1 z-[200] bg-card border border-border rounded-xl shadow-xl overflow-y-auto max-h-[200px]">
                          <button type="button" onClick={() => { setSessionFormData(p => ({ ...p, host_team_member_id: '' })); setOpenDropdown(null); }} className={dropdownOptionCls(sessionFormData.host_team_member_id === '')}>No host</button>
                          {(team || []).map(t => (
                            <button key={sid(t.id)} type="button" onClick={() => { setSessionFormData(p => ({ ...p, host_team_member_id: sid(t.id) })); setOpenDropdown(null); }} className={dropdownOptionCls(sessionFormData.host_team_member_id === sid(t.id))}>
                              <span className="truncate">{t.name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">Viewers</label>
                    <input
                      type="number" min="0"
                      value={sessionFormData.viewers}
                      onChange={e => setSessionFormData(p => ({ ...p, viewers: parseInt(e.target.value) || 0 }))}
                      disabled={isSubmitting}
                      className="w-full bg-muted/40 border border-border rounded-xl px-4 py-2.5 text-sm disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">Revenue (Rp)</label>
                  <input
                    type="number" min="0"
                    value={sessionFormData.revenue}
                    onChange={e => setSessionFormData(p => ({ ...p, revenue: parseInt(e.target.value) || 0 }))}
                    disabled={isSubmitting}
                    className="w-full bg-muted/40 border border-border rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb]"
                  />
                </div>
              </div>

              <div className="sticky bottom-0 z-10 px-5 py-4 border-t border-border bg-card flex flex-col sm:flex-row items-center justify-end gap-3">
                <button onClick={closeSessionModal} disabled={isSubmitting} className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-[11px] font-bold uppercase text-muted-foreground hover:bg-muted transition-all disabled:opacity-50 order-2 sm:order-1">
                  Cancel
                </button>
                <button
                  onClick={editingSession ? handleUpdateSession : handleCreateSession}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-[11px] font-bold uppercase bg-[#2563eb] text-white hover:bg-[#1d4ed8] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 order-1 sm:order-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    editingSession ? 'Update Session' : 'Create Session'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {sessionToDelete && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isSubmitting && setSessionToDelete(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative z-10 bg-card w-full max-w-sm rounded-[32px] border border-border shadow-2xl p-8 text-center"
            >
              <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-lg font-bold mb-2">Delete Session?</h3>
              <p className="text-xs text-muted-foreground mb-8">
                This will permanently remove the record for <span className="text-foreground font-bold">{sessionToDelete.brandName}</span>.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setSessionToDelete(null)} disabled={isSubmitting} className="px-6 py-3 rounded-2xl text-[10px] font-bold uppercase text-muted-foreground hover:bg-muted transition-all disabled:opacity-50">Cancel</button>
                <button onClick={confirmDelete} disabled={isSubmitting} className="px-6 py-3 rounded-2xl text-[10px] font-bold uppercase bg-red-500 text-white hover:bg-red-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {isSubmitting ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Staff Detail Modal */}
      <AnimatePresence>
        {showStaffDetailModal && selectedStaffForDetail && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowStaffDetailModal(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative z-10 bg-card w-full max-w-sm rounded-2xl border border-border shadow-2xl overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-border bg-[#2563eb]/10">
                <h3 className="text-lg font-bold text-foreground">{selectedStaffForDetail.staffName}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Performance Details</p>
              </div>

              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-border/40">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Sessions</p>
                    <p className="text-xl font-bold text-foreground">{selectedStaffForDetail.sessionCount.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Score</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-bold text-[#2563eb]">{selectedStaffForDetail.finalScore}</span>
                      <span className="text-xs text-muted-foreground">/100</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-muted/30 rounded-lg p-2">
                    <p className="text-[10px] text-muted-foreground">Revenue</p>
                    <p className="text-xs font-bold text-foreground truncate">{formatCurrency(Math.round(selectedStaffForDetail.totalRevenue / 1000000))}M</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-2">
                    <p className="text-[10px] text-muted-foreground">Viewers</p>
                    <p className="text-xs font-bold text-foreground">{(selectedStaffForDetail.totalViewers / 1000).toFixed(0)}K</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-2">
                    <p className="text-[10px] text-muted-foreground">Likes</p>
                    <p className="text-xs font-bold text-foreground">{(selectedStaffForDetail.totalLikes / 1000).toFixed(0)}K</p>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-muted/20 rounded-lg px-3 py-2">
                  <span className="text-xs font-bold text-muted-foreground">Revenue/Viewer</span>
                  <span className="text-sm font-bold text-foreground">{formatCurrency(Math.round(selectedStaffForDetail.revenuePerViewer))}</span>
                </div>

                <div className="space-y-2 pt-1">
                  {[
                    { label: 'Revenue', score: selectedStaffForDetail.revenueScore, color: 'bg-emerald-500' },
                    { label: 'Viewers', score: selectedStaffForDetail.viewerScore, color: 'bg-blue-500' },
                    { label: 'Likes',   score: selectedStaffForDetail.likesScore,  color: 'bg-red-500' },
                  ].map(({ label, score, color }) => (
                    <div key={label}>
                      <div className="flex justify-between text-[10px] mb-1">
                        <span>{label}</span><span>{score}%</span>
                      </div>
                      <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full ${color} rounded-full`} style={{ width: `${score}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-muted/20 border-t border-border">
                <button
                  onClick={() => setShowStaffDetailModal(false)}
                  className="w-full py-2.5 rounded-xl text-xs font-bold uppercase bg-[#2563eb] text-white hover:bg-[#1d4ed8] transition-all"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="pt-8 border-t border-border">
        <p className="text-[9px] text-center text-muted-foreground uppercase tracking-[0.3em] font-bold">
          VidHelp Intelligence Hub • {revenueData?.length?.toLocaleString() || '0'} Total Sessions
        </p>
      </div>
    </div>
  );
};

export default Revenue;