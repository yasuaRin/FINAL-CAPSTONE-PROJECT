import { useMemo, useState, useEffect, useCallback, useContext } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Download, Activity,
  ShieldAlert, CheckCircle2, ArrowUpRight,
  PieChart as PieChartIcon, AlertTriangle, Handshake,
  TrendingUp, Users, Layers, GitBranch
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  Tooltip as RechartsTooltip
} from 'recharts';
import { useRevenue } from '../../hooks/useRevenue';
import { useBrands } from '../../hooks/useBrands';
import { useTeam } from '../../hooks/useTeam';
import { usePredictions } from '../../hooks/usePredictions';
import { supabase } from '../../services/supabase';
import { RevenueLineChart } from '../../components/dashboard/RevenueLineChart';
import { AdminActionContext } from '../../components/layout/AdminLayout';
import { exportCompleteReport } from '../../utils/exportPDF';

const SHOPEE_ORANGE = '#EE4D2D';
const SHOPEE_ORANGE_HOVER = '#d43d1f';

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

// ── Rerun-model toast (mirrors the export-PDF toast in utils/exportPDF.js) ──
// Self-contained: appends its own keyframe style tag once, builds a
// backdrop + centered toast with spinner, optional Stop button, and
// theme-aware colors based on the `.dark` class on <html>.
const isDarkModeActive = () => document.documentElement.classList.contains('dark');

let _rerunAborted = false;
const resetRerunAbort = () => { _rerunAborted = false; };
const abortRerun       = () => { _rerunAborted = true; };
const isRerunAborted   = () => _rerunAborted;

const createRerunToast = (message, showStop = false, onStop) => {
  const existing = document.getElementById('rerun-model-toast');
  if (existing) existing.remove();
  const existingBackdrop = document.getElementById('rerun-model-backdrop');
  if (existingBackdrop) existingBackdrop.remove();

  if (!document.getElementById('rerun-toast-spin-style')) {
    const style = document.createElement('style');
    style.id = 'rerun-toast-spin-style';
    style.textContent = `@keyframes _rerun_toast_spin { to { transform: rotate(360deg); } }`;
    document.head.appendChild(style);
  }

  const backdrop = document.createElement('div');
  backdrop.id = 'rerun-model-backdrop';
  backdrop.style.cssText = `
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.45);
    backdrop-filter: blur(2px);
    z-index: 999998;
  `;

  const dark = isDarkModeActive();
  const toastBg          = dark ? '#111827' : '#ffffff';
  const toastColor       = dark ? '#ffffff' : '#111827';
  const spinnerBorder    = dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)';
  const spinnerBorderTop = dark ? '#ffffff' : '#111827';
  const stopBtnHoverBg   = '#dc2626';

  const toast = document.createElement('div');
  toast.id = 'rerun-model-toast';
  toast.style.cssText = `
    position: fixed; top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    background: ${toastBg}; color: ${toastColor};
    font-size: 0.875rem; font-weight: 700;
    padding: 1.25rem 2rem; border-radius: 1rem;
    box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
    z-index: 999999; display: flex; flex-direction: column;
    align-items: center; gap: 0.875rem;
    min-width: 260px; text-align: center;
  `;

  const spinner = document.createElement('span');
  spinner.id = 'rerun-toast-spinner';
  spinner.style.cssText = `
    display: inline-block; width: 1.75rem; height: 1.75rem;
    border: 3px solid ${spinnerBorder};
    border-top-color: ${spinnerBorderTop}; border-radius: 9999px;
    animation: _rerun_toast_spin 0.7s linear infinite; flex-shrink: 0;
  `;

  const text = document.createElement('span');
  text.id = 'rerun-toast-text';
  text.innerText = message;
  text.style.cssText = `font-size: 0.875rem; font-weight: 700; line-height: 1.4; white-space: pre-line;`;

  toast.appendChild(spinner);
  toast.appendChild(text);

  if (showStop) {
    const stopBtn = document.createElement('button');
    stopBtn.id = 'rerun-stop-btn';
    stopBtn.innerText = 'Stop';
    stopBtn.style.cssText = `
      margin-top: 0.25rem; background: #ef4444; color: #ffffff;
      border: none; border-radius: 0.5rem; padding: 0.4rem 1.25rem;
      font-size: 0.75rem; font-weight: 700; cursor: pointer;
      letter-spacing: 0.03em; transition: background 0.15s;
    `;
    stopBtn.onmouseenter = () => { stopBtn.style.background = stopBtnHoverBg; };
    stopBtn.onmouseleave = () => { stopBtn.style.background = '#ef4444'; };
    stopBtn.onclick = () => {
      abortRerun();
      updateRerunToast('Stopping training...');
      hideRerunStopButton();
      showRerunSpinner(false);
      onStop?.();
    };
    toast.appendChild(stopBtn);
  }

  document.body.appendChild(backdrop);
  document.body.appendChild(toast);
  return toast;
};

