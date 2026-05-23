import { useMemo, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Download, Activity,
  ShieldAlert, CheckCircle2, ArrowUpRight,
  PieChart as PieChartIcon, AlertCircle, Brain, RefreshCw, AlertTriangle, Handshake
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  Tooltip as RechartsTooltip
} from 'recharts';
import { useRevenue } from '../../hooks/useRevenue';
import { useBrands } from '../../hooks/useBrands';
import { useTeam } from '../../hooks/useTeam';
import { SortByButton } from '../../components/layout/SortByButton';
import { usePredictions } from '../../hooks/usePredictions';
import { supabase } from '../../services/supabase';
import { RevenueBarChart } from '../../components/dashboard/RevenueBarChart';
import { exportCompleteReport } from '../../utils/exportPDF';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
const sumRevenue = (item) => (item?.revenue_shopee ?? 0) + (item?.revenue_tiktok ?? 0);

const formatCurrency = (value) => {
  if (!value && value !== 0) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatCompactCurrency = (value) => {
  if (!value || value === 0) return 'Rp 0';
  if (value >= 1_000_000_000) return `Rp ${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000)     return `Rp ${(value / 1_000_000).toFixed(0)}M`;
  return formatCurrency(value);
};

// ============================================================================
// KPI CARD
// ============================================================================
const KpiCard = ({ title, value, icon: Icon, badge, badgeStyle, action, onAction, children }) => (
  <motion.div
    whileHover={{ y: -3, scale: 1.015 }}
    whileTap={{ scale: 0.98 }}
    onClick={onAction}
    className="dashboard-card p-4 cursor-pointer rounded-2xl border-l-4 border-l-primary group transition-all"
  >
    <div className="flex justify-between items-start gap-2">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-primary transition-colors leading-tight">
        {title}
      </p>
      {Icon && (
        <div className="p-1.5 bg-primary/10 rounded-lg text-primary group-hover:bg-primary group-hover:text-white transition-all shrink-0">
          <Icon size={14} />
        </div>
      )}
    </div>
    <h3 className="text-base font-mono font-bold mt-2 truncate">{value}</h3>
    <div className="mt-2.5 flex items-center justify-between">
      {badge && (
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badgeStyle}`}>
          {badge}
        </span>
      )}
      {action && (
        <span className="text-[10px] font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
          {action}
        </span>
      )}
    </div>
    {children}
  </motion.div>
);

