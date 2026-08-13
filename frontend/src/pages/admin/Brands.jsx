// frontend/src/pages/admin/Brands.jsx

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, Edit3, Trash2, X, Activity, AlertTriangle,
  CheckCircle2, ArrowUpRight, ArrowDown, ShieldCheck, ChevronDown, Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useRevenue } from '../../hooks/useRevenue';

const BASE_STYLE = `
  @keyframes spin  { to { transform: rotate(360deg); } }
  @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
`;

// CHANGE #1: same cache key useBrands.js uses for its sessionStorage cache.
// Adding a brand here doesn't go through useBrands, so without clearing this
// key the Revenue page's Brand dropdown can keep serving a stale cached list
// (up to 5 minutes old) that's missing the brand you just created.
const BRANDS_CACHE_KEY = 'brands_data';

const inputStyle = {
  width: "100%",
  padding: "9px 12px",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 13,
  outline: "none",
  background: "var(--muted)",
  color: "var(--foreground)",
};

const labelStyle = {
  fontSize: 10,
  fontWeight: 700,
  color: "var(--muted-foreground)",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  display: "block",
  marginBottom: 6,
};

const cancelBtn = {
  flex: 1,
  padding: 10,
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--card)",
  color: "var(--foreground)",
  fontWeight: 600,
  fontSize: 13,
  cursor: "pointer",
};

const primaryBtn = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "10px 20px",
  borderRadius: 10,
  border: "none",
  background: "#2563eb",
  color: "#ffffff",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
};

function formatRevenue(value) {
  if (!value && value !== 0) return 'Rp 0';
  return `Rp ${Number(value).toLocaleString('id-ID')}`;
}

