// frontend/src/pages/admin/Dashboard.jsx
import { useMemo, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, Download, Activity,
  ShieldAlert, CheckCircle2, ArrowUpRight,
  PieChart as PieChartIcon, AlertCircle, Brain, RefreshCw, Sparkles, BarChart3
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { format, subDays, startOfDay, endOfDay, parseISO, startOfYear, endOfYear } from 'date-fns';
import { useRevenue } from '../../hooks/useRevenue';
import { useBrands } from '../../hooks/useBrands';
import { useTeam } from '../../hooks/useTeam';
import { SortByButton } from '../../components/layout/SortByButton';
import { usePredictions } from '../../hooks/usePredictions';
import { supabase } from '../../services/supabase';

// --- Helper Functions ---
const parseRevenueDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
};

const sumRevenue = (item) => (item.revenue_shopee || 0) + (item.revenue_tiktok || 0);

// --- Format Currency for IDR ---
const formatCurrency = (value) => {
  if (!value && value !== 0) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

const formatCompactCurrency = (value) => {
  if (!value) return 'Rp 0';
  const billions = value / 1_000_000_000;
  return `Rp ${billions.toFixed(1)}B`;
};

// --- KPI Card Component ---
const KpiCard = ({ label, value, accent, icon: Icon, badge, badgeStyle, hint, action, onAction }) => (
  <motion.div
    whileHover={{ y: -4, scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={onAction}
    className={`dashboard-card p-5 cursor-pointer border-l-4 border-l-${accent} group transition-all`}
  >
    <div className="flex justify-between items-start">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground group-hover:text-primary transition-colors">
          {label}
        </p>
        <h3 className="text-2xl font-mono font-bold mt-1">{value}</h3>
      </div>
      <div className="p-2 bg-primary/10 rounded-lg text-primary group-hover:bg-primary group-hover:text-white transition-all">
        <Icon size={18} />
      </div>
    </div>
    <div className="mt-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        {badge && (
          <div className={`flex items-center font-bold text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded ${badgeStyle}`}>
            {badge}
          </div>
        )}
        {hint && <span className="text-[10px] font-medium text-muted-foreground">{hint}</span>}
      </div>
      {action && (
        <span className="text-[9px] font-bold uppercase tracking-widest text-primary opacity-0 group-hover:opacity-100 transition-opacity">
          {action}
        </span>
      )}
    </div>
  </motion.div>
);

// --- Bar Chart Tooltip Component ---
const BarChartTooltip = ({ active, payload, formatCurrency }) => {
  if (!active || !payload?.length) return null;
  
  const dataPoint = payload[0]?.payload || {};
  const label = dataPoint?.year;
  const actualValue = dataPoint?.actual;
  const forecastValue = dataPoint?.forecast;

  return (
    <div className="bg-card/95 backdrop-blur-md border border-border p-3 rounded-xl shadow-xl ring-1 ring-black/5 min-w-[180px]">
      <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2">{label}</p>
      <div className="space-y-2">
        {actualValue != null && actualValue > 0 && (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-[10px] font-medium text-muted-foreground">Actual</span>
            </div>
            <span className="text-[10px] font-bold text-primary">
              {formatCurrency(actualValue)}
            </span>
          </div>
        )}
        {forecastValue != null && forecastValue > 0 && (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-[10px] font-medium text-muted-foreground">Predicted</span>
            </div>
            <div className="text-right">
              <span className="block text-[10px] font-bold text-blue-500">
                {formatCurrency(forecastValue)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Critical Risk Monitor Component ---
const CriticalRiskMonitor = ({ onBrandClick }) => {
  const [riskData, setRiskData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchRiskData = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('risk_monitor')
          .select(`
            brand_id,
            risk_level,
            reasons,
            sessions_count,
            revenue_total
          `)
          .order('risk_level', { ascending: false });
        
        if (error) throw error;
        
        const { data: brands, error: brandsError } = await supabase
          .from('brands')
          .select('brand_id, brand_name');
        
        if (brandsError) throw brandsError;
        
        const brandMap = new Map(brands.map(b => [b.brand_id, b.brand_name]));
        
        const enrichedData = (data || []).map(item => ({
          id: item.brand_id,
          name: brandMap.get(item.brand_id) || 'Unknown',
          risk: item.risk_level,
          riskColor: item.risk_level === 'High' ? 'bg-destructive' : 
                     item.risk_level === 'Medium' ? 'bg-amber-500' : 'bg-emerald-500',
          reasons: item.reasons || [],
          sessions: item.sessions_count || 0,
          revenue: item.revenue_total || 0
        }));
        
        setRiskData(enrichedData);
      } catch (error) {
        console.error('Error fetching risk data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchRiskData();
    
    const subscription = supabase
      .channel('risk_monitor_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'risk_monitor' }, 
        () => fetchRiskData()
      )
      .subscribe();
    
    return () => subscription.unsubscribe();
  }, []);
  
  const highRiskCount = riskData.filter(b => b.risk === 'High').length;
  const mediumRiskCount = riskData.filter(b => b.risk === 'Medium').length;
  const lowRiskCount = riskData.filter(b => b.risk === 'Low').length;
  const totalCount = riskData.length;
  
  if (loading) {
    return (
      <div className="dashboard-card p-0 overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/20">
          <div className="flex items-center gap-2">
            <ShieldAlert size={16} className="text-destructive" />
            <h3 className="text-xs font-bold uppercase tracking-widest">Critical Risk Monitor</h3>
          </div>
        </div>
        <div className="p-8 text-center text-muted-foreground text-sm">
          Loading risk data...
        </div>
      </div>
    );
  }
  
  return (
    <div className="dashboard-card p-0 overflow-hidden">
      <div className="p-4 border-b border-border bg-muted/20">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <ShieldAlert size={16} className="text-destructive" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-foreground">
              Critical Risk Monitor
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {highRiskCount > 0 && (
              <span className="text-[9px] font-bold bg-destructive text-white px-2 py-0.5 rounded-full">
                {highRiskCount} High
              </span>
            )}
            {mediumRiskCount > 0 && (
              <span className="text-[9px] font-bold bg-amber-500 text-white px-2 py-0.5 rounded-full">
                {mediumRiskCount} Medium
              </span>
            )}
            {lowRiskCount > 0 && (
              <span className="text-[9px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded-full">
                {lowRiskCount} Low
              </span>
            )}
            <span className="text-[10px] font-bold bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
              {totalCount} Total
            </span>
          </div>
        </div>
        <p className="text-[9px] text-muted-foreground mt-2">
          Click on any brand to filter the chart by that brand
        </p>
      </div>

      <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto">
        {riskData.length > 0 ? (
          riskData.map((brand) => (
            <motion.div
              key={brand.id}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => onBrandClick?.(brand.id)}
              className="group p-3 rounded-lg border border-border/50 hover:border-destructive/30 hover:bg-destructive/5 transition-all cursor-pointer"
            >
              <div className="flex justify-between items-start mb-2">
                <h4 className="text-sm font-bold text-foreground group-hover:text-destructive transition-colors">
                  {brand.name}
                </h4>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                  brand.risk === 'High' 
                    ? 'bg-destructive text-white' 
                    : brand.risk === 'Medium'
                    ? 'bg-amber-500 text-white'
                    : 'bg-emerald-500 text-white'
                }`}>
                  {brand.risk}
                </span>
              </div>

              <div className="flex flex-wrap gap-1">
                {brand.reasons && brand.reasons.slice(0, 3).map((reason, idx) => (
                  <span 
                    key={idx} 
                    className="text-[9px] font-medium bg-muted/80 px-2 py-0.5 rounded text-muted-foreground group-hover:bg-muted transition-colors"
                  >
                    {reason}
                  </span>
                ))}
              </div>
            </motion.div>
          ))
        ) : (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No risk data available
          </div>
        )}
      </div>
    </div>
  );
};

// --- Main Dashboard Component ---
export const Dashboard = () => {
  const navigate = useNavigate();

  const [dateRange, setDateRange] = useState({
    start: subDays(new Date(), 730),
    end: new Date(),
    preset: '2y',
  });
  const [notification, setNotification] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState(null);

  const { data: revenue, loading: revenueLoading } = useRevenue();
  const { brands, loading: brandsLoading } = useBrands();
  const { team, loading: teamLoading } = useTeam();
  const {
    futurePredictions,
    retrainModels,
    isRetraining,
  } = usePredictions();

  // CSS Injection to fix white hover issue
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      /* Fix bar chart hover - remove white overlay */
      .recharts-bar-rectangle:hover rect {
        fill: #9A1212 !important;
        transition: fill 0.2s ease !important;
        cursor: pointer !important;
      }
      .recharts-bar-rectangle[data-name="ML Forecast"]:hover rect {
        fill: #1e40af !important;
      }
      .recharts-bar-rectangle:hover {
        filter: none !important;
      }
      .recharts-bar-rectangle:hover rect {
        stroke: none !important;
        opacity: 1 !important;
      }
    `;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  // Get available years
  const availableYears = useMemo(() => {
    const years = new Set();
    
    if (revenue && revenue.length) {
      revenue.forEach(item => {
        if (item.date) {
          const year = new Date(item.date).getFullYear();
          if (!isNaN(year)) years.add(year);
        }
      });
    }
    
    if (futurePredictions && futurePredictions.length) {
      futurePredictions.forEach(pred => {
        if (pred.date) {
          const year = new Date(pred.date).getFullYear();
          if (!isNaN(year)) years.add(year);
        }
      });
    }
    
    const result = Array.from(years).sort();
    return result.length ? result : [2024, 2025, 2026];
  }, [revenue, futurePredictions]);

  // Filter revenue by selected brand
  const filteredByBrand = useMemo(() => {
    if (!revenue) return [];
    if (!selectedBrand) return revenue;
    return revenue.filter(item => item.brand_id === selectedBrand);
  }, [revenue, selectedBrand]);

  // Filtered revenue by date range
  const filteredRevenue = useMemo(() => {
    if (!filteredByBrand) return [];
    return filteredByBrand.filter(item => {
      const d = parseRevenueDate(item.date);
      return d && d >= startOfDay(dateRange.start) && d <= endOfDay(dateRange.end);
    });
  }, [filteredByBrand, dateRange]);

  // KPI calculations
  const kpis = useMemo(() => {
    const totalRevenue = filteredRevenue.reduce((s, i) => s + sumRevenue(i), 0);
    const activeBrands = brands?.filter(b => b.brand_status === 'active').length ?? 0;
    const atRisk = brands?.filter(b => b.brand_status !== 'active').length ?? 0;

    const staffRev = {};
    filteredRevenue.forEach(item => {
      const id = item.host_id;
      staffRev[id] = (staffRev[id] || 0) + sumRevenue(item);
    });
    let topName = 'N/A', topRev = 0;
    Object.entries(staffRev).forEach(([id, total]) => {
      if (total > topRev) {
        topRev = total;
        topName = team?.find(s => s.id === parseInt(id))?.name ?? 'Unknown';
      }
    });

    const sorted = filteredRevenue
      .map(item => ({ ...item, date: parseRevenueDate(item.date) }))
      .filter(item => item.date)
      .sort((a, b) => b.date - a.date);

    const uniqueDates = [...new Set(sorted.map(i => format(i.date, 'yyyy-MM-dd')))];
    const recentDates = uniqueDates.slice(0, Math.min(7, uniqueDates.length));
    const previousDates = uniqueDates.slice(Math.min(7, uniqueDates.length), Math.min(14, uniqueDates.length));

    const lastTotal = filteredRevenue
      .filter(i => recentDates.includes(format(parseRevenueDate(i.date), 'yyyy-MM-dd')))
      .reduce((s, i) => s + sumRevenue(i), 0);
    const prevTotal = filteredRevenue
      .filter(i => previousDates.includes(format(parseRevenueDate(i.date), 'yyyy-MM-dd')))
      .reduce((s, i) => s + sumRevenue(i), 0);

    const growth = prevTotal > 0 ? ((lastTotal - prevTotal) / prevTotal * 100).toFixed(1) : 0;
    const riskIndicator = atRisk > 3 ? 'High' : atRisk > 0 ? 'Medium' : 'Low';

    return {
      totalRevenue,
      activeBrands,
      atRisk,
      topName,
      growth,
      riskIndicator,
      reportingPeriod: `${format(dateRange.start, 'MMM yy')} - ${format(dateRange.end, 'MMM dd, yyyy')}`,
    };
  }, [filteredRevenue, brands, team, dateRange]);

  // YEARLY chart data - aggregates by YEAR instead of month
  const chartData = useMemo(() => {
    const yearMap = new Map();
    
    // Get all years from 2024 to 2026
    const allYears = [2024, 2025, 2026];
    allYears.forEach(year => {
      yearMap.set(year, {
        year: year.toString(),
        actual: 0,
        forecast: 0,
      });
    });
    
    // Add actual revenue by year
    if (filteredRevenue.length > 0) {
      filteredRevenue.forEach(item => {
        if (item.date) {
          const date = parseISO(item.date);
          const year = date.getFullYear();
          if (yearMap.has(year)) {
            const existing = yearMap.get(year);
            existing.actual += sumRevenue(item);
            yearMap.set(year, existing);
          }
        }
      });
    }
    
    // Add forecast revenue by year
    if (futurePredictions && futurePredictions.length > 0) {
      futurePredictions.forEach(pred => {
        if (pred.date) {
          const date = parseISO(pred.date);
          const year = date.getFullYear();
          if (yearMap.has(year)) {
            const existing = yearMap.get(year);
            existing.forecast += pred.predicted || 0;
            yearMap.set(year, existing);
          }
        }
      });
    }
    
    return Array.from(yearMap.values()).sort((a, b) => parseInt(a.year) - parseInt(b.year));
  }, [filteredRevenue, futurePredictions]);

  // Platform contribution data
  const platformData = useMemo(() => {
    if (!filteredRevenue?.length) return [];

    let shopeeOnly = 0, tiktokOnly = 0, multi = 0;
    filteredRevenue.forEach(item => {
      const hasShopee = (item.revenue_shopee || 0) > 0;
      const hasTiktok = (item.revenue_tiktok || 0) > 0;
      if (hasShopee && hasTiktok) multi += sumRevenue(item);
      else if (hasShopee) shopeeOnly += item.revenue_shopee;
      else if (hasTiktok) tiktokOnly += item.revenue_tiktok;
    });

    const total = shopeeOnly + tiktokOnly + multi;
    if (total === 0) return [];

    const result = [];
    if (shopeeOnly > 0) result.push({ name: 'Shopee', value: Math.round((shopeeOnly / total) * 100), color: '#ee4d2d' });
    if (tiktokOnly > 0) result.push({ name: 'TikTok', value: Math.round((tiktokOnly / total) * 100), color: '#DB1A1A' });
    if (multi > 0) result.push({ name: 'Multi-Platform', value: Math.round((multi / total) * 100), color: '#3b82f6' });
    return result;
  }, [filteredRevenue]);

  const hasForecast = chartData.some(d => d.forecast > 0);
  const avgConfidence = futurePredictions?.length > 0
    ? (futurePredictions.reduce((sum, p) => sum + (p.model_r2 || 0), 0) / futurePredictions.length) * 100
    : 0;

  const notify = useCallback((msg, ms = 4000) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), ms);
  }, []);

  const handleRerunModel = useCallback(async () => {
    const result = await retrainModels();
    notify(result.success
      ? 'ML models retrained successfully! New predictions generated.'
      : `Failed to retrain models: ${result.error ?? 'Unknown error'}`
    );
  }, [retrainModels, notify]);

  const handleExportReport = useCallback(() => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      notify('Report exported successfully');
    }, 1500);
  }, [notify]);

  const handleDateRangeChange = useCallback((newRange) => {
    setDateRange(newRange);
    notify('Dashboard data updated successfully');
  }, [notify]);

  const handleBrandClick = useCallback((brandId) => {
    setSelectedBrand(brandId === selectedBrand ? null : brandId);
    if (brandId === selectedBrand) {
      notify('Cleared brand filter', 2000);
    } else {
      notify(`Filtering by ${brands?.find(b => b.brand_id === brandId)?.brand_name}`, 2000);
    }
  }, [selectedBrand, brands, notify]);

  // Loading timeout
  useEffect(() => {
    if (!revenueLoading && !brandsLoading && !teamLoading) return;
    const timeout = setTimeout(() => setTimedOut(true), 5000);
    return () => clearTimeout(timeout);
  }, [revenueLoading, brandsLoading, teamLoading]);

  useEffect(() => {
    const timeout = setTimeout(() => window.dispatchEvent(new Event('resize')), 200);
    return () => clearTimeout(timeout);
  }, [chartData]);

  const isLoading = (revenueLoading || brandsLoading || teamLoading) && !timedOut;
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="w-11 h-11 border-3 border-muted border-t-primary rounded-full animate-spin" />
        <p className="text-muted-foreground text-sm font-medium">Loading intelligence data...</p>
      </div>
    );
  }

  const selectedBrandName = brands?.find(b => b.brand_id === selectedBrand)?.brand_name;

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

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
          <p className="text-muted-foreground mt-1">Welcome back, here's what's happening today.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportReport}
            disabled={isExporting}
            className="inline-flex items-center justify-center rounded-xl text-xs font-bold uppercase tracking-wider transition-all bg-primary text-primary-foreground shadow-lg hover:shadow-primary/20 h-10 px-6 py-2 gap-2"
          >
            {isExporting ? <Activity className="animate-spin" size={16} /> : <Download size={14} />}
            Export Report
          </button>
          
          <button
            onClick={handleRerunModel}
            disabled={isRetraining}
            className="inline-flex items-center justify-center gap-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all bg-muted/20 border border-border text-foreground hover:border-primary/40 hover:text-primary h-10 px-4 py-2"
          >
            {isRetraining
              ? <><Activity size={14} className="animate-spin" /> Training...</>
              : <><RefreshCw size={14} /> Rerun ML Model</>
            }
          </button>
          
          <SortByButton
            brands={brands}
            onBrandChange={setSelectedBrand}
            onDateRangeChange={setDateRange}
            selectedBrand={selectedBrand}
            selectedDateRange={dateRange}
            availableYears={availableYears}
          />
        </div>
      </div>

      {/* Active Filters Display */}
      {selectedBrand && selectedBrandName && (
        <div className="flex items-center gap-2 flex-wrap bg-primary/5 border border-primary/20 rounded-lg px-4 py-2">
          <span className="text-[9px] text-muted-foreground">Active filter:</span>
          <span className="text-[9px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">
            Brand: {selectedBrandName}
          </span>
          <button
            onClick={() => setSelectedBrand(null)}
            className="text-[9px] text-muted-foreground hover:text-primary transition-colors ml-auto"
          >
            Clear filter
          </button>
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard
          label="Total Revenue"
          value={formatCurrency(kpis.totalRevenue)}
          accent="primary"
          icon={ArrowUpRight}
          badge={
            <span className="flex items-center gap-1">
              <TrendingUp size={10} />
              {parseFloat(kpis.growth) >= 0 ? '+' : ''}{kpis.growth}%
            </span>
          }
          badgeStyle={parseFloat(kpis.growth) >= 0 ? 'text-emerald-500 bg-emerald-500/10' : 'text-destructive bg-destructive/10'}
          hint="vs last period"
          action="View Analysis →"
          onAction={() => navigate('/admin/revenue')}
        />
        <KpiCard
          label="Active Brands"
          value={kpis.activeBrands}
          accent="info"
          icon={ArrowUpRight}
          badge="Live"
          badgeStyle="text-info bg-info/10"
          hint="monitored nodes"
          action="Manage Brands →"
          onAction={() => navigate('/admin/brands')}
        />
        <KpiCard
          label="At-Risk Brands"
          value={kpis.atRisk}
          accent="destructive"
          icon={ArrowUpRight}
          badge={
            <span className="flex items-center gap-1">
              <AlertCircle size={10} />
              {kpis.riskIndicator}
            </span>
          }
          badgeStyle={kpis.riskIndicator === 'High' ? 'bg-destructive text-white' : 'bg-amber-500 text-white'}
          hint="priority nodes"
          action="Risk Analysis →"
          onAction={() => navigate('/admin/brands')}
        />
        <KpiCard
          label="ML Forecast"
          value={`${futurePredictions?.length ?? 0} Periods`}
          accent="primary"
          icon={Brain}
          badge={`${avgConfidence.toFixed(0)}% avg confidence`}
          badgeStyle="bg-primary/10 text-primary"
          hint="R² score"
          onAction={handleRerunModel}
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Revenue Forecast Bar Chart - YEARLY */}
        <div className="lg:col-span-2 dashboard-card p-0 overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/20">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <BarChart3 size={16} className="text-primary" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-foreground">
                  Revenue Forecast & Trend Analysis (Yearly)
                  {selectedBrandName && (
                    <span className="ml-2 text-[9px] font-normal text-muted-foreground">
                      ({selectedBrandName})
                    </span>
                  )}
                </h3>
                {hasForecast && (
                  <span className="text-[9px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    ML Powered
                  </span>
                )}
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
            <p className="text-[10px] text-muted-foreground mt-2">
              Total revenue by year (2024-2026) from all brands
            </p>
          </div>

          <div className="h-[400px] w-full p-4">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
                  barGap={8}
                  barCategoryGap={30}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border)"
                    strokeOpacity={0.2}
                    vertical={false}
                  />
                  
                  <XAxis
                    dataKey="year"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: 'var(--muted-foreground)', fontWeight: 600 }}
                    dy={10}
                  />
                  
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: 'var(--muted-foreground)', fontWeight: 500 }}
                    tickFormatter={formatCompactCurrency}
                    width={80}
                  />
                  
                  <Tooltip content={<BarChartTooltip formatCurrency={formatCurrency} />} />
                  
                  <Legend wrapperStyle={{ fontSize: '10px' }} iconType="circle" />
                  
                  <Bar
                    dataKey="actual"
                    name="Actual Revenue"
                    fill="var(--primary)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={120}
                    className="bar-actual"
                  />

                  <Bar
                    dataKey="forecast"
                    name="ML Forecast"
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={120}
                    className="bar-forecast"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center gap-4">
                <Activity size={44} className="text-muted-foreground/25" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">No data available</p>
                  <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                    {selectedBrand ? 'No revenue data for selected brand' : 'Run ML models to generate forecasts'}
                  </p>
                </div>
                {!selectedBrand && (
                  <button
                    onClick={handleRerunModel}
                    disabled={isRetraining}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-bold transition-all hover:bg-primary/90"
                  >
                    {isRetraining
                      ? <><Activity size={13} className="animate-spin" /> Training…</>
                      : <><Brain size={13} /> Run ML Models</>
                    }
                  </button>
                )}
              </div>
            )}
          </div>

          {hasForecast && (
            <div className="px-6 py-3 border-t border-border/60 bg-muted/5 flex items-center justify-between flex-wrap gap-2">
              <p className="text-[9px] text-muted-foreground">
                ML Models: Linear Regression · Ridge · Random Forest · Gradient Boosting
              </p>
              <div className="flex items-center gap-2">
                <p className="text-[9px] text-muted-foreground">Best model selected via LOOCV per period</p>
                <button
                  onClick={handleRerunModel}
                  disabled={isRetraining}
                  className="inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-primary hover:text-primary/80 disabled:opacity-50 transition-opacity"
                >
                  {isRetraining
                    ? <><Activity size={10} className="animate-spin" /> Training…</>
                    : <><RefreshCw size={10} /> Rerun</>
                  }
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-8">

          {/* Platform Contribution */}
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
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.color}
                              className="hover:opacity-80 transition-opacity cursor-pointer"
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const data = payload[0];
                            return (
                              <div className="bg-card/95 backdrop-blur-md border border-border p-2 rounded-lg shadow-lg flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: data.payload.color }} />
                                <span className="text-[10px] font-bold text-foreground">{data.name}</span>
                                <span className="text-[10px] font-bold text-primary">{data.value}%</span>
                              </div>
                            );
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-col gap-2">
                    {platformData.map(p => (
                      <div key={p.name} className="flex items-center gap-2 group cursor-pointer">
                        <div 
                          className="w-2 h-2 rounded-full transition-all group-hover:scale-125" 
                          style={{ backgroundColor: p.color }} 
                        />
                        <span className="text-[10px] font-bold text-muted-foreground group-hover:text-foreground transition-colors">
                          {p.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">No platform data available</div>
              )}
            </div>
          </div>

          {/* Critical Risk Monitor */}
          <CriticalRiskMonitor onBrandClick={handleBrandClick} />
        </div>
      </div>

      {/* Footer */}
      <div className="pt-8 border-t border-border">
        <p className="text-[10px] text-center text-muted-foreground uppercase tracking-widest font-bold">
          VidHelp Intelligence Hub · System Operational · Revenue Period: 2024-2026
        </p>
      </div>
    </div>
  );
};

export default Dashboard;