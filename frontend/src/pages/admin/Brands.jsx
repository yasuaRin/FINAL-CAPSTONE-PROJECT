// frontend/src/pages/admin/Brands.jsx
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  Globe,
  Layout,
  Zap,
  Activity,
  AlertCircle,
  ChevronRight,
  PieChart,
  BarChart3,
  Clock,
  ArrowRight,
  ShieldCheck,
  Trophy,
  Target,
  Layers,
  MoreVertical
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';
import { format } from 'date-fns';
import { useBrands, formatRevenue } from '../../hooks/useBrands';

const COLORS = ['#DB1A1A', '#00f5ff', '#3b82f6', '#f59e0b', '#10b981', '#8b5cf6'];

const Brands = () => {
  const {
    brands,
    kpis,
    isLoading,
    error,
    getBrandSessions,
    createBrand,
    updateBrand,
    deleteBrand,
  } = useBrands();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrandId, setSelectedBrandId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterIndustry, setFilterIndustry] = useState('All');
  const [brandSessions, setBrandSessions] = useState({});

  // Fetch sessions when brand selected
  React.useEffect(() => {
    if (!selectedBrandId || !getBrandSessions || brandSessions[selectedBrandId]) return;
    getBrandSessions(selectedBrandId)
      .then((sessions) => setBrandSessions((prev) => ({ ...prev, [selectedBrandId]: sessions })))
      .catch(console.error);
  }, [selectedBrandId, getBrandSessions]);

  // Filtered brands
  const filteredBrands = useMemo(() => {
    if (!brands) return [];
    return brands.filter((b) => {
      const matchesSearch = (b.brand_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (b.brand_category || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesIndustry = filterIndustry === 'All' || b.brand_category === filterIndustry;
      return matchesSearch && matchesIndustry;
    });
  }, [brands, searchQuery, filterIndustry]);

  const industries = useMemo(
    () => ['All', ...new Set((brands || []).map((b) => b.brand_category).filter(Boolean))],
    [brands]
  );

  const selectedBrand = useMemo(
    () => brands?.find((b) => b.brand_id === selectedBrandId),
    [selectedBrandId, brands]
  );

  // Chart data for selected brand
  const brandTrendData = useMemo(() => {
    if (!selectedBrandId || !brandSessions[selectedBrandId]) return [];
    const sessions = brandSessions[selectedBrandId];
    // Group by date
    const dailyMap = new Map();
    sessions.forEach((s) => {
      const dateKey = s.date ? format(new Date(s.date), 'MMM dd') : '—';
      const revenue = (s.revenue_shopee || 0) + (s.revenue_tiktok || 0);
      if (dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, dailyMap.get(dateKey) + revenue);
      } else {
        dailyMap.set(dateKey, revenue);
      }
    });
    return Array.from(dailyMap.entries()).map(([date, revenue]) => ({ date, revenue }));
  }, [selectedBrandId, brandSessions]);

  const platformDistribution = useMemo(() => {
    if (!selectedBrandId || !brandSessions[selectedBrandId]) return [];
    const sessions = brandSessions[selectedBrandId];
    let shopeeTotal = 0;
    let tiktokTotal = 0;
    sessions.forEach((s) => {
      shopeeTotal += s.revenue_shopee || 0;
      tiktokTotal += s.revenue_tiktok || 0;
    });
    const result = [];
    if (shopeeTotal > 0) result.push({ name: 'Shopee', value: shopeeTotal, color: '#00f5ff' });
    if (tiktokTotal > 0) result.push({ name: 'TikTok', value: tiktokTotal, color: '#DB1A1A' });
    return result;
  }, [selectedBrandId, brandSessions]);

  const recentSessions = useMemo(() => {
    if (!selectedBrandId || !brandSessions[selectedBrandId]) return [];
    return [...brandSessions[selectedBrandId]]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 3);
  }, [selectedBrandId, brandSessions]);

  // Get risk level based on health score
  const getRiskLevel = (healthScore) => {
    if (healthScore >= 70) return { label: 'Low', color: 'emerald' };
    if (healthScore >= 40) return { label: 'Medium', color: 'amber' };
    return { label: 'High', color: 'red' };
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
            Loading Portfolio...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4 p-8 bg-card rounded-2xl border border-border">
          <AlertCircle size={48} className="text-destructive mx-auto" />
          <p className="text-sm font-black text-destructive uppercase tracking-widest">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-primary text-white rounded-xl font-black text-xs uppercase tracking-widest"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8 pb-16"
    >
      {/* Header - AI Studio Glassmorphism Style */}
      <div className="bg-card rounded-[2rem] p-8 border border-border">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-primary/10 rounded-lg">
                <Globe size={14} className="text-primary" />
              </div>
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">
                Operational Intel
              </span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-white font-sans">
              Brand Portfolio
            </h1>
            <p className="text-muted-foreground mt-2 font-medium text-sm">
              Manage and monitor corporate asset intelligence.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden lg:flex flex-col text-right mr-4">
              <span className="text-[10px] font-black text-emerald-500 uppercase">
                {kpis?.activeCount || 0} Active
              </span>
              <span className="text-[8px] font-bold text-muted-foreground uppercase opacity-50">
                Avg Health: {kpis?.avgHealthScore || 0}%
              </span>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl text-xs font-black uppercase tracking-widest bg-primary text-white hover:bg-primary/90 transition-all h-10 px-6 shadow-lg shadow-primary/20"
            >
              <Plus size={14} />
              Onboard Entity
            </button>
          </div>
        </div>
      </div>

      {/* Stats Summary - KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div whileHover={{ y: -4 }} className="bg-card rounded-3xl p-6 border border-border hover:border-primary/50 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Layers size={20} className="text-primary" />
            </div>
          </div>
          <div className="text-3xl font-mono font-black tracking-tighter text-white">{kpis?.totalBrands || 0}</div>
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Total Managed Brands</div>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} className="bg-card rounded-3xl p-6 border border-border hover:border-primary/50 transition-all">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/10 rounded-xl">
              <AlertCircle size={20} className="text-primary" />
            </div>
          </div>
          <div className="text-3xl font-mono font-black tracking-tighter text-white">{kpis?.atRiskCount || 0}</div>
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Active Risk Alerts</div>
        </motion.div>

        <motion.div whileHover={{ y: -4 }} className="bg-card rounded-3xl p-6 border border-border hover:border-primary/50 transition-all">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/10 rounded-xl">
              <TrendingUp size={20} className="text-primary" />
            </div>
          </div>
          <div className="text-3xl font-mono font-black tracking-tighter text-white">
            {kpis?.avgGrowth && kpis.avgGrowth > 0 ? '+' : ''}{kpis?.avgGrowth || 0}%
          </div>
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Cumulative Growth</div>
        </motion.div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Left: Brand List */}
        <div className="xl:col-span-8 space-y-6">
          {/* Search Bar - Premium Glass Card */}
          <div className="bg-card rounded-[2rem] border border-border p-6">
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="relative flex-1">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                  size={18}
                />
                <input
                  type="text"
                  placeholder="Search brands or sectors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-muted/30 border border-border rounded-2xl pl-12 pr-4 py-3 text-sm font-bold placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 outline-none transition-all text-white"
                />
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={filterIndustry}
                  onChange={(e) => setFilterIndustry(e.target.value)}
                  className="bg-muted/30 border border-border rounded-2xl px-4 py-3 text-[10px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-primary/20 text-white"
                >
                  {industries.map((ind) => (
                    <option key={ind} value={ind}>{ind}</option>
                  ))}
                </select>
                <button className="p-3 bg-muted/30 border border-border rounded-2xl hover:bg-muted/50 transition-colors">
                  <Filter size={18} className="text-muted-foreground" />
                </button>
              </div>
            </div>
          </div>

          {/* Brand Count */}
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.4em]">
              {filteredBrands.length} Monitored Assets
            </h3>
          </div>

          {filteredBrands.length === 0 && (
            <div className="bg-card rounded-[2rem] border border-border p-12 text-center">
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
                No brands found
              </p>
            </div>
          )}

          {/* Brand Cards - Premium Design */}
          {filteredBrands.map((brand) => {
            const isSelected = selectedBrandId === brand.brand_id;
            const risk = getRiskLevel(brand.healthScore);
            const trendData = brandTrendData.length > 0 ? brandTrendData : 
              (brand.growthTrend || []).map(t => ({ date: t.date, revenue: t.revenue }));

            return (
              <motion.div
                key={brand.brand_id}
                layoutId={`brand-${brand.brand_id}`}
                onClick={() => setSelectedBrandId(isSelected ? null : brand.brand_id)}
                className={`bg-card rounded-[2rem] border border-border group cursor-pointer transition-all duration-300 ${
                  isSelected
                    ? 'ring-2 ring-primary border-transparent shadow-2xl shadow-primary/10'
                    : 'hover:border-primary/30'
                }`}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-5">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-[#FF4444] flex items-center justify-center text-white font-black text-2xl italic shadow-lg group-hover:scale-105 transition-transform">
                        {(brand.brand_name || '?')[0]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h4 className="text-lg font-black uppercase italic tracking-tight text-white">
                            {brand.brand_name}
                          </h4>
                          <span className="text-[9px] font-black px-2 py-0.5 bg-white/10 rounded-full text-muted-foreground uppercase tracking-widest">
                            {brand.brand_category || '—'}
                          </span>
                        </div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                          <Layout size={10} className="text-primary" /> {brand.dominantPlatform || '—'}
                        </p>
                      </div>
                    </div>
                    <button className="text-muted-foreground hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors">
                      <MoreVertical size={18} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-3 bg-white/5 rounded-xl border border-border/50">
                      <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground mb-1">
                        Total Revenue
                      </p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-base font-mono font-black text-white">
                          {formatRevenue(brand.totalRevenue)}
                        </span>
                        <span className={`text-[9px] font-black ${brand.growth >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          {brand.growth >= 0 ? '+' : ''}{brand.growth}%
                        </span>
                      </div>
                    </div>
                    <div className="p-3 bg-white/5 rounded-xl border border-border/50">
                      <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground mb-1">
                        Health Index
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className="h-full transition-all duration-1000 rounded-full"
                            style={{ 
                              width: `${brand.healthScore || 0}%`,
                              backgroundColor: brand.healthScore >= 70 ? '#10b981' : brand.healthScore >= 40 ? '#f59e0b' : '#ef4444'
                            }}
                          />
                        </div>
                        <span className="text-xs font-mono font-bold text-white">{brand.healthScore || 0}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Mini Trend Chart */}
                  {trendData.length > 0 && (
                    <div className="h-12 mb-4 opacity-60 group-hover:opacity-100 transition-opacity">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trendData}>
                          <Area 
                            type="monotone" 
                            dataKey="revenue" 
                            stroke={brand.growth >= 0 ? '#10b981' : '#ef4444'} 
                            fill={brand.growth >= 0 ? '#10b98120' : '#ef444420'} 
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  <div className="pt-4 border-t border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full animate-pulse bg-${risk.color === 'emerald' ? 'emerald-500' : risk.color === 'amber' ? 'amber-500' : 'red-500'}`} style={{ backgroundColor: risk.color === 'emerald' ? '#10b981' : risk.color === 'amber' ? '#f59e0b' : '#ef4444' }} />
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{risk.label} Risk</span>
                    </div>
                    <button className="text-[9px] font-bold text-primary uppercase tracking-widest flex items-center gap-1 hover:gap-2 transition-all">
                      Full Profile <ChevronRight size={10} />
                    </button>
                  </div>
                </div>

                {/* Expanded Intelligence Panel */}
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden border-t border-border/50 bg-gradient-to-b from-transparent to-primary/5 rounded-b-[2rem]"
                    >
                      <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Platform Distribution */}
                        <div className="space-y-4">
                          <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                            <PieChart size={12} className="text-primary" /> Platform Breakdown
                          </h5>
                          <div className="h-40 w-full">
                            {platformDistribution.length > 0 ? (
                              <ResponsiveContainer width="100%" height="100%">
                                <RePieChart>
                                  <Pie
                                    data={platformDistribution}
                                    innerRadius={45}
                                    outerRadius={65}
                                    paddingAngle={5}
                                    dataKey="value"
                                  >
                                    {platformDistribution.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                  </Pie>
                                  <Tooltip formatter={(value) => formatRevenue(value)} contentStyle={{ background: '#1A1A1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white' }} />
                                </RePieChart>
                              </ResponsiveContainer>
                            ) : (
                              <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                                No platform data
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Revenue Trend */}
                        <div className="space-y-4">
                          <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                            <BarChart3 size={12} className="text-primary" /> Growth Momentum
                          </h5>
                          <div className="h-40 w-full">
                            {brandTrendData.length > 0 ? (
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={brandTrendData}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                                  <XAxis dataKey="date" hide />
                                  <YAxis hide />
                                  <Tooltip formatter={(value) => formatRevenue(value)} contentStyle={{ background: '#1A1A1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'white' }} />
                                  <Bar dataKey="revenue" fill="#DB1A1A" radius={[4, 4, 0, 0]} />
                                </BarChart>
                              </ResponsiveContainer>
                            ) : (
                              <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                                No trend data
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Recent Sessions */}
                        <div className="space-y-4">
                          <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                            <Clock size={12} className="text-primary" /> Recent Sessions
                          </h5>
                          <div className="space-y-2">
                            {recentSessions.length > 0 ? (
                              recentSessions.map((session, idx) => (
                                <motion.div
                                  key={idx}
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: idx * 0.1 }}
                                  className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-border/50"
                                >
                                  <div>
                                    <span className="text-[10px] font-black text-white">{session.platform || '—'}</span>
                                    <span className="text-[8px] text-muted-foreground font-bold block">
                                      {session.date ? format(new Date(session.date), 'MMM dd, yyyy') : '—'}
                                    </span>
                                  </div>
                                  <span className="font-mono text-[10px] font-black text-emerald-500">
                                    +{formatRevenue((session.revenue_shopee || 0) + (session.revenue_tiktok || 0))}
                                  </span>
                                </motion.div>
                              ))
                            ) : (
                              <p className="text-[10px] text-muted-foreground text-center py-4">No sessions recorded</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {/* Right: Performance Matrix - Premium Card */}
        <div className="xl:col-span-4 space-y-8">
          <div className="bg-card rounded-[2rem] border border-border overflow-hidden">
            <div className="p-5 border-b border-border bg-muted/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity size={16} className="text-primary" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-white">Performance Matrix</h3>
                </div>
                <Trophy size={16} className="text-amber-500" />
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* Health Score */}
              <div>
                <div className="flex justify-between items-end mb-2">
                  <span className="text-[10px] font-black uppercase text-muted-foreground">Avg Health Score</span>
                  <span className="text-xl font-black text-white">{kpis?.avgHealthScore || 0}%</span>
                </div>
                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${kpis?.avgHealthScore || 0}%` }}
                    transition={{ duration: 0.8 }}
                    className="h-full bg-emerald-500 rounded-full"
                  />
                </div>
              </div>

              {/* Active Rate */}
              <div>
                <div className="flex justify-between items-end mb-2">
                  <span className="text-[10px] font-black uppercase text-muted-foreground">Active Rate</span>
                  <span className="text-xl font-black text-white">
                    {kpis?.totalBrands > 0 ? Math.round((kpis.activeCount / kpis.totalBrands) * 100) : 0}%
                  </span>
                </div>
                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${kpis?.totalBrands > 0 ? Math.round((kpis.activeCount / kpis.totalBrands) * 100) : 0}%` }}
                    transition={{ duration: 0.8 }}
                    className="h-full bg-primary rounded-full"
                  />
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white/5 rounded-2xl border border-border/50 text-center">
                  <Layers size={16} className="text-primary mx-auto mb-2" />
                  <p className="text-[9px] font-black text-muted-foreground uppercase mb-1">Total Brands</p>
                  <span className="text-xl font-black italic text-white">{kpis?.totalBrands || 0}</span>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl border border-border/50 text-center">
                  <AlertCircle size={16} className="text-rose-500 mx-auto mb-2" />
                  <p className="text-[9px] font-black text-muted-foreground uppercase mb-1">At Risk</p>
                  <span className="text-xl font-black italic text-white">{kpis?.atRiskCount || 0}</span>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Card - Premium Gradient */}
          <div className="bg-card rounded-[2rem] border border-border p-8 relative overflow-hidden group shadow-2xl">
            <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 group-hover:rotate-45 transition-transform duration-500">
              <Zap size={180} className="text-primary" />
            </div>
            <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-primary" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Total Portfolio Revenue</span>
              </div>
              <h4 className="text-3xl font-black italic uppercase tracking-tighter leading-none text-white">
                {formatRevenue(kpis?.totalRevenue || 0)}
              </h4>
              <p className="text-xs font-medium text-muted-foreground leading-relaxed">
                Intelligence algorithms suggest a tactical pivot for F&B assets. Organizational GTV is projected to scale via platform redistribution workflows.
              </p>
              <button className="w-full py-4 bg-primary text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-primary/90 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-xl">
                Deploy Strategy <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Status */}
      <div className="pt-8 border-t border-border/50">
        <p className="text-[9px] text-center text-muted-foreground uppercase tracking-[0.3em] font-black">
          VidHelp Intelligence Hub • Real-time Analytics • {brands?.length || 0} Active Entities
        </p>
      </div>
    </motion.div>
  );
};

export default Brands;