const updateRerunToast = (message) => {
  const text = document.getElementById('rerun-toast-text');
  if (text) text.innerText = message;
};

const hideRerunStopButton = () => {
  document.getElementById('rerun-stop-btn')?.remove();
};

const showRerunSpinner = (show) => {
  const spinner = document.getElementById('rerun-toast-spinner');
  if (spinner) spinner.style.display = show ? 'inline-block' : 'none';
};

const removeRerunToast = () => {
  document.getElementById('rerun-model-toast')?.remove();
  document.getElementById('rerun-model-backdrop')?.remove();
};
// ─────────────────────────────────────────────────────────────────────────────

const KpiCard = ({ title, value, icon: Icon, badge, badgeStyle, action, onAction, children }) => {
  const hoverColorValue = '#ef4444';
  return (
    <Motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onAction}
      className="bg-card rounded-xl border border-border shadow-sm p-5 cursor-pointer transition-all"
      style={{
        transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), border-color 0.2s ease, background 0.2s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-4px) scale(1.02)";
        e.currentTarget.style.boxShadow = `0 12px 32px ${hoverColorValue}25, 0 4px 12px rgba(0,0,0,0.06)`;
        e.currentTarget.style.borderColor = hoverColorValue;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0) scale(1)";
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.borderColor = "var(--border)";
      }}
    >
      <div className="flex justify-between items-start gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
        {Icon && (
          <div className="p-1.5 rounded-lg bg-[#EE4D2D]/10 text-[#EE4D2D]">
            <Icon size={14} />
          </div>
        )}
      </div>
      <h3 className="text-xl font-bold font-mono mt-2 truncate text-foreground">{value}</h3>
      <div className="mt-2.5 flex items-center justify-between">
        {badge && (
          <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${badgeStyle}`}>{badge}</span>
        )}
        {action && (
          <span className="text-[10px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity ml-auto text-[#EE4D2D]">{action}</span>
        )}
      </div>
      {children}
    </Motion.div>
  );
};

// ── Risk level config ─────────────────────────────────────────────────────────
const RISK_CONFIG = {
  High:   { color: '#ef4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.2)',   dot: '#ef4444' },
  Medium: { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.2)',  dot: '#f59e0b' },
  Low:    { color: '#10b981', bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.2)',  dot: '#10b981' },
};

const CriticalRiskMonitor = ({ onBrandClick }) => {
  const [riskData, setRiskData] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const fetchRiskData = async () => {
      try {
        const [{ data, error }, { data: brands }] = await Promise.all([
          supabase
            .from('risk_monitor')
            .select('brand_id, risk_level_id, risk_levels(name), reasons')
            .order('risk_level_id', { ascending: true }),
          supabase.from('brands').select('brand_id, brand_name'),
        ]);
        if (error) throw error;
        const brandMap = new Map(brands?.map((b) => [b.brand_id, b.brand_name]));
        setRiskData(
          (data || []).map((item) => ({
            id:      item.brand_id,
            name:    brandMap.get(item.brand_id) || 'Unknown',
            risk:    item.risk_levels?.name || 'Unassessed',
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
      <div className="w-full p-3">
        <div className="space-y-1.5">
          {[1,2,3].map(i => (
            <div key={i} className="h-8 rounded-md bg-muted/40 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center justify-between">
        <div>
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-foreground">Brand Risk Monitor</h2>
          <p className="text-[10px] text-muted-foreground mt-0.5">Real-time risk assessment across all monitored brands</p>
        </div>
      </div>

      {/* Grid Layout - Replaces table */}
      <div className="w-full overflow-x-auto p-3">
        {/* Header Row */}
        <div className="grid grid-cols-[180px_120px_1fr] gap-3 px-4 py-1.5 border-b border-border/40 bg-muted/10 rounded-t-lg">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Brand</div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Risk Level</div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Risk Factors</div>
        </div>

        {/* Data Rows */}
        <div className="divide-y divide-border/30">
          {riskData.length === 0 ? (
            <div className="px-4 py-4 text-center text-sm text-muted-foreground">
              No risk data available
            </div>
          ) : (
            riskData.map((brand, idx) => {
              const cfg = RISK_CONFIG[brand.risk] || RISK_CONFIG.Low;
              return (
                <div
                  key={brand.id}
                  className="grid grid-cols-[180px_120px_1fr] gap-3 px-4 py-2 items-center transition-all cursor-pointer"
                  style={{
                    transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), border-color 0.2s ease, background 0.2s ease",
                    borderRadius: idx === 0 ? '8px 8px 0 0' : idx === riskData.length - 1 ? '0 0 8px 8px' : '0',
                    border: '1px solid var(--border)',
                    background: 'var(--card)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.boxShadow = "0 12px 32px rgba(219,26,26,0.15), 0 4px 12px rgba(0,0,0,0.08)";
                    e.currentTarget.style.borderColor = "rgba(219,26,26,0.3)";
                    e.currentTarget.style.background = "rgba(219,26,26,0.02)";
                    const name = e.currentTarget.querySelector(".brand-name");
                    if (name) name.style.color = "#ef4444";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.background = "var(--card)";
                    const name = e.currentTarget.querySelector(".brand-name");
                    if (name) name.style.color = "var(--foreground)";
                  }}
                  onClick={() => onBrandClick?.(brand.id)}
                >
                  {/* Brand */}
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="brand-name text-[11px] font-bold text-foreground truncate transition-colors" style={{ transition: "color 0.15s ease" }}>
                      {brand.name}
                    </span>
                  </div>

                  {/* Risk Level */}
                  <div>
                    <div
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full"
                      style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
                    >
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cfg.dot }} />
                      <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: cfg.color }}>{brand.risk}</span>
                    </div>
                  </div>

                  {/* Risk Factors */}
                  <div className="min-w-0">
                    <p className="text-[11px] text-muted-foreground truncate">
                      {brand.reasons?.join(' • ') || 'No risk factors detected'}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export const Dashboard = () => {
  const navigate = useNavigate();
  const [notification, setNotification] = useState(null);
  const [isExporting, setIsExporting]       = useState(false);
  const [selectedBrand, setSelectedBrand]   = useState(null);
  const [timedOut, setTimedOut]             = useState(false);
  const [forceShow, setForceShow]           = useState(false);
  const [dateRange, setDateRange]           = useState({ start: null, end: null, preset: 'allData' });
  const [isDarkMode, setIsDarkMode]         = useState(false);

  const [periodsMap, setPeriodsMap] = useState(new Map());

  useEffect(() => {
    const fetchPeriods = async () => {
      try {
        const { data, error } = await supabase
          .from('periods')
          .select('period_id, period_name, period_start_date, period_end_date');
        if (!error && data) {
          setPeriodsMap(
            new Map(
              data.map((p) => [
                p.period_id,
                {
                  name:  p.period_name,
                  start: p.period_start_date,
                  end:   p.period_end_date,
                },
              ])
            )
          );
        }
      } catch (err) {
        console.error('Error fetching periods:', err);
      }
    };
    fetchPeriods();
  }, []);

  const { data: revenue, loading: revenueLoading, brandTotals, yearlyData } = useRevenue();
  const { brands, loading: brandsLoading } = useBrands(brandTotals);
  const { team }                           = useTeam();
  const { futurePredictions, retrainModels, isRetraining, cancelRetrain } = usePredictions();

  useEffect(() => {
    const checkDarkMode = () => {
      const isDark = document.documentElement.classList.contains('dark') ||
                     (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
      setIsDarkMode(isDark);
    };
    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', checkDarkMode);
    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', checkDarkMode);
    };
  }, []);

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

  const partnerCount = partneredBrands.length;

  useEffect(() => { const t = setTimeout(() => setTimedOut(true),  8000);  return () => clearTimeout(t); }, []);
  useEffect(() => { const t = setTimeout(() => setForceShow(true), 10000); return () => clearTimeout(t); }, []);

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
    const periodMap = new Map();

    filteredRevenue.forEach((item) => {
      if (!item?.period_id) return;
      periodMap.set(item.period_id, (periodMap.get(item.period_id) || 0) + sumRevenue(item));
    });

    const getDisplayName = (periodId) => {
      const p = periodsMap.get(periodId);
      if (p?.start) {
        const d = new Date(p.start);
        return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      }
      if (p?.name) return p.name;
      const basePeriod = 22;
      const baseDate = new Date(2025, 11, 1);
      const monthsDiff = periodId - basePeriod;
      const futureDate = new Date(baseDate);
      futureDate.setMonth(baseDate.getMonth() + monthsDiff);
      return futureDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    };

    const result = Array.from(periodMap.entries())
      .map(([periodId, rev]) => ({
        periodId,
        displayName: getDisplayName(periodId),
        actual: rev,
        forecast: 0,
      }))
      .sort((a, b) => a.periodId - b.periodId);

    if (futurePredictions?.length > 0 && !selectedBrand && dateRange.preset === 'allData') {
      const predByPeriod = new Map();
      futurePredictions.forEach((pred) => {
        if (pred?.period_id && pred.is_future === true) {
          predByPeriod.set(
            pred.period_id,
            (predByPeriod.get(pred.period_id) || 0) + (pred.predicted || 0)
          );
        }
      });
      predByPeriod.forEach((value, periodId) => {
        const existing = result.find((r) => r.periodId === periodId);
        if (existing) {
          existing.forecast = value;
        } else {
          result.push({
            periodId,
            displayName: getDisplayName(periodId),
            actual: 0,
            forecast: value,
          });
        }
      });
    }

    return result.sort((a, b) => a.periodId - b.periodId);
  }, [filteredRevenue, futurePredictions, selectedBrand, dateRange.preset, periodsMap]);

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

  // TikTok color based on dark mode
  const tiktokColor = isDarkMode ? '#3b82f6' : '#000000';
  const multiColor = isDarkMode ? '#ffffff' : '#1DA1F2';

  const platformData = useMemo(() => {
    if (!filteredRevenue || filteredRevenue.length === 0) return [];
    let totalShopee = 0;
    let totalTikTok = 0;
    let totalMulti  = 0;
    filteredRevenue.forEach((item) => {
      const s = item.revenue_shopee ?? 0;
      const t = item.revenue_tiktok ?? 0;
      totalShopee += s;
      totalTikTok += t;
      if (s > 0 && t > 0) totalMulti += (s + t);
    });
    const total = totalShopee + totalTikTok;
    if (total === 0) return [];
    const segments = [
      { name: 'TikTok', value: totalTikTok, color: tiktokColor },
      { name: 'Shopee', value: totalShopee, color: '#EE4D2D' },
    ];
    if (totalMulti > 0) segments.push({ name: 'Multi', value: totalMulti, color: multiColor });
    const grandTotal = total + totalMulti;
    return segments.map(s => ({ ...s, value: Math.round((s.value / grandTotal) * 100) }));
  }, [filteredRevenue, multiColor, tiktokColor]);

  const { registerActions } = useContext(AdminActionContext);

  // ── Type-based notification system ────────────────────────────────────────────
  const notify = useCallback((message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  }, []);

  // ── Rerun Model: uses the same toast/backdrop/spinner/Stop-button pattern ──
  // as the PDF export flow in utils/exportPDF.js (createToast / updateToast /
  // hideStopButton / removeToast), adapted here as createRerunToast etc.
  const handleRerunModel = useCallback(async () => {
    resetRerunAbort();

    createRerunToast('ML training started...', true, cancelRetrain);

    let loadingTimer;

    try {
      loadingTimer = setTimeout(() => {
if (!isRerunAborted()) updateRerunToast('Model is currently being trained. \nPlease wait, this may take a while...');      }, 1200);

      const result = await retrainModels();

      clearTimeout(loadingTimer);

      if (isRerunAborted() || result.aborted) {
        // Stop button was pressed (or the fetch itself was aborted) — leave
        // the "Stopping training..." message and close shortly after.
        hideRerunStopButton();
        showRerunSpinner(false);
        updateRerunToast('Training stopped.');
        setTimeout(removeRerunToast, 1200);
        return;
      }

      hideRerunStopButton();

      if (result.success) {
        showRerunSpinner(false);
        updateRerunToast('ML models retrained successfully');
      } else {
        showRerunSpinner(false);
        updateRerunToast(`Training failed:\n${result.error || 'Unknown error'}`);
      }
      setTimeout(removeRerunToast, 3000);
    } catch (err) {
      clearTimeout(loadingTimer);
      if (isRerunAborted()) {
        hideRerunStopButton();
        showRerunSpinner(false);
        updateRerunToast('Training stopped.');
        setTimeout(removeRerunToast, 1200);
        return;
      }
      hideRerunStopButton();
      showRerunSpinner(false);
      updateRerunToast(`Training error:\n${err.message}`);
      setTimeout(removeRerunToast, 3000);
    } finally {
      resetRerunAbort();
    }
  }, [retrainModels, cancelRetrain]);

  const handleExportReport = useCallback(async () => {
    setIsExporting(true);
    await exportCompleteReport();
    setIsExporting(false);
  }, []);

  useEffect(() => {
    registerActions({
      onAllData: () => {
        setSelectedBrand(null);
        setDateRange({ start: null, end: null, preset: 'allData' });
        notify('Showing all data', 'info');
      },
      onExportReport: handleExportReport,
    });
  }, [registerActions, handleExportReport, notify]);

  const handleBrandClick = useCallback(
    (brandId) => {
      const isDeselecting = brandId === selectedBrand;
      setSelectedBrand(isDeselecting ? null : brandId);
      const brandName = brands?.find((b) => b.brand_id === brandId)?.brand_name;
      notify(isDeselecting ? 'Cleared brand filter' : 'Filtering by ' + brandName, 'info');
    },
    [selectedBrand, brands, notify]
  );

  // ✅ NEW: Handle clearing brand filter from the chart's X button
  const handleClearBrandFilter = useCallback(() => {
    console.log('✅ Clearing brand filter from Dashboard');
    setSelectedBrand(null);
    setDateRange({ start: null, end: null, preset: 'allData' });
    notify('Showing all data', 'info');
  }, [notify]);

  const showLoading =
    (revenueLoading || brandsLoading) && !timedOut && !forceShow &&
    revenue?.length === 0 && yearlyData?.length === 0;

  if (showLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="w-11 h-11 border-3 border-muted border-t-[#EE4D2D] rounded-full animate-spin" />
        <p className="text-muted-foreground text-sm">Loading dashboard data...</p>
        <p className="text-[10px] text-muted-foreground opacity-70">This may take a moment</p>
      </div>
    );
  }

  return (
    <div id="dashboard-report-container" className="space-y-6 pb-12 relative">
      <AnimatePresence>
        {notification && (
          <Motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 20,  x: '-50%' }}
            exit={{ opacity: 0 }}
            className="fixed top-4 left-1/2 z-[100] bg-[#0a0f1a] border border-white/10 px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3"
          >
            {notification?.type === 'success' && (
              <CheckCircle2 size={16} className="text-emerald-400" />
            )}
            {notification?.type === 'error' && (
              <AlertTriangle size={16} className="text-red-400" />
            )}
            {notification?.type === 'info' && (
              <Activity size={16} className="text-blue-400 animate-pulse" />
            )}
            <span className="text-sm font-semibold text-white">{notification?.message || notification}</span>
          </Motion.div>
        )}
      </AnimatePresence>

      {/* Page Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">Overview</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Revenue"
          value={formatCurrency(totalRevenue)}
          icon={TrendingUp}
          badge={selectedBrandName ? selectedBrandName : 'All Time'}
          badgeStyle="bg-[#EE4D2D]/10 text-[#EE4D2D]"
          action={!selectedBrand ? 'View Analysis' : ''}
          onAction={() => !selectedBrand && navigate('/admin/revenue')}
        />
        <KpiCard
          title="Brands Overview"
          value={`${activeBrands} / ${atRisk}`}
          icon={Layers}
          badge={`${atRisk} High Risk`}
          badgeStyle={atRisk > 0 ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}
          action="Manage Brands"
          onAction={() => navigate('/admin/brands')}
        />
        <KpiCard
          title="Total Staff"
          value={totalTeamMembers}
          icon={Users}
          badge="Active Members"
          badgeStyle="bg-violet-500/10 text-violet-500"
          action="Manage Team"
          onAction={() => navigate('/admin/team')}
        />
        <KpiCard
          title="Partnerships"
          value={partnerCount}
          icon={Handshake}
          badge="Total Active"
          badgeStyle="bg-amber-500/10 text-amber-500"
          action="View Leads"
          onAction={() => navigate('/admin/leads')}
        />
      </div>

      {/* Revenue Chart - Full Width */}
      <RevenueLineChart
        chartData={chartData}
        hasForecast={hasForecast}
        isRetraining={isRetraining}
        isLoading={false}
        onRerunModel={handleRerunModel}
        formatCompactCurrency={formatCompactCurrency}
        formatCurrency={formatCurrency}
        selectedBrand={selectedBrandName}
        onClearBrandFilter={handleClearBrandFilter} // ✅ ADDED THIS
        forecastDrop={forecastDrop}
      />

      {/* Platform Split + Risk Monitor - Side by Side with adjusted widths */}
      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
        {/* Platform Split - Smaller */}
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <PieChartIcon size={14} className="text-[#EE4D2D]" />
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-foreground">Platform Contribution</h3>
            </div>
          </div>
          <div className="flex-1 p-4 flex flex-col items-center justify-center">
            {platformData.length > 0 ? (
              <div className="w-full">
                <div className="relative">
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={platformData}
                        cx="50%" cy="50%"
                        innerRadius={50} outerRadius={72}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {platformData.map((entry, i) => (
                          <Cell
                            key={i}
                            fill={entry.name === 'Multi' ? multiColor : entry.color}
                            stroke="transparent"
                          />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const d = payload[0];
                          return (
                            <div className="bg-card border border-border p-2 rounded-lg shadow-lg flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.payload.name === 'Multi' ? multiColor : d.payload.color }} />
                              <span className="text-[10px] font-semibold text-foreground">{d.name}</span>
                              <span className="text-[10px] font-bold text-[#EE4D2D]">{d.value}%</span>
                            </div>
                          );
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    {(() => {
                      const top = [...platformData].sort((a, b) => b.value - a.value)[0];
                      const topColor = top.name === 'Multi' ? multiColor : top.color;
                      return (
                        <>
                          <span className="text-xl font-bold tabular-nums" style={{ color: topColor }}>{top.value}%</span>
                          <span className="text-[10px] text-muted-foreground font-medium mt-0.5">{top.name}</span>
                        </>
                      );
                    })()}
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  {platformData.map((p) => {
                    const color = p.name === 'Multi' ? multiColor : p.color;
                    return (
                      <div key={p.name} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: color }} />
                        <span className="text-[10px] text-muted-foreground flex-1">{p.name}</span>
                        <div className="flex items-center gap-1.5">
                          <div className="h-1 rounded-full bg-border w-12 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${p.value}%`, backgroundColor: color }} />
                          </div>
                          <span className="text-[10px] font-bold tabular-nums w-7 text-right" style={{ color }}>{p.value}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground text-sm">No platform data available</div>
            )}
          </div>
        </div>

        {/* Risk Monitor - Takes remaining space */}
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <CriticalRiskMonitor onBrandClick={handleBrandClick} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;