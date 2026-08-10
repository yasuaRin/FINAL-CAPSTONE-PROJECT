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
        // CHANGE #1: invalidate useBrands.js's sessionStorage cache so the
        // Revenue page's Brand dropdown picks up the new brand immediately
        // instead of serving a stale cached list for up to 5 minutes.
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
      <div id="brands-report-container" style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", gap: 12, flexDirection: "column" }}>
        <style>{BASE_STYLE}</style>
        <div style={{ width: 40, height: 40, border: "3px solid var(--border)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <p style={{ color: "var(--muted-foreground)", fontSize: 13, fontWeight: 500 }}>Loading brands...</p>
      </div>
    );
  }

  return (
    <div id="brands-export-container">
      <div style={{ paddingTop: 8, paddingBottom: 48 }}>
        <style>{BASE_STYLE}</style>

        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -20, x: "-50%" }} animate={{ opacity: 1, y: 20, x: "-50%" }} exit={{ opacity: 0, y: -20, x: "-50%" }}
              style={{ position: "fixed", top: 4, left: "50%", zIndex: 100, background: "var(--card)", color: "var(--foreground)", padding: "12px 24px", borderRadius: 16, boxShadow: "0 8px 40px rgba(0,0,0,0.18)", display: "flex", alignItems: "center", gap: 12, border: "1px solid var(--border)", minWidth: 260 }}
            >
              <div style={{ borderRadius: "50%", padding: 4, display: "flex", alignItems: "center", justifyContent: "center", background: notification.includes("Failed") ? "#ef4444" : "#22c55e", flexShrink: 0 }}>
                <CheckCircle2 size={16} color="white" />
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "-0.01em" }}>{notification}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Page Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 16 }}>
          <div>
            <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: "0 0 4px" }}>Pages / brands</p>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--foreground)", margin: 0, letterSpacing: "-0.5px" }}>Brand Portfolio</h1>
            <p style={{ color: "var(--muted-foreground)", fontSize: 13, margin: "4px 0 0" }}>Track and manage all your brands in one place.</p>
          </div>
        </div>

        {/* Add Button - Below the description */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", marginBottom: 20 }}>
          <button onClick={() => openForm()} style={primaryBtn}><Plus size={16} /> Add Brand</button>
        </div>

        {/* Main Card */}
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 20, overflow: "hidden", boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
          <div style={{ overflowX: "auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: "60px 2fr 1.4fr 1.2fr 1fr 100px", background: "#2563eb", padding: "0 8px" }}>
              {["No", "Brand", "Revenue", "Risk Level", "Status", "Actions"].map((h) => (
                <div key={h} style={{ padding: "14px 16px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#fff", textAlign: h === "Actions" ? "right" : "left" }}>
                  {h}
                </div>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "4px 8px" }}>
              {brandMatrix.length === 0 ? (
                <div style={{ padding: 48, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>No brands found.</div>
              ) : (
                brandMatrix.map((brand, idx) => (
                  <div
                    key={brand.brand_id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "60px 2fr 1.4fr 1.2fr 1fr 100px",
                      alignItems: "center",
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      background: "var(--card)",
                      transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), border-color 0.2s ease, background 0.2s ease",
                      opacity: brand.isActive ? 1 : 0.5,
                    }}
                    onMouseEnter={(e) => {
                      if (brand.isActive) {
                        e.currentTarget.style.transform = "translateY(-4px)";
                        e.currentTarget.style.boxShadow = "0 12px 32px rgba(219,26,26,0.15), 0 4px 12px rgba(0,0,0,0.08)";
                        e.currentTarget.style.borderColor = "rgba(219,26,26,0.3)";
                        e.currentTarget.style.background = "rgba(219,26,26,0.02)";
                        const name = e.currentTarget.querySelector(".brand-name");
                        const num = e.currentTarget.querySelector(".row-number");
                        if (name) name.style.color = "#DB1A1A";
                        if (num) { num.style.background = "#DB1A1A"; num.style.color = "#fff"; }
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
                      if (num) { num.style.background = "var(--muted)"; num.style.color = "#2563eb"; }
                    }}
                  >
                    <div style={{ padding: "16px 12px", textAlign: "center" }}>
                      <span className="row-number" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, borderRadius: 8, background: "var(--muted)", fontSize: 11, fontWeight: 700, color: "#2563eb", transition: "background 0.18s ease, color 0.18s ease" }}>
                        {idx + 1}
                      </span>
                    </div>

                    <div style={{ padding: "16px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        {/* Removed the initial letter div */}
                        <div>
                          <p className="brand-name" style={{ fontSize: 13, fontWeight: 700, color: brand.isActive ? "var(--foreground)" : "var(--muted-foreground)", margin: 0, transition: "color 0.15s ease", textDecoration: brand.isActive ? "none" : "line-through" }}>
                            {brand.brand_name}
                          </p>
                          <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: "3px 0 0" }}>
                            {brand.brand_category || 'General'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div style={{ padding: "16px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: brand.isActive ? "var(--foreground)" : "var(--muted-foreground)", textDecoration: brand.isActive ? "none" : "line-through" }}>
                          {formatRevenue(brand.totalRevenue)}
                        </span>
                        {brand.isActive && (
                          <div className={`inline-flex items-center justify-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex-shrink-0 ${brand.growth >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                            {brand.growth >= 0 ? <ArrowUpRight size={10} /> : <ArrowDown size={10} />}
                            {Math.abs(brand.growth)}%
                          </div>
                        )}
                      </div>
                      <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: "3px 0 0" }}>
                        {brand.sessionCount} live sessions
                      </p>
                    </div>

                    <div style={{ padding: "16px 20px" }}>
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
                        <div style={{ fontSize: 10, color: "var(--muted-foreground)", marginTop: 4, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {brand.riskReasons[0]}
                        </div>
                      )}
                    </div>

                    <div style={{ padding: "16px 20px" }}>
                      <StatusBadge status={brand.isActive ? 'active' : 'inactive'} />
                    </div>

                    <div style={{ padding: "16px 20px", textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: 6 }}>
                        <button 
                          onClick={() => openForm(brand)} 
                          style={{ 
                            width: 32, height: 32, borderRadius: "50%", border: "none", 
                            background: brand.isActive ? "rgba(37,99,235,0.08)" : "rgba(128,128,128,0.08)", 
                            cursor: "pointer", 
                            color: brand.isActive ? "#2563eb" : "#999", 
                            transition: "all 0.15s", 
                            display: "flex", 
                            alignItems: "center", 
                            justifyContent: "center" 
                          }}
                          onMouseEnter={(e) => { 
                            if (brand.isActive) {
                              e.currentTarget.style.background = "rgba(37,99,235,0.2)"; 
                              e.currentTarget.style.transform = "scale(1.12)"; 
                            }
                          }}
                          onMouseLeave={(e) => { 
                            if (brand.isActive) {
                              e.currentTarget.style.background = "rgba(37,99,235,0.08)"; 
                              e.currentTarget.style.transform = "scale(1)"; 
                            }
                          }}
                        >
                          <Edit3 size={13} />
                        </button>
                        {isSuperAdmin && (
                          <button 
                            onClick={() => setDeleteId(brand.brand_id)} 
                            style={{ 
                              width: 32, height: 32, borderRadius: "50%", border: "none", 
                              background: "rgba(219,26,26,0.08)", 
                              cursor: "pointer", 
                              color: "#DB1A1A", 
                              transition: "all 0.15s", 
                              display: "flex", 
                              alignItems: "center", 
                              justifyContent: "center" 
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(219,26,26,0.2)"; e.currentTarget.style.transform = "scale(1.12)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(219,26,26,0.08)"; e.currentTarget.style.transform = "scale(1)"; }}
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
          <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <div onClick={() => !isDeleting && setDeleteId(null)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} />
            <div style={{ position: "relative", zIndex: 10, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 20, padding: 32, maxWidth: 420, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center" }}>
                <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(219,26,26,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <AlertTriangle size={24} color="#DB1A1A" />
                </div>
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>Delete Brand?</h3>
                  <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: "8px 0 0" }}>
                    This will permanently remove <strong style={{ color: "var(--foreground)" }}>{brandMatrix.find(b => b.brand_id === deleteId)?.brand_name}</strong> from the system.
                  </p>
                </div>
                <div style={{ display: "flex", gap: 12, width: "100%" }}>
                  <button onClick={() => !isDeleting && setDeleteId(null)} style={cancelBtn}>Cancel</button>
                  <button onClick={handleDelete} style={{ flex: 1, padding: 10, borderRadius: 8, border: "none", background: "#DB1A1A", color: "#ffffff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Confirm</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add / Edit Modal */}
        {isFormOpen && (
          <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <div onClick={closeForm} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} />
            <div style={{ position: "relative", zIndex: 10, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 20, maxWidth: 600, width: "100%", maxHeight: "90vh", boxShadow: "0 20px 60px rgba(0,0,0,0.3)", overflow: "hidden" }}>
              <div style={{ padding: "16px 24px", background: "#2563eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#fff", margin: 0 }}>{editingBrand ? "Edit Brand" : "Add New Brand"}</h3>
                <button onClick={closeForm} style={{ padding: 6, borderRadius: 8, border: "none", background: "rgba(255,255,255,0.15)", cursor: "pointer", color: "#fff", display: "flex" }}><X size={16} /></button>
              </div>
              <div style={{ padding: 28, overflowY: "auto", maxHeight: "calc(90vh - 60px)" }}>
                <form onSubmit={handleSubmit}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                    <div>
                      <label style={labelStyle}>Brand Name *</label>
                      <input
                        name="name"
                        required
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        placeholder="e.g. Aura Glow"
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Category</label>
                      <div ref={dropdownRef} style={{ position: "relative" }}>
                        <button
                          type="button"
                          onClick={() => !isSubmitting && setOpenDropdown(prev => prev === 'category' ? null : 'category')}
                          disabled={isSubmitting}
                          style={{
                            width: "100%",
                            padding: "9px 12px",
                            border: `1px solid ${openDropdown === 'category' ? '#DB1A1A' : 'var(--border)'}`,
                            borderRadius: 8,
                            fontSize: 13,
                            outline: "none",
                            background: "var(--muted)",
                            color: "var(--foreground)",
                            textAlign: "left",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            cursor: "pointer",
                            transition: "border-color 0.15s ease",
                          }}
                        >
                          <span>{formCategory}</span>
                          <ChevronDown
                            size={14}
                            style={{
                              transition: "transform 0.15s ease",
                              transform: openDropdown === 'category' ? "rotate(180deg)" : "rotate(0deg)",
                              color: "var(--muted-foreground)",
                            }}
                          />
                        </button>
                        {openDropdown === 'category' && !isSubmitting && (
                          <div style={{
                            position: "absolute",
                            top: "calc(100% + 4px)",
                            left: 0,
                            right: 0,
                            zIndex: 200,
                            background: "var(--card)",
                            border: "1px solid var(--border)",
                            borderRadius: 8,
                            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                            overflow: "hidden",
                            maxHeight: 200,
                            overflowY: "auto",
                          }}>
                            {CATEGORY_OPTIONS.map(cat => (
                              <button
                                key={cat}
                                type="button"
                                onClick={() => { setFormCategory(cat); setOpenDropdown(null); }}
                                style={{
                                  display: "block",
                                  width: "100%",
                                  padding: "8px 14px",
                                  border: "none",
                                  background: formCategory === cat ? "rgba(219,26,26,0.08)" : "transparent",
                                  color: formCategory === cat ? "#DB1A1A" : "var(--foreground)",
                                  fontSize: 13,
                                  cursor: "pointer",
                                  textAlign: "left",
                                  transition: "background 0.12s",
                                  fontWeight: formCategory === cat ? 600 : 400,
                                }}
                                onMouseEnter={e => { if (formCategory !== cat) e.currentTarget.style.background = "var(--muted)"; }}
                                onMouseLeave={e => { if (formCategory !== cat) e.currentTarget.style.background = "transparent"; }}
                              >
                                {cat}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Status</label>
                    <select
                      name="status"
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value)}
                      style={inputStyle}
                    >
                      {STATUS_OPTIONS.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: "flex", gap: 12 }}>
                    <button type="button" onClick={closeForm} style={cancelBtn}>Cancel</button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      style={{
                        flex: 1,
                        padding: 10,
                        borderRadius: 8,
                        border: "none",
                        background: "#2563eb",
                        color: "#ffffff",
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: "pointer",
                        opacity: isSubmitting ? 0.7 : 1,
                      }}
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