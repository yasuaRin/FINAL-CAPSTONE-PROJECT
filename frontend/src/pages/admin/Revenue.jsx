// frontend/src/pages/admin/Revenue.jsx

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, X, AlertTriangle, Plus, Users, SlidersHorizontal, ChevronDown
} from 'lucide-react';

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

  const [rowLimit, setRowLimit] = useState(25);
  const [periodsData, setPeriodsData] = useState([]);

  const [globalFilterOpen, setGlobalFilterOpen] = useState(false);
  const [selectedStaffForDetail, setSelectedStaffForDetail] = useState(null);
  const [showStaffDetailModal, setShowStaffDetailModal] = useState(false);
  const [topPerformersFromView, setTopPerformersFromView] = useState([]);
  const [loadingPerformers, setLoadingPerformers] = useState(false);

  const [openDropdown, setOpenDropdown] = useState(null);

  const globalFilterRef = useRef(null);
  const fileInputRef = useRef(null);
  const notificationTimeoutRef = useRef(null);
  const dropdownRef = useRef(null);
  const modalRef = useRef(null);

  // ========== CUSTOM HOOKS ==========
  const { data: revenueData, loading, refetch: refetchRevenue, brandTotals } = useRevenue();
  const { brands } = useBrands(brandTotals);
  const { team } = useTeam();

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

  // ========== ALL useEffect HOOKS ==========
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
    const fetchPeriods = async () => {
      try {
        const { data, error } = await supabase
          .from('periods')
          .select('period_id, period_name, period_start_date, period_end_date')
          .order('period_id');
        if (!error && data) {
          const uniquePeriodsMap = new Map();
          data.forEach(p => {
            const normalizedId = normalizePeriodId(p.period_id);
            if (!uniquePeriodsMap.has(normalizedId)) {
              uniquePeriodsMap.set(normalizedId, p);
            }
          });
          setPeriodsData(Array.from(uniquePeriodsMap.values()));
        }
      } catch {
        // silently handle
      }
    };
    fetchPeriods();
  }, []);

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
      map[normalizedId] = {
        id: normalizedId,
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

  // FIXED: sessionIntelligence with proper filtering
  const sessionIntelligence = useMemo(() => {
    let rows = dateFilteredLogs.map(log => {
      const periodId = log.period_id;
      const periodDisplay = (periodId !== null && periodId !== undefined) ? `Period ${periodId}` : 'No Period';
      return {
        ...log,
        brandName: brandMap[log.brandId] || 'Unknown Brand',
        staffName: teamMap[log.hostId] || '—',
        period: periodDisplay,
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
    
    // Apply brand filter
    if (tableFilter.brandId && tableFilter.brandId !== 'All') {
      rows = rows.filter(r => r.brandId === tableFilter.brandId);
    }
    
    // Apply period filter
    if (tableFilter.period && tableFilter.period !== 'All') {
      rows = rows.filter(r => r.period === tableFilter.period);
    }
    
    rows.sort((a, b) => {
      const av = sortCol === 'date' ? new Date(a.date).getTime() : a[sortCol];
      const bv = sortCol === 'date' ? new Date(b.date).getTime() : b[sortCol];
      return sortDir === 'asc' ? av - bv : bv - av;
    });
    
    return rows;
  }, [dateFilteredLogs, brandMap, teamMap, searchTerm, tableFilter.brandId, tableFilter.period, sortCol, sortDir]);

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

  const uniquePeriodsForDropdown = useMemo(() => {
    const uniqueMap = new Map();
    periodsData.forEach(p => {
      const normalizedId = normalizePeriodId(p.period_id);
      if (!uniqueMap.has(normalizedId)) {
        uniqueMap.set(normalizedId, p);
      }
    });
    return Array.from(uniqueMap.values())
      .sort((a, b) => normalizePeriodId(a.period_id) - normalizePeriodId(b.period_id))
      .map(p => ({
        id: normalizePeriodId(p.period_id),
        name: p.period_name || `Period ${normalizePeriodId(p.period_id)}`
      }));
  }, [periodsData]);

  const handleSortByBrandChange = (brandId) => {
    handleGlobalBrand(brandId || 'All');
  };

  const handleGlobalBrand = (brandId) => {
    setInsightBrandId(brandId);
    setTableFilter(prev => ({ ...prev, brandId: brandId || 'All' }));
    setGlobalFilterOpen(false);
    
    if (brandId && brandId !== 'All') {
      const brand = brandsList.find(b => b.id === brandId);
      notify(`Filtering by brand: ${brand?.name || 'Brand'}`);
    } else {
      notify('Showing all brands');
    }
  };

  const handleGlobalPeriod = (period) => {
    setTableFilter(prev => ({ ...prev, period: period || 'All' }));
    setGlobalFilterOpen(false);
    
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
    setGlobalFilterOpen(false);
    notify('All filters cleared - showing all sessions');
  };

  const globalActiveCount = [
    tableFilter.period !== 'All',
    rowLimit !== 25,
  ].filter(Boolean).length;

  const notify = (msg, isError = false) => {
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
    }
    setNotification(msg);
    notificationTimeoutRef.current = setTimeout(() => {
      setNotification(null);
      notificationTimeoutRef.current = null;
    }, 5000);
  };

  const resetForm = () => {
    setSessionFormData({
      date: format(new Date(), 'yyyy-MM-dd'),
      time: format(new Date(), 'HH:mm'),
      brandId: brandsList[0]?.id || '',
      platform: 'TikTok',
      viewers: 0,
      revenue: 0,
      period_id: uniquePeriodsForDropdown[0]?.id ? String(uniquePeriodsForDropdown[0].id) : '',
      host_team_member_id: team?.[0] ? sid(team[0].id) : '',
    });
  };

  const refreshDataWithRetry = async (retries = 3, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
      try {
        await refetchRevenue();
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

  const handleCreateSession = async () => {
    if (isSubmitting) return;
    if (!sessionFormData.brandId) { notify('Please select a brand'); return; }
    if (!sessionFormData.period_id) { notify('Please select a period'); return; }
    
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
      const normalizedPeriodId = normalizePeriodId(sessionFormData.period_id);

      if (!normalizedPeriodId) { notify('Invalid period selected'); return; }

      const { error } = await supabase.from('live_sessions').insert([{
        date: sessionFormData.date,
        time: sessionFormData.time || '00:00',
        revenue_shopee: isShopee ? Number(sessionFormData.revenue) : 0,
        revenue_tiktok: isTikTok ? Number(sessionFormData.revenue) : 0,
        viewers_shopee: isShopee ? Number(sessionFormData.viewers) : 0,
        viewers_tiktok: isTikTok ? Number(sessionFormData.viewers) : 0,
        likes_shopee: 0,
        likes_tiktok: 0,
        period_id: normalizedPeriodId,
        host_team_member_id: sessionFormData.host_team_member_id || null,
        brand_id: sessionFormData.brandId,
        platform_id: platformId,
      }]);

      if (error) throw error;

      setShowSessionModal(false);
      resetForm();
      
      const refreshed = await refreshDataWithRetry();
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
    if (!sessionFormData.period_id) { notify('Please select a period'); return; }
    
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
          period_id: normalizePeriodId(sessionFormData.period_id),
          host_team_member_id: sessionFormData.host_team_member_id || null,
          platform_id: platformId,
        })
        .eq('id', sessionId)
        .select();

      if (error) throw error;
      
      if (!data || data.length === 0) {
        throw new Error('No rows updated. The session may have been deleted or you lack permission.');
      }

      const refreshed = await refreshDataWithRetry();
      if (refreshed) {
        notify('Session updated successfully');
      } else {
        notify('Session updated but data refresh may be delayed. Please refresh the page manually.', true);
      }
      
      setShowSessionModal(false);
      setEditingSession(null);
      resetForm();
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

      const refreshed = await refreshDataWithRetry();
      if (refreshed) {
        notify('Session deleted successfully');
      } else {
        notify('Session deleted but data refresh may be delayed. Please refresh the page manually.', true);
      }
      
      setSessionToDelete(null);
    } catch (err) {
      console.error('DELETE ERROR:', err);
      notify(err.message, true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSession = (session) => {
    const originalSession = revenueData?.find(item => String(item.id) === String(session.id));
    setSessionToDelete({ ...session, _rawId: originalSession?.id ?? session.id });
  };

  const openEditModal = (session) => {
    const originalSession = revenueData?.find((item) => String(item.id) === String(session.id));
    if (!originalSession) { 
      notify('Error: Could not find original session data', true); 
      return; 
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
    setGlobalFilterOpen(false);
    
    const brand = brandsList.find(b => b.id === brandId);
    const brandName = brand?.name || 'Brand';
    notify(`Showing ${brandName} sessions${period && period !== 'All' ? ` for ${period}` : ''}`);
  };

  const closeSessionModal = () => {
    setShowSessionModal(false);
    setEditingSession(null);
    setOpenDropdown(null);
    setIsSubmitting(false);
  };

  const dropdownTriggerCls = (isOpen) =>
    `w-full bg-muted/40 border rounded-xl px-3 py-2.5 text-xs text-left flex items-center justify-between transition-all ${
      isOpen ? 'border-primary ring-1 ring-primary/20' : 'border-border'
    }`;

  const dropdownOptionCls = (isSelected) =>
    `w-full text-left px-3 py-2 text-xs transition-colors ${
      isSelected
        ? 'bg-primary/10 text-primary font-semibold'
        : 'hover:bg-muted/50 text-foreground'
    }`;

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

  // ========== MAIN RETURN ==========
  // FIXED: outer wrapper is a plain <div> (not motion.div) — same as Brands.jsx.
  // motion.div creates a CSS transform context that breaks fixed positioning + x:'-50%'
  // on the notification toast. Plain div has no transform context so fixed works correctly.
  return (
    <div id="revenue-report-container">
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 20, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-4 left-1/2 z-[100] bg-card text-foreground px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-border"
          >
            <div className={`rounded-full p-1 ${notification.includes('Failed') || notification.includes('error') ? 'bg-red-500' : 'bg-emerald-500'}`}>
              <CheckCircle2 size={16} className="text-white" />
            </div>
            <span className="text-sm font-bold tracking-tight">{notification}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-6 pb-16 relative min-w-0 overflow-x-hidden">
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
                      <div>
                        <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">Period</label>
                        <select
                          value={tableFilter.period}
                          onChange={(e) => handleGlobalPeriod(e.target.value)}
                          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs font-medium outline-none focus:ring-1 focus:ring-primary/20"
                        >
                          <option value="All">All Periods</option>
                          {uniquePeriods.map(period => (
                            <option key={`filter-period-${period}`} value={period}>{period}</option>
                          ))}
                        </select>
                      </div>

                      <div className="border-t border-border/60" />

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
                    onClick={() => { setSelectedStaffForDetail(staff); setShowStaffDetailModal(true); }}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-[8px] font-black text-muted-foreground/50 w-3 shrink-0">{i + 1}</span>
                      <span className="text-[11px] font-bold text-primary truncate hover:underline">{staff.staffName}</span>
                    </div>
                    <span className="text-[9px] font-bold text-foreground truncate">See details</span>
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

        {/* RESPONSIVE ADD/EDIT SESSION MODAL */}
        <AnimatePresence>
          {showSessionModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="relative bg-card w-full max-w-lg rounded-2xl border border-border shadow-2xl my-8 mx-auto overflow-hidden"
                ref={modalRef}
              >
                {/* Header */}
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

                {/* Scrollable Form Content */}
                <div className="overflow-y-auto max-h-[calc(90vh-140px)] px-5 py-5 space-y-4">
                  {/* Date & Time Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">
                        Date
                      </label>
                      <input
                        type="date"
                        value={sessionFormData.date}
                        onChange={e => setSessionFormData(p => ({ ...p, date: e.target.value }))}
                        disabled={isSubmitting}
                        className="w-full bg-muted/40 border border-border rounded-xl px-4 py-2.5 text-sm disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">
                        Time
                      </label>
                      <input
                        type="time"
                        value={sessionFormData.time}
                        onChange={e => setSessionFormData(p => ({ ...p, time: e.target.value }))}
                        disabled={isSubmitting}
                        className="w-full bg-muted/40 border border-border rounded-xl px-4 py-2.5 text-sm disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                  </div>

                  {/* Brand & Channel Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">
                        Brand <span className="text-primary">*</span>
                      </label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => !isSubmitting && setOpenDropdown(prev => prev === 'brand' ? null : 'brand')}
                          disabled={isSubmitting}
                          className={dropdownTriggerCls(openDropdown === 'brand')}
                        >
                          <span className={sessionFormData.brandId ? 'text-foreground' : 'text-muted-foreground truncate'}>
                            {sessionFormData.brandId
                              ? (brandsList.find(b => b.id === sessionFormData.brandId)?.name || 'Unknown')
                              : 'Select Brand'}
                          </span>
                          <ChevronDown size={14} className={`text-muted-foreground transition-transform flex-shrink-0 ml-2 ${openDropdown === 'brand' ? 'rotate-180' : ''}`} />
                        </button>
                        {openDropdown === 'brand' && !isSubmitting && (
                          <div className="absolute top-full left-0 right-0 mt-1 z-[200] bg-card border border-border rounded-xl shadow-xl overflow-y-auto max-h-[200px]">
                            {brandsList.map(b => (
                              <button
                                key={b.id}
                                type="button"
                                onClick={() => { setSessionFormData(p => ({ ...p, brandId: b.id })); setOpenDropdown(null); }}
                                className={dropdownOptionCls(sessionFormData.brandId === b.id)}
                              >
                                <span className="truncate">{b.name}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">
                        Channel
                      </label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => !isSubmitting && setOpenDropdown(prev => prev === 'platform' ? null : 'platform')}
                          disabled={isSubmitting}
                          className={dropdownTriggerCls(openDropdown === 'platform')}
                        >
                          <span className="text-foreground truncate">
                            {PLATFORM_OPTIONS.find(p => p.value === sessionFormData.platform)?.label || 'Select Channel'}
                          </span>
                          <ChevronDown size={14} className={`text-muted-foreground transition-transform flex-shrink-0 ml-2 ${openDropdown === 'platform' ? 'rotate-180' : ''}`} />
                        </button>
                        {openDropdown === 'platform' && !isSubmitting && (
                          <div className="absolute top-full left-0 right-0 mt-1 z-[200] bg-card border border-border rounded-xl shadow-xl overflow-y-auto max-h-[180px]">
                            {PLATFORM_OPTIONS.map(p => (
                              <button
                                key={p.value}
                                type="button"
                                onClick={() => { setSessionFormData(prev => ({ ...prev, platform: p.value })); setOpenDropdown(null); }}
                                className={dropdownOptionCls(sessionFormData.platform === p.value)}
                              >
                                {p.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Period & Host Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">
                        Period <span className="text-primary">*</span>
                      </label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => !isSubmitting && setOpenDropdown(prev => prev === 'period' ? null : 'period')}
                          disabled={isSubmitting}
                          className={dropdownTriggerCls(openDropdown === 'period')}
                        >
                          <span className={sessionFormData.period_id ? 'text-foreground' : 'text-muted-foreground truncate'}>
                            {sessionFormData.period_id
                              ? (uniquePeriodsForDropdown.find(p => String(p.id) === String(sessionFormData.period_id))?.name || `Period ${sessionFormData.period_id}`)
                              : 'Select Period'}
                          </span>
                          <ChevronDown size={14} className={`text-muted-foreground transition-transform flex-shrink-0 ml-2 ${openDropdown === 'period' ? 'rotate-180' : ''}`} />
                        </button>
                        {openDropdown === 'period' && !isSubmitting && (
                          <div className="absolute top-full left-0 right-0 mt-1 z-[200] bg-card border border-border rounded-xl shadow-xl overflow-y-auto max-h-[200px]">
                            {uniquePeriodsForDropdown.map(period => (
                              <button
                                key={`modal-period-${period.id}`}
                                type="button"
                                onClick={() => { setSessionFormData(p => ({ ...p, period_id: String(period.id) })); setOpenDropdown(null); }}
                                className={dropdownOptionCls(String(sessionFormData.period_id) === String(period.id))}
                              >
                                <span className="truncate">{period.name}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">
                        Host
                      </label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => !isSubmitting && setOpenDropdown(prev => prev === 'host' ? null : 'host')}
                          disabled={isSubmitting}
                          className={dropdownTriggerCls(openDropdown === 'host')}
                        >
                          <span className={sessionFormData.host_team_member_id ? 'text-foreground' : 'text-muted-foreground truncate'}>
                            {sessionFormData.host_team_member_id
                              ? ((team || []).find(t => sid(t.id) === sessionFormData.host_team_member_id)?.name || 'Unknown')
                              : 'No host'}
                          </span>
                          <ChevronDown size={14} className={`text-muted-foreground transition-transform flex-shrink-0 ml-2 ${openDropdown === 'host' ? 'rotate-180' : ''}`} />
                        </button>
                        {openDropdown === 'host' && !isSubmitting && (
                          <div className="absolute top-full left-0 right-0 mt-1 z-[200] bg-card border border-border rounded-xl shadow-xl overflow-y-auto max-h-[200px]">
                            <button
                              type="button"
                              onClick={() => { setSessionFormData(p => ({ ...p, host_team_member_id: '' })); setOpenDropdown(null); }}
                              className={dropdownOptionCls(sessionFormData.host_team_member_id === '')}
                            >
                              No host
                            </button>
                            {(team || []).map(t => (
                              <button
                                key={sid(t.id)}
                                type="button"
                                onClick={() => { setSessionFormData(p => ({ ...p, host_team_member_id: sid(t.id) })); setOpenDropdown(null); }}
                                className={dropdownOptionCls(sessionFormData.host_team_member_id === sid(t.id))}
                              >
                                <span className="truncate">{t.name}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Viewers & Revenue Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">
                        Viewers
                      </label>
                      <input
                        type="number" min="0"
                        value={sessionFormData.viewers}
                        onChange={e => setSessionFormData(p => ({ ...p, viewers: parseInt(e.target.value) || 0 }))}
                        disabled={isSubmitting}
                        className="w-full bg-muted/40 border border-border rounded-xl px-4 py-2.5 text-sm disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block">
                        Revenue (Rp)
                      </label>
                      <input
                        type="number" min="0"
                        value={sessionFormData.revenue}
                        onChange={e => setSessionFormData(p => ({ ...p, revenue: parseInt(e.target.value) || 0 }))}
                        disabled={isSubmitting}
                        className="w-full bg-muted/40 border border-border rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                  </div>
                </div>

                {/* Footer - Sticky Buttons */}
                <div className="sticky bottom-0 z-10 px-5 py-4 border-t border-border bg-card flex flex-col sm:flex-row items-center justify-end gap-3">
                  <button
                    onClick={closeSessionModal}
                    disabled={isSubmitting}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-[11px] font-bold uppercase text-muted-foreground hover:bg-muted transition-all disabled:opacity-50 order-2 sm:order-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={editingSession ? handleUpdateSession : handleCreateSession}
                    disabled={isSubmitting}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-[11px] font-bold uppercase bg-primary text-white hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 order-1 sm:order-2"
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

        <AnimatePresence>
          {showStaffDetailModal && selectedStaffForDetail && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-card w-full max-w-sm rounded-2xl border border-border shadow-2xl overflow-hidden"
              >
                <div className="px-4 py-3 border-b border-border bg-primary/10">
                  <h3 className="text-base font-bold text-foreground">{selectedStaffForDetail.staffName}</h3>
                  <p className="text-[9px] text-muted-foreground mt-0.5">Performance Details</p>
                </div>

                <div className="p-4 space-y-3">
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

                  <div className="flex items-center justify-between bg-muted/20 rounded-lg px-3 py-2">
                    <span className="text-[8px] font-bold text-muted-foreground">Revenue/Viewer</span>
                    <span className="text-[10px] font-bold text-foreground">{formatCurrency(Math.round(selectedStaffForDetail.revenuePerViewer))}</span>
                  </div>

                  <div className="space-y-2 pt-1">
                    {[
                      { label: 'Revenue', score: selectedStaffForDetail.revenueScore, color: 'bg-emerald-500' },
                      { label: 'Viewers', score: selectedStaffForDetail.viewerScore, color: 'bg-blue-500' },
                      { label: 'Likes',   score: selectedStaffForDetail.likesScore,  color: 'bg-red-500' },
                    ].map(({ label, score, color }) => (
                      <div key={label}>
                        <div className="flex justify-between text-[7px] mb-0.5">
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
                    className="w-full py-2 rounded-xl text-[9px] font-bold uppercase bg-primary text-white hover:bg-primary/90 transition-all"
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
    </div>
  );
};

export default Revenue;