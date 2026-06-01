// frontend/src/pages/admin/Brands.jsx

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, Edit3, Trash2, X, Activity, AlertTriangle,
  CheckCircle2, ArrowUpRight, ArrowDown, Globe, ShieldCheck, ChevronDown, Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useRevenue } from '../../hooks/useRevenue';

function formatRevenue(value) {
  if (!value && value !== 0) return 'Rp 0';
  return `Rp ${Number(value).toLocaleString('id-ID')}`;
}

const dropdownTriggerCls = (isOpen) =>
  `w-full bg-background border rounded-xl py-3 px-4 text-sm font-medium text-foreground text-left flex items-center justify-between transition-all outline-none ${
    isOpen ? 'border-blue-600 ring-2 ring-blue-600/20' : 'border-input'
  }`;

const dropdownOptionCls = (isSelected) =>
  `w-full text-left px-4 py-2.5 text-sm transition-colors ${
    isSelected
      ? 'bg-blue-600/10 text-blue-600 font-semibold'
      : 'hover:bg-muted/50 text-foreground'
  }`;

const CATEGORY_OPTIONS = ['Beauty', 'Gadgets', 'F&B', 'Luxury', 'Fashion', 'Sports'];
const STATUS_OPTIONS = [
  { value: 'active',   label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export default function Brands() {
  const { user } = useAuth();
  const { brandTotals, loading: revenueLoading } = useRevenue();

  const [userRole, setUserRole] = useState(null);
  const [isRoleLoading, setIsRoleLoading] = useState(true);
  const [brands, setBrands] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [riskData, setRiskData] = useState(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);

  const [formCategory, setFormCategory] = useState('Beauty');
  const [formStatus, setFormStatus] = useState('active');
  const [formName, setFormName] = useState('');

  const [openDropdown, setOpenDropdown] = useState(null);
  const dropdownRef = useRef(null);
  const notificationTimeoutRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        setIsRoleLoading(true);
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        if (authError || !authUser?.id) return;
        const { data, error } = await supabase
          .from('team_members')
          .select('role')
          .eq('auth_user_id', authUser.id)
          .single();
        if (!error && data) setUserRole(data.role);
      } catch (err) {
        console.error('fetchUserRole error:', err);
      } finally {
        setIsRoleLoading(false);
      }
    };
    fetchUserRole();
  }, []);

  const isSuperAdmin = userRole === 'super_admin';

  const fetchData = async () => {
    try {
      setIsLoading(true);

      const { data: brandsData, error: brandsErr } = await supabase
        .from('brands')
        .select('brand_id, brand_name, brand_category, brand_status')
        .order('brand_name', { ascending: true });
      if (brandsErr) throw brandsErr;

      const { data: sessionsData, error: sessionsErr } = await supabase
        .from('live_sessions')
        .select('*, platforms(platform_name)')
        .order('date', { ascending: false });
      if (sessionsErr) throw sessionsErr;

      const { data: riskMonitorData } = await supabase
        .from('risk_monitor')
        .select('brand_id, risk_level, risk_score, reasons, revenue_total, sessions_count, status');

      const riskMap = new Map();
      (riskMonitorData || []).forEach(risk => {
        riskMap.set(risk.brand_id, {
          level: risk.risk_level,
          score: risk.risk_score,
          reasons: risk.reasons || [],
          totalRevenue: risk.revenue_total,
          sessionsCount: risk.sessions_count,
          status: risk.status,
        });
      });

      setBrands(brandsData || []);
      setSessions(sessionsData || []);
      setRiskData(riskMap);
    } catch (err) {
      console.error('Fetch failed', err);
      notify('Failed to load data', true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filteredBrands = useMemo(() => {
    if (!brands.length) return [];
    return brands.filter(b =>
      b.brand_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.brand_category?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, brands]);

  const brandMatrix = useMemo(() => {
    if (!filteredBrands.length || !sessions.length) return [];

    return filteredBrands.map(brand => {
      const brandSessions = sessions.filter(s => s.brand_id === brand.brand_id);
      const totalRevenue = brandTotals.get(brand.brand_id) || 0;
      const sessionCount = brandSessions.length;

      const periods = [...new Set(brandSessions.map(s => s.period_id))].sort((a, b) => b - a);
      const latestRev = brandSessions
        .filter(s => s.period_id === periods[0])
        .reduce((sum, s) => sum + (s.revenue_shopee || 0) + (s.revenue_tiktok || 0), 0);
      const prevRev = brandSessions
        .filter(s => s.period_id === periods[1])
        .reduce((sum, s) => sum + (s.revenue_shopee || 0) + (s.revenue_tiktok || 0), 0);
      const growth = prevRev > 0 ? Math.round(((latestRev - prevRev) / prevRev) * 100) : 0;

      const riskInfo = riskData.get(brand.brand_id);

      return {
        ...brand,
        totalRevenue,
        growth,
        sessionCount,
        riskLevel: riskInfo?.level || null,
        riskReasons: riskInfo?.reasons || [],
        isActive: brand.brand_status === 'active',
      };
    });
  }, [filteredBrands, sessions, riskData, brandTotals]);

  const notify = (msg, isError = false) => {
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
    }
    setNotification(msg);
    notificationTimeoutRef.current = setTimeout(() => {
      setNotification(null);
      notificationTimeoutRef.current = null;
    }, 5000);
  };

  const openForm = (brand = null) => {
    setEditingBrand(brand);
    setFormName(brand?.brand_name || '');
    setFormCategory(brand?.brand_category || 'Beauty');
    setFormStatus(brand?.brand_status || 'active');
    setOpenDropdown(null);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingBrand(null);
    setOpenDropdown(null);
    setIsSubmitting(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    const brandData = {
      brand_name: formName,
      brand_category: formCategory,
      brand_status: formStatus,
    };
    try {
      if (editingBrand) {
        const { error } = await supabase.from('brands').update(brandData).eq('brand_id', editingBrand.brand_id);
        if (error) throw error;
        notify('Brand updated successfully');
      } else {
        const { error } = await supabase.from('brands').insert([brandData]);
        if (error) throw error;
        notify('Brand created successfully');
      }
      closeForm();
      await fetchData();
    } catch (err) {
      console.error('Submit error:', err);
      notify(`Failed to ${editingBrand ? 'update' : 'create'} brand`, true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId || isDeleting) return;
    setIsDeleting(true);
    try {
      await supabase.from('live_sessions').delete().eq('brand_id', deleteId);
      await supabase.from('risk_monitor').delete().eq('brand_id', deleteId);
      const { error } = await supabase.from('brands').delete().eq('brand_id', deleteId);
      if (error) throw error;
      notify('Brand deleted successfully');
      setDeleteId(null);
      await fetchData();
    } catch (err) {
      console.error('Delete error:', err);
      notify('Failed to delete brand', true);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading || isRoleLoading || revenueLoading) {
    return (
      <div id="brands-report-container" className="flex items-center justify-center h-96">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-[3px] border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
            Loading brands...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div id="brands-report-container">
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 20, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-4 left-1/2 z-[100] bg-card text-foreground px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-border"
          >
            <div className={`rounded-full p-1 ${notification.includes('Failed') ? 'bg-red-500' : 'bg-emerald-500'}`}>
              <CheckCircle2 size={16} className="text-white" />
            </div>
            <span className="text-sm font-bold tracking-tight">{notification}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-8 pb-12">
        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider ${
          isSuperAdmin
            ? 'bg-blue-600/10 text-blue-600 border border-blue-600/20'
            : 'bg-muted/50 text-muted-foreground border border-border'
        }`}>
          <ShieldCheck size={12} />
          {isSuperAdmin ? 'Super Admin - Full Access' : 'Admin - Limited Access (No Delete)'}
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Globe size={14} className="text-blue-600" />
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">Brand Management</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Brand Portfolio</h1>
            <p className="text-muted-foreground mt-1 font-light text-xs">Track and manage all your brands in one place.</p>
          </div>
          <button
            onClick={() => openForm()}
            className="inline-flex items-center justify-center rounded-xl text-xs font-black uppercase tracking-widest bg-blue-600 text-white hover:bg-blue-700 transition-all h-10 px-6 shadow-lg shadow-blue-600/20 gap-2"
          >
            <Plus size={14} /> Add Brand
          </button>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by brand name or category..."
              className="w-full bg-card border border-border rounded-2xl pl-12 pr-4 py-3 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-blue-600/20 outline-none transition-all"
            />
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-card rounded-2xl border border-border">
            <Activity size={14} className="text-blue-600" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{brandMatrix.length} Total Brands</span>
          </div>
        </div>

        <div className="mt-8 overflow-hidden rounded-[2rem] border border-border bg-card shadow-xl">
          <div className="p-6 border-b border-border bg-muted/20">
            <h3 className="text-xl font-bold tracking-tight text-foreground">All Brands</h3>
            <p className="text-muted-foreground text-xs font-light mt-1">Complete overview of your brand performance and risk status.</p>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full min-w-[700px] text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/10">
                  <th className="p-5 text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground opacity-60 w-[220px]">Brand</th>
                  <th className="p-5 text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground opacity-60 w-[240px]">Revenue</th>
                  <th className="p-5 text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground opacity-60">Churned Level</th>
                  <th className="p-5 text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground opacity-60">Status</th>
                  <th className="p-5 text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground opacity-60 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {brandMatrix.map((brand) => (
                  <tr
                    key={brand.brand_id}
                    className="group transition-all duration-300 border-b border-border/20 last:border-0"
                    style={{
                      transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), border-color 0.2s ease, background 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-4px)";
                      e.currentTarget.style.boxShadow = "0 12px 32px rgba(239,68,68,0.15), 0 4px 12px rgba(0,0,0,0.08)";
                      e.currentTarget.style.borderColor = "rgba(239,68,68,0.3)";
                      e.currentTarget.style.background = "rgba(239,68,68,0.02)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "none";
                      e.currentTarget.style.borderColor = "var(--border)";
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <td className="p-5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center font-black text-white text-lg shadow-lg transform transition-transform group-hover:scale-110 duration-500 flex-shrink-0">
                          {(brand.brand_name || '?')[0]}
                        </div>
                        <div>
                          <p className="font-bold text-base tracking-tight text-foreground transition-colors">{brand.brand_name}</p>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-muted/80 px-2 py-0.5 rounded-full border border-border/50">
                            {brand.brand_category || 'General'}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="p-5">
                      <div className="flex items-center gap-3">
                        <span className="font-medium font-mono tracking-tight text-foreground whitespace-nowrap">
                          {formatRevenue(brand.totalRevenue)}
                        </span>
                        <div className={`inline-flex items-center justify-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex-shrink-0 ${
                          brand.growth >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                        }`}>
                          {brand.growth >= 0 ? <ArrowUpRight size={10} /> : <ArrowDown size={10} />}
                          {Math.abs(brand.growth)}%
                        </div>
                      </div>
                      <div className="mt-1 text-[9px] text-muted-foreground font-bold uppercase tracking-widest whitespace-nowrap">
                        {brand.sessionCount} live sessions
                      </div>
                    </td>

                    <td className="p-5">
                      {brand.riskLevel ? (
                        <span className={`inline-flex px-3 py-1 rounded-xl text-[9px] font-bold uppercase tracking-wider border ${
                          brand.riskLevel === 'High' ? 'bg-red-500/10 text-red-500 border-red-500/20'
                          : brand.riskLevel === 'Medium' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                        }`}>{brand.riskLevel}</span>
                      ) : (
                        <span className="inline-flex px-3 py-1 rounded-xl text-[9px] font-bold uppercase tracking-wider border bg-gray-500/10 text-gray-500 border-gray-500/20">
                          Not Assessed
                        </span>
                      )}
                      {brand.riskReasons.length > 0 && (
                        <div className="mt-1 text-[8px] text-muted-foreground max-w-[200px]">{brand.riskReasons[0]}</div>
                      )}
                    </td>

                    <td className="p-5">
                      <span className={`inline-flex px-3 py-1 rounded-xl text-[9px] font-bold uppercase tracking-wider border ${
                        brand.isActive
                          ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                          : 'bg-red-500/10 text-red-500 border-red-500/20'
                      }`}>
                        {brand.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    <td className="p-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); openForm(brand); }}
                          className="p-2 bg-blue-600/10 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all shadow-sm"
                          title="Edit brand"
                        >
                          <Edit3 size={14} />
                        </button>
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
                      {!isSuperAdmin && (
                        <div className="text-[8px] text-muted-foreground mt-1 text-right">Delete restricted</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="pt-6 border-t border-border">
          <p className="text-[9px] text-center text-muted-foreground uppercase tracking-[0.3em] font-bold">
            VidHelp Brand Management - Real-time Analytics - {brandMatrix.length} Active Brands
          </p>
        </div>
      </div>

      {isSuperAdmin && (
        <AnimatePresence>
          {deleteId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => !isDeleting && setDeleteId(null)}
                className="absolute inset-0 bg-background/80 backdrop-blur-sm"
              />
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                className="bg-card border border-border rounded-2xl p-6 max-w-md w-full relative z-10 shadow-2xl"
              >
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center text-red-500">
                    <AlertTriangle size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground">Delete Brand?</h3>
                    <p className="text-muted-foreground text-sm font-light mt-1">This action cannot be undone. The brand will be permanently removed.</p>
                  </div>
                  <div className="flex gap-3 w-full pt-2">
                    <button
                      onClick={() => !isDeleting && setDeleteId(null)}
                      disabled={isDeleting}
                      className="flex-1 px-4 py-2 bg-muted text-muted-foreground rounded-xl text-sm font-bold disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="flex-1 px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isDeleting ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        'Delete Permanently'
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      )}

      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={closeForm}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-card border border-border rounded-2xl p-8 max-w-md w-full relative z-10 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-foreground">
                  {editingBrand ? 'Edit Brand' : 'Add New Brand'}
                </h3>
                <button
                  onClick={closeForm}
                  disabled={isSubmitting}
                  className="p-2 hover:bg-muted rounded-xl text-muted-foreground transition-all disabled:opacity-50"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Brand Name *
                  </label>
                  <input
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    disabled={isSubmitting}
                    placeholder="e.g. Aura Glow"
                    className="w-full bg-background border border-input rounded-xl py-3 px-4 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-blue-600/20 outline-none transition-all disabled:opacity-50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4" ref={dropdownRef}>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Category
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => !isSubmitting && setOpenDropdown(prev => prev === 'category' ? null : 'category')}
                        disabled={isSubmitting}
                        className={dropdownTriggerCls(openDropdown === 'category')}
                      >
                        <span>{formCategory}</span>
                        <ChevronDown
                          size={14}
                          className={`text-muted-foreground transition-transform flex-shrink-0 ${openDropdown === 'category' ? 'rotate-180' : ''}`}
                        />
                      </button>
                      {openDropdown === 'category' && !isSubmitting && (
                        <div className="absolute top-full left-0 right-0 mt-1 z-[200] bg-card border border-border rounded-xl shadow-xl overflow-y-auto max-h-[200px]">
                          {CATEGORY_OPTIONS.map(cat => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => { setFormCategory(cat); setOpenDropdown(null); }}
                              className={dropdownOptionCls(formCategory === cat)}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Status
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => !isSubmitting && setOpenDropdown(prev => prev === 'status' ? null : 'status')}
                        disabled={isSubmitting}
                        className={dropdownTriggerCls(openDropdown === 'status')}
                      >
                        <span>{STATUS_OPTIONS.find(s => s.value === formStatus)?.label}</span>
                        <ChevronDown
                          size={14}
                          className={`text-muted-foreground transition-transform flex-shrink-0 ${openDropdown === 'status' ? 'rotate-180' : ''}`}
                        />
                      </button>
                      {openDropdown === 'status' && !isSubmitting && (
                        <div className="absolute top-full left-0 right-0 mt-1 z-[200] bg-card border border-border rounded-xl shadow-xl overflow-y-auto max-h-[120px]">
                          {STATUS_OPTIONS.map(s => (
                            <button
                              key={s.value}
                              type="button"
                              onClick={() => { setFormStatus(s.value); setOpenDropdown(null); }}
                              className={dropdownOptionCls(formStatus === s.value)}
                            >
                              {s.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={closeForm}
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-3 bg-muted text-muted-foreground rounded-xl text-sm font-bold disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        {editingBrand ? 'Processing...' : 'Creating...'}
                      </>
                    ) : (
                      editingBrand ? 'Save Changes' : 'Add Brand'
                    )}
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