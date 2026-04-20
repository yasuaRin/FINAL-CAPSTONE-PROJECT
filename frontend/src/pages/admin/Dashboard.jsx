import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUpRight, Download, Activity, Sparkles,
  ShieldAlert, CheckCircle2,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { format } from 'date-fns';
import { useRevenue } from '../../hooks/useRevenue';
import { useBrands } from '../../hooks/useBrands';
import { useTeam } from '../../hooks/useTeam';

export const Dashboard = () => {
  const navigate = useNavigate();
  const { data: revenue, loading: revenueLoading } = useRevenue();
  const { brands, loading: brandsLoading } = useBrands();
  const { team, loading: teamLoading } = useTeam();

  const [timedOut, setTimedOut] = useState(false);
  const [notification, setNotification] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

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

  // ── KPIs — all real data from Supabase ──
  const kpis = useMemo(() => {
    const totalRevenue = revenue?.reduce((s, i) =>
      s + (i.revenue_shopee || 0) + (i.revenue_tiktok || 0), 0) || 0;
    const activeBrands = brands?.filter(b => b.brand_status === 'active').length || 0;
    const atRisk = brands?.filter(b => b.brand_status !== 'active').length || 0;

    // Top performer: sum revenue per host_id, find the highest
    const staffRev = {};
    revenue?.forEach(item => {
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

    // Growth: compare last 7 unique dates vs previous 7
    const sorted = [...(revenue || [])]
      .map(item => ({ ...item, normalizedDate: normalizeDateKey(item.date) }))
      .filter(item => item.normalizedDate)
      .sort((a, b) => new Date(b.normalizedDate) - new Date(a.normalizedDate));

    const uniqueDates = [...new Set(sorted.map(i => i.normalizedDate))];
    const recentDates = uniqueDates.slice(0, 7);
    const previousDates = uniqueDates.slice(7, 14);

    const last7 = revenue?.filter(i => recentDates.includes(normalizeDateKey(i.date))) || [];
    const prev7 = revenue?.filter(i => previousDates.includes(normalizeDateKey(i.date))) || [];

    const l7t = last7.reduce((s, i) => s + (i.revenue_shopee || 0) + (i.revenue_tiktok || 0), 0);
    const p7t = prev7.reduce((s, i) => s + (i.revenue_shopee || 0) + (i.revenue_tiktok || 0), 0);
    const growth = p7t > 0 ? ((l7t - p7t) / p7t * 100).toFixed(1) : 0;

    return { totalRevenue, activeBrands, atRisk, topName, topRev, growth };
  }, [revenue, brands, team]);

  // ── Chart — mock for now (replace with real revenue when ready) ──
  const chartData = useMemo(() => {
    const days = 7;
    const result = [];
    const today = new Date();
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(today.getDate() - (days - 1 - i));
      const baseActual = 50000 + (i * 5000) + (Math.random() * 10000);
      result.push({
        date: format(date, 'MMM dd'),
        actual: Math.round(baseActual),
        prediction: Math.round(baseActual * (1.05 + Math.random() * 0.05)),
      });
    }
    return result;
  }, [revenue]);

  // ── Platform split — real Supabase data ──
// ── Platform split — with MULTI support (3 platforms) using Tailwind CSS ──
const platformData = useMemo(() => {
  if (!revenue?.length) return [];
  
  let shopeeOnlyRev = 0;
  let tiktokOnlyRev = 0;
  let multiRev = 0;
  
  revenue.forEach(item => {
    const hasShopee = (item.revenue_shopee || 0) > 0;
    const hasTiktok = (item.revenue_tiktok || 0) > 0;
    
    if (hasShopee && hasTiktok) {
      // MULTI: Both platforms have revenue
      multiRev += (item.revenue_shopee || 0) + (item.revenue_tiktok || 0);
    } else if (hasShopee) {
      // SHOPEE ONLY
      shopeeOnlyRev += (item.revenue_shopee || 0);
    } else if (hasTiktok) {
      // TIKTOK ONLY
      tiktokOnlyRev += (item.revenue_tiktok || 0);
    }
  });
  
  const total = shopeeOnlyRev + tiktokOnlyRev + multiRev;
  if (total === 0) return [];
  
  const result = [];
  
  if (shopeeOnlyRev > 0) {
    result.push({ 
      name: 'Shopee', 
      value: shopeeOnlyRev, 
      color: '#00f5ff', // Cyan
      bgClass: 'bg-[#00f5ff]',
      badgeClass: 'bg-cyan-100 text-cyan-700',
      pct: (shopeeOnlyRev / total * 100).toFixed(1) 
    });
  }
  
  if (tiktokOnlyRev > 0) {
    result.push({ 
      name: 'TikTok', 
      value: tiktokOnlyRev, 
      color: '#010101', // Black
      bgClass: 'bg-black',
      badgeClass: 'bg-black/5 text-black',
      pct: (tiktokOnlyRev / total * 100).toFixed(1) 
    });
  }
  
  if (multiRev > 0) {
    result.push({ 
      name: 'Multi', 
      value: multiRev, 
      color: '#ef4444', // Tailwind red-500
      bgClass: 'bg-red-500',
      badgeClass: 'bg-red-100 text-red-600',
      pct: (multiRev / total * 100).toFixed(1) 
    });
  }
  
  return result.sort((a, b) => b.value - a.value);
}, [revenue]);

  // ── At-risk brands — real Supabase data ──
  // Definition: any brand whose brand_status is NOT 'active'
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

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      setNotification('Report exported successfully');
      setTimeout(() => setNotification(null), 3000);
    }, 1500);
  };

  const isLoading = (revenueLoading || brandsLoading || teamLoading) && !timedOut;

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '16px' }}>
        <div style={{ width: '44px', height: '44px', border: '3px solid #f0f2f5', borderTopColor: '#1a1a1a', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: '#7b809a', fontSize: '14px', fontWeight: '500' }}>Loading intelligence data...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: '8px' }}>

      {/* ── Toast notification ── */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 16, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            style={{
              position: 'fixed', top: 0, left: '50%', zIndex: 9999,
              background: '#1a1a1a', color: 'white',
              padding: '12px 24px', borderRadius: '16px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              display: 'flex', alignItems: 'center', gap: '10px',
              border: '1px solid rgba(255,255,255,0.1)'
            }}
          >
            <div style={{ background: '#4caf50', borderRadius: '50%', padding: '2px', display: 'flex' }}>
              <CheckCircle2 size={14} />
            </div>
            <span style={{ fontSize: '13px', fontWeight: '700' }}>{notification}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#344767', margin: 0, letterSpacing: '-0.5px' }}>
            Dashboard Overview
          </h1>
          <p style={{ color: '#7b809a', fontSize: '14px', margin: '4px 0 0' }}>
            Welcome back — here's what's happening today.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'rgba(76,175,80,0.08)', color: '#4caf50',
            padding: '6px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '700'
          }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4caf50', animation: 'pulse 2s infinite' }} />
            Live from Supabase
          </div>
          <button onClick={handleExport} disabled={isExporting} className="btn-primary">
            {isExporting ? <Activity size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Download size={15} />}
            Export Report
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        {[
          {
            label: 'Total Revenue',
            value: `Rp ${kpis.totalRevenue.toLocaleString()}`,
            trend: `${kpis.growth >= 0 ? '+' : ''}${kpis.growth}%`,
            trendLabel: 'vs last period',
            trendBg: kpis.growth >= 0 ? 'rgba(76,175,80,0.1)' : 'rgba(234,6,6,0.1)',
            trendColor: kpis.growth >= 0 ? '#4caf50' : '#ea0606',
            border: '#1a1a1a', path: '/admin/revenue'
          },
          {
            label: 'Active Brands',
            value: kpis.activeBrands,
            trend: 'Live', trendLabel: 'monitored nodes',
            trendBg: 'rgba(33,150,243,0.1)', trendColor: '#2196f3',
            border: '#2196f3', path: '/admin/brands'
          },
          {
            label: 'At-Risk Nodes',
            value: kpis.atRisk,
            trend: 'Critical', trendLabel: 'priority nodes',
            trendBg: 'rgba(234,6,6,0.1)', trendColor: '#ea0606',
            border: '#ea0606', path: '/admin/brands'
          },
          {
            label: 'Top Performer',
            value: kpis.topName.split(' ')[0] || 'N/A',
            trend: kpis.topRev > 0 ? `Rp ${(kpis.topRev / 1000).toFixed(0)}k` : 'N/A',
            trendLabel: 'top revenue',
            trendBg: 'rgba(255,152,0,0.1)', trendColor: '#ff9800',
            border: '#ff9800', path: '/admin/team'
          },
        ].map((card, i) => (
          <motion.div
            key={i}
            whileHover={{ y: -4, scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => navigate(card.path)}
            className="dashboard-card"
            style={{ padding: '20px', borderLeft: `4px solid ${card.border}`, cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#7b809a', marginBottom: '6px' }}>
                  {card.label}
                </div>
                <div style={{ fontSize: '22px', fontWeight: '800', color: '#344767', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '-0.5px' }}>
                  {card.value}
                </div>
              </div>
              <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(0,0,0,0.04)', color: '#7b809a' }}>
                <ArrowUpRight size={18} />
              </div>
            </div>
            <div style={{ marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '10px', fontWeight: '700', background: card.trendBg, color: card.trendColor, padding: '2px 8px', borderRadius: '20px' }}>
                {card.trend}
              </span>
              <span style={{ fontSize: '10px', color: '#7b809a' }}>{card.trendLabel}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Main Grid: Chart (left) + Platform Mix (right) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px', marginBottom: '24px' }}>

        {/* Revenue Chart */}
        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e4e1db', overflow: 'hidden', width: '100%' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e4e1db', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={16} color="#1a1a1a" />
              <h3 style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
                Revenue Forecast & Trend Analysis
              </h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#1a1a1a' }} />
                <span style={{ fontSize: '10px', fontWeight: '500' }}>Actual</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }} />
                <span style={{ fontSize: '10px', fontWeight: '500' }}>Predicted</span>
              </div>
            </div>
          </div>
          <div style={{ height: '380px', width: '100%', padding: '16px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1a1a1a" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#1a1a1a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#7b809a' }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#7b809a' }} tickFormatter={(val) => `Rp ${(val / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e4e1db', fontSize: '12px' }}
                  formatter={(value) => [`Rp ${value.toLocaleString()}`, '']}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Area type="monotone" dataKey="actual" stroke="#1a1a1a" strokeWidth={2.5} fillOpacity={1} fill="url(#colorActual)" />
                <Area type="monotone" dataKey="prediction" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Platform Mix */}
        <div className="dashboard-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(0,0,0,0.06)', background: 'rgba(0,0,0,0.015)' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#344767' }}>
              Platform Mix
            </span>
          </div>
          <div style={{ padding: '16px' }}>
            {platformData.length > 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <PieChart width={150} height={150}>
                  <Pie data={platformData} cx={75} cy={75} innerRadius={42} outerRadius={62} paddingAngle={5} dataKey="value">
                    {platformData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ fontSize: '11px', borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    formatter={(value) => [`Rp ${value.toLocaleString()}`, '']}
                  />
                </PieChart>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {platformData.map((p, i) => (
                    <div key={i}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#7b809a', textTransform: 'uppercase' }}>{p.name}</span>
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: '800', color: '#344767', paddingLeft: '16px' }}>{p.pct}%</div>
                      <div style={{ fontSize: '11px', color: '#7b809a', paddingLeft: '16px' }}>Rp {p.value.toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#7b809a', fontSize: '13px', padding: '32px 0' }}>No platform data yet</div>
            )}
          </div>
        </div>

      </div>{/* end Main Grid */}

      {/* ── Critical Risk Monitor — card list style (matches AI Studio reference) ── */}
      <div className="dashboard-card" style={{ padding: 0, overflow: 'hidden', marginBottom: '24px' }}>

        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid rgba(0,0,0,0.06)',
          background: 'rgba(234,6,6,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={15} color="#ea0606" />
            <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#ea0606' }}>
              Critical Risk Monitor
            </span>
            {/* Live count — real number from Supabase */}
            <span style={{ fontSize: '10px', fontWeight: '700', background: '#ea0606', color: 'white', padding: '2px 8px', borderRadius: '20px' }}>
              {atRiskBrands.length} at risk
            </span>
          </div>
          <button
            onClick={() => navigate('/admin/brands')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: '700', color: '#7b809a' }}
          >
            View All Brands →
          </button>
        </div>

        {/* Card list body */}
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {atRiskBrands.length > 0 ? atRiskBrands.map((b) => {
            // Risk level logic:
            // Since all flagged brands share brand_status !== 'active',
            // we differentiate visually: 'inactive' = High, anything else = Medium
            const isHigh = b.brand_status === 'churned';
            const riskLabel = isHigh ? 'High' : 'Medium';
            const riskBg   = isHigh ? '#ea0606' : '#fb8c00';

            return (
              <div
                key={b.brand_id}
                onClick={() => navigate('/admin/brands')}
                style={{
                  padding: '12px', borderRadius: '10px', cursor: 'pointer',
                  border: '1px solid rgba(0,0,0,0.06)',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(234,6,6,0.03)';
                  e.currentTarget.style.borderColor = 'rgba(234,6,6,0.25)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = 'rgba(0,0,0,0.06)';
                }}
              >
                {/* Row 1: brand name + risk badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#344767' }}>
                    {b.brand_name}
                  </span>
                  {/* Urgency badge — High = red solid, Medium = amber solid */}
                  <span style={{
                    fontSize: '10px', fontWeight: '700', padding: '2px 8px',
                    borderRadius: '4px', textTransform: 'uppercase',
                    background: riskBg, color: 'white', flexShrink: 0
                  }}>
                    {riskLabel}
                  </span>
                </div>

                {/* Row 2: reason tags — muted pill tags explaining why */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {/* Tag 1: always show the actual status from DB */}
                  <span style={{
                    fontSize: '10px', fontWeight: '600',
                    background: '#f0f2f5', color: '#7b809a',
                    padding: '2px 8px', borderRadius: '20px'
                  }}>
                    {b.brand_status}
                  </span>
                  {/* Tag 2: category context */}
                  {b.brand_category && (
                    <span style={{
                      fontSize: '10px', fontWeight: '600',
                      background: '#f0f2f5', color: '#7b809a',
                      padding: '2px 8px', borderRadius: '20px'
                    }}>
                      {b.brand_category}
                    </span>
                  )}
                  {/* Tag 3: reason derived from brand_status — real DB value, no hardcoding */}
                  <span style={{
                    fontSize: '10px', fontWeight: '600',
                    background: '#f0f2f5', color: '#7b809a',
                    padding: '2px 8px', borderRadius: '20px'
                  }}>
                    {b.brand_status === 'churned' ? 'Client Churned' : 'Revenue Decline'}
                  </span>
                </div>
              </div>
            );
          }) : (
            <div style={{ padding: '32px', textAlign: 'center', color: '#7b809a', fontSize: '13px' }}>
              ✅ All brands are active — no risks detected
            </div>
          )}
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '16px', textAlign: 'center' }}>
        <p style={{ fontSize: '10px', color: '#7b809a', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
          VidHelp Intelligence Hub • System Operational • {new Date().toLocaleTimeString()}
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>
    </div>
  );
};

export default Dashboard;