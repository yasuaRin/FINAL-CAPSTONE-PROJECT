// frontend/src/pages/admin/Revenue.jsx
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, DollarSign, Activity, Download,
  CheckCircle2, Calendar, Users, Target, BarChart3,
  ArrowUpRight, ArrowDownRight, Minus, ChevronDown, Check, Filter,
  Zap, Shield, Clock, PieChart, Globe, FileUp
} from 'lucide-react';
import {
  CartesianGrid, XAxis, YAxis, Tooltip,
  ResponsiveContainer, AreaChart, Area, PieChart as RePieChart, Pie, Cell
} from 'recharts';
import { useRevenue } from '../../hooks/useRevenue';
import { useBrands } from '../../hooks/useBrands';
import { useTeam } from '../../hooks/useTeam';
import { subDays, startOfDay, endOfDay, format, isWithinInterval } from 'date-fns';
import { SortByButton } from '../../components/layout/SortByButton';

const Revenue = () => {
  const parseRevenueDate = (value) => {
    if (!value) return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
    if (typeof value === 'string' || typeof value === 'number') {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
  };

  const normalizeDateKey = (dateValue) => {
    const parsed = parseRevenueDate(dateValue);
    return parsed ? format(parsed, 'yyyy-MM-dd') : null;
  };

  const { data: revenue, loading: revenueLoading } = useRevenue();
  const { brands, loading: brandsLoading } = useBrands();
  const { team, loading: teamLoading } = useTeam();

  const [notification, setNotification] = useState(null);
  const [showRevenueOnly, setShowRevenueOnly] = useState(true);
  const [sortCol, setSortCol] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [sortOpen, setSortOpen] = useState(false);
  const [limitOpen, setLimitOpen] = useState(false);
  const [rowLimit, setRowLimit] = useState(10);
  const sortRef = useRef(null);
  const limitRef = useRef(null);
  const [dateRange, setDateRange] = useState({
    start: subDays(new Date(), 30),
    end: new Date(),
    preset: '30d'
  });

<<<<<<< HEAD
  // State for filter dropdown
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const filterRef = useRef(null);
  
  // Sort state
  const [sortColumn, setSortColumn] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');
  
  // Rows per page state
  const [rowsToShow, setRowsToShow] = useState(10);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setFilterDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
=======
  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (sortRef.current && !sortRef.current.contains(e.target)) setSortOpen(false);
      if (limitRef.current && !limitRef.current.contains(e.target)) setLimitOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
>>>>>>> 30358d859c78d0d1eb8c5cc4f280af5c0496d5d5
  }, []);

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const isLoading = revenueLoading || brandsLoading || teamLoading;

  // Filter revenue by date range
  const filteredRevenue = useMemo(() => {
    if (!revenue?.length) return [];
    return revenue.filter(item => {
      const d = parseRevenueDate(item.date);
      return d && isWithinInterval(d, {
        start: startOfDay(dateRange.start),
        end: endOfDay(dateRange.end)
      });
    });
  }, [revenue, dateRange]);

  // KPI calculations
  const kpis = useMemo(() => {
    const totalRevenue = filteredRevenue.reduce((s, i) =>
      s + (i.revenue_shopee || 0) + (i.revenue_tiktok || 0), 0);

    const totalSessions = filteredRevenue.length;

    const avgRevenue = totalSessions > 0
      ? Math.round(totalRevenue / totalSessions)
      : 0;

    const shopeeTotal = filteredRevenue.reduce((s, i) => s + (i.revenue_shopee || 0), 0);
    const tiktokTotal = filteredRevenue.reduce((s, i) => s + (i.revenue_tiktok || 0), 0);
    
    let topPlatform;
    if (shopeeTotal > tiktokTotal) topPlatform = 'Shopee';
    else if (tiktokTotal > shopeeTotal) topPlatform = 'TikTok';
    else topPlatform = 'Multi';

    const today = new Date();
    const last7 = filteredRevenue.filter(i => {
      const dateValue = parseRevenueDate(i.date);
      if (!dateValue) return false;
      const d = (today - dateValue) / 86400000;
      return d <= 7 && d > 0;
    });
    const prev7 = filteredRevenue.filter(i => {
      const dateValue = parseRevenueDate(i.date);
      if (!dateValue) return false;
      const d = (today - dateValue) / 86400000;
      return d <= 14 && d > 7;
    });
    const last7Total = last7.reduce((s, i) => s + (i.revenue_shopee || 0) + (i.revenue_tiktok || 0), 0);
    const prev7Total = prev7.reduce((s, i) => s + (i.revenue_shopee || 0) + (i.revenue_tiktok || 0), 0);
    const revenueGrowth = prev7Total > 0 ? ((last7Total - prev7Total) / prev7Total * 100).toFixed(1) : 0;

    return { totalRevenue, totalSessions, avgRevenue, topPlatform, revenueGrowth };
  }, [filteredRevenue]);

  // Revenue trend (daily grouped)
  const revenueTrend = useMemo(() => {
    if (!filteredRevenue.length) return [];
    
    const dailyMap = new Map();
    
    filteredRevenue.forEach(item => {
      const dateKey = format(parseRevenueDate(item.date), 'yyyy-MM-dd');
      const revenue = (item.revenue_shopee || 0) + (item.revenue_tiktok || 0);
      
      if (dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, dailyMap.get(dateKey) + revenue);
      } else {
        dailyMap.set(dateKey, revenue);
      }
    });
    
    return Array.from(dailyMap.entries())
      .map(([date, revenue]) => ({
        date: format(new Date(date), 'MMM dd'),
        revenue,
        forecast: Math.round(revenue * 1.06)
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [filteredRevenue]);

  // Platform stats
  const platformStats = useMemo(() => {
    if (!filteredRevenue.length) return [];
    
    let shopeeOnlyRev = 0;
    let tiktokOnlyRev = 0;
    let multiRev = 0;
    
    filteredRevenue.forEach(item => {
      const hasShopee = (item.revenue_shopee || 0) > 0;
      const hasTiktok = (item.revenue_tiktok || 0) > 0;
      
      if (hasShopee && hasTiktok) {
        multiRev += (item.revenue_shopee || 0) + (item.revenue_tiktok || 0);
      } else if (hasShopee) {
        shopeeOnlyRev += (item.revenue_shopee || 0);
      } else if (hasTiktok) {
        tiktokOnlyRev += (item.revenue_tiktok || 0);
      }
    });
    
    const total = shopeeOnlyRev + tiktokOnlyRev + multiRev;
    if (total === 0) return [];
    
    const stats = [];
    
    if (shopeeOnlyRev > 0) {
      stats.push({ 
        name: 'Shopee', 
        revenue: shopeeOnlyRev, 
        pct: (shopeeOnlyRev / total * 100).toFixed(1),
        color: '#00f5ff'
      });
    }
    
    if (tiktokOnlyRev > 0) {
      stats.push({ 
        name: 'TikTok', 
        revenue: tiktokOnlyRev, 
        pct: (tiktokOnlyRev / total * 100).toFixed(1),
        color: '#DB1A1A'
      });
    }
    
    if (multiRev > 0) {
      stats.push({ 
        name: 'Multi', 
        revenue: multiRev, 
        pct: (multiRev / total * 100).toFixed(1),
        color: '#3b82f6'
      });
    }
    
    return stats.sort((a, b) => b.revenue - a.revenue);
  }, [filteredRevenue]);

<<<<<<< HEAD
  // Session Intelligence with Sorting
=======
  // Full sorted list (no slice here — slicing moved to render)
>>>>>>> 30358d859c78d0d1eb8c5cc4f280af5c0496d5d5
  const sessionIntelligence = useMemo(() => {
    if (!filteredRevenue.length) return [];
    let sessions = [...filteredRevenue]
      .map(item => {
        const brand = brands?.find(b => b.id === item.brand_id);
        const staff = team?.find(t => t.id === item.host_id);
        const totalRev = (item.revenue_shopee || 0) + (item.revenue_tiktok || 0);
        
        const hasShopee = (item.revenue_shopee || 0) > 0;
        const hasTiktok = (item.revenue_tiktok || 0) > 0;
        
        let platformType;
        if (hasShopee && hasTiktok) platformType = 'Multi';
        else if (hasShopee) platformType = 'Shopee';
        else if (hasTiktok) platformType = 'TikTok';
        else platformType = '—';
        
        return {
          ...item,
          brandName: brand?.brand_name || '—',
          staffName: staff?.name || '—',
          totalRevenue: totalRev,
          platform: platformType,
          parsedDate: parseRevenueDate(item.date)
        };
      });
    
    if (showRevenueOnly) {
      sessions = sessions.filter(item => item.totalRevenue > 0);
    }

<<<<<<< HEAD
    // Apply sorting
    sessions.sort((a, b) => {
      let aVal, bVal;
      switch (sortColumn) {
        case 'date':
          aVal = a.parsedDate ? new Date(a.parsedDate).getTime() : 0;
          bVal = b.parsedDate ? new Date(b.parsedDate).getTime() : 0;
          break;
        case 'revenue':
          aVal = a.totalRevenue;
          bVal = b.totalRevenue;
          break;
        case 'host':
          aVal = a.staffName.toLowerCase();
          bVal = b.staffName.toLowerCase();
          return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        default:
          aVal = a.parsedDate ? new Date(a.parsedDate).getTime() : 0;
          bVal = b.parsedDate ? new Date(b.parsedDate).getTime() : 0;
      }
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });
    
    return sessions;
  }, [filteredRevenue, brands, team, showRevenueOnly, sortColumn, sortDirection]);

  // Limit rows to show
  const visibleSessions = useMemo(() => {
    return rowsToShow === 999999 ? sessionIntelligence : sessionIntelligence.slice(0, rowsToShow);
  }, [sessionIntelligence, rowsToShow]);

  const getSortDisplayText = () => {
    if (sortColumn === 'date' && sortDirection === 'desc') return 'Date — newest first';
    if (sortColumn === 'date' && sortDirection === 'asc') return 'Date — oldest first';
    if (sortColumn === 'revenue' && sortDirection === 'desc') return '↓ Revenue — highest first';
    if (sortColumn === 'revenue' && sortDirection === 'asc') return '↑ Revenue — lowest first';
    if (sortColumn === 'host' && sortDirection === 'asc') return 'Host — A to Z';
    if (sortColumn === 'host' && sortDirection === 'desc') return 'Host — Z to A';
    return 'Sort By';
  };

  const getRowsDisplayText = () => {
    if (rowsToShow === 999999) return 'All rows';
    return `${rowsToShow} rows`;
  };

  const handleSortChange = (column, direction) => {
    setSortColumn(column);
    setSortDirection(direction);
  };

  const handleRowsChange = (rows) => {
    setRowsToShow(rows);
  };
=======
    sessions.sort((a, b) => {
      let aVal, bVal;
      if (sortCol === 'date') {
        aVal = a.parsedDate?.getTime() ?? 0;
        bVal = b.parsedDate?.getTime() ?? 0;
      } else if (sortCol === 'revenue') {
        aVal = a.totalRevenue;
        bVal = b.totalRevenue;
      } else if (sortCol === 'host') {
        return sortDir === 'asc'
          ? a.staffName.localeCompare(b.staffName)
          : b.staffName.localeCompare(a.staffName);
      }
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });
    
    return sessions;
  }, [filteredRevenue, brands, team, showRevenueOnly, sortCol, sortDir]);

  // Sliced based on rowLimit (null = show all)
  const visibleSessions = useMemo(() => {
    return rowLimit === null ? sessionIntelligence : sessionIntelligence.slice(0, rowLimit);
  }, [sessionIntelligence, rowLimit]);
>>>>>>> 30358d859c78d0d1eb8c5cc4f280af5c0496d5d5

  const handleDateRangeChange = (newRange) => {
    setDateRange(newRange);
    showNotification('Analytics data updated');
  };

  const handleExport = () => {
    showNotification('Report exported successfully');
  };

  // Sort options - simplified (removed brand and platform)
  const sortGroups = [
    {
      label: 'Revenue',
      options: [
        { label: 'Highest first', col: 'revenue', dir: 'desc' },
        { label: 'Lowest first',  col: 'revenue', dir: 'asc'  },
      ]
    },
    {
      label: 'Date',
      options: [
        { label: 'Newest first', col: 'date', dir: 'desc' },
        { label: 'Oldest first', col: 'date', dir: 'asc'  },
      ]
    },
    {
      label: 'Host',
      options: [
        { label: 'A → Z', col: 'host', dir: 'asc'  },
        { label: 'Z → A', col: 'host', dir: 'desc' },
      ]
    },
  ];

  // Row limit options
  const limitOptions = [5, 10, 25, 50, null];

  // Human-readable label for the active sort
  const activeSortLabel = (() => {
    for (const group of sortGroups) {
      const match = group.options.find(o => o.col === sortCol && o.dir === sortDir);
      if (match) return `${group.label}: ${match.label}`;
    }
    return 'Sort';
  })();

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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8 pb-16 relative"
    >
      {/* Notification Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 20, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-4 left-1/2 z-[100] bg-card backdrop-blur-xl text-foreground px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-border"
          >
            <div className="bg-emerald-500 rounded-full p-1">
              <CheckCircle2 size={16} className="text-white" />
            </div>
            <span className="text-sm font-bold tracking-tight">{notification}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="bg-card rounded-[2rem] p-8 border border-border">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-primary/10 rounded-lg">
                <TrendingUp size={14} className="text-primary" />
              </div>
              {/* Intel Label - text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground */}
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
                Financial Intelligence
              </span>
            </div>
            {/* Main Page Title - text-3xl font-bold tracking-tight */}
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Revenue Analytics
            </h1>
            <p className="text-muted-foreground mt-2 font-light text-xs">
              Real-time GTV tracking across all nodes.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3">
  </div>
            <button
              onClick={handleExport}
              className="inline-flex items-center justify-center gap-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-primary text-white hover:bg-primary/90 transition-all h-10 px-6 shadow-lg shadow-primary/20"
            >
              <Download size={14} />
              Export Report
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div whileHover={{ y: -4 }} className="bg-card rounded-3xl p-6 border border-border hover:border-primary/50 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-primary/10 rounded-xl">
              <DollarSign size={20} className="text-primary" />
            </div>
            {/* Growth Badge - text-[9px] font-bold uppercase tracking-wider */}
            <div className={`flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${kpis.revenueGrowth >= 0 ? 'text-emerald-500 bg-emerald-500/10' : 'text-red-500 bg-red-500/10'}`}>
              {kpis.revenueGrowth >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {Math.abs(kpis.revenueGrowth)}%
            </div>
          </div>
          {/* KPI Value - text-2xl font-mono font-bold */}
          <div className="text-2xl font-mono font-bold tracking-tighter text-foreground">Rp {kpis.totalRevenue.toLocaleString()}</div>
          {/* KPI Label - text-[10px] font-bold uppercase tracking-wider text-muted-foreground */}
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-1">Aggregate Revenue</div>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} className="bg-card rounded-3xl p-6 border border-border hover:border-primary/50 transition-all">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Activity size={20} className="text-primary" />
            </div>
          </div>
          <div className="text-2xl font-mono font-bold tracking-tighter text-foreground">{kpis.totalSessions.toLocaleString()}</div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-1">Total Sessions</div>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} className="bg-card rounded-3xl p-6 border border-border hover:border-primary/50 transition-all">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Target size={20} className="text-primary" />
            </div>
          </div>
          <div className="text-2xl font-mono font-bold tracking-tighter text-foreground">Rp {kpis.avgRevenue.toLocaleString()}</div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-1">Avg per Session</div>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} className="bg-card rounded-3xl p-6 border border-border hover:border-primary/50 transition-all">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/10 rounded-xl">
              <TrendingUp size={20} className="text-primary" />
            </div>
          </div>
          <div className="text-2xl font-mono font-bold tracking-tighter text-foreground">{kpis.topPlatform}</div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-1">Top Platform</div>
        </motion.div>
      </div>

      {/* Revenue Trend Chart */}
      <div className="bg-card rounded-[2.5rem] border border-border p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <BarChart3 size={18} className="text-primary" />
            {/* Module Header - text-xs font-bold uppercase tracking-widest */}
            <h3 className="text-xs font-bold uppercase tracking-widest text-foreground">Revenue Trend Analysis</h3>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-[10px] font-medium text-muted-foreground">Actual</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-[10px] font-medium text-muted-foreground">Predicted</span>
            </div>
          </div>
        </div>
        
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenueTrend}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.2} vertical={false} />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--muted-foreground)', fontWeight: 600 }} dy={8} interval={5} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--muted-foreground)', fontWeight: 600 }} tickFormatter={v => `Rp ${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--foreground)', backdropFilter: 'blur(10px)' }} formatter={(value) => [`Rp ${value.toLocaleString()}`, 'Revenue']} labelFormatter={(label) => `Date: ${label}`} />
              <Area type="monotone" dataKey="revenue" stroke="var(--primary)" strokeWidth={4} fill="url(#revenueGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Platform + Session Table Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Platform Distribution */}
        <div className="bg-card rounded-[2rem] border border-border overflow-hidden">
          <div className="p-6 border-b border-border">
            <div className="flex items-center gap-2">
              <PieChart size={16} className="text-primary" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-foreground">Platform Contribution</h3>
            </div>
          </div>
          <div className="p-6">
            {platformStats.length > 0 ? (
              <div className="space-y-5">
                {platformStats.map((p, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-bold text-foreground">{p.name}</span>
                      <span className="text-xs font-mono font-bold text-foreground">Rp {p.revenue.toLocaleString()}</span>
                    </div>
                    <div className="h-2 bg-border rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${p.pct}%` }} transition={{ duration: 0.8, delay: i * 0.1 }} className="h-full rounded-full" style={{ backgroundColor: p.color }} />
                    </div>
                    <div className="flex justify-end mt-1">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{p.pct}%</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <p className="text-xs font-light">No platform data available</p>
              </div>
            )}
          </div>
        </div>