// ============================================================================
// CRITICAL RISK MONITOR
// ============================================================================
const CriticalRiskMonitor = ({ onBrandClick }) => {
  const [riskData, setRiskData] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const fetchRiskData = async () => {
      try {
        const [{ data, error }, { data: brands }] = await Promise.all([
          supabase
            .from('risk_monitor')
            .select('brand_id, risk_level, reasons')
            .order('risk_level', { ascending: false }),
          supabase.from('brands').select('brand_id, brand_name'),
        ]);
        if (error) throw error;
        const brandMap = new Map(brands?.map((b) => [b.brand_id, b.brand_name]));
        setRiskData(
          (data || []).map((item) => ({
            id:      item.brand_id,
            name:    brandMap.get(item.brand_id) || 'Unknown',
            risk:    item.risk_level,
            reasons: item.reasons || [],
          }))
        );
      } catch (err) {
        console.error('Error fetching risk data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRiskData();
  }, []);

  const counts = { High: 0, Medium: 0, Low: 0 };
  riskData.forEach((b) => { if (counts[b.risk] !== undefined) counts[b.risk]++; });

  if (loading) {
    return (
      <div className="dashboard-card p-0 overflow-hidden">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <ShieldAlert size={16} className="text-destructive" />
            <h3 className="text-xs font-bold">Critical Risk Monitor</h3>
          </div>
        </div>
        <div className="p-8 text-center text-sm">Loading risk data...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-card p-0 overflow-hidden">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <ShieldAlert size={16} className="text-destructive" />
            <h3 className="text-xs font-bold">Critical Risk Monitor</h3>
          </div>
        </div>
        <p className="text-[9px] text-muted-foreground mt-2">Click on any brand to filter the chart</p>
      </div>
      <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
        {riskData.map((brand) => (
          <motion.div
            key={brand.id}
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => onBrandClick?.(brand.id)}
            className="p-3 rounded-lg border hover:border-destructive/30 hover:bg-destructive/5 cursor-pointer transition-all"
          >
            <div className="flex justify-between items-start">
              <h4 className="text-sm font-bold">{brand.name}</h4>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                brand.risk === 'High'   ? 'bg-destructive text-white' :
                brand.risk === 'Medium' ? 'bg-amber-500 text-white'   : 'bg-emerald-500 text-white'
              }`}>{brand.risk}</span>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {brand.reasons?.slice(0, 2).map((r, i) => (
                <span key={i} className="text-[9px] bg-muted/80 px-2 py-0.5 rounded">{r}</span>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// MAIN DASHBOARD
// ============================================================================
export const Dashboard = () => {
  const navigate = useNavigate();
  const [notification, setNotification]     = useState(null);
  const [isExporting, setIsExporting]       = useState(false);
  const [selectedBrand, setSelectedBrand]   = useState(null);
  const [timedOut, setTimedOut]             = useState(false);
  const [forceShow, setForceShow]           = useState(false);
  const [dateRange, setDateRange]           = useState({ start: null, end: null, preset: 'allData' });

  const { data: revenue, loading: revenueLoading, totalRevenue: aggregatedTotal, brandTotals, yearlyData } = useRevenue();
  const { brands, loading: brandsLoading } = useBrands(brandTotals);
  const { team }                           = useTeam();
  const { futurePredictions, retrainModels, isRetraining } = usePredictions();

  const [partneredBrands, setPartneredBrands] = useState([]);
  useEffect(() => {
    const fetchPartneredBrands = async () => {
      try {
        const { data, error } = await supabase.from('partners').select('*');
        if (!error && data) setPartneredBrands(data);
      } catch { setPartneredBrands([]); }
    };
    fetchPartneredBrands();
  }, []);

  const partnershipStats = {
    inProgress: partneredBrands.filter(p => p.status === 'In Progress').length,
    dealing:    partneredBrands.filter(p => p.status === 'Dealing').length,
    partner:    partneredBrands.filter(p => p.status === 'Partner').length,
  };
  const partnerCount = partneredBrands.length;

  useEffect(() => { const t = setTimeout(() => setTimedOut(true),  8000);  return () => clearTimeout(t); }, []);
  useEffect(() => { const t = setTimeout(() => setForceShow(true), 10000); return () => clearTimeout(t); }, []);

  const globalYears = useMemo(() => yearlyData.map((y) => y.year).sort((a, b) => a - b), [yearlyData]);

  const filteredRevenue = useMemo(() => {
    if (!revenue || revenue.length === 0) return [];
    return revenue.filter((item) => {
      const matchesBrand = !selectedBrand || item.brand_id === selectedBrand;
      const itemDate = item?.date ? new Date(item.date) : null;
      const matchesDate =
        !dateRange?.start || !dateRange?.end || dateRange.preset === 'allData' ||
        (itemDate && itemDate >= dateRange.start && itemDate <= dateRange.end);
      return matchesBrand && matchesDate;
    });
  }, [revenue, selectedBrand, dateRange]);

  const selectedBrandName = brands?.find((b) => b.brand_id === selectedBrand)?.brand_name;

  const totalRevenue = useMemo(
    () => filteredRevenue.reduce((sum, item) => sum + sumRevenue(item), 0),
    [filteredRevenue]
  );

  const chartData = useMemo(() => {
    const yearMap = new Map();
    filteredRevenue.forEach((item) => {
      if (!item?.date) return;
      const year = new Date(item.date).getFullYear();
      yearMap.set(year, (yearMap.get(year) || 0) + sumRevenue(item));
    });
    const result = Array.from(yearMap.entries())
      .map(([year, rev]) => ({ year: year.toString(), actual: rev, forecast: 0 }))
      .sort((a, b) => parseInt(a.year) - parseInt(b.year));

    if (futurePredictions?.length > 0 && !selectedBrand && dateRange.preset === 'allData') {
      const predByYear = new Map();
      futurePredictions.forEach((pred) => {
        if (pred?.date && pred.is_future === true) {
          const year = new Date(pred.date).getFullYear();
          predByYear.set(year, (predByYear.get(year) || 0) + (pred.predicted || 0));
        }
      });
      predByYear.forEach((value, year) => {
        const existing = result.find((r) => parseInt(r.year) === year);
        if (existing) existing.forecast = value;
        else result.push({ year: year.toString(), actual: 0, forecast: value });
      });
    }
    return result.sort((a, b) => parseInt(a.year) - parseInt(b.year));
  }, [filteredRevenue, futurePredictions, selectedBrand, dateRange.preset]);

  const totalTeamMembers = useMemo(() => team?.length ?? 0, [team]);
  const activeBrands     = useMemo(() => brands?.filter((b) => b.brand_status === 'active').length ?? 0, [brands]);
  const atRisk           = useMemo(() => brands?.filter((b) => b.risk_level === 'High').length ?? 0, [brands]);
  const hasForecast      = useMemo(() => chartData.some((d) => d.forecast > 0), [chartData]);

  const forecastDrop = useMemo(() => {
    if (!hasForecast) return null;
    const lastActual    = [...chartData].reverse().find((d) => d.actual > 0);
    const firstForecast = chartData.find((d) => d.forecast > 0);
    if (!lastActual || !firstForecast) return null;
    const dropPct = ((lastActual.actual - firstForecast.forecast) / lastActual.actual) * 100;
    return dropPct >= 10 ? { dropPct: Math.round(dropPct), forecastYear: firstForecast.year } : null;
  }, [hasForecast, chartData]);

  const avgConfidence =
    futurePredictions?.length > 0
      ? (futurePredictions.reduce((s, p) => s + (p.model_r2 || 0), 0) / futurePredictions.length) * 100
      : 0;

  // ── PLATFORM CONTRIBUTION ─────────────────────────────────────────────────
  // Three fixed segments — always shown if they have any revenue at all:
  //   • TikTok  = sum of all revenue_tiktok values across every session
  //   • Shopee  = sum of all revenue_shopee values across every session
  //   • Multi   = sum of (shopee + tiktok) for sessions where BOTH columns > 0
  //               (these sessions are counted once in Multi, not split)
  //
  // Why this approach:
  //   Classifying each session as Shopee OR TikTok OR Multi was causing TikTok
  //   to show 0 whenever most sessions had both columns populated (all went to
  //   Multi). Instead we track each platform's raw column total independently,
  //   then subtract Multi from the individual totals to avoid double-counting.
    // ── PLATFORM CONTRIBUTION ─────────────────────────────────────────────────
  // Fixed: Shopee, TikTok, and Multi all show correctly
  const platformData = useMemo(() => {
    if (!filteredRevenue || filteredRevenue.length === 0) return [];

    let totalShopee = 0;
    let totalTikTok = 0;
    let totalMulti = 0;

    filteredRevenue.forEach((item) => {
      const s = item.revenue_shopee ?? 0;
      const t = item.revenue_tiktok ?? 0;
      
      // Add to individual platform totals
      totalShopee += s;
      totalTikTok += t;
      
      // For Multi: count sessions where BOTH platforms were used
      if (s > 0 && t > 0) {
        totalMulti += (s + t);
      }
    });

    // Calculate net values (excluding Multi)
    const shopeeNet = totalShopee;
    const tiktokNet = totalTikTok;

    const total = shopeeNet + tiktokNet;
    
    if (total === 0) return [];

    const segments = [
      { name: 'TikTok', value: tiktokNet, color: '#DB1A1A' },
      { name: 'Shopee', value: shopeeNet, color: '#ee4d2d' },
    ];

    // Only add Multi if there are sessions with both platforms
    if (totalMulti > 0) {
      segments.push({ name: 'Multi', value: totalMulti, color: '#3b82f6' });
    }

    // Calculate percentages based on total including Multi if present
    const grandTotal = total + totalMulti;
    
    return segments.map(s => ({ 
      ...s, 
      value: Math.round((s.value / grandTotal) * 100) 
    }));
  }, [filteredRevenue]);

  const notify = useCallback((msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  }, []);

  const handleRerunModel = useCallback(async () => {
    const result = await retrainModels();
    notify(result.success ? 'ML models retrained successfully!' : `Failed: ${result.error}`);
  }, [retrainModels, notify]);

  const handleExportReport = useCallback(async () => {
    setIsExporting(true);
    await exportCompleteReport();
    setIsExporting(false);
  }, []);

  const handleBrandClick = useCallback(
    (brandId) => {
      const isDeselecting = brandId === selectedBrand;
      setSelectedBrand(isDeselecting ? null : brandId);
      const brandName = brands?.find((b) => b.brand_id === brandId)?.brand_name;
      notify(isDeselecting ? 'Cleared brand filter' : `Filtering by ${brandName}`);
    },
    [selectedBrand, brands, notify]
  );

  const showLoading =
    (revenueLoading || brandsLoading) && !timedOut && !forceShow &&
    revenue?.length === 0 && yearlyData?.length === 0;

  if (showLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="w-11 h-11 border-3 border-muted border-t-primary rounded-full animate-spin" />
        <p className="text-muted-foreground text-sm">Loading dashboard data...</p>
        <p className="text-[10px] text-muted-foreground opacity-70">This may take a moment</p>
      </div>
    );
  }

  return (
    <div id="dashboard-report-container" className="space-y-8 pb-12 relative">
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 20,  x: '-50%' }}
            exit={{ opacity: 0 }}
            className="fixed top-4 left-1/2 z-[100] bg-card px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border"
          >
            <CheckCircle2 size={16} className="text-emerald-500" />
            <span className="text-sm font-bold">{notification}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
          <p className="text-muted-foreground mt-1">Welcome back, here is what is happening today.</p>
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
              : <><RefreshCw size={14} /> Rerun ML Model</>}
          </button>
          <SortByButton
            brands={brands}
            onBrandChange={setSelectedBrand}
            selectedBrand={selectedBrand}
            onDateRangeChange={setDateRange}
            dateRange={dateRange}
          />
        </div>
      </div>

      {selectedBrand && selectedBrandName && (
        <div className="flex items-center gap-2 flex-wrap bg-primary/5 border border-primary/20 rounded-lg px-4 py-2">
          <span className="text-[9px] text-muted-foreground">Active filter:</span>
          <span className="text-[9px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">Brand: {selectedBrandName}</span>
          <button onClick={() => setSelectedBrand(null)} className="text-[9px] text-muted-foreground hover:text-primary transition-colors ml-auto">
            Clear filter
          </button>
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard
          title="Total Revenue" value={formatCurrency(totalRevenue)} icon={ArrowUpRight}
          badge={selectedBrandName ? `Brand: ${selectedBrandName}` : 'All Time'} badgeStyle="bg-primary/10 text-primary"
          action={!selectedBrand ? 'View Analysis →' : ''} onAction={() => !selectedBrand && navigate('/admin/revenue')}
        />
        <KpiCard
          title="Brands Overview" value={`${activeBrands}/${atRisk}`} icon={AlertTriangle}
          badge={`${atRisk} High Risk of Churn`} badgeStyle={atRisk > 0 ? 'bg-destructive text-white' : 'bg-emerald-500 text-white'}
          action="Manage Brands →" onAction={() => navigate('/admin/brands')}
        />
        <KpiCard
          title="Total Staff" value={totalTeamMembers} icon={Activity}
          badge="Active Staff" badgeStyle="bg-primary/10 text-primary"
          action="Manage Team →" onAction={() => navigate('/admin/team')}
        />
        <KpiCard
          title="Partnership Status" value={partnerCount} icon={Handshake}
          badge="Total Active Partnerships" badgeStyle="bg-primary/10 text-primary"
          action="View Partnerships →" onAction={() => navigate('/admin/leads')}
        >
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/20 p-3 text-center">
              <p className="text-xs text-gray-400">In Progress</p>
              <p className="text-lg font-bold text-yellow-400">{partnershipStats.inProgress}</p>
            </div>
            <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-3 text-center">
              <p className="text-xs text-gray-400">Dealing</p>
              <p className="text-lg font-bold text-blue-400">{partnershipStats.dealing}</p>
            </div>
            <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-3 text-center">
              <p className="text-xs text-gray-400">Partner</p>
              <p className="text-lg font-bold text-green-400">{partnershipStats.partner}</p>
            </div>
          </div>
        </KpiCard>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <RevenueBarChart
          chartData={chartData} hasForecast={hasForecast} isRetraining={isRetraining} isLoading={false}
          onRerunModel={handleRerunModel} formatCompactCurrency={formatCompactCurrency} formatCurrency={formatCurrency}
          selectedBrand={selectedBrandName} forecastDrop={forecastDrop}
        />

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
                <div className="flex flex-col items-center gap-3">
                  <div className="w-full h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={platformData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={80}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {platformData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0];
                            return (
                              <div className="bg-card/95 backdrop-blur-md border border-border p-2 rounded-lg shadow-lg flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.payload.color }} />
                                <span className="text-[10px] font-bold">{d.name}</span>
                                <span className="text-[10px] font-bold text-primary">{d.value}%</span>
                              </div>
                            );
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
                    {platformData.map((p) => (
                      <div key={p.name} className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                        <span className="text-[11px] font-semibold text-muted-foreground">{p.name}</span>
                        <span className="text-[11px] font-bold text-foreground">{p.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">No platform data available</div>
              )}
            </div>
          </div>

          <CriticalRiskMonitor onBrandClick={handleBrandClick} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;