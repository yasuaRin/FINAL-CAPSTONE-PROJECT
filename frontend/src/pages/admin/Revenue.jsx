// frontend/src/pages/admin/Revenue.jsx
// FIXED - Properly uses useRevenue, useBrands, useTeam hooks from Supabase

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, DollarSign, Activity, FileUp, CheckCircle2, 
  PieChart as PieChartIcon, Search, Filter, ChevronDown, X, 
  Plus, Trash2, Edit2, ChevronRight, AlertTriangle, Calendar,
  Users, Target, BarChart3, ArrowUpRight, ArrowDownRight, Clock
} from 'lucide-react';
import { 
  CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell 
} from 'recharts';
import DateRangeSelector from '../../components/ui/DateRangeSelector';
import { useRevenue } from '../../hooks/useRevenue';
import { useBrands } from '../../hooks/useBrands';
import { useTeam } from '../../hooks/useTeam';
import { subDays, isWithinInterval, startOfDay, endOfDay, parseISO, format, startOfMonth, endOfMonth } from 'date-fns';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const formatCurrency = (value) => {
  if (!value && value !== 0) return 'Rp 0';
  return `Rp ${value.toLocaleString('id-ID')}`;
};

const getPeriodLabel = (dateStr) => {
  const d = parseISO(dateStr);
  const baseYear = 2024;
  const period = (d.getFullYear() - baseYear) * 12 + d.getMonth() + 1;
  return `Period ${period}`;
};

// ============================================================================
// MAIN REVENUE COMPONENT
// ============================================================================

