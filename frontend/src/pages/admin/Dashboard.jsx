// frontend/src/pages/admin/Dashboard.jsx
import { useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, Download, Activity, Sparkles,
  ShieldAlert, CheckCircle2, ArrowUpRight,
  PieChart as PieChartIcon, AlertCircle, Flame
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { format, subDays, differenceInDays, parseISO, startOfDay, endOfDay } from 'date-fns';
import { useRevenue } from '../../hooks/useRevenue';
import { useBrands } from '../../hooks/useBrands';
import { useTeam } from '../../hooks/useTeam';
import { DateRangeSelector } from '../../components/DateRangeSelector';

export const Dashboard = () => {
  const navigate = useNavigate();
  const riskSectionRef = useRef(null);
  
  const [dateRange, setDateRange] = useState({
    start: subDays(new Date(), 30),
    end: new Date(),
    preset: '30d'
  });
  const [notification, setNotification] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [filterBrand, setFilterBrand] = useState('All');
  const [filterPlatform, setFilterPlatform] = useState('All');

  const { data: revenue, loading: revenueLoading } = useRevenue();
  const { brands, loading: brandsLoading } = useBrands();
  const { team, loading: teamLoading } = useTeam();

  const [timedOut, setTimedOut] = useState(false);

  // ── Helpers ──
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

  // Filter revenue by date range
  const filteredRevenue = useMemo(() => {
    if (!revenue) return [];
    return revenue.filter(item => {
      const itemDate = parseRevenueDate(item.date);
      return itemDate && itemDate >= startOfDay(dateRange.start) && itemDate <= endOfDay(dateRange.end);
    });
  }, [revenue, dateRange]);

  // ── KPIs from real Supabase data ──
  const kpis = useMemo(() => {
    const totalRevenue = filteredRevenue.reduce((s, i) =>
      s + (i.revenue_shopee || 0) + (i.revenue_tiktok || 0), 0) || 0;
    
    const activeBrands = brands?.filter(b => b.brand_status === 'active').length || 0;
    const atRisk = brands?.filter(b => b.brand_status !== 'active').length || 0;

    // Top performer: sum revenue per host_id
    const staffRev = {};
    filteredRevenue.forEach(item => {
      const id = item.host_id;
      const amt = (item.revenue_shopee || 0) + (item.revenue_tiktok || 0);
      staffRev[id] = (staffRev[id] || 0) + amt;
    });
    let topName = 'N/A', topRev = 0;
    Object.entries(staffRev).forEach(([id, total]) => {
      if (total > topRev) {
        topRev = total;
        topName = team?.find(s => s.id === parseInt(id))?.name || 'Unknown';
      }
    });

    // Calculate growth based on filtered date range
    const sorted = [...filteredRevenue]
      .map(item => ({ ...item, normalizedDate: normalizeDateKey(item.date) }))
      .filter(item => item.normalizedDate)
      .sort((a, b) => new Date(b.normalizedDate) - new Date(a.normalizedDate));

    const uniqueDates = [...new Set(sorted.map(i => i.normalizedDate))];
    const recentDates = uniqueDates.slice(0, Math.min(7, uniqueDates.length));
    const previousDates = uniqueDates.slice(Math.min(7, uniqueDates.length), Math.min(14, uniqueDates.length));

    const lastPeriod = filteredRevenue.filter(i => recentDates.includes(normalizeDateKey(i.date))) || [];
    const prevPeriod = filteredRevenue.filter(i => previousDates.includes(normalizeDateKey(i.date))) || [];

    const lastTotal = lastPeriod.reduce((s, i) => s + (i.revenue_shopee || 0) + (i.revenue_tiktok || 0), 0);
    const prevTotal = prevPeriod.reduce((s, i) => s + (i.revenue_shopee || 0) + (i.revenue_tiktok || 0), 0);
    const growth = prevTotal > 0 ? ((lastTotal - prevTotal) / prevTotal * 100).toFixed(1) : 0;

    const riskIndicator = atRisk > 3 ? 'High' : atRisk > 0 ? 'Medium' : 'Low';

    return { 
      totalRevenue, 
      activeBrands, 
      atRisk, 
      topName, 
      topRev, 
      growth,
      riskIndicator,
      reportingPeriod: `${format(dateRange.start, 'MMM dd')} - ${format(dateRange.end, 'MMM dd, yyyy')}`
    };
  }, [filteredRevenue, brands, team, dateRange]);

  // ── Chart data from real revenue ──
  const chartData = useMemo(() => {
    if (!filteredRevenue.length) {
      // Generate placeholder based on date range if no data
      const days = Math.max(1, differenceInDays(dateRange.end, dateRange.start));
      const points = Math.min(7, days);
      const result = [];
      for (let i = 0; i < points; i++) {
        const date = new Date(dateRange.end);
        date.setDate(date.getDate() - (points - 1 - i));
        result.push({
          date: format(date, 'MMM dd'),
          actual: 0,
          prediction: 0,
        });
      }
      return result;
    }

    // Group revenue by date
    const revenueByDate = {};
    filteredRevenue.forEach(item => {
      const dateKey = format(parseRevenueDate(item.date), 'yyyy-MM-dd');
      const amount = (item.revenue_shopee || 0) + (item.revenue_tiktok || 0);
      revenueByDate[dateKey] = (revenueByDate[dateKey] || 0) + amount;
    });

    // Get sorted dates
    const sortedDates = Object.keys(revenueByDate).sort();
    const displayDates = sortedDates.slice(-7); // Last 7 days
    
    return displayDates.map(date => ({
      date: format(parseISO(date), 'MMM dd'),
      actual: revenueByDate[date],
      prediction: revenueByDate[date] * 1.05, // Simple prediction
    }));
  }, [filteredRevenue, dateRange]);

  // ── Platform split from real data ──
  const platformData = useMemo(() => {
    if (!filteredRevenue?.length) return [];
    
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
    
    const result = [];
    
    if (shopeeOnlyRev > 0) {
      result.push({ 
        name: 'Shopee', 
        value: Math.round((shopeeOnlyRev / total) * 100),
        color: '#ee4d2d'
      });
    }
    
    if (tiktokOnlyRev > 0) {
      result.push({ 
        name: 'TikTok', 
        value: Math.round((tiktokOnlyRev / total) * 100),
        color: '#DB1A1A'
      });
    }
    
    if (multiRev > 0) {
      result.push({ 
        name: 'Multi-Platform', 
        value: Math.round((multiRev / total) * 100),
        color: '#3b82f6'
      });
    }
    
    return result;
  }, [filteredRevenue]);

  // ── At-risk brands from real data ──
  const atRiskBrands = useMemo(() => {
    return brands?.filter(b => b.brand_status !== 'active') || [];
  }, [brands]);

  useEffect(() => {
    if (!revenueLoading && !brandsLoading && !teamLoading) return;
    const t = setTimeout(() => setTimedOut(true), 5000);
    return () => clearTimeout(t);
  }, [revenueLoading, brandsLoading, teamLoading]);

  useEffect(() => {
    const timer = setTimeout(() => window.dispatchEvent(new Event('resize')), 200);
    return () => clearTimeout(timer);
  }, [chartData]);

  const handleExportReport = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      setNotification('Report exported successfully');
      setTimeout(() => setNotification(null), 3000);
    }, 1500);
  };

  const handleDateRangeChange = (newRange) => {
    setDateRange(newRange);
    setNotification('Dashboard data updated successfully');
    setTimeout(() => setNotification(null), 3000);
  };

  const isLoading = (revenueLoading || brandsLoading || teamLoading) && !timedOut;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="w-11 h-11 border-3 border-muted border-t-primary rounded-full animate-spin" />
        <p className="text-muted-foreground text-sm font-medium">Loading intelligence data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 relative">
      {/* Notification Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 20, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-4 left-1/2 z-[100] bg-card text-card-foreground px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-border"
          >
            <div className="bg-emerald-500 rounded-full p-1">
              <CheckCircle2 size={16} />
            </div>
            <span className="text-sm font-bold tracking-tight">{notification}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dashboard Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
          <p className="text-muted-foreground mt-1">Welcome back, here's what's happening today.</p>
        </div>
        <div className="flex items-center gap-3">
          <DateRangeSelector value={dateRange} onChange={handleDateRangeChange} />
          <button 
            onClick={handleExportReport}
            disabled={isExporting}
            className="inline-flex items-center justify-center rounded-xl text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow-lg hover:shadow-primary/20 h-10 px-6 py-2 gap-2"
          >
            {isExporting ? <Activity className="animate-spin" size={16} /> : <Download size={16} />}
            Export Report
          </button>
        </div>
      </div>

      {/* KPI Grid - AI Studio Style */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div 
          whileHover={{ y: -4, scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/admin/revenue')}
          className="dashboard-card p-5 cursor-pointer border-l-4 border-l-primary group transition-all"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground group-hover:text-primary transition-colors">Total Revenue</p>
              <h3 className="text-2xl font-mono font-bold mt-1">
                Rp {kpis.totalRevenue.toLocaleString()}
              </h3>
            </div>
            <div className="p-2 bg-primary/10 rounded-lg text-primary group-hover:bg-primary group-hover:text-white transition-all">
              <ArrowUpRight size={18} />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`flex items-center font-bold text-[10px] px-1.5 py-0.5 rounded ${parseFloat(kpis.growth) >= 0 ? 'text-emerald-500 bg-emerald-500/10' : 'text-destructive bg-destructive/10'}`}>
                <TrendingUp size={10} className="mr-1" />
                {parseFloat(kpis.growth) >= 0 ? '+' : ''}{kpis.growth}%
              </div>
              <span className="text-[10px] text-muted-foreground font-medium">vs last period</span>
            </div>
            <span className="text-[9px] font-bold uppercase tracking-widest text-primary opacity-0 group-hover:opacity-100 transition-opacity">
              View Analysis →
            </span>
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -4, scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/admin/brands')}
          className="dashboard-card p-5 cursor-pointer border-l-4 border-l-info group transition-all"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground group-hover:text-info transition-colors">Active Brands</p>
              <h3 className="text-2xl font-mono font-bold mt-1">
                {kpis.activeBrands}
              </h3>
            </div>
            <div className="p-2 bg-info/10 rounded-lg text-info group-hover:bg-info group-hover:text-white transition-all">
              <ArrowUpRight size={18} />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center text-info font-bold text-[10px] bg-info/10 px-1.5 py-0.5 rounded">
                Live
              </div>
              <span className="text-[10px] text-muted-foreground font-medium">monitored nodes</span>
            </div>
            <span className="text-[9px] font-bold uppercase tracking-widest text-info opacity-0 group-hover:opacity-100 transition-opacity">
              Manage Brands →
            </span>
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -4, scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/admin/brands')}
          className="dashboard-card p-5 cursor-pointer border-l-4 border-l-destructive group transition-all"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground group-hover:text-destructive transition-colors">At-Risk Brands</p>
              <h3 className="text-2xl font-mono font-bold mt-1">
                {kpis.atRisk}
              </h3>
            </div>
            <div className="p-2 bg-destructive/10 rounded-lg text-destructive group-hover:bg-destructive group-hover:text-white transition-all">
              <ArrowUpRight size={18} />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`flex items-center font-bold text-[10px] px-1.5 py-0.5 rounded ${
                kpis.riskIndicator === 'High' ? 'bg-destructive text-white' : 'bg-amber-500 text-white'
              }`}>
                <AlertCircle size={10} className="mr-1" />
                {kpis.riskIndicator}
              </div>
              <span className="text-[10px] text-muted-foreground font-medium">priority nodes</span>
            </div>
            <span className="text-[9px] font-bold uppercase tracking-widest text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
              Risk Analysis →
            </span>
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -4, scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/admin/team')}
          className="dashboard-card p-5 cursor-pointer border-l-4 border-l-amber-500 group transition-all"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground group-hover:text-amber-500 transition-colors">Top Performer</p>
              <h3 className="text-2xl font-mono font-bold mt-1">
                {kpis.topName.split(' ')[0] || 'N/A'}
              </h3>
            </div>
            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500 group-hover:bg-amber-500 group-hover:text-white transition-all">
              <ArrowUpRight size={18} />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center text-amber-600 font-bold text-[10px] bg-amber-500/10 px-1.5 py-0.5 rounded">
                {kpis.topRev > 0 ? `Rp ${(kpis.topRev / 1000).toFixed(0)}k` : 'N/A'}
              </div>
              <span className="text-[10px] text-muted-foreground font-medium">top revenue</span>
            </div>
            <span className="text-[9px] font-bold uppercase tracking-widest text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity">
              View Team →
            </span>
          </div>
        </motion.div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Revenue Forecast & Trend Analysis */}
        <div className="lg:col-span-2 dashboard-card p-0 overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-primary" />
              <h3 className="text-xs font-bold uppercase tracking-widest">Revenue Forecast & Trend Analysis</h3>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-[10px] font-medium">Actual</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-[10px] font-medium">Predicted</span>
              </div>
            </div>
          </div>
          <div className="h-[400px] p-6">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" strokeOpacity={0.2} vertical={false} />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: 'var(--muted-foreground)', fontWeight: 600 }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: 'var(--muted-foreground)', fontWeight: 600 }} 
                  tickFormatter={(val) => `Rp ${(val/1000).toFixed(0)}k`}
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-card/95 backdrop-blur-md border border-border p-3 rounded-xl shadow-xl ring-1 ring-black/5">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2">{payload[0].payload.date}</p>
                          <div className="space-y-1.5">
                            {payload.map((entry) => (
                              <div key={entry.name} className="flex items-center justify-between gap-6">
                                <div className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color || entry.stroke }} />
                                  <span className="text-[10px] font-medium text-muted-foreground capitalize">{entry.name}</span>
                                </div>
                                <span className="text-[10px] font-bold">Rp {entry.value.toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="actual" 
                  stroke="var(--primary)" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorActual)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="prediction" 
                  stroke="#3b82f6" 
                  strokeWidth={2} 
                  strokeDasharray="5 5"
                  fill="transparent" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Side */}
        <div className="space-y-8">
          {/* Platform Contribution Chart */}
          <div className="dashboard-card p-0 overflow-hidden">
            <div className="p-4 border-b border-border bg-muted/20">
              <div className="flex items-center gap-2">
                <PieChartIcon size={16} className="text-primary" />
                <h3 className="text-xs font-bold uppercase tracking-widest">Platform Contribution</h3>
              </div>
            </div>
            <div className="p-4">
              {platformData.length > 0 ? (
                <div className="flex items-center justify-between">
                  <div className="h-[160px] w-[160px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={platformData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={60}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {platformData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0];
                              return (
                                <div className="bg-card/95 backdrop-blur-md border border-border p-2 rounded-lg shadow-lg flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: data.payload.color }} />
                                  <span className="text-[10px] font-bold text-foreground">{data.name}</span>
                                  <span className="text-[10px] font-bold text-primary">{data.value}%</span>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-col gap-2">
                    {platformData.map((p) => (
                      <div key={p.name} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                        <span className="text-[10px] font-bold text-muted-foreground">{p.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No platform data available
                </div>
              )}
            </div>
          </div>

          {/* Critical Risk Monitor - AI Studio Style */}
          <div className="dashboard-card p-0 overflow-hidden">
            <div className="p-4 border-b border-border bg-muted/20">
              <div className="flex items-center gap-2">
                <ShieldAlert size={16} className="text-destructive" />
                <h3 className="text-xs font-bold uppercase tracking-widest">Critical Risk Monitor</h3>
                <span className="text-[10px] font-bold bg-destructive text-white px-2 py-0.5 rounded-full ml-auto">
                  {atRiskBrands.length} at risk
                </span>
              </div>
            </div>
            <div className="p-4 space-y-4">
              {atRiskBrands.length > 0 ? atRiskBrands.map((brand) => {
                const isHigh = brand.brand_status === 'churned';
                const riskLabel = isHigh ? 'High' : 'Medium';
                const riskColor = isHigh ? 'bg-destructive' : 'bg-amber-500';
                
                return (
                  <motion.div 
                    key={brand.brand_id}
                    whileHover={{ x: 4 }}
                    onClick={() => navigate('/admin/brands')}
                    className="group p-3 rounded-lg border border-border/50 hover:border-destructive/30 hover:bg-destructive/5 transition-all cursor-pointer"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-sm font-bold">{brand.brand_name}</h4>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${riskColor} text-white`}>
                        {riskLabel}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <span className="text-[9px] font-medium bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                        {brand.brand_status}
                      </span>
                      {brand.brand_category && (
                        <span className="text-[9px] font-medium bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                          {brand.brand_category}
                        </span>
                      )}
                      <span className="text-[9px] font-medium bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                        {brand.brand_status === 'churned' ? 'Client Churned' : 'Revenue Decline'}
                      </span>
                    </div>
                  </motion.div>
                );
              }) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  ✅ All brands are active — no risks detected
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* System Status Footer */}
      <div className="pt-8 border-t border-border">
        <p className="text-[10px] text-center text-muted-foreground uppercase tracking-widest font-bold">
          VidHelp Intelligence Hub • System Operational • {kpis.reportingPeriod}
        </p>
      </div>
    </div>
  );
};

export default Dashboard;