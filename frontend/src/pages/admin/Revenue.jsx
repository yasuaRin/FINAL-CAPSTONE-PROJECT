// frontend/src/pages/admin/Revenue.jsx

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, Activity, FileUp, CheckCircle2,
  Filter, ChevronDown, X, AlertTriangle, Plus, Users
} from 'lucide-react';

import SortByButton from '../../components/layout/SortByButton';
import { useRevenue } from '../../hooks/useRevenue';
import { useBrands } from '../../hooks/useBrands';
import { useTeam } from '../../hooks/useTeam';
import { supabase } from '../../services/supabase';

import {
  subDays, isWithinInterval, startOfDay, endOfDay,
  parseISO, format, startOfMonth, endOfMonth
} from 'date-fns';

import RevenueBrandsPanel from '../../components/revenue/RevenueBrandsPanel';
import RevenueSessionsTable from '../../components/revenue/RevenueSessionsTable';

// ---------------- HELPERS ----------------
const formatCurrency = (value) =>
  `Rp ${(value || 0).toLocaleString('id-ID')}`;

// Normalize UUID to string
const sid = (v) => (v == null ? '' : String(v));

// ---------------- MAIN ----------------
const Revenue = () => {
  const [dateRange, setDateRange] = useState({
    start: subDays(new Date(), 30),
    end: new Date(),
  });

  const [insightBrandId, setInsightBrandId] = useState('All');
  const [notification, setNotification] = useState(null);
  const [tableFilter, setTableFilter] = useState({ brandId: 'All', period: 'All' });
  const [editingSession, setEditingSession] = useState(null);
  const [sessionToDelete, setSessionToDelete] = useState(null);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sessionFormData, setSessionFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'), brandId: '', platform: 'TikTok', viewers: 0, revenue: 0,
  });
  const [sortCol, setSortCol] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [rowLimit, setRowLimit] = useState(25);
  const [sortOpen, setSortOpen] = useState(false);
  const [limitOpen, setLimitOpen] = useState(false);
  const [periodsData, setPeriodsData] = useState([]);
  const sortRef = useRef(null);
  const limitRef = useRef(null);
  const fileInputRef = useRef(null);

  const { data: revenueData, loading, refetch: refetchRevenue, brandTotals } = useRevenue();
  const { brands } = useBrands(brandTotals);
  const { team } = useTeam();

  // Fetch periods data from database
  useEffect(() => {
    const fetchPeriods = async () => {
      try {
        const { data, error } = await supabase
          .from('periods')
          .select('period_id, period_name, period_start_date, period_end_date')
          .order('period_id');
        
        if (!error && data) {
          console.log('📅 Periods fetched:', data);
          setPeriodsData(data);
        } else if (error) {
          console.error('Error fetching periods:', error);
        }
      } catch (err) {
        console.error('Failed to fetch periods:', err);
      }
    };
    
    fetchPeriods();
  }, []);

  // Create period map for quick lookup
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

  // Debug logging
  useEffect(() => {
    console.log('🔍 REVENUE PAGE DEBUG:');
    console.log('brandTotals size:', brandTotals.size);
    console.log('brands count:', brands?.length);
    console.log('revenueData count:', revenueData?.length);
    console.log('periodsData count:', periodsData.length);
    console.log('periodMap:', periodMap);
    
    if (brandTotals.size > 0 && brands?.length > 0) {
      console.log('💸 BRAND REVENUE MAPPING:');
      brands.forEach(brand => {
        const brandId = sid(brand.brand_id);
        const revenue = brandTotals.get(brandId) || 0;
        console.log(`  ${brand.brand_name}: Rp ${revenue.toLocaleString('id-ID')}`);
      });
    }
  }, [brandTotals, brands, revenueData, periodsData, periodMap]);

  // ── Normalize brandsList with total revenue from brandTotals ──
  const brandsList = useMemo(() => {
    if (!brands) return [];
    
    return brands
      .map(b => ({ 
        id: sid(b.brand_id), 
        name: b.brand_name,
        totalRevenue: brandTotals.get(sid(b.brand_id)) || 0
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [brands, brandTotals]);

  // ── Normalize teamMap for fast lookup ──
  const teamMap = useMemo(() => {
    const m = {};
    (team || []).forEach(t => { m[sid(t.id)] = t.name; });
    return m;
  }, [team]);

  // ── raw logs – all IDs normalized to string ──
  // log.revenue = revenue_shopee + revenue_tiktok — the correct full session total
  // for ALL platform types including Multi. Never re-sum from revenueData.
  const revenueLogs = useMemo(() => {
    if (!revenueData) return [];
    return revenueData.map(i => ({
      id: sid(i.id),
      brandId: sid(i.brand_id),
      host_team_member_id: sid(i.host_team_member_id),
      date: i.date,
      period_id: i.period_id,
      platform:
        i.revenue_shopee > 0 && i.revenue_tiktok > 0 ? 'Multi'
        : i.revenue_shopee > 0 ? 'Shopee'
        : 'TikTok',
      revenue: (i.revenue_shopee ?? 0) + (i.revenue_tiktok ?? 0),
      viewers: (i.viewers_shopee ?? 0) + (i.viewers_tiktok ?? 0),
    }));
  }, [revenueData]);

  // Debug for Top Performers - MOVED HERE after revenueLogs is defined
  useEffect(() => {
    if (!revenueLogs.length && !team?.length) return;
    
    console.log('🔍 TOP PERFORMERS DEBUG:');
    console.log('Team members count:', team?.length);
    console.log('Team sample:', team?.slice(0, 3));
    
    // Check revenueLogs for host_team_member_id values
    const uniquehost_team_member_ids = new Set();
    const host_team_member_idCounts = {};
    
    revenueLogs.forEach(log => {
      if (log.host_team_member_id && log.host_team_member_id !== 'null' && log.host_team_member_id !== '') {
        uniquehost_team_member_ids.add(log.host_team_member_id);
        host_team_member_idCounts[log.host_team_member_id] = (host_team_member_idCounts[log.host_team_member_id] || 0) + 1;
      }
    });
    
    console.log('Unique host IDs in revenueLogs:', uniquehost_team_member_ids.size);
    console.log('Sample host IDs:', Array.from(uniquehost_team_member_ids).slice(0, 5));
    console.log('Host ID to session count mapping:', Object.entries(host_team_member_idCounts).slice(0, 5));
    
    // Check if host IDs match team IDs
    const teamIds = new Set(team?.map(t => String(t.id)) || []);
    let matchCount = 0;
    
    uniquehost_team_member_ids.forEach(host_team_member_id => {
      if (teamIds.has(host_team_member_id)) {
        matchCount++;
      }
    });
    
    console.log('Host IDs matching team IDs:', matchCount, 'out of', uniquehost_team_member_ids.size);
    
    // Show which host IDs are NOT in team
    if (uniquehost_team_member_ids.size > 0 && matchCount === 0) {
      console.warn('⚠️ No host IDs match team IDs! This is why top performers are empty.');
      console.log('First host ID from revenue:', Array.from(uniquehost_team_member_ids)[0]);
      console.log('First team ID from team:', Array.from(teamIds)[0]);
    }
  }, [team, revenueLogs]);

  // ── brandMap for fast lookup ──
  const brandMap = useMemo(() => {
    const m = {};
    brandsList.forEach(b => { m[b.id] = b.name; });
    return m;
  }, [brandsList]);

  // ── All-time revenue ──
  const allTimeRevenue = useMemo(() => {
    let total = 0;
    brandTotals.forEach(val => { total += val; });
    return total;
  }, [brandTotals]);

  const totalSessionsAllTime = revenueLogs.length;
  const avgRevenueAllTime = totalSessionsAllTime === 0 ? 0 : allTimeRevenue / totalSessionsAllTime;

  // ── Best staff per brand (ONE staff member per brand - the top earner) ──
  const bestStaffPerBrand = useMemo(() => {
    if (!team?.length) return [];

    const staffBrandRevenue = {};
    revenueLogs.forEach(log => {
      if (!log.host_team_member_id) return;
      const key = `${log.brandId}_${log.host_team_member_id}`;
      if (!staffBrandRevenue[key]) {
        staffBrandRevenue[key] = {
          brandId: log.brandId,
          brandName: brandMap[log.brandId] || 'Unknown',
          staffId: log.host_team_member_id,
          staffName: teamMap[log.host_team_member_id] || `Host ${log.host_team_member_id}`,
          revenue: 0,
        };
      }
      staffBrandRevenue[key].revenue += log.revenue;
    });

    const bestStaffPerBrandMap = {};
    Object.values(staffBrandRevenue).forEach(item => {
      const brandId = item.brandId;
      if (!bestStaffPerBrandMap[brandId] || item.revenue > bestStaffPerBrandMap[brandId].revenue) {
        bestStaffPerBrandMap[brandId] = item;
      }
    });

    return Object.values(bestStaffPerBrandMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [revenueLogs, teamMap, brandMap]);

  // ── Top platform by revenue in selected date range ──
const topPlatformInRange = useMemo(() => {
  const filtered = revenueLogs.filter(l =>
    isWithinInterval(parseISO(l.date), {
      start: startOfDay(dateRange.start),
      end: endOfDay(dateRange.end),
    })
  );

  const stats = { TikTok: 0, Shopee: 0, Multi: 0 };
  filtered.forEach(log => {
    stats[log.platform] += log.revenue;
  });

  const entries = Object.entries(stats).filter(([, rev]) => rev > 0);
  if (!entries.length) return { name: 'N/A', revenue: 0 };

  const [name, revenue] = entries.reduce((p, c) => (p[1] > c[1] ? p : c));
  return { name, revenue };
}, [revenueLogs, dateRange]);

// ── Top platform by revenue (ALL TIME - matches SQL query) ──
const topPlatformAllTime = useMemo(() => {
  const stats = { TikTok: 0, Shopee: 0, Multi: 0 };
  
  revenueLogs.forEach(log => {
    stats[log.platform] += log.revenue;
  });

  const entries = Object.entries(stats).filter(([, rev]) => rev > 0);
  if (!entries.length) return { name: 'N/A', revenue: 0 };

  const [name, revenue] = entries.reduce((p, c) => (p[1] > c[1] ? p : c));
  return { name, revenue };
}, [revenueLogs]);

// Use the all-time version to match your SQL query
const topPlatform = topPlatformAllTime;

  // ── Brand performance insights - Shows TOTAL revenue and OVERALL date range ──
  const brandPerformanceInsights = useMemo(() => {
    const map = {};
    
    brandsList.forEach(b => {
      map[b.id] = {
        id: b.id,
        name: b.name,
        totalRevenue: b.totalRevenue,
        peakRevenue: 0,
        peakPeriod: '',
        peakPeriodId: null,
        peakRange: '',
        overallStartDate: null,
        overallEndDate: null,
        overallRange: '',
        hasSessions: b.totalRevenue > 0,
        sessionCount: 0,
        periodRevenue: {},
      };
    });

    revenueLogs.forEach(log => {
      const b = map[log.brandId];
      if (!b) return;
      
      b.sessionCount++;
      
      const logDate = parseISO(log.date);
      if (!b.overallStartDate || logDate < b.overallStartDate) {
        b.overallStartDate = logDate;
      }
      if (!b.overallEndDate || logDate > b.overallEndDate) {
        b.overallEndDate = logDate;
      }
      
      const periodId = log.period_id;
      const periodKey = `period_${periodId}`;
      
      if (!b.periodRevenue[periodKey]) {
        b.periodRevenue[periodKey] = {
          periodId: periodId,
          revenue: 0,
          sessions: [],
        };
      }
      b.periodRevenue[periodKey].revenue += log.revenue;
      b.periodRevenue[periodKey].sessions.push({
        date: log.date,
        revenue: log.revenue,
      });
      
      if (log.revenue > b.peakRevenue) {
        b.peakRevenue = log.revenue;
      }
    });

    Object.values(map).forEach(b => {
      if (b.hasSessions && b.overallStartDate && b.overallEndDate) {
        b.overallRange = `${format(b.overallStartDate, 'dd MMM yyyy')} - ${format(b.overallEndDate, 'dd MMM yyyy')}`;
      }
      
      if (b.hasSessions && Object.keys(b.periodRevenue).length > 0) {
        let bestPeriod = null;
        let bestPeriodRevenue = 0;
        
        Object.values(b.periodRevenue).forEach(period => {
          if (period.revenue > bestPeriodRevenue) {
            bestPeriodRevenue = period.revenue;
            bestPeriod = period;
          }
        });
        
        if (bestPeriod) {
          b.peakPeriodId = bestPeriod.periodId;
          b.peakPeriod = `Period ${bestPeriod.periodId}`;
          b.bestPeriodRevenue = bestPeriodRevenue;
          
          const periodInfo = periodMap[bestPeriod.periodId];
          if (periodInfo && periodInfo.startDate && periodInfo.endDate) {
            const startDate = parseISO(periodInfo.startDate);
            const endDate = parseISO(periodInfo.endDate);
            b.peakRange = `${format(startDate, 'dd MMM yyyy')} - ${format(endDate, 'dd MMM yyyy')}`;
          } else {
            const dates = bestPeriod.sessions.map(s => parseISO(s.date)).sort((a, b) => a - b);
            b.peakRange = `${format(dates[0], 'dd MMM yyyy')} - ${format(dates[dates.length - 1], 'dd MMM yyyy')}`;
          }
        }
      }
    });

    let results = Object.values(map);
    if (insightBrandId !== 'All') results = results.filter(b => b.id === insightBrandId);
    
    return results.sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [revenueLogs, brandsList, insightBrandId, periodMap]);

  // ── Session intelligence (filtered + sorted table rows) ──
  const sessionIntelligence = useMemo(() => {
    let rows = revenueLogs.map(log => ({
      ...log,
      brandName: brandMap[log.brandId] || 'Unknown Brand',
      staffName: teamMap[log.host_team_member_id] || '—',
      period: `Period ${log.period_id}`,
    }));

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      rows = rows.filter(s => s.brandName.toLowerCase().includes(term));
    }

    if (tableFilter.brandId !== 'All') rows = rows.filter(s => s.brandId === tableFilter.brandId);
    if (tableFilter.period !== 'All') rows = rows.filter(s => s.period === tableFilter.period);

    rows.sort((a, b) => {
      let aVal, bVal;
      if (sortCol === 'date') { aVal = new Date(a.date).getTime(); bVal = new Date(b.date).getTime(); }
      else if (sortCol === 'revenue') { aVal = a.revenue; bVal = b.revenue; }
      else if (sortCol === 'viewers') { aVal = a.viewers; bVal = b.viewers; }
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return rows;
  }, [revenueLogs, brandMap, teamMap, searchTerm, tableFilter, sortCol, sortDir]);

  const visibleSessions = useMemo(
    () => rowLimit === null ? sessionIntelligence : sessionIntelligence.slice(0, rowLimit),
    [sessionIntelligence, rowLimit]
  );

  const uniquePeriods = useMemo(() => {
    const periods = new Set();
    revenueLogs.forEach(log => periods.add(`Period ${log.period_id}`));
    return Array.from(periods).sort((a, b) => {
      const numA = parseInt(a.split(' ')[1]);
      const numB = parseInt(b.split(' ')[1]);
      return numA - numB;
    });
  }, [revenueLogs]);

  const sortGroups = [
    { label: 'Date', options: [{ label: 'Newest first', col: 'date', dir: 'desc' }, { label: 'Oldest first', col: 'date', dir: 'asc' }] },
    { label: 'Revenue', options: [{ label: 'Highest first', col: 'revenue', dir: 'desc' }, { label: 'Lowest first', col: 'revenue', dir: 'asc' }] },
    { label: 'Viewers', options: [{ label: 'Most viewers', col: 'viewers', dir: 'desc' }, { label: 'Fewest viewers', col: 'viewers', dir: 'asc' }] },
  ];

  const limitOptions = [10, 25, 50, 100, null];

  const activeSortLabel = (() => {
    for (const g of sortGroups) {
      const m = g.options.find(o => o.col === sortCol && o.dir === sortDir);
      if (m) return `${g.label}: ${m.label}`;
    }
    return 'Sort';
  })();

  const notify = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const resetForm = () => setSessionFormData({
    date: format(new Date(), 'yyyy-MM-dd'),
    brandId: brandsList[0]?.id || '',
    platform: 'TikTok',
    viewers: 0,
    revenue: 0,
  });

  const handleCreateSession = async () => {
    try {
      const { data: platformData } = await supabase
        .from('platforms')
        .select('platform_id')
        .eq('platform_name', sessionFormData.platform === 'Multi' ? 'multi' : sessionFormData.platform.toLowerCase())
        .single();

      const isShopee = sessionFormData.platform === 'Shopee' || sessionFormData.platform === 'Multi';
      const isTikTok = sessionFormData.platform === 'TikTok' || sessionFormData.platform === 'Multi';

      const { error } = await supabase.from('live_sessions').insert([{
        date: sessionFormData.date,
        time: '00:00',
        revenue_shopee: isShopee ? sessionFormData.revenue : 0,
        revenue_tiktok: isTikTok ? sessionFormData.revenue : 0,
        viewers_shopee: isShopee ? sessionFormData.viewers : 0,
        viewers_tiktok: isTikTok ? sessionFormData.viewers : 0,
        likes_shopee: 0,
        likes_tiktok: 0,
        period_id: 1,
        host_team_member_id: null,
        brand_id: sessionFormData.brandId,
        platform_id: platformData?.platform_id,
      }]);

      if (error) throw error;
      notify('Session created successfully');
      setShowSessionModal(false);
      resetForm();
      refetchRevenue();
    } catch (err) {
      console.error('Create error:', err);
      notify('Failed to create session');
    }
  };

  const handleUpdateSession = async () => {
    try {
      const isShopee = sessionFormData.platform === 'Shopee' || sessionFormData.platform === 'Multi';
      const isTikTok = sessionFormData.platform === 'TikTok' || sessionFormData.platform === 'Multi';

      const { error } = await supabase.from('live_sessions').update({
        date: sessionFormData.date,
        revenue_shopee: isShopee ? sessionFormData.revenue : 0,
        revenue_tiktok: isTikTok ? sessionFormData.revenue : 0,
        viewers_shopee: isShopee ? sessionFormData.viewers : 0,
        viewers_tiktok: isTikTok ? sessionFormData.viewers : 0,
        brand_id: sessionFormData.brandId,
      }).eq('id', editingSession.id);

      if (error) throw error;
      notify('Session updated successfully');
      setShowSessionModal(false);
      setEditingSession(null);
      resetForm();
      refetchRevenue();
    } catch (err) {
      console.error('Update error:', err);
      notify('Failed to update session');
    }
  };

  const confirmDelete = async () => {
    try {
      const { error } = await supabase.from('live_sessions').delete().eq('id', sessionToDelete.id);
      if (error) throw error;
      notify('Session deleted successfully');
      setSessionToDelete(null);
      refetchRevenue();
    } catch (err) {
      console.error('Delete error:', err);
      notify('Failed to delete session');
    }
  };

  const handleDeleteSession = (id) => {
    const session = sessionIntelligence.find(x => x.id === id);
    if (session) setSessionToDelete(session);
  };

  const openEditModal = (session) => {
    setEditingSession(session);
    setSessionFormData({
      date: session.date,
      brandId: session.brandId,
      platform: session.platform,
      viewers: session.viewers,
      revenue: session.revenue,
    });
    setShowSessionModal(true);
  };

  const handleHallOfFameClick = (brandId, period) => {
    document.getElementById('session-intelligence')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTableFilter({ brandId, period });
    notify(`Showing sessions for ${period}`);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    console.log('File upload:', file);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Loading intelligence data...</p>
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

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Revenue</h1>
          <p className="text-muted-foreground mt-1 text-sm">Track performance, analyze trends, and monitor platform distribution.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <SortByButton
              brands={brands}
              selectedBrand={tableFilter.brandId === 'All' ? null : tableFilter.brandId}
              onBrandChange={(brandId) =>
                setTableFilter(prev => ({
                  ...prev,
                  brandId: brandId || 'All',
                }))
              }
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
            />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 min-w-0">
        <div className="bg-card p-5 rounded-2xl border border-border shadow-sm min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Total Revenue</p>
          <p className="text-xl sm:text-2xl font-bold text-foreground leading-tight break-all">
            {formatCurrency(allTimeRevenue)}
          </p>
          <div className="mt-2 pt-3 border-t border-border/40 flex items-center gap-1.5 flex-wrap">
            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Avg / session</span>
            <span className="text-[11px] font-bold text-foreground">{formatCurrency(Math.round(avgRevenueAllTime))}</span>
          </div>
        </div>

        <div className="bg-card p-5 rounded-2xl border border-border shadow-sm min-w-0">
          <div className="flex items-center gap-2 mb-3">
            <Users size={12} className="text-primary shrink-0" />
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Top Performers</p>
          </div>
          <div className="space-y-2">
            {bestStaffPerBrand.length === 0 && (
              <p className="text-xs text-muted-foreground">No data yet</p>
            )}
            {bestStaffPerBrand.slice(0, 5).map((staff, i) => (
              <div key={`${staff.staffId}_${staff.brandId}`} className="flex items-center justify-between gap-2 min-w-0">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="text-[8px] font-black text-muted-foreground/50 w-3 shrink-0">{i + 1}</span>
                  <span className="text-[11px] font-bold text-primary truncate">{staff.staffName}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0 min-w-0">
                  <span className="text-[9px] font-medium text-muted-foreground hidden sm:inline">Top:</span>
                  <span className="text-[9px] font-bold text-foreground truncate max-w-[80px]">{staff.brandName}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card p-5 rounded-2xl border border-border shadow-sm min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
            Top Platform
            <span className="ml-1 font-normal normal-case tracking-normal text-muted-foreground/50 text-[9px]">(range)</span>
          </p>
          <p className="text-xl sm:text-2xl font-bold text-foreground">{topPlatform.name}</p>
          <div className="mt-2 pt-3 border-t border-border/40 flex items-center gap-1.5 flex-wrap">
            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Revenue</span>
            <span className="text-[11px] font-bold text-foreground break-all">{formatCurrency(topPlatform.revenue)}</span>
          </div>
        </div>

        <div className="bg-card p-5 rounded-2xl border border-border shadow-sm min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Total Live Sessions</p>
          <p className="text-xl sm:text-2xl font-bold text-foreground">{totalSessionsAllTime.toLocaleString()}</p>
          <div className="mt-2 pt-3 border-t border-border/40 flex items-center gap-1.5">
            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Brands</span>
            <span className="text-[11px] font-bold text-foreground">{brandsList.length}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12 min-w-0">
        <RevenueBrandsPanel
          brandsList={brandsList}
          insightBrandId={insightBrandId}
          setInsightBrandId={setInsightBrandId}
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
          sortRef={sortRef}
          limitRef={limitRef}
          sortOpen={sortOpen}
          setSortOpen={setSortOpen}
          limitOpen={limitOpen}
          setLimitOpen={setLimitOpen}
          sortGroups={sortGroups}
          sortCol={sortCol}
          sortDir={sortDir}
          setSortCol={setSortCol}
          setSortDir={setSortDir}
          rowLimit={rowLimit}
          setRowLimit={setRowLimit}
          limitOptions={limitOptions}
          activeSortLabel={activeSortLabel}
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

      <AnimatePresence>
        {showSessionModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-card w-full max-w-md rounded-3xl border border-border shadow-2xl"
            >
              <div className="px-6 py-4 border-b border-border bg-muted/20 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-[0.2em]">
                  {editingSession ? 'Edit Record' : 'Record New Session'}
                </h3>
                <button onClick={() => setShowSessionModal(false)} className="p-2 hover:bg-muted rounded-full">
                  <X size={16} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Target Date</label>
                  <input
                    type="date"
                    value={sessionFormData.date}
                    onChange={e => setSessionFormData({ ...sessionFormData, date: e.target.value })}
                    className="w-full bg-muted/40 border border-border rounded-xl px-4 py-3 text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Brand</label>
                    <select
                      value={sessionFormData.brandId}
                      onChange={e => setSessionFormData({ ...sessionFormData, brandId: e.target.value })}
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
                      onChange={e => setSessionFormData({ ...sessionFormData, platform: e.target.value })}
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
                    <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Viewers</label>
                    <input
                      type="number"
                      value={sessionFormData.viewers}
                      onChange={e => setSessionFormData({ ...sessionFormData, viewers: parseInt(e.target.value) || 0 })}
                      className="w-full bg-muted/40 border border-border rounded-xl px-4 py-3 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Revenue (Rp)</label>
                    <input
                      type="number"
                      value={sessionFormData.revenue}
                      onChange={e => setSessionFormData({ ...sessionFormData, revenue: parseInt(e.target.value) || 0 })}
                      className="w-full bg-muted/40 border border-border rounded-xl px-4 py-3 text-xs font-bold"
                    />
                  </div>
                </div>
              </div>
              <div className="p-6 bg-muted/20 border-t border-border flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowSessionModal(false)}
                  className="px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase text-muted-foreground"
                >
                  Discard
                </button>
                <button
                  onClick={editingSession ? handleUpdateSession : handleCreateSession}
                  className="px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase bg-primary text-white"
                >
                  {editingSession ? 'Update' : 'Commit'}
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
                This will permanently remove the record for{' '}
                <span className="text-foreground font-bold">{sessionToDelete.brandName}</span>.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setSessionToDelete(null)}
                  className="px-6 py-3 rounded-2xl text-[10px] font-bold uppercase text-muted-foreground hover:bg-muted transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-6 py-3 rounded-2xl text-[10px] font-bold uppercase bg-red-500 text-white hover:bg-red-600 transition-all"
                >
                  Delete
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
    </motion.div>
  );
};

export default Revenue;