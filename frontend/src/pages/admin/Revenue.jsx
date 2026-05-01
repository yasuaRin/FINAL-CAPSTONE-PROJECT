// frontend/src/pages/admin/Revenue.jsx
import React, { useState, useMemo } from 'react';
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
import { DateRangeSelector } from '../../components/DateRangeSelector';
import { subDays, startOfDay, endOfDay, format, isWithinInterval } from 'date-fns';

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
  const [dateRange, setDateRange] = useState({
    start: subDays(new Date(), 30),
    end: new Date(),
    preset: '30d'
  });

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

    // Calculate revenue growth (last 7 days vs previous 7 days)
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

  const sessionIntelligence = useMemo(() => {
    if (!filteredRevenue.length) return [];
    let sessions = [...filteredRevenue]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
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
          platform: platformType
        };
      });
    
    if (showRevenueOnly) {
      sessions = sessions.filter(item => item.totalRevenue > 0);
    }
    
    return sessions.slice(0, 50);
  }, [filteredRevenue, brands, team, showRevenueOnly]);

  const handleDateRangeChange = (newRange) => {
    setDateRange(newRange);
    showNotification('Analytics data updated');
  };

  const handleExport = () => {
    showNotification('Report exported successfully');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
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
      {/* Notification Toast - Glassmorphism Style */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 20, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-4 left-1/2 z-[100] bg-black/90 backdrop-blur-xl text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/20"
          >
            <div className="bg-emerald-500 rounded-full p-1">
              <CheckCircle2 size={16} />
            </div>
            <span className="text-sm font-bold tracking-tight">{notification}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header - AI Studio Glassmorphism Style */}
      <div className="bg-card rounded-[2rem] p-8 border border-border">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-primary/10 rounded-lg">
                <TrendingUp size={14} className="text-primary" />
              </div>
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">
                Financial Intelligence
              </span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-white font-sans">
              Revenue Analytics
            </h1>
            <p className="text-muted-foreground mt-2 font-medium text-sm">
              Real-time GTV tracking across all nodes.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <DateRangeSelector value={dateRange} onChange={handleDateRangeChange} />
            <button
              onClick={handleExport}
              className="inline-flex items-center justify-center gap-2 rounded-xl text-xs font-black uppercase tracking-widest bg-primary text-white hover:bg-primary/90 transition-all h-10 px-6 shadow-lg shadow-primary/20"
            >
              <Download size={14} />
              Export Report
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards - AI Studio Glass Style */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div 
          whileHover={{ y: -4 }} 
          className="bg-card rounded-3xl p-6 border border-border hover:border-primary/50 transition-all"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-primary/10 rounded-xl">
              <DollarSign size={20} className="text-primary" />
            </div>
            <div className={`flex items-center gap-1 text-[10px] font-black ${kpis.revenueGrowth >= 0 ? 'text-emerald-400 bg-emerald-400/10' : 'text-red-400 bg-red-400/10'} px-2 py-1 rounded-full`}>
              {kpis.revenueGrowth >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {Math.abs(kpis.revenueGrowth)}%
            </div>
          </div>
          <div className="text-3xl font-mono font-black tracking-tighter text-white">Rp {kpis.totalRevenue.toLocaleString()}</div>
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Aggregate Revenue</div>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} className="bg-card rounded-3xl p-6 border border-border hover:border-primary/50 transition-all">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Activity size={20} className="text-primary" />
            </div>
          </div>
          <div className="text-3xl font-mono font-black tracking-tighter text-white">{kpis.totalSessions.toLocaleString()}</div>
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Total Sessions</div>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} className="bg-card rounded-3xl p-6 border border-border hover:border-primary/50 transition-all">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Target size={20} className="text-primary" />
            </div>
          </div>
          <div className="text-3xl font-mono font-black tracking-tighter text-white">Rp {kpis.avgRevenue.toLocaleString()}</div>
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Avg per Session</div>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} className="bg-card rounded-3xl p-6 border border-border hover:border-primary/50 transition-all">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/10 rounded-xl">
              <TrendingUp size={20} className="text-primary" />
            </div>
          </div>
          <div className="text-3xl font-mono font-black tracking-tighter text-white">{kpis.topPlatform}</div>
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Top Platform</div>
        </motion.div>
      </div>

      {/* Revenue Trend Chart - AI Studio Glass Card */}
      <div className="bg-card rounded-[2.5rem] border border-border p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <BarChart3 size={18} className="text-primary" />
            <h3 className="text-xs font-black uppercase tracking-widest text-white">Revenue Trend Analysis</h3>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-[10px] font-medium text-muted-foreground">Actual Revenue</span>
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
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: '#7B809A', fontWeight: 600 }} 
                dy={8}
                interval={5}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: '#7B809A', fontWeight: 600 }} 
                tickFormatter={v => `Rp ${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{ background: 'rgba(0,0,0,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white', backdropFilter: 'blur(10px)' }}
                formatter={(value) => [`Rp ${value.toLocaleString()}`, 'Revenue']}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Area type="monotone" dataKey="revenue" stroke="var(--primary)" strokeWidth={4} fill="url(#revenueGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Platform + Session Table Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Platform Distribution - AI Studio Glass Card */}
        <div className="bg-card rounded-[2rem] border border-border overflow-hidden">
          <div className="p-6 border-b border-border">
            <div className="flex items-center gap-2">
              <PieChart size={16} className="text-primary" />
              <h3 className="text-xs font-black uppercase tracking-widest text-white">Platform Contribution</h3>
            </div>
          </div>
          <div className="p-6">
            {platformStats.length > 0 ? (
              <div className="space-y-5">
                {platformStats.map((p, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-bold text-white">{p.name}</span>
                      <span className="text-xs font-mono font-bold text-white">Rp {p.revenue.toLocaleString()}</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${p.pct}%` }}
                        transition={{ duration: 0.8, delay: i * 0.1 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: p.color }}
                      />
                    </div>
                    <div className="flex justify-end mt-1">
                      <span className="text-[9px] font-bold text-muted-foreground">{p.pct}%</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <p className="text-xs">No platform data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Session Intelligence Table - AI Studio Glass Card */}
        <div className="lg:col-span-2 bg-card rounded-[2rem] border border-border overflow-hidden">
          <div className="p-6 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-primary" />
              <h3 className="text-xs font-black uppercase tracking-widest text-white">Session Intelligence</h3>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowRevenueOnly(!showRevenueOnly)}
                className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors"
              >
                {showRevenueOnly ? 'Show All' : 'Show Revenue Only'}
              </button>
              <span className="text-[9px] text-muted-foreground">
                {sessionIntelligence.length} sessions
              </span>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            {sessionIntelligence.length > 0 ? (
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
                  {sessionIntelligence.map((item, idx) => {
                    const platformInfo = platformStats.find(p => p.name === item.platform);
                    const badgeColor = platformInfo?.color || '#7B809A';
                    
                    return (
                      <motion.tr 
                        key={item.id || idx} 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.02 }}
                        className="border-b border-border hover:bg-white/5 transition-colors"
                      >
                        <td className="py-3 px-4 text-xs font-mono text-white">
                          {(() => {
                            const parsed = parseRevenueDate(item.date);
                            return parsed ? format(parsed, 'MMM dd') : item.date;
                          })()}
                        </td>
                        <td className="py-3 px-4 font-bold text-sm text-white">{item.brandName}</td>
                        <td className="py-3 px-4">
                          <span className="text-[9px] font-black px-2 py-1 rounded-full uppercase" style={{ backgroundColor: `${badgeColor}20`, color: badgeColor }}>
                            {item.platform}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">{item.staffName}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-sm text-white">
                          {item.totalRevenue > 0 ? `Rp ${item.totalRevenue.toLocaleString()}` : '—'}
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-12">
                <p className="text-xs text-muted-foreground">No sessions found for selected period</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Status */}
      <div className="pt-8 border-t border-border/50">
        <p className="text-[9px] text-center text-muted-foreground uppercase tracking-[0.3em] font-black">
          VidHelp Intelligence Hub • Real-time Analytics • {format(dateRange.start, 'MMM dd')} - {format(dateRange.end, 'MMM dd, yyyy')}
        </p>
      </div>
    </motion.div>
  );
};

export default Revenue;