const StatusBadge = ({ status }) => (
  <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", background: status === "active" ? "rgba(34,197,94,0.1)" : "var(--muted)", color: status === "active" ? "#22c55e" : "var(--muted-foreground)" }}>
    <div style={{ width: 6, height: 6, borderRadius: "50%", background: status === "active" ? "#22c55e" : "var(--muted-foreground)", animation: status === "active" ? "pulse 2s infinite" : "none" }} />
    {status}
  </div>
);

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
      .select('brand_id, brand_name, brand_category, brand_status, brand_created_at')
      .order('brand_created_at', { ascending: false });
      if (brandsErr) throw brandsErr;

      const { data: sessionsData, error: sessionsErr } = await supabase
        .from('live_sessions')
        .select('*, platforms(platform_name)')
        .order('date', { ascending: false });
      if (sessionsErr) throw sessionsErr;

      const { data: riskMonitorData } = await supabase
        .from('risk_monitor')
       .select('brand_id, risk_level_id, risk_levels(name), risk_score, reasons, revenue_total, sessions_count, status');

      const riskMap = new Map();
      (riskMonitorData || []).forEach(risk => {
        riskMap.set(risk.brand_id, {
          level: risk.risk_levels?.name || null,
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
        sessionStorage.removeItem(BRANDS_CACHE_KEY);
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
      let { error } = await supabase
        .from("live_sessions")
        .delete()
        .eq("brand_id", deleteId);
      if (error) throw error;

      ({ error } = await supabase
        .from("team_performance")
        .delete()
        .eq("brand_id", deleteId));
      if (error) throw error;

      ({ error } = await supabase
        .from("risk_monitor")
        .delete()
        .eq("brand_id", deleteId));
      if (error) throw error;

      ({ error } = await supabase
        .from("periods")
        .delete()
        .eq("brand_id", deleteId));
      if (error) throw error;

      ({ error } = await supabase
        .from("brands")
        .delete()
        .eq("brand_id", deleteId));
      if (error) throw error;

      notify("Brand deleted successfully");
      setDeleteId(null);
      await fetchData();
    } catch (err) {
      console.error("Delete error:", err);
      notify("Failed to delete brand", true);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading || isRoleLoading || revenueLoading) {
    return (
      <div id="brands-report-container" className="flex items-center justify-center h-[60vh] gap-3 flex-col">
        <style>{BASE_STYLE}</style>
        <div className="w-10 h-10 border-3 border-border border-t-[#2563eb] rounded-full animate-spin" />
        <p className="text-muted-foreground text-sm font-medium">Loading brands...</p>
      </div>
    );
  }

  return (
    <div id="brands-export-container">
      <div className="pt-2 pb-12 px-3 sm:px-4 md:px-0">
        <style>{BASE_STYLE}</style>

        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -20, x: "-50%" }}
              animate={{ opacity: 1, y: 20, x: "-50%" }}
              exit={{ opacity: 0, y: -20, x: "-50%" }}
              className="fixed top-4 left-1/2 z-[100] bg-card text-foreground px-4 sm:px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-border w-[90vw] max-w-[380px] sm:min-w-[260px] sm:w-auto"
            >
              <div className={`rounded-full p-1 flex items-center justify-center flex-shrink-0 ${notification.includes("Failed") ? "bg-red-500" : "bg-emerald-500"}`}>
                <CheckCircle2 size={16} color="white" />
              </div>
              <span className="text-sm font-bold tracking-tight">{notification}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Page Header */}
        <div className="flex justify-between items-start mb-4 flex-wrap gap-4">
          <div>
            <p className="text-[11px] text-muted-foreground mb-1">Pages / brands</p>
            <h1 className="text-[20px] sm:text-[22px] font-extrabold text-foreground tracking-tight">Brand Portfolio</h1>
            <p className="text-muted-foreground text-sm mt-1">Track and manage all your brands in one place.</p>
          </div>
        </div>

        {/* Add Button */}
        <div className="flex items-center justify-start mb-5">
          <button onClick={() => openForm()} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border-none bg-[#2563eb] text-white font-bold text-sm cursor-pointer hover:bg-[#1d4ed8] transition-colors">
            <Plus size={16} /> Add Brand
          </button>
        </div>

        {/* Main Card */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            {/* Column headers — desktop/tablet only, rows stack into cards below md */}
            <div className="hidden md:grid grid-cols-[60px_2fr_1.4fr_1.2fr_1fr_100px] bg-[#2563eb] px-2">
              {["No", "Brand", "Revenue", "Risk Level", "Status", "Actions"].map((h) => (
                <div key={h} className={`py-3.5 px-4 text-[10px] font-bold uppercase tracking-wider text-white ${h === "Actions" ? "text-right" : "text-left"}`}>
                  {h}
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2 md:gap-1 p-2">
              {brandMatrix.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm">No brands found.</div>
              ) : (
                brandMatrix.map((brand, idx) => (
                  <div
                    key={brand.brand_id}
                    className="grid grid-cols-1 md:grid-cols-[60px_2fr_1.4fr_1.2fr_1fr_100px] items-center rounded-xl border border-border bg-card transition-all duration-300 divide-y divide-border md:divide-y-0"
                    style={{
                      transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), border-color 0.2s ease, background 0.2s ease",
                      opacity: brand.isActive ? 1 : 0.5,
                    }}
                    onMouseEnter={(e) => {
                      if (brand.isActive) {
                        e.currentTarget.style.transform = "translateY(-4px)";
                        e.currentTarget.style.boxShadow = "0 12px 32px rgba(37,99,235,0.15), 0 4px 12px rgba(0,0,0,0.08)";
                        e.currentTarget.style.borderColor = "rgba(37,99,235,0.3)";
                        e.currentTarget.style.background = "rgba(37,99,235,0.02)";
                        const name = e.currentTarget.querySelector(".brand-name");
                        const num = e.currentTarget.querySelector(".row-number");
                        if (name) name.style.color = "#2563eb";
                        if (num) { 
                          num.style.background = "#2563eb"; 
                          num.style.color = "#fff"; 
                        }
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "none";
                      e.currentTarget.style.borderColor = "var(--border)";
                      e.currentTarget.style.background = "var(--card)";
                      const name = e.currentTarget.querySelector(".brand-name");
                      const num = e.currentTarget.querySelector(".row-number");
                      if (name) name.style.color = "var(--foreground)";
                      if (num) { 
                        num.style.background = "var(--muted)"; 
                        num.style.color = "#2563eb"; 
                      }
                    }}
                  >
                    <div className="hidden md:block py-4 px-3 text-center">
                      <span
                        className="row-number"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          background: 'var(--muted)',
                          fontSize: 11,
                          fontWeight: 700,
                          color: '#2563eb',
                          transition: 'background 0.18s ease, color 0.18s ease',
                        }}
                      >
                        {idx + 1}
                      </span>
                    </div>

                    <div className="py-3 px-4 md:py-4 md:px-5">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className={`brand-name text-sm font-bold transition-colors duration-200 ${brand.isActive ? "text-foreground" : "text-muted-foreground"} ${!brand.isActive ? "line-through" : ""}`}>
                            {brand.brand_name}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {brand.brand_category || 'General'}
                          </p>
                        </div>
                        <div className="md:hidden flex-shrink-0">
                          <StatusBadge status={brand.isActive ? 'active' : 'inactive'} />
                        </div>
                      </div>
                    </div>

                    <div className="py-3 px-4 md:py-4 md:px-5">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold ${brand.isActive ? "text-foreground" : "text-muted-foreground"} ${!brand.isActive ? "line-through" : ""}`}>
                          {formatRevenue(brand.totalRevenue)}
                        </span>
                        {brand.isActive && (
                          <div className={`inline-flex items-center justify-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex-shrink-0 ${brand.growth >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                            {brand.growth >= 0 ? <ArrowUpRight size={10} /> : <ArrowDown size={10} />}
                            {Math.abs(brand.growth)}%
                          </div>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {brand.sessionCount} live sessions
                      </p>
                    </div>

                    <div className="py-3 px-4 md:py-4 md:px-5">
                      {brand.riskLevel ? (
                        <span className={`inline-flex px-3 py-1 rounded-xl text-[9px] font-bold uppercase tracking-wider border ${
                          !brand.isActive ? 'bg-gray-500/10 text-gray-500 border-gray-500/20'
                          : brand.riskLevel === 'High' ? 'bg-red-500/10 text-red-500 border-red-500/20'
                          : brand.riskLevel === 'Medium' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                        }`}>
                          {brand.riskLevel}
                        </span>
                      ) : (
                        <span className="inline-flex px-3 py-1 rounded-xl text-[9px] font-bold uppercase tracking-wider border bg-gray-500/10 text-gray-500 border-gray-500/20">
                          Not Assessed
                        </span>
                      )}
                      {brand.riskReasons.length > 0 && (
                        <div className="text-[10px] text-muted-foreground mt-1 max-w-full md:max-w-[200px] truncate">
                          {brand.riskReasons[0]}
                        </div>
                      )}
                    </div>

                    <div className="hidden md:block py-4 px-5">
                      <StatusBadge status={brand.isActive ? 'active' : 'inactive'} />
                    </div>

                    <div className="py-3 px-4 md:py-4 md:px-5 flex justify-end md:justify-end">
                      <div className="inline-flex gap-1.5">
                        <button 
                          onClick={() => openForm(brand)} 
                          className="w-9 h-9 md:w-8 md:h-8 rounded-full border-none bg-[#2563eb]/10 text-[#2563eb] transition-all duration-200 hover:bg-[#2563eb]/20 hover:scale-110 flex items-center justify-center cursor-pointer"
                          disabled={!brand.isActive}
                          style={{ opacity: brand.isActive ? 1 : 0.4 }}
                        >
                          <Edit3 size={13} />
                        </button>
                        {isSuperAdmin && (
                          <button 
                            onClick={() => setDeleteId(brand.brand_id)} 
                            className="w-9 h-9 md:w-8 md:h-8 rounded-full border-none bg-red-500/10 text-[#DB1A1A] transition-all duration-200 hover:bg-red-500/20 hover:scale-110 flex items-center justify-center cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Delete Modal */}
        {isSuperAdmin && deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div onClick={() => !isDeleting && setDeleteId(null)} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <div className="relative z-10 bg-card border border-border rounded-2xl p-6 sm:p-8 max-w-[420px] w-full shadow-2xl">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="w-13 h-13 rounded-full bg-red-500/10 flex items-center justify-center">
                  <AlertTriangle size={24} color="#DB1A1A" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Delete Brand?</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    This will permanently remove <strong className="text-foreground">{brandMatrix.find(b => b.brand_id === deleteId)?.brand_name}</strong> from the system.
                  </p>
                </div>
                <div className="flex gap-3 w-full">
                  <button onClick={() => !isDeleting && setDeleteId(null)} className="flex-1 py-2.5 rounded-lg border border-border bg-card text-foreground font-semibold text-sm cursor-pointer hover:bg-muted transition-colors">Cancel</button>
                  <button onClick={handleDelete} className="flex-1 py-2.5 rounded-lg border-none bg-[#DB1A1A] text-white font-bold text-sm cursor-pointer hover:bg-red-600 transition-colors">Confirm</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add / Edit Modal */}
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            <div onClick={closeForm} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <div className="relative z-10 bg-card border border-border rounded-2xl max-w-[600px] w-full max-h-[90vh] shadow-2xl overflow-hidden">
              <div className="px-4 sm:px-6 py-4 bg-[#2563eb] flex justify-between items-center">
                <h3 className="text-base font-bold text-white">{editingBrand ? "Edit Brand" : "Add New Brand"}</h3>
                <button onClick={closeForm} className="p-1.5 rounded-lg border-none bg-white/15 cursor-pointer text-white hover:bg-white/25 transition-colors flex">
                  <X size={16} />
                </button>
              </div>
              <div className="p-5 sm:p-7 overflow-y-auto max-h-[calc(90vh-60px)]">
                <form onSubmit={handleSubmit}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">Brand Name *</label>
                      <input
                        name="name"
                        required
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        placeholder="e.g. Aura Glow"
                        className="w-full px-3 py-2.5 border border-border rounded-lg text-sm outline-none bg-muted text-foreground focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]/20 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">Category</label>
                      <div ref={dropdownRef} className="relative">
                        <button
                          type="button"
                          onClick={() => !isSubmitting && setOpenDropdown(prev => prev === 'category' ? null : 'category')}
                          disabled={isSubmitting}
                          className={`w-full px-3 py-2.5 border rounded-lg text-sm outline-none bg-muted text-foreground text-left flex items-center justify-between cursor-pointer transition-all duration-200 ${openDropdown === 'category' ? 'border-[#2563eb] ring-1 ring-[#2563eb]/20' : 'border-border'}`}
                        >
                          <span>{formCategory}</span>
                          <ChevronDown
                            size={14}
                            className={`text-muted-foreground transition-transform duration-200 ${openDropdown === 'category' ? 'rotate-180' : 'rotate-0'}`}
                          />
                        </button>
                        {openDropdown === 'category' && !isSubmitting && (
                          <div className="absolute top-full left-0 right-0 mt-1 z-[200] bg-card border border-border rounded-lg shadow-lg overflow-hidden max-h-[200px] overflow-y-auto">
                            {CATEGORY_OPTIONS.map(cat => (
                              <button
                                key={cat}
                                type="button"
                                onClick={() => { setFormCategory(cat); setOpenDropdown(null); }}
                                className={`w-full px-3.5 py-2 border-none text-left text-sm cursor-pointer transition-all duration-200 ${
                                  formCategory === cat 
                                    ? 'bg-[#2563eb]/10 text-[#2563eb] font-semibold' 
                                    : 'text-foreground hover:bg-muted'
                                }`}
                              >
                                {cat}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">Status</label>
                    <select
                      name="status"
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value)}
                      className="w-full px-3 py-2.5 border border-border rounded-lg text-sm outline-none bg-muted text-foreground focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]/20 transition-all"
                    >
                      {STATUS_OPTIONS.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button 
                      type="button" 
                      onClick={closeForm} 
                      className="flex-1 py-2.5 rounded-lg border border-border bg-card text-foreground font-semibold text-sm cursor-pointer hover:bg-muted transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 py-2.5 rounded-lg border-none bg-[#2563eb] text-white font-bold text-sm cursor-pointer hover:bg-[#1d4ed8] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? "Saving..." : editingBrand ? "Save Changes" : "Add Brand"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}