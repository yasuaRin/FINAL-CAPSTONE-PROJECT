// frontend/src/pages/admin/Brands.jsx
// UPDATED VERSION - With Role-Based Access Control

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
import { useAuth } from '../../hooks/useAuth';

// ── Helper Functions ─────────────────────────────────────────────────────────
function formatRevenue(value) {
  if (!value && value !== 0) return "Rp 0";
  return `Rp ${Number(value).toLocaleString('id-ID')}`;
}
// ── Main Component ──────────────────────────────────────────────────────────
export default function Brands() {
  const { user } = useAuth();

// ── Role State ─────────────────────────────────────────────
const [userRole, setUserRole] = useState(null);
const [isRoleLoading, setIsRoleLoading] = useState(true);

// ── Fetch User Role from admins table ─────────────────────
useEffect(() => {
  const fetchUserRole = async () => {
    try {
      setIsRoleLoading(true);

      // Get authenticated user
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        console.error("Auth Error:", authError);
        return;
      }

      console.log("AUTH USER:", authUser);

      if (!authUser?.email) {
        console.error("No authenticated email found");
        return;
      }

      // Fetch role from admins table
      const { data, error } = await supabase
        .from("admins")
        .select("role")
        .eq("email", authUser.email)
        .single();

      if (error) {
        console.error("Role Fetch Error:", error);
        return;
      }

      console.log("DB ROLE:", data.role);

      // Save role into state
      setUserRole(data.role);

    } catch (err) {
      console.error("fetchUserRole Error:", err);
    } finally {
      setIsRoleLoading(false);
    }
  };

  fetchUserRole();
}, []);

// ── Super Admin Check ─────────────────────────────────────
const isSuperAdmin = userRole === "super_admin";