<<<<<<< HEAD
        {/* Session Intelligence Table with Filter Dropdown */}
        <div className="lg:col-span-2 bg-card rounded-[2rem] border border-border overflow-hidden">
          <div className="p-6 border-b border-border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-primary" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-foreground">Session Intelligence</h3>
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                {/* Revenue Only Toggle - text-[9px] font-bold uppercase tracking-wider */}
                <button
                  onClick={() => setShowRevenueOnly(!showRevenueOnly)}
                  className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors px-3 py-1.5 rounded-lg border border-border hover:border-primary/40 bg-background"
                >
                  {showRevenueOnly ? 'Show All' : 'Revenue Only'}
                </button>

                {/* Filter Dropdown Button */}
                <div className="relative" ref={filterRef}>
                  <button
                    onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border text-[9px] font-bold uppercase tracking-wider text-muted-foreground hover:border-primary/40 hover:text-primary transition-all bg-background"
                  >
                    <Filter size={12} />
                    Filter by
                    <ChevronDown size={10} className={`transition-transform ${filterDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  <AnimatePresence>
                    {filterDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -5, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -5, scale: 0.95 }}
                        className="absolute right-0 top-full mt-2 z-50 w-56 bg-card border border-border rounded-xl shadow-xl overflow-hidden"
                      >
                        <div className="py-2 max-h-96 overflow-y-auto">
                          {/* Sort By Section */}
                          <div className="px-4 pt-2 pb-1">
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">Sort By</span>
                          </div>
                          
                          <button
                            onClick={() => { handleSortChange('date', 'desc'); setFilterDropdownOpen(false); }}
                            className={`w-full text-left px-4 py-2 text-[11px] font-medium transition-colors ${sortColumn === 'date' && sortDirection === 'desc' ? 'text-primary bg-primary/10' : 'text-foreground hover:bg-primary/5'}`}
                          >
                            Date — newest first {sortColumn === 'date' && sortDirection === 'desc' && <Check size={10} className="inline ml-2" />}
                          </button>
                          <button
                            onClick={() => { handleSortChange('date', 'asc'); setFilterDropdownOpen(false); }}
                            className={`w-full text-left px-4 py-2 text-[11px] font-medium transition-colors ${sortColumn === 'date' && sortDirection === 'asc' ? 'text-primary bg-primary/10' : 'text-foreground hover:bg-primary/5'}`}
                          >
                            Date — oldest first {sortColumn === 'date' && sortDirection === 'asc' && <Check size={10} className="inline ml-2" />}
                          </button>
                          <button
                            onClick={() => { handleSortChange('revenue', 'desc'); setFilterDropdownOpen(false); }}
                            className={`w-full text-left px-4 py-2 text-[11px] font-medium transition-colors ${sortColumn === 'revenue' && sortDirection === 'desc' ? 'text-primary bg-primary/10' : 'text-foreground hover:bg-primary/5'}`}
                          >
                            ↓ Revenue — highest first {sortColumn === 'revenue' && sortDirection === 'desc' && <Check size={10} className="inline ml-2" />}
                          </button>
                          <button
                            onClick={() => { handleSortChange('revenue', 'asc'); setFilterDropdownOpen(false); }}
                            className={`w-full text-left px-4 py-2 text-[11px] font-medium transition-colors ${sortColumn === 'revenue' && sortDirection === 'asc' ? 'text-primary bg-primary/10' : 'text-foreground hover:bg-primary/5'}`}
                          >
                            ↑ Revenue — lowest first {sortColumn === 'revenue' && sortDirection === 'asc' && <Check size={10} className="inline ml-2" />}
                          </button>
                          <button
                            onClick={() => { handleSortChange('host', 'asc'); setFilterDropdownOpen(false); }}
                            className={`w-full text-left px-4 py-2 text-[11px] font-medium transition-colors ${sortColumn === 'host' && sortDirection === 'asc' ? 'text-primary bg-primary/10' : 'text-foreground hover:bg-primary/5'}`}
                          >
                            Host — A to Z {sortColumn === 'host' && sortDirection === 'asc' && <Check size={10} className="inline ml-2" />}
                          </button>

                          {/* Divider */}
                          <div className="h-px bg-border my-2" />

                          {/* Rows per Page Section */}
                          <div className="px-4 pt-2 pb-1">
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">Rows per Page</span>
                          </div>
                          
                          <button
                            onClick={() => { handleRowsChange(5); setFilterDropdownOpen(false); }}
                            className={`w-full text-left px-4 py-2 text-[11px] font-medium transition-colors ${rowsToShow === 5 ? 'text-primary bg-primary/10' : 'text-foreground hover:bg-primary/5'}`}
                          >
                            5 rows {rowsToShow === 5 && <Check size={10} className="inline ml-2" />}
                          </button>
                          <button
                            onClick={() => { handleRowsChange(10); setFilterDropdownOpen(false); }}
                            className={`w-full text-left px-4 py-2 text-[11px] font-medium transition-colors ${rowsToShow === 10 ? 'text-primary bg-primary/10' : 'text-foreground hover:bg-primary/5'}`}
                          >
                            10 rows {rowsToShow === 10 && <Check size={10} className="inline ml-2" />}
                          </button>
                          <button
                            onClick={() => { handleRowsChange(20); setFilterDropdownOpen(false); }}
                            className={`w-full text-left px-4 py-2 text-[11px] font-medium transition-colors ${rowsToShow === 20 ? 'text-primary bg-primary/10' : 'text-foreground hover:bg-primary/5'}`}
                          >
                            20 rows {rowsToShow === 20 && <Check size={10} className="inline ml-2" />}
                          </button>
                          <button
                            onClick={() => { handleRowsChange(30); setFilterDropdownOpen(false); }}
                            className={`w-full text-left px-4 py-2 text-[11px] font-medium transition-colors ${rowsToShow === 30 ? 'text-primary bg-primary/10' : 'text-foreground hover:bg-primary/5'}`}
                          >
                            30 rows {rowsToShow === 30 && <Check size={10} className="inline ml-2" />}
                          </button>
                          <button
                            onClick={() => { handleRowsChange(40); setFilterDropdownOpen(false); }}
                            className={`w-full text-left px-4 py-2 text-[11px] font-medium transition-colors ${rowsToShow === 40 ? 'text-primary bg-primary/10' : 'text-foreground hover:bg-primary/5'}`}
                          >
                            40 rows {rowsToShow === 40 && <Check size={10} className="inline ml-2" />}
                          </button>
                          <button
                            onClick={() => { handleRowsChange(50); setFilterDropdownOpen(false); }}
                            className={`w-full text-left px-4 py-2 text-[11px] font-medium transition-colors ${rowsToShow === 50 ? 'text-primary bg-primary/10' : 'text-foreground hover:bg-primary/5'}`}
                          >
                            50 rows {rowsToShow === 50 && <Check size={10} className="inline ml-2" />}
                          </button>
                          <button
                            onClick={() => { handleRowsChange(60); setFilterDropdownOpen(false); }}
                            className={`w-full text-left px-4 py-2 text-[11px] font-medium transition-colors ${rowsToShow === 60 ? 'text-primary bg-primary/10' : 'text-foreground hover:bg-primary/5'}`}
                          >
                            60 rows {rowsToShow === 60 && <Check size={10} className="inline ml-2" />}
                          </button>
                          <button
                            onClick={() => { handleRowsChange(70); setFilterDropdownOpen(false); }}
                            className={`w-full text-left px-4 py-2 text-[11px] font-medium transition-colors ${rowsToShow === 70 ? 'text-primary bg-primary/10' : 'text-foreground hover:bg-primary/5'}`}
                          >
                            70 rows {rowsToShow === 70 && <Check size={10} className="inline ml-2" />}
                          </button>
                          <button
                            onClick={() => { handleRowsChange(80); setFilterDropdownOpen(false); }}
                            className={`w-full text-left px-4 py-2 text-[11px] font-medium transition-colors ${rowsToShow === 80 ? 'text-primary bg-primary/10' : 'text-foreground hover:bg-primary/5'}`}
                          >
                            80 rows {rowsToShow === 80 && <Check size={10} className="inline ml-2" />}
                          </button>
                          <button
                            onClick={() => { handleRowsChange(90); setFilterDropdownOpen(false); }}
                            className={`w-full text-left px-4 py-2 text-[11px] font-medium transition-colors ${rowsToShow === 90 ? 'text-primary bg-primary/10' : 'text-foreground hover:bg-primary/5'}`}
                          >
                            90 rows {rowsToShow === 90 && <Check size={10} className="inline ml-2" />}
                          </button>
                          <button
                            onClick={() => { handleRowsChange(100); setFilterDropdownOpen(false); }}
                            className={`w-full text-left px-4 py-2 text-[11px] font-medium transition-colors ${rowsToShow === 100 ? 'text-primary bg-primary/10' : 'text-foreground hover:bg-primary/5'}`}
                          >
                            100 rows {rowsToShow === 100 && <Check size={10} className="inline ml-2" />}
                          </button>
                          <button
                            onClick={() => { handleRowsChange(999999); setFilterDropdownOpen(false); }}
                            className={`w-full text-left px-4 py-2 text-[11px] font-medium transition-colors ${rowsToShow === 999999 ? 'text-primary bg-primary/10' : 'text-foreground hover:bg-primary/5'}`}
                          >
                            All rows {rowsToShow === 999999 && <Check size={10} className="inline ml-2" />}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                <span className="text-[9px] font-medium text-muted-foreground">
                  {visibleSessions.length} of {sessionIntelligence.length} sessions
                </span>
              </div>
=======
        {/* Session Intelligence Table */}
        <div className="lg:col-span-2 bg-card rounded-[2rem] border border-border overflow-hidden">
          
          <div className="p-6 border-b border-border flex items-center justify-between gap-4">
            {/* Left: title + session count */}
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-primary" />
              <h3 className="text-xs font-black uppercase tracking-widest text-foreground">Session Intelligence</h3>
              <span className="ml-1 text-[9px] font-bold text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-full">
                {visibleSessions.length}/{sessionIntelligence.length}
              </span>
>>>>>>> 30358d859c78d0d1eb8c5cc4f280af5c0496d5d5
            </div>

            {/* Right: controls */}
            <div className="flex items-center gap-2">
              {/* Show all toggle */}
              <button
                onClick={() => setShowRevenueOnly(!showRevenueOnly)}
                className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors px-3 py-1.5 rounded-lg border border-border hover:border-primary/40 bg-background"
              >
                {showRevenueOnly ? 'Show All' : 'Revenue Only'}
              </button>

              {/* Row limit dropdown */}
              <div className="relative" ref={limitRef}>
                <button
                  onClick={() => { setLimitOpen(prev => !prev); setSortOpen(false); }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-wider transition-all ${
                    limitOpen
                      ? 'bg-primary text-white border-primary'
                      : 'bg-background border-border text-muted-foreground hover:border-primary/40 hover:text-primary'
                  }`}
                >
                  Show {rowLimit === null ? 'All' : rowLimit}
                  <ChevronDown
                    size={10}
                    className={`transition-transform duration-200 ${limitOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                <AnimatePresence>
                  {limitOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 z-50 w-36 bg-card border border-border rounded-2xl shadow-xl overflow-hidden"
                    >
                      <div className="px-4 pt-3 pb-1">
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                          Rows per view
                        </span>
                      </div>
                      {limitOptions.map((opt, i) => {
                        const isActive = rowLimit === opt;
                        return (
                          <button
                            key={i}
                            onClick={() => { setRowLimit(opt); setLimitOpen(false); }}
                            className={`w-full flex items-center justify-between px-4 py-2 text-left text-xs font-medium transition-colors ${
                              isActive
                                ? 'text-primary bg-primary/8'
                                : 'text-foreground hover:bg-muted/10'
                            }`}
                          >
                            <span>{opt === null ? 'All' : `Top ${opt}`}</span>
                            {isActive && <Check size={11} className="text-primary shrink-0" />}
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Sort dropdown */}
              <div className="relative" ref={sortRef}>
                <button
                  onClick={() => { setSortOpen(prev => !prev); setLimitOpen(false); }}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-wider transition-all ${
                    sortOpen
                      ? 'bg-primary text-white border-primary'
                      : 'bg-background border-border text-muted-foreground hover:border-primary/40 hover:text-primary'
                  }`}
                >
                  <Filter size={10} />
                  Sort by
                  <ChevronDown
                    size={10}
                    className={`transition-transform duration-200 ${sortOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                <AnimatePresence>
                  {sortOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 z-50 w-52 bg-card border border-border rounded-2xl shadow-xl overflow-hidden"
                    >
                      {sortGroups.map((group, gi) => (
                        <div key={gi}>
                          <div className="px-4 pt-3 pb-1">
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                              {group.label}
                            </span>
                          </div>
                          {group.options.map((opt, oi) => {
                            const isActive = sortCol === opt.col && sortDir === opt.dir;
                            return (
                              <button
                                key={oi}
                                onClick={() => {
                                  setSortCol(opt.col);
                                  setSortDir(opt.dir);
                                  setSortOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-4 py-2 text-left text-xs font-medium transition-colors ${
                                  isActive
                                    ? 'text-primary bg-primary/8'
                                    : 'text-foreground hover:bg-muted/10'
                                }`}
                              >
                                <span>{opt.label}</span>
                                {isActive && (
                                  <Check size={11} className="text-primary shrink-0" />
                                )}
                              </button>
                            );
                          })}
                          {gi < sortGroups.length - 1 && (
                            <div className="mx-4 my-1 border-t border-border" />
                          )}
                        </div>
                      ))}

                      <div className="px-4 py-3 border-t border-border bg-muted/5">
                        <p className="text-[9px] text-muted-foreground font-medium">
                          Active: <span className="text-foreground font-bold">{activeSortLabel}</span>
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            {visibleSessions.length > 0 ? (
<<<<<<< HEAD
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {/* Table Headers - text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground opacity-60 */}
                    <th className="text-left py-4 px-4 text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground opacity-60">Date</th>
                    <th className="text-left py-4 px-4 text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground opacity-60">Brand</th>
                    <th className="text-left py-4 px-4 text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground opacity-60">Platform</th>
                    <th className="text-left py-4 px-4 text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground opacity-60">Host</th>
                    <th className="text-right py-4 px-4 text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground opacity-60">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleSessions.map((item, idx) => {
                    const platformInfo = platformStats.find(p => p.name === item.platform);
                    const badgeColor = platformInfo?.color || 'var(--primary)';
                    
                    return (
                      <motion.tr 
                        key={item.id || idx} 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.02 }}
                        className="border-b border-border hover:bg-muted/5 transition-colors"
                      >
                        <td className="py-3 px-4 text-xs font-mono text-foreground">
                          {(() => {
                            const parsed = parseRevenueDate(item.date);
                            return parsed ? format(parsed, 'MMM dd') : item.date;
                          })()}
                        </td>
                        {/* Brand Name - font-bold text-base tracking-tight */}
                        <td className="py-3 px-4 font-bold text-base tracking-tight text-foreground">{item.brandName}</td>
                        <td className="py-3 px-4">
                          {/* Platform Badge - text-[9px] font-bold uppercase tracking-wider */}
                          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full" style={{ backgroundColor: `${badgeColor}20`, color: badgeColor }}>
                            {item.platform}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground font-medium">{item.staffName}</td>
                        {/* Revenue Value - text-lg font-bold font-mono tracking-tighter */}
                        <td className="py-3 px-4 text-right text-lg font-bold font-mono tracking-tighter text-foreground">
                          {item.totalRevenue > 0 ? `Rp ${item.totalRevenue.toLocaleString()}` : '—'}
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
=======
              <>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-4 px-4 text-[9px] font-black uppercase tracking-wider text-muted-foreground">Date</th>
                      <th className="text-left py-4 px-4 text-[9px] font-black uppercase tracking-wider text-muted-foreground">Brand</th>
                      <th className="text-left py-4 px-4 text-[9px] font-black uppercase tracking-wider text-muted-foreground">Platform</th>
                      <th className="text-left py-4 px-4 text-[9px] font-black uppercase tracking-wider text-muted-foreground">Host</th>
                      <th className="text-right py-4 px-4 text-[9px] font-black uppercase tracking-wider text-muted-foreground">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleSessions.map((item, idx) => {
                      const platformInfo = platformStats.find(p => p.name === item.platform);
                      const badgeColor = platformInfo?.color || 'var(--primary)';
                      
                      return (
                        <tr key={item.id || idx} className="border-b border-border hover:bg-muted/5 transition-colors">
                          <td className="py-3 px-4 text-xs font-mono text-foreground">
                            {(() => {
                              const parsed = parseRevenueDate(item.date);
                              return parsed ? format(parsed, 'MMM dd') : item.date;
                            })()}
                          </td>
                          <td className="py-3 px-4 font-bold text-sm text-foreground">{item.brandName}</td>
                          <td className="py-3 px-4">
                            <span className="text-[9px] font-black px-2 py-1 rounded-full uppercase" style={{ backgroundColor: `${badgeColor}20`, color: badgeColor }}>
                              {item.platform}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-xs text-muted-foreground">{item.staffName}</td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-sm text-foreground">
                            {item.totalRevenue > 0 ? `Rp ${item.totalRevenue.toLocaleString()}` : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Footer: showing X of Y */}
                {rowLimit !== null && sessionIntelligence.length > rowLimit && (
                  <div className="px-6 py-3 border-t border-border bg-muted/5 flex items-center justify-between">
                    <p className="text-[9px] text-muted-foreground font-medium">
                      Showing <span className="text-foreground font-bold">{visibleSessions.length}</span> of <span className="text-foreground font-bold">{sessionIntelligence.length}</span> sessions
                    </p>
                    <button
                      onClick={() => setRowLimit(null)}
                      className="text-[9px] font-bold uppercase tracking-wider text-primary hover:text-primary/70 transition-colors"
                    >
                      View all →
                    </button>
                  </div>
                )}
              </>
>>>>>>> 30358d859c78d0d1eb8c5cc4f280af5c0496d5d5
            ) : (
              <div className="text-center py-12">
                <p className="text-xs font-light text-muted-foreground">No sessions found for selected period</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Status - text-[9px] font-bold uppercase tracking-[0.3em] */}
      <div className="pt-8 border-t border-border">
        <p className="text-[9px] text-center text-muted-foreground uppercase tracking-[0.3em] font-bold">
          VidHelp Intelligence Hub • Real-time Analytics • {format(dateRange.start, 'MMM dd')} - {format(dateRange.end, 'MMM dd, yyyy')}
        </p>
      </div>
    </motion.div>
  );
};

export default Revenue;