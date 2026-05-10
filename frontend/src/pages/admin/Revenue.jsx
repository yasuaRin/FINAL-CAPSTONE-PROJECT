// frontend/src/pages/admin/Revenue.jsx

import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, Activity, FileUp, CheckCircle2,
  Filter, ChevronDown, X, AlertTriangle, Plus
} from 'lucide-react';

import DateRangeSelector from '../../components/ui/DateRangeSelector';
import { useRevenue } from '../../hooks/useRevenue';
import { useBrands } from '../../hooks/useBrands';
import { useTeam } from '../../hooks/useTeam';
import { supabase } from '../../services/supabase';

import {
  subDays, isWithinInterval, startOfDay, endOfDay,
  parseISO, format, startOfMonth, endOfMonth
} from 'date-fns';

import RevenueBrandsPanel from '../../components/revenue/RevenueBrandsPanel';
import RevenueSessionsTable from '../../components/revenue/RevenueSessionsTable';

// ---------------- HELPERS ----------------
const formatCurrency = (value) =>
  `Rp ${(value || 0).toLocaleString('id-ID')}`;

const getPeriodLabel = (dateStr) => {
  const d = parseISO(dateStr);
  return `Period ${(d.getFullYear() - 2024) * 12 + d.getMonth() + 1}`;
};