// DEBUG
console.log("CURRENT ROLE:", userRole);
console.log("IS SUPER ADMIN:", isSuperAdmin);
  
  const [brands, setBrands] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [riskData, setRiskData] = useState(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [notification, setNotification] = useState(null);
  const [syncStatus, setSyncStatus] = useState('idle');
  
  const fileInputRef = React.useRef(null);

  // ── Fetch Data from Supabase (including risk_monitor) ──────────────────────
  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch aggregated brand summary
const { data: brandsData, error: brandsErr } = await supabase
  .from("brand_revenue_summary")
  .select("*")
  .order("total_revenue", { ascending: false });
      
      if (brandsErr) throw brandsErr;
      
      // Fetch sessions
      const { data: sessionsData, error: sessionsErr } = await supabase
        .from("live_sessions")
        .select("*, platforms(platform_name)")
        .order("date", { ascending: false });
      
      if (sessionsErr) throw sessionsErr;
      
      // Fetch risk monitor data
      const { data: riskMonitorData, error: riskErr } = await supabase
        .from("risk_monitor")
        .select("brand_id, risk_level, risk_score, reasons, revenue_total, sessions_count, status");
      
      if (riskErr) console.error("Error fetching risk monitor:", riskErr);
      
      // Create a Map for quick lookup: brand_id -> risk info
      const riskMap = new Map();
      if (riskMonitorData) {
        riskMonitorData.forEach(risk => {
          riskMap.set(risk.brand_id, {
            level: risk.risk_level,
            score: risk.risk_score,
            reasons: risk.reasons || [],
            totalRevenue: risk.revenue_total,
            sessionsCount: risk.sessions_count,
            status: risk.status
          });
        });
      }
      
      setBrands(brandsData || []);
      setSessions(sessionsData || []);
      setRiskData(riskMap);
      
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
  
  // ── Enriched Brand Matrix with Metrics + Risk from risk_monitor ────────────
  const brandMatrix = useMemo(() => {
    if (!filteredBrands.length || !sessions.length) return [];
    
    return filteredBrands.map(brand => {

  const brandSessions = sessions.filter(
    s => s.brand_id === brand.brand_id
  );

  const totalRevenue = brand.total_revenue || 0;
  const sessionCount = brand.session_count || 0;
      
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
      
      // Get risk from risk_monitor table
      const riskInfo = riskData.get(brand.brand_id);
      const riskLevel = riskInfo?.level || null;
      const riskScore = riskInfo?.score || null;
      const riskReasons = riskInfo?.reasons || [];
      
      // Determine status badge
      const brandStatus = brand.brand_status;
      const isActive = brandStatus === 'active';
      
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
        riskScore,
        riskReasons,
        isActive,
        brandStatus,
        growthTrend,
        sessionCount,
        latestSessions: brandSessions.slice(0, 3)
      };
    });
  }, [filteredBrands, sessions, riskData]);
  
  // ── CRUD Operations with Role Checks ───────────────────────────────────────
  const handleDelete = async () => {
    // ROLE CHECK: Only Super Admin can delete
    if (!isSuperAdmin) {
      setNotification("❌ Access Denied: Only Super Admin can delete brands");
      setDeleteId(null);
      setTimeout(() => setNotification(null), 3000);
      return;
    }
    
    if (deleteId) {
      const { error } = await supabase
        .from("brands")
        .delete()
        .eq("brand_id", deleteId);
      
      if (error) {
        setNotification("Failed to delete brand");
      } else {
        setNotification("✅ Brand removed successfully");
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
  brand_status: formData.get('status'),
};
    
    if (editingBrand) {
      const { error } = await supabase
        .from("brands")
        .update(brandData)
        .eq("brand_id", editingBrand.brand_id);
      
      if (error) {
        setNotification("Failed to update brand");
      } else {
        setNotification("✅ Brand updated successfully");
        fetchData();
      }
    } else {
      const { error } = await supabase
        .from("brands")
        .insert([brandData]);
      
      if (error) {
        setNotification("Failed to create brand");
      } else {
        setNotification("✅ Brand onboarded successfully");
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
                brand_status: b.brand_status || "active",
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
  if (isLoading || isRoleLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
            Loading brands...
          </p>
        </div>
      </div>
    );
  }
  
  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8 pb-12 relative">
      
      {/* Role Indicator Badge */}
      <div className="flex justify-end">
        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${
          isSuperAdmin 
            ? 'bg-primary/10 text-primary border border-primary/20' 
            : 'bg-muted/50 text-muted-foreground border border-border'
        }`}>
          <ShieldCheck size={12} />
          {isSuperAdmin ? 'Super Admin • Full Access' : 'Admin • Limited Access (No Delete)'}
        </div>
      </div>
      
      {/* Notification Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 20, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-4 left-1/2 z-[100] bg-card text-foreground px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-border"
          >
            <div className={`rounded-full p-1 ${notification.includes('✅') ? 'bg-emerald-500' : notification.includes('❌') ? 'bg-red-500' : 'bg-emerald-500'}`}>
              <CheckCircle2 size={16} className="text-white" />
            </div>
            <span className="text-sm font-bold tracking-tight">{notification}</span>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Globe size={14} className="text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
              Brand Management
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Brand Portfolio</h1>
          <p className="text-muted-foreground mt-1 font-light text-xs">Track and manage all your brands in one place.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className={`inline-flex items-center justify-center rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all h-10 px-4 gap-2 border border-border bg-card hover:border-primary/50 ${syncStatus === 'processing' ? 'animate-pulse' : ''}`}
          >
            {syncStatus === 'success' ? <CheckCircle2 size={14} className="text-emerald-500" /> : <FileUp size={14} />}
            {syncStatus === 'processing' ? 'Importing...' : syncStatus === 'success' ? 'Imported' : 'Import Brands'}
          </button>
          <input type="file" ref={fileInputRef} onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])} className="hidden" accept=".json,.csv" />
          <button 
            onClick={() => openForm()} 
            className="inline-flex items-center justify-center rounded-xl text-xs font-black uppercase tracking-widest bg-primary text-white hover:bg-primary/90 transition-all h-10 px-6 shadow-lg shadow-primary/20 gap-2"
          >
            <Plus size={14} /> Add Brand
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
            placeholder="Search by brand name or category..." 
            className="w-full bg-card border border-border rounded-2xl pl-12 pr-4 py-3 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
          />
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-card rounded-2xl border border-border">
          <Activity size={14} className="text-primary" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{brandMatrix.length} Total Brands</span>
        </div>
      </div>
      
      {/* Brands Overview Table */}
      <div className="mt-8 overflow-hidden rounded-[2rem] border border-border bg-card shadow-xl">
        <div className="p-6 border-b border-border bg-muted/20">
          <h3 className="text-xl font-bold tracking-tight text-foreground">All Brands</h3>
          <p className="text-muted-foreground text-xs font-light mt-1">Complete overview of your brand performance and risk status.</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/10">
                <th className="p-5 text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground opacity-60">Brand</th>
                <th className="p-5 text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground opacity-60">Revenue</th>
                <th className="p-5 text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground opacity-60">Churned Level</th>
                <th className="p-5 text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground opacity-60">Status</th>
                <th className="p-5 text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground opacity-60 text-right">Actions</th>
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
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-muted/80 px-2 py-0.5 rounded-full border border-border/50">
                          {brand.brand_category || 'General'}
                        </span>
                      </div>
                    </div>
                  </td>
                  
                  {/* Revenue */}
                  <td className="p-5">
                    <div className="flex items-center gap-3">
                    <span
  className="font-medium font-mono tracking-tight text-foreground break-all leading-tight"
  style={{
    fontSize: 'clamp(10px, 1.1vw, 14px)'
  }}
>
  {formatRevenue(brand.totalRevenue)}
</span>
                      <div className={`flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${brand.growth >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                        {brand.growth >= 0 ? <ArrowUpRight size={10} /> : <ArrowDown size={10} />}
                        {Math.abs(brand.growth)}%
                      </div>
                    </div>
                    <div className="mt-1 text-[9px] text-muted-foreground font-bold uppercase tracking-widest">
                      {brand.sessionCount} live sessions
                    </div>
                  </td>
                  
                  {/* Risk Level - FROM risk_monitor TABLE */}
                  <td className="p-5">
                    {brand.riskLevel ? (
                      <span className={`inline-flex px-3 py-1 rounded-xl text-[9px] font-bold uppercase tracking-wider border ${
                        brand.riskLevel === 'High' 
                          ? 'bg-red-500/10 text-red-500 border-red-500/20' 
                          : brand.riskLevel === 'Medium' 
                          ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' 
                          : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                      }`}>
                        {brand.riskLevel}
                      </span>
                    ) : (
                      <span className="inline-flex px-3 py-1 rounded-xl text-[9px] font-bold uppercase tracking-wider border bg-gray-500/10 text-gray-500 border-gray-500/20">
                        Not Assessed
                      </span>
                    )}
                    {brand.riskReasons && brand.riskReasons.length > 0 && (
                      <div className="mt-1 text-[8px] text-muted-foreground max-w-[200px]">
                        {brand.riskReasons[0]}
                      </div>
                    )}
                  </td>
                  
                  {/* Status */}
                  <td className="p-5">
                    <span
  className={`inline-flex px-3 py-1 rounded-xl text-[9px] font-bold uppercase tracking-wider border ${
    brand.isActive
      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
      : 'bg-red-500/10 text-red-500 border-red-500/20'
  }`}
>
  {brand.isActive ? 'Active' : 'Inactive'}
</span>
                  </td>
                  
                  {/* Actions - Delete button only visible to Super Admin */}
                  <td className="p-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {/* Edit button - visible to both roles */}
                      <button 
                        onClick={(e) => { e.stopPropagation(); openForm(brand); }} 
                        className="p-2 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-xl transition-all shadow-sm"
                        title="Edit brand"
                      >
                        <Edit3 size={14} />
                      </button>
                      
                      {/* Delete button - ONLY visible to Super Admin */}
                      {isSuperAdmin && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); setDeleteId(brand.brand_id); }} 
                          className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all shadow-sm"
                          title="Delete brand (Super Admin only)"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    {/* Show tooltip for Admin why delete is hidden */}
                    {!isSuperAdmin && (
                      <div className="text-[8px] text-muted-foreground mt-1 text-right">
                        Delete restricted
                      </div>
                    )}
                  </td>
                  
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Footer */}
      <div className="pt-6 border-t border-border">
        <p className="text-[9px] text-center text-muted-foreground uppercase tracking-[0.3em] font-bold">
          VidHelp Brand Management • Real-time Analytics • {brandMatrix.length} Active Brands
        </p>
      </div>
      
      {/* Delete Confirmation Modal - Only shown if Super Admin */}
      {isSuperAdmin && (
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
                    <h3 className="text-lg font-bold text-foreground">Delete Brand?</h3>
                    <p className="text-muted-foreground text-sm font-light mt-1">
                      This action cannot be undone. The brand will be permanently removed.
                    </p>
                  </div>
                  <div className="flex gap-3 w-full pt-2">
                    <button onClick={() => setDeleteId(null)} className="flex-1 px-4 py-2 bg-muted text-muted-foreground rounded-xl text-sm font-bold">Cancel</button>
                    <button onClick={handleDelete} className="flex-1 px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-bold">Delete Permanently</button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      )}
      
      {/* Add/Edit Brand Modal */}
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
                <h3 className="text-xl font-bold text-foreground">{editingBrand ? 'Edit Brand' : 'Add New Brand'}</h3>
                <button onClick={closeForm} className="p-2 hover:bg-muted rounded-xl text-muted-foreground transition-all">
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Brand Name *</label>
                    <input 
                      name="name" 
                      required 
                      defaultValue={editingBrand?.brand_name} 
                      placeholder="e.g. Aura Glow" 
                      className="w-full bg-background border border-input rounded-xl py-3 px-4 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Category</label>
                    <select 
                      name="industry" 
                      defaultValue={editingBrand?.brand_category || 'Beauty'} 
                      className="w-full bg-background border border-input rounded-xl py-3 px-4 text-sm font-medium text-foreground focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    >
                      <option value="Beauty">Beauty</option>
                      <option value="Gadgets">Gadgets</option>
                      <option value="F&B">Food & Beverage</option>
                      <option value="Luxury">Luxury</option>
                      <option value="Fashion">Fashion</option>
                      <option value="Sports">Sports</option>
                    </select>
                  </div>
                  <div className="space-y-2">
  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
    Status
  </label>

  <select
    name="status"
    defaultValue={editingBrand?.brand_status || 'active'}
    className="w-full bg-background border border-input rounded-xl py-3 px-4 text-sm font-medium text-foreground focus:ring-2 focus:ring-primary/20 outline-none transition-all"
  >
    <option value="active">Active</option>
    <option value="inactive">Inactive</option>
  </select>
</div>
                </div>
                
                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={closeForm} className="flex-1 px-4 py-3 bg-muted text-muted-foreground rounded-xl text-sm font-bold">Cancel</button>
                  <button type="submit" className="flex-1 px-4 py-3 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20">
                    {editingBrand ? 'Save Changes' : 'Add Brand'}
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