// frontend/src/pages/admin/Revenue.jsx
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, DollarSign, Activity, Download,
  CheckCircle2, Calendar, Users, Target, BarChart3,
  ArrowUpRight, ArrowDownRight, Minus, ChevronDown, Check, Filter
} from 'lucide-react';
import {
  CartesianGrid, XAxis, YAxis, Tooltip,
  ResponsiveContainer, AreaChart, Area
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

  // 🎯 FIXED: Platform stats that SHOWS ALL 3 PLATFORMS
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
    
    console.log('📊 Platform Revenue Breakdown:');
    console.log(`  Shopee Only: Rp ${shopeeOnlyRev.toLocaleString()} (${(shopeeOnlyRev/total*100).toFixed(1)}%)`);
    console.log(`  TikTok Only: Rp ${tiktokOnlyRev.toLocaleString()} (${(tiktokOnlyRev/total*100).toFixed(1)}%)`);
    console.log(`  Multi: Rp ${multiRev.toLocaleString()} (${(multiRev/total*100).toFixed(1)}%)`);
    
    const stats = [];
    
    if (shopeeOnlyRev > 0) {
      stats.push({ 
        name: 'Shopee', 
        revenue: shopeeOnlyRev, 
        pct: (shopeeOnlyRev / total * 100).toFixed(1),
        color: 'bg-cyan-400',
        badgeColor: 'bg-cyan-100 text-cyan-600'
      });
    }
    
    if (tiktokOnlyRev > 0) {
      stats.push({ 
        name: 'TikTok', 
        revenue: tiktokOnlyRev, 
        pct: (tiktokOnlyRev / total * 100).toFixed(1),
        color: 'bg-black',
        badgeColor: 'bg-black/5 text-black'
      });
    }
    
    if (multiRev > 0) {
      stats.push({ 
        name: 'Multi', 
        revenue: multiRev, 
        pct: (multiRev / total * 100).toFixed(1),
        color: 'bg-red-500',
        badgeColor: 'bg-red-100 text-red-600'
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
        
        // Determine platform type by revenue pattern
        const hasShopee = (item.revenue_shopee || 0) > 0;
        const hasTiktok = (item.revenue_tiktok || 0) > 0;
        
        let platformType;
        if (hasShopee && hasTiktok) platformType = 'Multi';
        else if (hasShopee) platformType = 'Shopee';
        else if (hasTiktok) platformType = 'TikTok';
        else platformType = '—'; // No revenue
        
        return {
          ...item,
          brandName: brand?.brand_name || '—',
          staffName: staff?.name || '—',
          totalRevenue: totalRev,
          platform: platformType
        };
      });
    
    // 🎯 Filter based on toggle
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
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="w-11 h-11 border-3 border-gray-200 border-t-black rounded-full animate-spin" />
        <p className="text-gray-500 text-sm font-medium">Loading revenue data...</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-16 relative"
    >
      {/* Notification Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 20, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-4 left-1/2 z-[100] bg-black text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/10"
          >
            <div className="bg-emerald-500 rounded-full p-1">
              <CheckCircle2 size={16} />
            </div>
            <span className="text-sm font-bold tracking-tight">{notification}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Revenue Analytics</h1>
          <p className="text-muted-foreground mt-1">Track performance across platforms and sessions</p>
        </div>
        <div className="flex items-center gap-3">
                  
          <DateRangeSelector value={dateRange} onChange={handleDateRangeChange} />
          <button
            onClick={handleExport}
            className="inline-flex items-center justify-center gap-2 rounded-xl text-sm font-bold bg-black text-white shadow-lg hover:bg-black/80 h-10 px-6"
          >
            <Download size={16} />
            Export Report
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="dashboard-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-50 rounded-lg">
              <DollarSign size={20} className="text-blue-600" />
            </div>
            <div className={`flex items-center gap-1 text-xs font-bold ${kpis.revenueGrowth >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50'} px-2 py-1 rounded-full`}>
              {kpis.revenueGrowth >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {Math.abs(kpis.revenueGrowth)}%
            </div>
          </div>
          <div className="text-2xl font-bold mb-1">Rp {kpis.totalRevenue.toLocaleString()}</div>
          <div className="text-sm text-muted-foreground">Total Revenue</div>
        </div>

        <div className="dashboard-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Activity size={20} className="text-purple-600" />
            </div>
          </div>
          <div className="text-2xl font-bold mb-1">{kpis.totalSessions.toLocaleString()}</div>
          <div className="text-sm text-muted-foreground">Total Sessions</div>
        </div>

        <div className="dashboard-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-green-50 rounded-lg">
              <Target size={20} className="text-green-600" />
            </div>
          </div>
          <div className="text-2xl font-bold mb-1">Rp {kpis.avgRevenue.toLocaleString()}</div>
          <div className="text-sm text-muted-foreground">Avg per Session</div>
        </div>

        <div className="dashboard-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-red-50 rounded-lg">
              <TrendingUp size={20} className="text-red-600" />
            </div>
          </div>
          <div className="text-2xl font-bold mb-1">{kpis.topPlatform}</div>
          <div className="text-sm text-muted-foreground">Top Platform</div>
        </div>
      </div>

      {/* Revenue Trend Chart */}
      <div style={{ 
        background: 'white', 
        borderRadius: '16px', 
        border: '1px solid #e4e1db',
        overflow: 'hidden',
        width: '100%',
        marginBottom: '24px'
      }}>
        <div style={{ 
          padding: '16px 20px', 
          borderBottom: '1px solid #e4e1db',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <BarChart3 size={20} color="#1a1a1a" />
            <h3 style={{ fontSize: '14px', fontWeight: 'bold', margin: 0 }}>Revenue Trend Analysis</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#1a1a1a' }} />
              <span style={{ fontSize: '10px', fontWeight: '500' }}>Actual Revenue</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }} />
              <span style={{ fontSize: '10px', fontWeight: '500' }}>Forecast</span>
            </div>
          </div>
        </div>
        
        <div style={{ height: '400px', width: '100%', padding: '16px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenueTrend}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1a1a1a" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#1a1a1a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 11, fill: '#7b809a' }} 
                dy={8}
                interval={5}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 11, fill: '#7b809a' }} 
                tickFormatter={v => `Rp ${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: '1px solid #e4e1db', fontSize: '12px' }}
                formatter={(value) => [`Rp ${value.toLocaleString()}`, '']}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Area type="monotone" dataKey="revenue" stroke="#1a1a1a" strokeWidth={2.5} fill="url(#revenueGradient)" />
              <Area type="monotone" dataKey="forecast" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" fill="transparent" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Platform + Session Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Platform Distribution */}
        <div className="dashboard-card overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="text-lg font-bold">Platform Revenue</h3>
          </div>
          <div className="p-6 space-y-4">
            {platformStats.length > 0 ? platformStats.map((p, i) => (
              <div key={i}>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-semibold">{p.name}</span>
                  <span className="text-sm font-semibold">Rp {p.revenue.toLocaleString()}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${p.pct}%` }}
                    transition={{ duration: 0.8 }}
                    className={`h-full rounded-full ${p.color}`}
                  />
                </div>
                <div className="text-right text-xs text-muted-foreground mt-1">{p.pct}%</div>
              </div>
            )) : (
              <div className="text-center text-muted-foreground py-8">No platform data</div>
            )}
          </div>
        </div>

        {/* Session Intelligence Table */}
        <div id="session-intelligence" className="lg:col-span-2 dashboard-card overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h3 className="text-lg font-bold">Session Intelligence</h3>
            <span className="text-xs text-muted-foreground">
              {showRevenueOnly ? 'Showing sessions with revenue' : 'Showing all sessions'}
            </span>
          </div>
          <div className="overflow-x-auto">
            {sessionIntelligence.length > 0 ? (
              <table className="dashboard-table w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Date</th>
                    <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Brand</th>
                    <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Platform</th>
                    <th className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Host</th>
                    <th className="text-right py-3 px-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {sessionIntelligence.map((item) => {
                    const platformInfo = platformStats.find(p => p.name === item.platform);
                    const badgeColor = platformInfo?.badgeColor || 'bg-gray-100 text-gray-600';
                    
                    return (
                      <tr key={item.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 text-sm">
                          {(() => {
                            const parsed = parseRevenueDate(item.date);
                            return parsed ? format(parsed, 'MMM dd') : item.date;
                          })()}
                        </td>
                        <td className="py-3 px-4 font-semibold">{item.brandName}</td>
                        <td className="py-3 px-4">
                          <span className={`text-xs font-bold px-2 py-1 rounded-full uppercase ${badgeColor}`}>
                            {item.platform}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">{item.staffName}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold">
                          {item.totalRevenue > 0 ? `Rp ${item.totalRevenue.toLocaleString()}` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-12 text-muted-foreground">No sessions found for selected period</div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Revenue;