// ---------------- MAIN ----------------
const Revenue = () => {
  const [dateRange, setDateRange] = useState({
    start: subDays(new Date(), 30),
    end: new Date(),
  });

  const [insightBrandId, setInsightBrandId] = useState('All');
  const [notification, setNotification] = useState(null);
  const [tableFilter, setTableFilter] = useState({ brandId: 'All', period: 'All' });
  const [editingSession, setEditingSession] = useState(null);
  const [sessionToDelete, setSessionToDelete] = useState(null);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sessionFormData, setSessionFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'), brandId: '', platform: 'TikTok', viewers: 0, revenue: 0,
  });
  const [sortCol, setSortCol] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [rowLimit, setRowLimit] = useState(25);
  const [sortOpen, setSortOpen] = useState(false);
  const [limitOpen, setLimitOpen] = useState(false);
  const sortRef = useRef(null);
  const limitRef = useRef(null);

  const fileInputRef = useRef(null);

  const { data: revenueData, loading, refetch: refetchRevenue, totalRevenue: globalTotalRevenue, brandTotals } = useRevenue();
  const { brands } = useBrands(brandTotals);
  const { team } = useTeam();

  const brandsList = useMemo(
    () => (brands || []).map(b => ({
      id: b.brand_id,
      name: b.brand_name
    })),
    [brands]
  );

  const revenueLogs = useMemo(() => {
    if (!revenueData) return [];
    return revenueData.map(i => ({
      id: i.id,
      brandId: i.brand_id,
      date: i.date,
      platform: (i.revenue_shopee > 0 && i.revenue_tiktok > 0)
        ? 'Multi' : i.revenue_shopee > 0 ? 'Shopee' : 'TikTok',
      revenue: (i.revenue_shopee || 0) + (i.revenue_tiktok || 0),
      viewers: (i.viewers_shopee || 0) + (i.viewers_tiktok || 0),
      host_id: i.host_id,
    }));
  }, [revenueData]);

  const dateFilteredLogs = useMemo(() =>
    revenueLogs.filter(l =>
      isWithinInterval(parseISO(l.date), {
        start: startOfDay(dateRange.start),
        end: endOfDay(dateRange.end),
      })
    ),
    [revenueLogs, dateRange]
  );

  const totalRevenue = useMemo(
    () => dateFilteredLogs.reduce((a, b) => a + b.revenue, 0),
    [dateFilteredLogs]
  );

  const avgRevenue =
    dateFilteredLogs.length === 0
      ? 0
      : totalRevenue / dateFilteredLogs.length;

  const revenueGrowth = useMemo(() => {
    const today = new Date();
    const l7 = dateFilteredLogs.filter((l) => { const d = (today - parseISO(l.date)) / 86400000; return d <= 7 && d > 0; });
    const p7 = dateFilteredLogs.filter((l) => { const d = (today - parseISO(l.date)) / 86400000; return d <= 14 && d > 7; });
    const lSum = l7.reduce((s, l) => s + l.revenue, 0);
    const pSum = p7.reduce((s, l) => s + l.revenue, 0);
    if (pSum === 0) return 0;
    return ((lSum - pSum) / pSum * 100).toFixed(1);
  }, [dateFilteredLogs]);

  const topPlatform = useMemo(() => {
    const stats = {};
    dateFilteredLogs.forEach((log) => {
      if (!stats[log.platform]) stats[log.platform] = { revenue: 0 };
      stats[log.platform].revenue += log.revenue;
    });
    const entries = Object.entries(stats);
    if (!entries.length) return 'N/A';
    return entries.reduce((p, c) => p[1].revenue > c[1].revenue ? p : c)[0];
  }, [dateFilteredLogs]);

  const brandPerformanceInsights = useMemo(() => {
    const map = {};

    brandsList.forEach(b => {
      map[b.id] = {
        id: b.id,
        name: b.name,
        peakRevenue: 0,
        peakPeriod: '',
        peakRange: '',
        hasSessions: false,
      };
    });

    revenueLogs.forEach(log => {
      const b = map[log.brandId];
      if (!b) return;

      b.hasSessions = true;

      const period = getPeriodLabel(log.date);
      const date = parseISO(log.date);
      const range = `${format(startOfMonth(date), 'MMM dd')} - ${format(endOfMonth(date), 'MMM dd, yyyy')}`;

      if (log.revenue > b.peakRevenue) {
        b.peakRevenue = log.revenue;
        b.peakPeriod = period;
        b.peakRange = range;
      }
    });

    let results = Object.values(map);
    if (insightBrandId !== 'All') results = results.filter(b => b.id === insightBrandId);
    return results.sort((a, b) => b.peakRevenue - a.peakRevenue);
  }, [revenueLogs, brandsList, insightBrandId]);

  const sessionIntelligence = useMemo(() => {
    let rows = revenueLogs.map((log) => ({
      ...log,
      brandName: brandsList.find((b) => b.id === log.brandId)?.name || 'Unknown Brand',
      staffName: team?.find((t) => t.id === log.host_id)?.name || '—',
      period: getPeriodLabel(log.date),
    }));

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      rows = rows.filter((s) => s.brandName.toLowerCase().includes(term));
    }

    if (tableFilter.brandId !== 'All') rows = rows.filter((s) => s.brandId === tableFilter.brandId);
    if (tableFilter.period !== 'All') rows = rows.filter((s) => s.period === tableFilter.period);

    rows.sort((a, b) => {
      let aVal, bVal;
      if (sortCol === 'date') {
        aVal = new Date(a.date).getTime();
        bVal = new Date(b.date).getTime();
      } else if (sortCol === 'revenue') {
        aVal = a.revenue;
        bVal = b.revenue;
      } else if (sortCol === 'viewers') {
        aVal = a.viewers;
        bVal = b.viewers;
      }
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return rows;
  }, [revenueLogs, brandsList, team, searchTerm, tableFilter, sortCol, sortDir]);

  const visibleSessions = useMemo(
    () => rowLimit === null ? sessionIntelligence : sessionIntelligence.slice(0, rowLimit),
    [sessionIntelligence, rowLimit]
  );

  const sortGroups = [
    { label: 'Date', options: [{ label: 'Newest first', col: 'date', dir: 'desc' }, { label: 'Oldest first', col: 'date', dir: 'asc' }] },
    { label: 'Revenue', options: [{ label: 'Highest first', col: 'revenue', dir: 'desc' }, { label: 'Lowest first', col: 'revenue', dir: 'asc' }] },
    { label: 'Viewers', options: [{ label: 'Most viewers', col: 'viewers', dir: 'desc' }, { label: 'Fewest viewers', col: 'viewers', dir: 'asc' }] },
  ];

  const limitOptions = [10, 25, 50, 100, null];

  const activeSortLabel = (() => {
    for (const g of sortGroups) {
      const m = g.options.find((o) => o.col === sortCol && o.dir === sortDir);
      if (m) return `${g.label}: ${m.label}`;
    }
    return 'Sort';
  })();

  const notify = (msg, isError = false) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const resetForm = () => setSessionFormData({
    date: format(new Date(), 'yyyy-MM-dd'), brandId: brandsList[0]?.id || '',
    platform: 'TikTok', viewers: 0, revenue: 0,
  });

  const handleCreateSession = async () => {
    try {
      const { data: platformData } = await supabase
        .from('platforms')
        .select('platform_id')
        .eq('platform_name', sessionFormData.platform === 'Multi' ? 'multi' : sessionFormData.platform.toLowerCase())
        .single();

      const revenueShopee = sessionFormData.platform === 'Shopee' || sessionFormData.platform === 'Multi' ? sessionFormData.revenue : 0;
      const revenueTiktok = sessionFormData.platform === 'TikTok' || sessionFormData.platform === 'Multi' ? sessionFormData.revenue : 0;

      const { error } = await supabase
        .from('live_sessions')
        .insert([{
          date: sessionFormData.date,
          time: '00:00',
          revenue_shopee: revenueShopee,
          revenue_tiktok: revenueTiktok,
          viewers_shopee: sessionFormData.platform === 'Shopee' || sessionFormData.platform === 'Multi' ? sessionFormData.viewers : 0,
          viewers_tiktok: sessionFormData.platform === 'TikTok' || sessionFormData.platform === 'Multi' ? sessionFormData.viewers : 0,
          likes_shopee: 0,
          likes_tiktok: 0,
          period_id: 1,
          host_id: 1,
          brand_id: sessionFormData.brandId,
          platform_id: platformData?.platform_id
        }]);

      if (error) throw error;
      notify('Session created successfully');
      setShowSessionModal(false);
      resetForm();
      refetchRevenue();
    } catch (err) {
      console.error('Create error:', err);
      notify('Failed to create session', true);
    }
  };

  const handleUpdateSession = async () => {
    try {
      const revenueShopee = sessionFormData.platform === 'Shopee' || sessionFormData.platform === 'Multi' ? sessionFormData.revenue : 0;
      const revenueTiktok = sessionFormData.platform === 'TikTok' || sessionFormData.platform === 'Multi' ? sessionFormData.revenue : 0;

      const { error } = await supabase
        .from('live_sessions')
        .update({
          date: sessionFormData.date,
          revenue_shopee: revenueShopee,
          revenue_tiktok: revenueTiktok,
          viewers_shopee: sessionFormData.platform === 'Shopee' || sessionFormData.platform === 'Multi' ? sessionFormData.viewers : 0,
          viewers_tiktok: sessionFormData.platform === 'TikTok' || sessionFormData.platform === 'Multi' ? sessionFormData.viewers : 0,
          brand_id: sessionFormData.brandId,
        })
        .eq('id', editingSession.id);

      if (error) throw error;
      notify('Session updated successfully');
      setShowSessionModal(false);
      setEditingSession(null);
      resetForm();
      refetchRevenue();
    } catch (err) {
      console.error('Update error:', err);
      notify('Failed to update session', true);
    }
  };

  const confirmDelete = async () => {
    try {
      const { error } = await supabase
        .from('live_sessions')
        .delete()
        .eq('id', sessionToDelete.id);

      if (error) throw error;
      notify('Session deleted successfully');
      setSessionToDelete(null);
      refetchRevenue();
    } catch (err) {
      console.error('Delete error:', err);
      notify('Failed to delete session', true);
    }
  };

  const handleDeleteSession = (id) => {
    const session = sessionIntelligence.find((x) => x.id === id);
    if (session) setSessionToDelete(session);
  };

  const openEditModal = (session) => {
    setEditingSession(session);
    setSessionFormData({
      date: session.date,
      brandId: session.brandId,
      platform: session.platform,
      viewers: session.viewers,
      revenue: session.revenue,
    });
    setShowSessionModal(true);
  };

  const handleHallOfFameClick = (brandId, period) => {
    document.getElementById('session-intelligence')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTableFilter({ brandId, period });
    notify(`Showing sessions for ${period}`);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // TODO: Implement CSV upload
    console.log('File upload:', file);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Loading intelligence data...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div className="space-y-8 pb-16 relative">

      {/* Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 20, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-4 left-1/2 z-[100] bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/10"
          >
            <div className="bg-emerald-500 rounded-full p-1"><CheckCircle2 size={16} /></div>
            <span className="text-sm font-bold tracking-tight">{notification}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Revenue</h1>
          <p className="text-muted-foreground mt-1">Track performance, analyze trends, and monitor platform distribution.</p>
        </div>
        <div className="flex items-center gap-3">
          <DateRangeSelector value={dateRange} onChange={setDateRange} />
          <button onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center justify-center rounded-xl text-sm font-bold transition-all bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-6 py-2 gap-2 shadow-lg">
            <FileUp size={16} /> Import Data
          </button>
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".csv,.xlsx,.json" />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Revenue', value: formatCurrency(globalTotalRevenue), sub: `${revenueGrowth >= 0 ? '+' : ''}${revenueGrowth}% vs prev 7d` },
          { label: 'Total Sessions', value: dateFilteredLogs.length.toLocaleString() || '0' },
          { label: 'Avg Revenue / Session', value: formatCurrency(Math.round(avgRevenue)) },
          { label: 'Top Platform', value: topPlatform },
        ].map(({ label, value, sub }) => (
          <div key={label} className="bg-card p-6 rounded-2xl border border-border shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-bold text-foreground">{value}</h3>
              {sub && <span className={`text-xs font-bold ${String(sub).startsWith('-') ? 'text-red-500' : 'text-emerald-500'}`}>{sub}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Peaks + Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        
        {/* Period Performance Peaks Panel */}
        <RevenueBrandsPanel
          brandsList={brandsList}
          insightBrandId={insightBrandId}
          setInsightBrandId={setInsightBrandId}
          brandPerformanceInsights={brandPerformanceInsights}
          handleHallOfFameClick={handleHallOfFameClick}
          formatCurrency={formatCurrency}
        />

        {/* Session Intelligence Table */}
        <RevenueSessionsTable
          visibleSessions={visibleSessions}
          sessionIntelligence={sessionIntelligence}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          tableFilter={tableFilter}
          setTableFilter={setTableFilter}
          sortRef={sortRef}
          limitRef={limitRef}
          sortOpen={sortOpen}
          setSortOpen={setSortOpen}
          limitOpen={limitOpen}
          setLimitOpen={setLimitOpen}
          sortGroups={sortGroups}
          sortCol={sortCol}
          sortDir={sortDir}
          setSortCol={setSortCol}
          setSortDir={setSortDir}
          rowLimit={rowLimit}
          setRowLimit={setRowLimit}
          limitOptions={limitOptions}
          activeSortLabel={activeSortLabel}
          openEditModal={openEditModal}
          handleDeleteSession={handleDeleteSession}
          formatCurrency={formatCurrency}
          parseISO={parseISO}
          format={format}
          resetForm={resetForm}
          setShowSessionModal={setShowSessionModal}
        />
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showSessionModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="bg-card w-full max-w-md rounded-3xl border border-border shadow-2xl">
              <div className="px-6 py-4 border-b border-border bg-muted/20 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-[0.2em]">{editingSession ? 'Edit Record' : 'Record New Session'}</h3>
                <button onClick={() => setShowSessionModal(false)} className="p-2 hover:bg-muted rounded-full"><X size={16} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Target Date</label>
                  <input type="date" value={sessionFormData.date}
                    onChange={(e) => setSessionFormData({ ...sessionFormData, date: e.target.value })}
                    className="w-full bg-muted/40 border border-border rounded-xl px-4 py-3 text-xs" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Brand</label>
                    <select value={sessionFormData.brandId}
                      onChange={(e) => setSessionFormData({ ...sessionFormData, brandId: e.target.value })}
                      className="w-full bg-muted/40 border border-border rounded-xl px-4 py-3 text-xs">
                      <option value="" disabled>Select Brand</option>
                      {brandsList.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Channel</label>
                    <select value={sessionFormData.platform}
                      onChange={(e) => setSessionFormData({ ...sessionFormData, platform: e.target.value })}
                      className="w-full bg-muted/40 border border-border rounded-xl px-4 py-3 text-xs">
                      <option value="TikTok">TikTok</option>
                      <option value="Shopee">Shopee</option>
                      <option value="Multi">Multi-Platform</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Viewers</label>
                    <input type="number" value={sessionFormData.viewers}
                      onChange={(e) => setSessionFormData({ ...sessionFormData, viewers: parseInt(e.target.value) || 0 })}
                      className="w-full bg-muted/40 border border-border rounded-xl px-4 py-3 text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Revenue (Rp)</label>
                    <input type="number" value={sessionFormData.revenue}
                      onChange={(e) => setSessionFormData({ ...sessionFormData, revenue: parseInt(e.target.value) || 0 })}
                      className="w-full bg-muted/40 border border-border rounded-xl px-4 py-3 text-xs font-bold" />
                  </div>
                </div>
              </div>
              <div className="p-6 bg-muted/20 border-t border-border flex items-center justify-end gap-3">
                <button onClick={() => setShowSessionModal(false)} className="px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase text-muted-foreground">Discard</button>
                <button onClick={editingSession ? handleUpdateSession : handleCreateSession}
                  className="px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase bg-primary text-white">
                  {editingSession ? 'Update' : 'Commit'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Modal */}
      <AnimatePresence>
        {sessionToDelete && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card w-full max-w-sm rounded-[32px] border border-border shadow-2xl p-8 text-center">
              <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-lg font-bold mb-2">Delete Session?</h3>
              <p className="text-xs text-muted-foreground mb-8">
                This will permanently remove the record for <span className="text-foreground font-bold">{sessionToDelete.brandName}</span>.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setSessionToDelete(null)} className="px-6 py-3 rounded-2xl text-[10px] font-bold uppercase text-muted-foreground hover:bg-muted transition-all">Cancel</button>
                <button onClick={confirmDelete} className="px-6 py-3 rounded-2xl text-[10px] font-bold uppercase bg-red-500 text-white hover:bg-red-600 transition-all">Delete</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <div className="pt-8 border-t border-border">
        <p className="text-[9px] text-center text-muted-foreground uppercase tracking-[0.3em] font-bold">
          VidHelp Intelligence Hub • {revenueData?.length?.toLocaleString() || '0'} Total Sessions
        </p>
      </div>
    </motion.div>
  );
};

export default Revenue;