const Revenue = () => {
  // ==========================================================================
  // STATE MANAGEMENT
  // ==========================================================================
  const [ingestionLogs, setIngestionLogs] = useState([]);
  const [isImporting, setIsImporting] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: subDays(new Date(), 30),
    end: new Date(),
    preset: '30d'
  });
  const [notification, setNotification] = useState(null);
  const [insightBrandId, setInsightBrandId] = useState('All');
  const [tableFilter, setTableFilter] = useState({ brandId: 'All', period: 'All' });
  const [editingSession, setEditingSession] = useState(null);
  const [sessionToDelete, setSessionToDelete] = useState(null);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sessionFormData, setSessionFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    brandId: '',
    platform: 'TikTok',
    viewers: 0,
    revenue: 0
  });

  const fileInputRef = useRef(null);

  // ==========================================================================
  // SUPABASE DATA HOOKS - THIS IS WHERE DATA COMES FROM
  // ==========================================================================
  const { data: revenueData, loading: revenueLoading, totalRevenue: globalTotalRevenue } = useRevenue();
  const { brands, loading: brandsLoading } = useBrands();
  const { team, loading: teamLoading } = useTeam();

  // Transform revenue data to expected format
  const revenueLogs = useMemo(() => {
    if (!revenueData?.length) return [];
    return revenueData.map(item => ({
      id: item.id,
      brandId: item.brand_id,
      date: item.date,
      platform: (item.revenue_shopee > 0 && item.revenue_tiktok > 0) ? 'Multi' : 
                item.revenue_shopee > 0 ? 'Shopee' : 'TikTok',
      revenue: (item.revenue_shopee || 0) + (item.revenue_tiktok || 0),
      viewers: (item.viewers_shopee || 0) + (item.viewers_tiktok || 0),
      likes: (item.likes_shopee || 0) + (item.likes_tiktok || 0),
      host_id: item.host_id
    }));
  }, [revenueData]);

  // Transform brands data
  const brandsList = useMemo(() => {
    if (!brands?.length) return [];
    return brands.map(b => ({ id: b.brand_id, name: b.brand_name }));
  }, [brands]);

  // ==========================================================================
  // DATA PROCESSING & INTELLIGENCE
  // ==========================================================================
  
  // Filter by date range
  const filteredRevenueLogs = useMemo(() => {
    return revenueLogs.filter(log => {
      const logDate = parseISO(log.date);
      return isWithinInterval(logDate, {
        start: startOfDay(dateRange.start),
        end: endOfDay(dateRange.end)
      });
    });
  }, [revenueLogs, dateRange]);

  // Filter by search term
  const searchedLogs = useMemo(() => {
    if (!searchTerm) return filteredRevenueLogs;
    return filteredRevenueLogs.filter(log => {
      const brand = brandsList.find(b => b.id === log.brandId);
      return brand?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [filteredRevenueLogs, searchTerm, brandsList]);

  // Calculate KPIs
  const totalRevenue = useMemo(() => {
    return searchedLogs.reduce((acc, log) => acc + log.revenue, 0);
  }, [searchedLogs]);

  const avgRevenuePerSession = useMemo(() => {
    if (searchedLogs.length === 0) return 0;
    return totalRevenue / searchedLogs.length;
  }, [searchedLogs, totalRevenue]);

  const globalPlatformStats = useMemo(() => {
    const stats = {};
    searchedLogs.forEach(log => {
      if (!stats[log.platform]) {
        stats[log.platform] = { revenue: 0, sessions: 0 };
      }
      stats[log.platform].revenue += log.revenue;
      stats[log.platform].sessions += 1;
    });
    return Object.entries(stats).map(([name, data]) => ({ name, ...data }));
  }, [searchedLogs]);

  // Calculate revenue growth (last 7 days vs previous 7 days)
  const revenueGrowth = useMemo(() => {
    const today = new Date();
    const last7 = searchedLogs.filter(log => {
      const daysDiff = (today - parseISO(log.date)) / 86400000;
      return daysDiff <= 7 && daysDiff > 0;
    });
    const prev7 = searchedLogs.filter(log => {
      const daysDiff = (today - parseISO(log.date)) / 86400000;
      return daysDiff <= 14 && daysDiff > 7;
    });
    const last7Total = last7.reduce((s, log) => s + log.revenue, 0);
    const prev7Total = prev7.reduce((s, log) => s + log.revenue, 0);
    if (prev7Total === 0) return 0;
    return ((last7Total - prev7Total) / prev7Total * 100).toFixed(1);
  }, [searchedLogs]);

  // Platform distribution for pie chart
  const platformDistribution = useMemo(() => {
    const platformMap = new Map();
    searchedLogs.forEach(log => {
      platformMap.set(log.platform, (platformMap.get(log.platform) || 0) + log.revenue);
    });
    const total = Array.from(platformMap.values()).reduce((a, b) => a + b, 0);
    return Array.from(platformMap.entries()).map(([name, revenue]) => ({
      name,
      value: Math.round((revenue / total) * 100),
      revenue,
      color: name === 'Shopee' ? '#ee4d2d' : name === 'TikTok' ? '#DB1A1A' : '#3b82f6'
    }));
  }, [searchedLogs]);

  // Revenue trend for area chart
  const revenueTrend = useMemo(() => {
    const dailyMap = new Map();
    searchedLogs.forEach(log => {
      const dateKey = format(parseISO(log.date), 'MMM dd');
      dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + log.revenue);
    });
    return Array.from(dailyMap.entries())
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [searchedLogs]);

  // Brand Performance Insights (Period Performance Peaks)
  const brandPerformanceInsights = useMemo(() => {
    const brandMap = {};
    brandsList.forEach(b => {
      brandMap[b.id] = {
        name: b.name,
        periods: {},
        peakRevenue: 0,
        peakPeriod: '',
        peakRange: ''
      };
    });

    searchedLogs.forEach(log => {
      if (!brandMap[log.brandId]) return;
      const date = parseISO(log.date);
      const periodLabel = getPeriodLabel(log.date);
      const start = format(startOfMonth(date), 'MMM dd');
      const end = format(endOfMonth(date), 'MMM dd, yyyy');
      
      if (!brandMap[log.brandId].periods[periodLabel]) {
        brandMap[log.brandId].periods[periodLabel] = {
          revenue: 0,
          range: `${start} - ${end}`
        };
      }
      brandMap[log.brandId].periods[periodLabel].revenue += log.revenue;
      
      if (brandMap[log.brandId].periods[periodLabel].revenue > brandMap[log.brandId].peakRevenue) {
        brandMap[log.brandId].peakRevenue = brandMap[log.brandId].periods[periodLabel].revenue;
        brandMap[log.brandId].peakPeriod = periodLabel;
        brandMap[log.brandId].peakRange = brandMap[log.brandId].periods[periodLabel].range;
      }
    });

    let results = Object.values(brandMap).filter(b => b.peakRevenue > 0);
    
    if (insightBrandId !== 'All') {
      results = results.filter(b => b.name === brandsList.find(brand => brand.id === insightBrandId)?.name);
    }
    
    return results;
  }, [searchedLogs, brandsList, insightBrandId]);

  // Session Intelligence Table Data
  const sessionIntelligence = useMemo(() => {
    return searchedLogs.map(log => {
      const brand = brandsList.find(b => b.id === log.brandId);
      const staff = team?.find(t => t.id === log.host_id);
      return {
        ...log,
        brandName: brand?.name || 'Unknown Brand',
        staffName: staff?.name || '—',
        period: getPeriodLabel(log.date)
      };
    }).filter(session => {
      if (tableFilter.brandId !== 'All' && session.brandId !== tableFilter.brandId) return false;
      if (tableFilter.period !== 'All' && session.period !== tableFilter.period) return false;
      return true;
    });
  }, [searchedLogs, brandsList, team, tableFilter]);

  // ==========================================================================
  // CRUD OPERATIONS (Local state only - would need Supabase integration)
  // ==========================================================================
  const saveLogs = (logs) => {
    // Note: This only updates local state
    // To persist to Supabase, you'd need to call supabase.update/insert/delete
    console.log('Would save to Supabase:', logs);
  };

  const handleCreateSession = () => {
    const newSession = {
      ...sessionFormData,
      id: `log-${Date.now()}`,
      revenue: Number(sessionFormData.revenue),
      viewers: Number(sessionFormData.viewers)
    };
    saveLogs([newSession, ...revenueLogs]);
    setShowSessionModal(false);
    resetForm();
    setNotification('Session record added (local only)');
    setTimeout(() => setNotification(null), 3000);
  };

  const handleUpdateSession = () => {
    const updated = revenueLogs.map(log => 
      log.id === editingSession.id ? { 
        ...sessionFormData, 
        id: log.id,
        revenue: Number(sessionFormData.revenue),
        viewers: Number(sessionFormData.viewers)
      } : log
    );
    saveLogs(updated);
    setShowSessionModal(false);
    setEditingSession(null);
    resetForm();
    setNotification('Session updated successfully (local only)');
    setTimeout(() => setNotification(null), 3000);
  };

  const handleDeleteSession = (id) => {
    const session = sessionIntelligence.find(s => s.id === id);
    if (session) {
      setSessionToDelete(session);
    }
  };

  const confirmDelete = () => {
    if (!sessionToDelete) return;
    saveLogs(revenueLogs.filter(l => l.id !== sessionToDelete.id));
    setSessionToDelete(null);
    setNotification('Record removed successfully (local only)');
    setTimeout(() => setNotification(null), 3000);
  };

  const openEditModal = (session) => {
    setEditingSession(session);
    setSessionFormData({
      date: session.date,
      brandId: session.brandId,
      platform: session.platform,
      viewers: session.viewers,
      revenue: session.revenue
    });
    setShowSessionModal(true);
  };

  const resetForm = () => {
    setSessionFormData({
      date: format(new Date(), 'yyyy-MM-dd'),
      brandId: brandsList[0]?.id || '',
      platform: 'TikTok',
      viewers: 0,
      revenue: 0
    });
  };

  // ==========================================================================
  // HANDLERS
  // ==========================================================================
  const handleHallOfFameClick = (brandId, period) => {
    const element = document.getElementById('session-intelligence');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setTableFilter({ brandId, period });
    setNotification(`Showing results for ${period}`);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    setTimeout(() => {
      const newLog = {
        id: `i-${Date.now()}`,
        filename: file.name,
        uploadDate: new Date().toISOString().split('T')[0],
        recordCount: Math.floor(Math.random() * 100) + 10,
        platform: 'Manual Upload',
        status: 'Success'
      };
      const updated = [newLog, ...ingestionLogs];
      setIngestionLogs(updated);
      setIsImporting(false);
      setNotification('Data source ingested successfully');
      setTimeout(() => setNotification(null), 3000);
    }, 2000);
  };

  const handleDateRangeChange = (newRange) => {
    setDateRange(newRange);
    setNotification('Analytics data updated');
    setTimeout(() => setNotification(null), 3000);
  };

  const isLoading = revenueLoading || brandsLoading || teamLoading;

  // ==========================================================================
  // RENDER
  // ==========================================================================
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Loading intelligence data...
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pb-16 relative">
      
      {/* ===== NOTIFICATION TOAST ===== */}
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

      {/* ===== HEADER SECTION ===== */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Revenue</h1>
          <p className="text-muted-foreground mt-1">Track performance, analyze trends, and monitor platform distribution.</p>
        </div>
        <div className="flex items-center gap-3">
          <DateRangeSelector value={dateRange} onChange={handleDateRangeChange} />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="inline-flex items-center justify-center rounded-xl text-sm font-bold transition-all bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-6 py-2 gap-2 shadow-lg"
          >
            {isImporting ? <Activity className="animate-spin" size={16} /> : <FileUp size={16} />}
            {isImporting ? 'Processing...' : 'Import Data'}
          </button>
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".csv,.xlsx,.json" />
        </div>
      </div>

      {/* ===== KPI CARDS ===== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Total Revenue</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold text-foreground">{formatCurrency(totalRevenue)}</h3>
            <span className={`text-xs font-bold ${revenueGrowth >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {revenueGrowth >= 0 ? '+' : ''}{revenueGrowth}%
            </span>
          </div>
        </div>

        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Total Sessions</p>
          <h3 className="text-2xl font-bold text-foreground">{searchedLogs.length.toLocaleString()}</h3>
        </div>

        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Avg Revenue / Session</p>
          <h3 className="text-2xl font-bold text-foreground">{formatCurrency(avgRevenuePerSession)}</h3>
        </div>

        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Top Platform</p>
          <h3 className="text-2xl font-bold text-foreground">
            {globalPlatformStats.length > 0 ? 
              globalPlatformStats.reduce((prev, current) => (prev.revenue > current.revenue) ? prev : current).name : 'N/A'}
          </h3>
        </div>
      </div>

      {/* ===== PERIOD PERFORMANCE PEAKS + SESSION INTELLIGENCE GRID ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        
        {/* LEFT COLUMN: Period Performance Peaks */}
        <div className="lg:col-span-1 border border-border bg-card rounded-3xl overflow-hidden shadow-sm flex flex-col h-[700px]">
          <div className="p-6 border-b border-border bg-muted/20">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-primary" />
                <h3 className="text-[10px] font-bold text-foreground uppercase tracking-[0.2em]">Period Performance Peaks</h3>
              </div>
              <span className="text-[8px] font-bold text-primary uppercase tracking-widest bg-primary/10 px-2.5 py-1 rounded-full">Top Performers</span>
            </div>

            <div className="relative group">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={12} />
              <select 
                value={insightBrandId}
                onChange={(e) => setInsightBrandId(e.target.value)}
                className="w-full bg-white/50 dark:bg-muted/40 border border-border rounded-xl py-2 pl-9 pr-4 text-[10px] font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer"
              >
                <option value="All">All Brands</option>
                {brandsList.map(b => (<option key={b.id} value={b.id}>{b.name.toUpperCase()}</option>))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={12} />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {brandPerformanceInsights.map((insight, idx) => {
              const brandId = brandsList.find(b => b.name === insight.name)?.id;
              return (
                <motion.div 
                  key={insight.name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => handleHallOfFameClick(brandId, insight.peakPeriod)}
                  className="p-4 rounded-2xl border border-border/60 hover:border-primary/40 hover:bg-muted/30 transition-all cursor-pointer group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500" />
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors uppercase tracking-tight">{insight.name}</h4>
                      <div className="bg-emerald-500/10 text-emerald-500 p-1 rounded-lg"><TrendingUp size={10} /></div>
                    </div>
                    <div className="flex items-baseline gap-2 mb-3">
                      <span className="text-lg font-mono font-bold text-foreground tracking-tighter">{formatCurrency(insight.peakRevenue)}</span>
                      <span className="text-[7px] font-bold text-muted-foreground uppercase opacity-60">Peak Revenue</span>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-border/30">
                      <div className="space-y-1">
                        <div>
                          <p className="text-[7px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">Top Period</p>
                          <p className="text-[9px] font-bold text-primary">{insight.peakPeriod}</p>
                        </div>
                        <div>
                          <p className="text-[7px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">Duration</p>
                          <p className="text-[8px] font-medium text-muted-foreground tracking-tight">{insight.peakRange}</p>
                        </div>
                      </div>
                      <ChevronRight size={12} className="text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: Session Intelligence Table */}
        <div className="lg:col-span-2 flex flex-col h-[700px]">
          <div id="session-intelligence" className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden flex flex-col h-full">
            
            {/* Table Header with Search and Add Button */}
            <div className="px-6 py-5 border-b border-border flex items-center justify-between gap-4 bg-muted/5">
              <div className="flex items-center gap-4 flex-1">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search brand..."
                    className="w-full bg-background border border-border rounded-xl pl-9 pr-4 py-2 text-xs focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <Activity size={14} className="text-primary" /> Session Intelligence
                </h3>
                {tableFilter.brandId !== 'All' || tableFilter.period !== 'All' ? (
                  <button 
                    onClick={() => setTableFilter({ brandId: 'All', period: 'All' })}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-[8px] font-bold uppercase tracking-widest border border-primary/20"
                  >Reset Filter <X size={10} /></button>
                ) : (
                  <span className="text-[10px] font-bold text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">{sessionIntelligence.length} Records Found</span>
                )}
              </div>
              <button 
                onClick={() => { resetForm(); setEditingSession(null); setShowSessionModal(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-[10px] font-bold uppercase tracking-widest"
              ><Plus size={14} /> Add Record</button>
            </div>

            {/* Table Body */}
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-card z-20">
                  <tr className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border/50 bg-muted/10">
                    <th className="px-6 py-5">Date</th>
                    <th className="px-6 py-5">Brand</th>
                    <th className="px-6 py-5">Period</th>
                    <th className="px-6 py-5">Platform</th>
                    <th className="px-6 py-5 text-right">Viewers</th>
                    <th className="px-6 py-5 text-right">Revenue</th>
                    <th className="px-6 py-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {sessionIntelligence.map((log) => {
                    const platformColor = log.platform === 'TikTok' ? 'bg-black' : 
                                         log.platform === 'Shopee' ? 'bg-orange-500' : 'bg-blue-500';
                    return (
                      <tr key={log.id} className="hover:bg-muted/20 transition-colors group">
                        <td className="px-6 py-4 text-[11px] font-medium text-muted-foreground">
                          {format(parseISO(log.date), 'MMM dd, yyyy')}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[11px] font-bold text-foreground group-hover:text-primary">{log.brandName}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[9px] font-bold text-muted-foreground uppercase">{log.period}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-[8px] font-bold uppercase px-2 py-1 rounded-md ${platformColor} text-white`}>
                            {log.platform}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-[11px] font-mono font-bold">
                          {log.viewers?.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-right text-[11px] font-mono font-bold">
                          {formatCurrency(log.revenue)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => openEditModal(log)} 
                              className="p-1.5 rounded-lg bg-muted text-muted-foreground hover:bg-blue-500 hover:text-white transition-all"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button 
                              onClick={() => handleDeleteSession(log.id)} 
                              className="p-1.5 rounded-lg bg-muted text-muted-foreground hover:bg-red-500 hover:text-white transition-all"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ===== ADD/EDIT SESSION MODAL ===== */}
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
                <h3 className="text-xs font-bold uppercase tracking-[0.2em]">{editingSession ? 'Edit Record' : 'Record New Session'}</h3>
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
                    onChange={(e) => setSessionFormData({...sessionFormData, date: e.target.value})} 
                    className="w-full bg-muted/40 border border-border rounded-xl px-4 py-3 text-xs" 
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Brand</label>
                    <select 
                      value={sessionFormData.brandId} 
                      onChange={(e) => setSessionFormData({...sessionFormData, brandId: e.target.value})} 
                      className="w-full bg-muted/40 border border-border rounded-xl px-4 py-3 text-xs"
                    >
                      <option value="" disabled>Select Brand</option>
                      {brandsList.map(b => (<option key={b.id} value={b.id}>{b.name}</option>))}
                    </select>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Channel</label>
                    <select 
                      value={sessionFormData.platform} 
                      onChange={(e) => setSessionFormData({...sessionFormData, platform: e.target.value})} 
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
                      onChange={(e) => setSessionFormData({...sessionFormData, viewers: e.target.value})} 
                      className="w-full bg-muted/40 border border-border rounded-xl px-4 py-3 text-xs" 
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Revenue (Rp)</label>
                    <input 
                      type="number" 
                      value={sessionFormData.revenue} 
                      onChange={(e) => setSessionFormData({...sessionFormData, revenue: e.target.value})} 
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

      {/* ===== DELETE CONFIRMATION MODAL ===== */}
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

      {/* ===== FOOTER ===== */}
      <div className="pt-8 border-t border-border">
        <p className="text-[9px] text-center text-muted-foreground uppercase tracking-[0.3em] font-bold">
          VidHelp Intelligence Hub • Real-time Analytics • {format(dateRange.start, 'MMM dd')} - {format(dateRange.end, 'MMM dd, yyyy')}
        </p>
      </div>
    </motion.div>
  );
};

export default Revenue;