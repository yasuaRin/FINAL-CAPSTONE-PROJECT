﻿/**
 * Revenue.jsx
 * ══════════════════════════════════════════════════════════════
 * DESIGN: Matches the AI Studio prototype (RevenueModule.tsx)
 * DATA:   100% real — useRevenue() / useBrands() / useTeam()
 *         NO localStorage, NO mock seeds, NO hardcoded numbers
 *
 * ── HOW DATA FLOWS (for your defense) ──────────────────────
 *
 *  Supabase table: live_sessions
 *    │
 *    ▼
 *  useRevenue() → returns `data` array where each item has:
 *    • id, date, time
 *    • revenue_shopee   ← Shopee revenue for that session
 *    • revenue_tiktok   ← TikTok revenue for that session
 *    • viewers_shopee, viewers_tiktok
 *    • likes_shopee, likes_tiktok
 *    • host_id          ← FK → team table
 *    • brand_id         ← FK → brands table
 *
 *  useBrands() → returns `brands` array (for brand name lookup)
 *  useTeam()   → returns `team` array   (for host name lookup)
 *
 * ── KEY CALCULATIONS ────────────────────────────────────────
 *
 *  totalRevenue     = Σ (revenue_shopee + revenue_tiktok)
 *  totalSessions    = rawData.length
 *  avgPerSession    = totalRevenue / totalSessions
 *  topPlatform      = whichever of Shopee/TikTok has more Σ revenue
 *
 *  revenueTrend     = group by date → sum (shopee+tiktok) per day
 *                     → used for the AreaChart
 *
 *  platformStats    = [
 *                       { name:'Shopee', revenue: Σrevenue_shopee,
 *                         sessions: count, viewers: Σviewers_shopee },
 *                       { name:'TikTok', revenue: Σrevenue_tiktok,
 *                         sessions: count, viewers: Σviewers_tiktok }
 *                     ]
 *                     → used for the progress-bar Platform Revenue section
 *
 *  sessionRows      = rawData enriched with brandName + hostName
 *                     → used for the Session Intelligence table
 *
 *  DATE FILTER:
 *    dateRange.start / dateRange.end come from DateRangeSelector.
 *    We filter rawData to only rows whose date falls in that range.
 *    The DateRangeSelector component already exists in your project
 *    at ../../components/DateRangeSelector — we reuse it as-is.
 *
 * ══════════════════════════════════════════════════════════════
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Activity, CheckCircle2 } from 'lucide-react';
import {
  CartesianGrid, XAxis, YAxis, Tooltip,
  ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { subDays, isWithinInterval, startOfDay, endOfDay, parseISO } from 'date-fns';

// ── Your real hooks ──────────────────────────────────────────
import { useRevenue } from '../../hooks/useRevenue';
import { useBrands } from '../../hooks/useBrands';
import { useTeam } from '../../hooks/useTeam';

// ── Existing component from your project ────────────────────
// DateRangeSelector is already built — we just reuse it here.
import { DateRangeSelector } from '../../components/DateRangeSelector';

// ─────────────────────────────────────────────────────────────
// PLATFORM COLOR MAP
// Shopee = orange-red (brand color), TikTok = black (brand color)
// ─────────────────────────────────────────────────────────────
const PLATFORM_COLORS = {
  Shopee: '#ee4d2d',
  TikTok: '#010101',
};

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
const Revenue = () => {

  // ── 1. FETCH REAL DATA ───────────────────────────────────
  // useRevenue()  → live_sessions rows from Supabase
  // useBrands()   → brands table (for name lookup by brand_id)
  // useTeam()     → team/host table (for name lookup by host_id)
  const { data: rawData, loading: revenueLoading } = useRevenue();
  const { brands, loading: brandsLoading } = useBrands();
  const { team, loading: teamLoading } = useTeam();

  // ── 2. UI STATE ──────────────────────────────────────────
  // dateRange: controlled by DateRangeSelector component.
  // Default: last 30 days (matching the prototype default).
  const [dateRange, setDateRange] = useState({
    start: subDays(new Date(), 30),
    end: new Date(),
    preset: '30d'
  });
  const [notification, setNotification] = useState(null);

  const isLoading = revenueLoading || brandsLoading || teamLoading;

  // ── 3. DATE FILTERING ────────────────────────────────────
  // Filter rawData to only sessions within the selected date range.
  // parseISO converts "2025-03-03" string → JS Date object.
  // isWithinInterval checks if that date falls between start and end.
  // startOfDay/endOfDay ensures we include the full boundary days.
  const filteredData = useMemo(() => {
    if (!rawData?.length) return [];
    return rawData.filter(r => {
      if (!r.date) return false;
      try {
        const d = parseISO(r.date);
        return isWithinInterval(d, {
          start: startOfDay(dateRange.start),
          end: endOfDay(dateRange.end)
        });
      } catch {
        return false;
      }
    });
  }, [rawData, dateRange]);

  // ── 4. KPI CALCULATIONS ──────────────────────────────────

  // Total revenue = sum of shopee + tiktok across all filtered rows
  const totalRevenue = useMemo(() =>
    filteredData.reduce((s, r) =>
      s + (r.revenue_shopee || 0) + (r.revenue_tiktok || 0), 0),
  [filteredData]);

  // Total sessions = count of filtered rows
  const totalSessions = filteredData.length;

  // Average revenue per session
  const avgRevenuePerSession = totalSessions > 0
    ? Math.round(totalRevenue / totalSessions)
    : 0;

  // Platform stats: group into Shopee and TikTok buckets.
  // Powers "Top Platform" KPI and the progress bars.
  const platformStats = useMemo(() => {
    const stats = {
      Shopee: { name: 'Shopee', revenue: 0, viewers: 0, likes: 0, sessions: 0 },
      TikTok: { name: 'TikTok', revenue: 0, viewers: 0, likes: 0, sessions: 0 },
    };
    filteredData.forEach(r => {
      if ((r.revenue_shopee || 0) > 0 || (r.viewers_shopee || 0) > 0) {
        stats.Shopee.revenue  += r.revenue_shopee  || 0;
        stats.Shopee.viewers  += r.viewers_shopee  || 0;
        stats.Shopee.likes    += r.likes_shopee    || 0;
        stats.Shopee.sessions += 1;
      }
      if ((r.revenue_tiktok || 0) > 0 || (r.viewers_tiktok || 0) > 0) {
        stats.TikTok.revenue  += r.revenue_tiktok  || 0;
        stats.TikTok.viewers  += r.viewers_tiktok  || 0;
        stats.TikTok.likes    += r.likes_tiktok    || 0;
        stats.TikTok.sessions += 1;
      }
    });
    // Sort by revenue descending so highest platform appears first
    return Object.values(stats).sort((a, b) => b.revenue - a.revenue);
  }, [filteredData]);

  // Top platform = whichever bucket has higher total revenue
  const topPlatform = useMemo(() => {
    if (!platformStats.length || platformStats.every(p => p.revenue === 0)) return 'N/A';
    return platformStats[0].name;
  }, [platformStats]);

  // ── 5. CHART DATA ────────────────────────────────────────
  // Group filtered sessions by date.
  // For each date, sum (revenue_shopee + revenue_tiktok).
  // Result: [{ date: '2025-03-03', revenue: 12345678 }, ...]
  const revenueTrend = useMemo(() => {
    const daily = {};
    filteredData.forEach(r => {
      if (!r.date) return;
      const amt = (r.revenue_shopee || 0) + (r.revenue_tiktok || 0);
      daily[r.date] = (daily[r.date] || 0) + amt;
    });
    // Sort chronologically (oldest → newest) for correct chart direction
    return Object.entries(daily)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, revenue]) => ({ date, revenue }));
  }, [filteredData]);

  // ── 6. SESSION TABLE DATA ────────────────────────────────
  // Enrich each session row with human-readable names:
  //   brand_id (UUID) → brands[].id       → brand_name field
  //   host_id  (int)  → team[].id         → name field
  const sessionIntelligence = useMemo(() => {
    if (!filteredData.length) return [];
    return [...filteredData]
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .map(r => ({
        ...r,
        brandName: brands?.find(b => b.id === r.brand_id)?.brand_name || '—',
        hostName:  team?.find(t => t.id === r.host_id)?.name || '—',
        totalRevenue: (r.revenue_shopee || 0) + (r.revenue_tiktok || 0),
        totalViewers: (r.viewers_shopee || 0) + (r.viewers_tiktok || 0),
        // Dominant platform badge: whichever column has more revenue
        platform: (r.revenue_shopee || 0) >= (r.revenue_tiktok || 0) ? 'Shopee' : 'TikTok',
      }));
  }, [filteredData, brands, team]);

  // ── 7. DATE RANGE CHANGE HANDLER ────────────────────────
  // When user picks a new range → update state → all useMemos recompute
  const handleDateRangeChange = (newRange) => {
    setDateRange(newRange);
    setNotification('Analytics data updated');
    setTimeout(() => setNotification(null), 3000);
  };

  // ── 8. LOADING STATE ─────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Activity className="animate-spin text-slate-400" size={32} />
        <p className="text-slate-500 text-sm font-medium">Loading revenue data...</p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────
  // RENDER — layout matches the AI Studio prototype exactly
  // ─────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-16 relative"
    >

      {/* ── NOTIFICATION TOAST ──────────────────────────────
          Shows briefly after date range changes.
      */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 20, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-4 left-1/2 z-[100] bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/10"
          >
            <div className="bg-emerald-500 rounded-full p-1">
              <CheckCircle2 size={16} />
            </div>
            <span className="text-sm font-bold tracking-tight">{notification}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODULE HEADER ───────────────────────────────────
          Right side reuses your existing DateRangeSelector component.
          It calls handleDateRangeChange when user picks a new range,
          which updates dateRange state → all data recomputes via useMemo.
      */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Revenue</h1>
          <p className="text-slate-500 mt-1">
            Track performance, analyze trends, and monitor platform distribution.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DateRangeSelector value={dateRange} onChange={handleDateRangeChange} />
        </div>
      </div>

      {/* ── 1. KPI CARDS ────────────────────────────────────
          All 4 values are computed from real filteredData above.
          No hardcoded numbers anywhere.
      */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Total Revenue
          </p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold text-slate-900">
              Rp {totalRevenue.toLocaleString('id-ID')}
            </h3>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            {filteredData.length} sessions in range
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Total Sessions
          </p>
          <h3 className="text-2xl font-bold text-slate-900">
            {totalSessions.toLocaleString()}
          </h3>
          <p className="text-[10px] text-slate-400 mt-1">Live sessions recorded</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Avg Revenue / Session
          </p>
          <h3 className="text-2xl font-bold text-slate-900">
            Rp {avgRevenuePerSession.toLocaleString('id-ID')}
          </h3>
          <p className="text-[10px] text-slate-400 mt-1">Per live session average</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Top Platform
          </p>
          <h3 className="text-2xl font-bold text-slate-900">{topPlatform}</h3>
          <p className="text-[10px] text-slate-400 mt-1">
            {topPlatform !== 'N/A'
              ? `Rp ${(platformStats[0]?.revenue || 0).toLocaleString('id-ID')}`
              : 'No data yet'}
          </p>
        </div>

      </div>

      {/* ── 2. REVENUE TREND CHART ──────────────────────────
          AreaChart using revenueTrend = [{ date, revenue }].
          Grouped by date, summing shopee + tiktok per day.
          X = date (MM/DD format), Y = revenue in millions.
      */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Revenue Trend
          </h3>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-slate-900" />
            <span className="text-[10px] font-bold text-slate-500 uppercase">Daily Revenue</span>
          </div>
        </div>
        <div className="h-[350px] p-6">
          {revenueTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueTrend}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#1a1a1a" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#1a1a1a" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                  tickFormatter={val => val.split('-').slice(1).join('/')}
                  dy={10}
                  interval="preserveStartEnd"
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                  tickFormatter={val => `${(val / 1000000).toFixed(0)}M`}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px', border: 'none',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px'
                  }}
                  formatter={val => [`Rp ${Number(val).toLocaleString('id-ID')}`, 'Revenue']}
                  labelFormatter={label => `Date: ${label}`}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#1a1a1a"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorRev)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
              <TrendingUp size={32} style={{ opacity: 0.3 }} />
              <span className="text-sm">No revenue data for this period</span>
            </div>
          )}
        </div>
      </div>

      {/* ── 3 + 4. PLATFORM BARS + SESSION TABLE ────────────
          Two-column grid matching the prototype.
          Left  (1 col): Platform Revenue animated progress bars
          Right (2 col): Session Intelligence table
      */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* ── PLATFORM REVENUE BARS ─────────────────────────
            platformStats has Shopee and TikTok buckets.
            Bar width = platform.revenue / totalRevenue * 100%
            Animated from 0 → actual width using framer-motion.
        */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-50">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Platform Revenue
            </h3>
          </div>
          <div className="p-6 space-y-6">
            {totalRevenue > 0 ? (
              platformStats
                .filter(p => p.revenue > 0)
                .map(platform => {
                  const percentage = (platform.revenue / totalRevenue) * 100;
                  return (
                    <div key={platform.name} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ background: PLATFORM_COLORS[platform.name] || '#7b809a' }}
                          />
                          <span className="text-xs font-bold text-slate-700">
                            {platform.name}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-slate-900">
                            Rp {platform.revenue.toLocaleString('id-ID')}
                          </span>
                          <span className="text-[10px] text-slate-400 ml-1">
                            ({percentage.toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          className="h-full rounded-full"
                          style={{ background: PLATFORM_COLORS[platform.name] || '#1a1a1a' }}
                        />
                      </div>
                      <div className="flex gap-3 text-[10px] text-slate-400">
                        <span>{platform.sessions} sessions</span>
                        <span>·</span>
                        <span>{platform.viewers.toLocaleString('id-ID')} viewers</span>
                      </div>
                    </div>
                  );
                })
            ) : (
              <p className="text-sm text-slate-400 text-center py-8">
                No platform data for this period
              </p>
            )}
          </div>
        </div>

        {/* ── SESSION INTELLIGENCE TABLE ─────────────────────
            Each row = one live_sessions record enriched with names.
            brandName: brands.find(b => b.id === r.brand_id).brand_name
            hostName:  team.find(t => t.id === r.host_id).name
            platform:  derived from whichever revenue column is larger
            revenue:   combined shopee + tiktok for that row
        */}
        <div
          id="session-intelligence"
          className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Session Intelligence
            </h3>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg uppercase">
              {sessionIntelligence.length} sessions
            </span>
          </div>
          <div className="overflow-x-auto">
            {sessionIntelligence.length > 0 ? (
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50">
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Brand</th>
                    <th className="px-6 py-4">Platform</th>
                    <th className="px-6 py-4">Host</th>
                    <th className="px-6 py-4 text-right">Viewers</th>
                    <th className="px-6 py-4 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {sessionIntelligence.map((row, i) => (
                    <motion.tr
                      key={row.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: Math.min(i * 0.02, 0.4) }}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      {/* Date shown as MM/DD */}
                      <td className="px-6 py-4 text-xs font-medium text-slate-500">
                        {row.date ? row.date.split('-').slice(1).join('/') : '—'}
                      </td>

                      {/* Brand name from brands lookup */}
                      <td className="px-6 py-4">
                        <span className="text-xs font-bold text-slate-700">
                          {row.brandName}
                        </span>
                      </td>

                      {/* Platform badge — color coded by brand */}
                      <td className="px-6 py-4">
                        <span
                          className="text-[10px] font-bold uppercase tracking-tight px-2 py-0.5 rounded"
                          style={{
                            background: row.platform === 'Shopee'
                              ? 'rgba(238,77,45,0.1)' : 'rgba(0,0,0,0.06)',
                            color: row.platform === 'Shopee' ? '#ee4d2d' : '#344767',
                          }}
                        >
                          {row.platform}
                        </span>
                      </td>

                      {/* Host name from team lookup */}
                      <td className="px-6 py-4 text-xs font-medium text-slate-500">
                        {row.hostName}
                      </td>

                      {/* Combined viewers: viewers_shopee + viewers_tiktok */}
                      <td className="px-6 py-4 text-right text-xs font-bold text-slate-600">
                        {row.totalViewers > 0
                          ? row.totalViewers.toLocaleString('id-ID')
                          : '—'}
                      </td>

                      {/* Combined revenue: revenue_shopee + revenue_tiktok */}
                      <td className="px-6 py-4 text-right text-sm font-bold text-slate-900">
                        Rp {row.totalRevenue.toLocaleString('id-ID')}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
                <Activity size={32} style={{ opacity: 0.3 }} />
                <span className="text-sm">No sessions in this date range</span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Footer */}
      <div className="border-t border-slate-100 pt-6 text-center">
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
          VidHelp Revenue Intelligence · Live from Supabase · {rawData?.length || 0} total sessions
        </p>
      </div>

    </motion.div>
  );
};

export default Revenue;