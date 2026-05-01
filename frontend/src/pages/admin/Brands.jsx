// frontend/src/pages/admin/Brands.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, Edit3, Trash2, X, Activity, AlertTriangle,
  FileUp, CheckCircle2, ArrowUpRight, ArrowDown, Filter,
  TrendingUp, TrendingDown, Globe, Layout, Zap, ShieldCheck,
  ChevronRight, Layers, MoreVertical
} from 'lucide-react';
import {
  CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, AreaChart, Area
} from 'recharts';
import { format, subDays, startOfDay, endOfDay, isWithinInterval, parseISO } from 'date-fns';
import { supabase } from '../../services/supabase';

// ── Helper Functions ─────────────────────────────────────────────────────────
function formatRevenue(value) {
  if (!value && value !== 0) return "Rp 0";
  if (value >= 1_000_000_000) return `Rp ${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000)     return `Rp ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000)         return `Rp ${(value / 1_000).toFixed(0)}K`;
  return `Rp ${value.toLocaleString()}`;
}

// ── Main Component ──────────────────────────────────────────────────────────
export default function Brands() {
  const [brands, setBrands] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [notification, setNotification] = useState(null);
  const [syncStatus, setSyncStatus] = useState('idle');
  
  const fileInputRef = React.useRef(null);

  // ── Fetch Data from Supabase ──────────────────────────────────────────────
  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      const { data: brandsData, error: brandsErr } = await supabase
        .from("brands")
        .select("*")
        .order("brand_name");
      
      if (brandsErr) throw brandsErr;
      
      const { data: sessionsData, error: sessionsErr } = await supabase
        .from("live_sessions")
        .select("*, platforms(platform_name)")
        .order("date", { ascending: false });
      
      if (sessionsErr) throw sessionsErr;
      
      setBrands(brandsData || []);
      setSessions(sessionsData || []);
      
    } catch (err) {
      console.error("Fetch failed", err);
      setNotification("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => { fetchData(); }, []);
  
  // ── Filtered Data ─────────────────────────────────────────────────────────
  const filteredBrands = useMemo(() => {
    if (!brands.length) return [];
    return brands.filter(b => 
      b.brand_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      b.brand_category?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, brands]);
  
  // ── Enriched Brand Matrix with Metrics ────────────────────────────────────
  const brandMatrix = useMemo(() => {
    if (!filteredBrands.length || !sessions.length) return [];
    
    return filteredBrands.map(brand => {
      const brandSessions = sessions.filter(s => s.brand_id === brand.brand_id);
      const totalRevenue = brandSessions.reduce((sum, s) => 
        sum + (s.revenue_shopee || 0) + (s.revenue_tiktok || 0), 0);
      
      // Calculate growth (compare last two periods)
      const periods = [...new Set(brandSessions.map(s => s.period_id))].sort((a, b) => b - a);
      const latestRev = brandSessions
        .filter(s => s.period_id === periods[0])
        .reduce((sum, s) => sum + (s.revenue_shopee || 0) + (s.revenue_tiktok || 0), 0);
      const prevRev = brandSessions
        .filter(s => s.period_id === periods[1])
        .reduce((sum, s) => sum + (s.revenue_shopee || 0) + (s.revenue_tiktok || 0), 0);
      const growth = prevRev > 0 ? Math.round(((latestRev - prevRev) / prevRev) * 100) : 0;
      
      // Platform mix
      const platforms = [...new Set(brandSessions.map(s => s.platforms?.platform_name).filter(Boolean))];
      const platformMix = platforms.join(', ');
      
      // Risk assessment
      let riskLevel = 'Low';
      let riskReasons = [];
      
      if (brandSessions.length > 0) {
        const sortedSessions = [...brandSessions].sort((a, b) => new Date(b.date) - new Date(a.date));
        if (sortedSessions.length >= 2 && 
            ((sortedSessions[0]?.revenue_shopee + sortedSessions[0]?.revenue_tiktok) < 
             (sortedSessions[1]?.revenue_shopee + sortedSessions[1]?.revenue_tiktok))) {
          riskLevel = 'Medium';
          riskReasons.push('Revenue dropped in recent session');
        }
        if (totalRevenue < 10000 && brandSessions.length > 3) {
          riskLevel = 'High';
          riskReasons.push('Low yield across multiple sessions');
        }
      }
      
      // Growth trend for chart
      const growthTrend = brandSessions
        .filter(s => s.date)
        .map(s => ({
          date: format(new Date(s.date), 'MMM dd'),
          revenue: (s.revenue_shopee || 0) + (s.revenue_tiktok || 0),
          platform: s.platforms?.platform_name || 'Unknown'
        }))
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(-6);
      
      return {
        ...brand,
        totalRevenue,
        growth,
        platformMix,
        riskLevel,
        riskReasons,
        growthTrend,
        sessionCount: brandSessions.length,
        latestSessions: brandSessions.slice(0, 3)
      };
    });
  }, [filteredBrands, sessions]);
  
  // ── CRUD Operations ───────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (deleteId) {
      const { error } = await supabase
        .from("brands")
        .delete()
        .eq("brand_id", deleteId);
      
      if (error) {
        setNotification("Failed to delete brand");
      } else {
        setNotification("Brand removed successfully");
        fetchData();
      }
      setDeleteId(null);
      setTimeout(() => setNotification(null), 3000);
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const brandData = {
      brand_name: formData.get('name'),
      brand_category: formData.get('industry'),
      brand_status: 'active',
    };
    
    if (editingBrand) {
      const { error } = await supabase
        .from("brands")
        .update(brandData)
        .eq("brand_id", editingBrand.brand_id);
      
      if (error) {
        setNotification("Failed to update brand");
      } else {
        setNotification("Brand updated successfully");
        fetchData();
      }
    } else {
      const { error } = await supabase
        .from("brands")
        .insert([brandData]);
      
      if (error) {
        setNotification("Failed to create brand");
      } else {
        setNotification("Brand onboarded successfully");
        fetchData();
      }
    }
    
    closeForm();
    setTimeout(() => setNotification(null), 3000);
  };
  
  const openForm = (brand) => {
    setEditingBrand(brand || null);
    setIsFormOpen(true);
  };
  
  const closeForm = () => {
    setIsFormOpen(false);
    setEditingBrand(null);
  };
  
  // ── CSV/JSON Import ───────────────────────────────────────────────────────
  const processFile = (file) => {
    setSyncStatus('processing');
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        let incoming = [];
        const content = event.target?.result;
        if (file.name.endsWith('.json')) incoming = JSON.parse(content);
        
        let addedCount = 0;
        
        for (const b of incoming) {
          const name = b.name || b.brand_name || "Unknown Brand";
          const exists = brands.find(cb => 
            cb.brand_name?.toLowerCase() === name.toLowerCase()
          );
          
          if (!exists) {
            const { error } = await supabase
              .from("brands")
              .insert([{
                brand_name: name,
                brand_category: b.industry || b.brand_category || "General",
                brand_status: "active",
              }]);
            
            if (!error) addedCount++;
          }
        }
        
        if (addedCount > 0) {
          setSyncStatus('success');
          fetchData();
        } else {
          setSyncStatus('idle');
        }
        setTimeout(() => setSyncStatus('idle'), 2000);
      } catch (err) {
        setSyncStatus('error');
        setTimeout(() => setSyncStatus('idle'), 3000);
      }
    };
    reader.readAsText(file);
  };
  
  // ── Loading State ─────────────────────────────────────────────────────────
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
  
  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8 pb-12 relative">
      
      {/* Notification Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 20, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-4 left-1/2 z-[100] bg-card text-foreground px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-border"
          >
            <div className="bg-emerald-500 rounded-full p-1"><CheckCircle2 size={16} className="text-white" /></div>
            <span className="text-sm font-bold tracking-tight">{notification}</span>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Globe size={14} className="text-primary" />
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">
              Operational Intel
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Brand Portfolio</h1>
          <p className="text-muted-foreground mt-1">Manage and monitor corporate asset intelligence.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className={`inline-flex items-center justify-center rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all h-10 px-4 gap-2 border border-border bg-card hover:border-primary/50 ${syncStatus === 'processing' ? 'animate-pulse' : ''}`}
          >
            {syncStatus === 'success' ? <CheckCircle2 size={14} className="text-emerald-500" /> : <FileUp size={14} />}
            {syncStatus === 'processing' ? 'Processing...' : syncStatus === 'success' ? 'Imported' : 'Sync Assets'}
          </button>
          <input type="file" ref={fileInputRef} onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])} className="hidden" accept=".json,.csv" />
          <button 
            onClick={() => openForm()} 
            className="inline-flex items-center justify-center rounded-xl text-xs font-black uppercase tracking-widest bg-primary text-white hover:bg-primary/90 transition-all h-10 px-6 shadow-lg shadow-primary/20 gap-2"
          >
            <Plus size={14} /> Onboard Entity
          </button>
        </div>
      </div>
      
      {/* Search Bar */}
      <div className="flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input 
            type="text" 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            placeholder="Search brands or sectors..." 
            className="w-full bg-card border border-border rounded-2xl pl-12 pr-4 py-3 text-sm font-bold text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
          />
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-card rounded-2xl border border-border">
          <Activity size={14} className="text-primary" />
          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{brandMatrix.length} Monitored Assets</span>
        </div>
      </div>
      
      {/* Intelligence Ledger Table */}
      <div className="mt-8 overflow-hidden rounded-[2rem] border border-border bg-card shadow-xl">
        <div className="p-6 border-b border-border bg-muted/20">
          <h3 className="text-xl font-bold tracking-tight text-foreground">Intelligence Ledger</h3>
          <p className="text-muted-foreground text-xs font-medium mt-1">Consolidated operational view of monitored assets.</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/10">
                <th className="p-5 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Brand Information</th>
                <th className="p-5 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Sales Performance</th>
                <th className="p-5 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Risk Status</th>
                <th className="p-5 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Platform Reach</th>
                <th className="p-5 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground text-right">Management</th>
              </tr>
            </thead>
            <tbody>
              {brandMatrix.map((brand) => (
                <tr key={brand.brand_id} className="group transition-all duration-300 border-b border-border/20 last:border-0 hover:bg-primary/5">
                  
                  {/* Brand Information */}
                  <td className="p-5">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center font-black text-white text-lg shadow-lg transform transition-transform group-hover:scale-110 duration-500">
                        {(brand.brand_name || '?')[0]}
                      </div>
                      <div>
                        <p className="font-bold text-base tracking-tight text-foreground group-hover:text-primary transition-colors">{brand.brand_name}</p>
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground bg-muted/80 px-2 py-0.5 rounded-full border border-border/50">
                          {brand.brand_category || 'General'}
                        </span>
                      </div>
                    </div>
                  </td>
                  
                  {/* Sales Performance */}
                  <td className="p-5">
                    <div className="flex items-center gap-3">
                      <span className="text-base font-mono font-black tracking-tighter text-foreground">{formatRevenue(brand.totalRevenue)}</span>
                      <div className={`flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full ${brand.growth >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                        {brand.growth >= 0 ? <ArrowUpRight size={10} /> : <ArrowDown size={10} />}
                        {Math.abs(brand.growth)}%
                      </div>
                    </div>
                    <div className="mt-1 text-[9px] text-muted-foreground font-bold uppercase tracking-widest">
                      {brand.sessionCount} sessions
                    </div>
                  </td>
                  
                  {/* Risk Status */}
                  <td className="p-5">
                    <span className={`inline-flex px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border ${
                      brand.riskLevel === 'High' 
                        ? 'bg-red-500/10 text-red-500 border-red-500/20' 
                        : brand.riskLevel === 'Medium' 
                        ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' 
                        : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                    }`}>
                      {brand.riskLevel}
                    </span>
                   </td>
                  
                  {/* Platform Reach */}
                  <td className="p-5">
                    <div className="flex -space-x-2">
                      {brand.platformMix.split(',').slice(0, 3).map((p, i) => (
                        <div key={i} className="w-7 h-7 rounded-full bg-muted border-2 border-card flex items-center justify-center text-[9px] font-black text-muted-foreground shadow-sm" title={p.trim()}>
                          {p.trim()[0]}
                        </div>
                      ))}
                      {brand.platformMix.split(',').length > 3 && (
                        <div className="w-7 h-7 rounded-full bg-primary/20 border-2 border-card flex items-center justify-center text-[9px] font-black text-primary">
                          +{brand.platformMix.split(',').length - 3}
                        </div>
                      )}
                    </div>
                   </td>
                  
                  {/* Management Actions */}
                  <td className="p-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); openForm(brand); }} 
                        className="p-2 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-xl transition-all shadow-sm"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setDeleteId(brand.brand_id); }} 
                        className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all shadow-sm"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                   </td>
                  
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Footer */}
      <div className="pt-6 border-t border-border">
        <p className="text-[9px] text-center text-muted-foreground uppercase tracking-[0.3em] font-black">
          VidHelp Intelligence Hub • Real-time Analytics • {brandMatrix.length} Active Entities
        </p>
      </div>
      
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setDeleteId(null)} 
              className="absolute inset-0 bg-background/80 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.95, opacity: 0 }} 
              className="bg-card border border-border rounded-2xl p-6 max-w-md w-full relative z-10 shadow-2xl"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center text-red-500">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Offboard Entity?</h3>
                  <p className="text-muted-foreground text-sm mt-1">This will remove the brand metrics permanently.</p>
                </div>
                <div className="flex gap-3 w-full pt-2">
                  <button onClick={() => setDeleteId(null)} className="flex-1 px-4 py-2 bg-muted text-muted-foreground rounded-xl text-sm font-bold">Cancel</button>
                  <button onClick={handleDelete} className="flex-1 px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-bold">Confirm</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Onboard/Edit Modal */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={closeForm} 
              className="absolute inset-0 bg-background/80 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 20 }} 
              className="bg-card border border-border rounded-2xl p-8 max-w-2xl w-full relative z-10 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-foreground">{editingBrand ? 'Update Asset' : 'Onboard Entity'}</h3>
                <button onClick={closeForm} className="p-2 hover:bg-muted rounded-xl text-muted-foreground transition-all">
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Entity Name *</label>
                    <input 
                      name="name" 
                      required 
                      defaultValue={editingBrand?.brand_name} 
                      placeholder="e.g. Aura Glow" 
                      className="w-full bg-background border border-input rounded-xl py-3 px-4 text-sm font-bold text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Market Sector</label>
                    <select 
                      name="industry" 
                      defaultValue={editingBrand?.brand_category || 'Beauty'} 
                      className="w-full bg-background border border-input rounded-xl py-3 px-4 text-sm font-bold text-foreground focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    >
                      <option value="Beauty">Beauty</option>
                      <option value="Gadgets">Gadgets</option>
                      <option value="F&B">F&B</option>
                      <option value="Luxury">Luxury</option>
                      <option value="Fashion">Fashion</option>
                      <option value="Sports">Sports</option>
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Operational Base</label>
                    <input 
                      name="location" 
                      defaultValue={editingBrand?.location || 'Global'} 
                      placeholder="e.g. New York, USA" 
                      className="w-full bg-background border border-input rounded-xl py-3 px-4 text-sm font-bold text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Contact Email</label>
                    <input 
                      name="email" 
                      type="email" 
                      defaultValue={editingBrand?.contactEmail || ''} 
                      placeholder="partnerships@brand.com" 
                      className="w-full bg-background border border-input rounded-xl py-3 px-4 text-sm font-bold text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
                    />
                  </div>
                </div>
                
                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={closeForm} className="flex-1 px-4 py-3 bg-muted text-muted-foreground rounded-xl text-sm font-bold">Cancel</button>
                  <button type="submit" className="flex-1 px-4 py-3 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20">
                    {editingBrand ? 'Update Asset' : 'Onboard Entity'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
    </div>
  );
}