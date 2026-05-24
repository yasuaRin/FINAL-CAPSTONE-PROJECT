import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../services/supabase";
import { useAuth } from "../../hooks/useAuth";
import { UserPlus, Search, Mail, Phone, Edit3, Trash2, AlertTriangle, X, Upload, MoreVertical, Activity, CheckCircle2, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";

const BASE_STYLE = `
  @keyframes spin  { to { transform: rotate(360deg); } }
  @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
`;

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
  background: "var(--primary)",
  color: "var(--primary-foreground)",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
};

const Avatar = ({ src, name, size = 40 }) => {
  const [imageError, setImageError] = useState(false);
  if (!src || imageError) {
    const colors = ['#22c55e', '#3b82f6', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899'];
    const colorIndex = (name?.length || 0) % colors.length;
    return (
      <div style={{ width: size, height: size, borderRadius: '50%', background: colors[colorIndex], display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid var(--border)' }}>
        <span style={{ color: 'white', fontSize: size * 0.4, fontWeight: 'bold' }}>{name?.charAt(0)?.toUpperCase() || '?'}</span>
      </div>
    );
  }
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <img src={src} alt={name} referrerPolicy="no-referrer" crossOrigin="anonymous" onError={() => setImageError(true)}
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: "1px solid var(--border)" }} />
    </div>
  );
};

const StatusBadge = ({ status }) => (
  <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", background: status === "active" ? "rgba(34,197,94,0.1)" : "var(--muted)", color: status === "active" ? "#22c55e" : "var(--muted-foreground)" }}>
    <div style={{ width: 6, height: 6, borderRadius: "50%", background: status === "active" ? "#22c55e" : "var(--muted-foreground)", animation: status === "active" ? "pulse 2s infinite" : "none" }} />
    {status}
  </div>
);

const RoleBadge = ({ role }) => {
  const colors = { super_admin: "#22c55e", admin: "#fb8c00", staff: "var(--muted-foreground)" };
  return (
    <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: colors[role] || colors.staff }}>
      {role?.replace("_", " ") || "staff"}
    </span>
  );
};

const roleOrder = { super_admin: 0, admin: 1, staff: 2 };

const HeaderFilter = ({ label, value, options, onChange }) => {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const isFiltered = value !== "All";
  const isActive = open || isFiltered;

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => setOpen(o => !o)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        background: "none",
        border: "1px solid transparent",
        borderRadius: 6,
        cursor: "pointer",
        padding: "4px 8px",
        color: isFiltered ? "#fff" : hovered ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.8)", 
        fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em",
        transition: "color 0.15s ease",
      }}
      >
        {label}
        <ChevronDown
          size={10}
          style={{
            opacity: isActive || hovered ? 1 : 0.6,
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.15s ease, opacity 0.15s ease",
          }}
        />
        {isFiltered && (
        <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#fff", marginLeft: 1, flexShrink: 0 }} />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            style={{
              position: "absolute", top: "calc(100% + 8px)", left: 0, zIndex: 100,
              background: "var(--card)", border: "1px solid var(--border)",
              borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
              minWidth: 160, overflow: "hidden",
            }}
          >
            {options.map(opt => (
              <button
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  width: "100%", padding: "8px 14px", border: "none",
                  background: value === opt.value ? "var(--primary)" : "transparent",
                  color: value === opt.value ? "var(--primary-foreground)" : "var(--foreground)",
                  fontSize: 11, fontWeight: 600, cursor: "pointer", textAlign: "left",
                  transition: "background 0.12s",
                }}
                onMouseEnter={e => { if (value !== opt.value) e.currentTarget.style.background = "var(--muted)"; }}
                onMouseLeave={e => { if (value !== opt.value) e.currentTarget.style.background = "transparent"; }}
              >
                {opt.dot && (
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: opt.dot, flexShrink: 0 }} />
                )}
                {opt.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function Team() {
  const { user, role: currentRole } = useAuth();
  const formAvatarRef = useRef(null);
  const fileInputRef = useRef(null);

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [formError, setFormError] = useState("");
  const [formAvatar, setFormAvatar] = useState(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedRole, setSelectedRole] = useState("staff");

  const [roleFilter, setRoleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [levelFilter, setLevelFilter] = useState("All");

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    if (!notification) return;
    const t = setTimeout(() => setNotification(null), 4000);
    return () => clearTimeout(t);
  }, [notification]);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("team_members")
        .select("id, name, email, phone, avatar_url, role, role_description, status, auth_user_id")
        .order("created_at", { ascending: false });
      if (error) console.error("Team members fetch error:", error);
      const memberList = (data || []).map((m) => ({
        _id: m.id, _table: "team_members",
        name: m.name, email: m.email, phone: m.phone || "",
        role: m.auth_user_id ? m.role || "admin" : "staff",
        status: m.status || "active", avatar: m.avatar_url,
        roleDescription: m.role_description || m.role || "Staff",
      }));
      memberList.sort((a, b) => (roleOrder[a.role] ?? 2) - (roleOrder[b.role] ?? 2));
      setMembers(memberList);
    } catch (err) {
      console.error("Error fetching members:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMembers(); }, []);

  const uniqueRoleDescriptions = useMemo(() =>
    Array.from(new Set(members.map(m => m.roleDescription).filter(Boolean))).sort(), [members]);

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return members.filter((m) => {
      const matchName = (m.name || "").toLowerCase().includes(q);
      const matchRole = roleFilter === "All" || m.roleDescription === roleFilter;
      const matchStatus = statusFilter === "All" || m.status === statusFilter;
      const matchLevel = levelFilter === "All" || m.role === levelFilter;
      return matchName && matchRole && matchStatus && matchLevel;
    });
  }, [members, searchTerm, roleFilter, statusFilter, levelFilter]);

  const totalPages = Math.ceil(filtered.length / rowsPerPage);
  const paginatedMembers = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return filtered.slice(startIndex, startIndex + rowsPerPage);
  }, [filtered, currentPage, rowsPerPage]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, rowsPerPage, roleFilter, statusFilter, levelFilter]);

  const canEdit = (member) => {
    if (currentRole === "super_admin") return true;
    if (currentRole === "admin" && member.role !== "super_admin") return true;
    return false;
  };

  const getStoragePath = (url) => {
    if (!url || !url.includes("/avatars/")) return null;
    return url.split("/avatars/")[1];
  };

  const deleteFromStorage = async (url) => {
    const path = getStoragePath(url);
    if (!path) return;
    await supabase.storage.from("avatars").remove([path]);
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    setFormError("");
    try {
      if (formAvatar) await deleteFromStorage(formAvatar);
      const ext = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const filePath = `members/${fileName}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      setFormAvatar(data.publicUrl);
      formAvatarRef.current = data.publicUrl;
    } catch (err) {
      console.error("Avatar upload error:", err);
      setFormError("Failed to upload avatar. Please try again.");
    } finally {
      setAvatarUploading(false);
    }
  };

  const openForm = (member = null) => {
    setEditingMember(member);
    const avatar = member?.avatar || null;
    setFormAvatar(avatar);
    formAvatarRef.current = avatar;
    setFormError("");
    setSelectedRole(member?.role || "staff");
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingMember(null);
    setFormAvatar(null);
    formAvatarRef.current = null;
    setFormError("");
    setSelectedRole("staff");
    setAvatarUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const name = fd.get("name"), email = fd.get("email") || editingMember?.email;
    const phone = fd.get("phone"), role = fd.get("role") || editingMember?.role || "staff";
    const status = fd.get("status") || "active", password = fd.get("password");
    const roleDescription = fd.get("roleDescription");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers = { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` };
      if (editingMember) {
        const _res = await fetch(`${import.meta.env.VITE_API_URL}/team/update-member`, { method: "POST", headers, body: JSON.stringify({ id: editingMember._id, table: "team_members", name, phone: phone || null, status, avatar_url: formAvatarRef.current, roleDescription }) });
        const _result = await _res.json();
        if (!_res.ok) throw new Error(_result.message);
      } else {
        if (role === "staff") {
          const _res = await fetch(`${import.meta.env.VITE_API_URL}/team/create-staff`, { method: "POST", headers, body: JSON.stringify({ name, email, phone: phone || null, role: roleDescription, status, avatar_url: formAvatar || null }) });
          const _result = await _res.json();
          if (!_res.ok) throw new Error(_result.message || "Failed to create staff member.");
        } else {
          if (!password) { setFormError("Password is required for Admin / Super Admin accounts."); setSubmitting(false); return; }
          const _res = await fetch(`${import.meta.env.VITE_API_URL}/team/create-admin`, { method: "POST", headers, body: JSON.stringify({ email, password, name, phone, role, avatar_url: formAvatar || null }) });
          const _result = await _res.json();
          if (!_res.ok) throw new Error(_result.message);
        }
      }
      await fetchMembers();
      setNotification(editingMember ? "Member updated successfully." : "Member added successfully.");
      closeForm();
    } catch (err) {
      console.error("SUBMIT ERROR:", err);
      setFormError(err.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const _res = await fetch(`${import.meta.env.VITE_API_URL}/team/delete-member`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` }, body: JSON.stringify({ id: deleteTarget._id, table: "team_members" }) });
      const _result = await _res.json();
      if (!_res.ok) throw new Error(_result.message);
      await fetchMembers();
      setNotification("Member removed successfully.");
    } catch (err) {
      console.error("Delete error:", err);
      setNotification("❌ Failed to remove member.");
    } finally {
      setDeleteTarget(null);
    }
  };

  if (loading)
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", gap: 12, flexDirection: "column" }}>
        <style>{BASE_STYLE}</style>
        <div style={{ width: 40, height: 40, border: "3px solid var(--border)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <p style={{ color: "var(--muted-foreground)", fontSize: 13, fontWeight: 500 }}>Loading team data...</p>
      </div>
    );

  const roleOptions = [
    { value: "All", label: "All Roles" },
    ...uniqueRoleDescriptions.map(r => ({ value: r, label: r })),
  ];

  const statusOptions = [
    { value: "All", label: "All Status" },
    { value: "active", label: "Active", dot: "#22c55e" },
    { value: "inactive", label: "Inactive", dot: "var(--muted-foreground)" },
  ];

  const levelOptions = [
    { value: "All", label: "All Levels" },
    { value: "super_admin", label: "Super Admin", dot: "#22c55e" },
    { value: "admin", label: "Admin", dot: "#fb8c00" },
    { value: "staff", label: "Staff", dot: "var(--muted-foreground)" },
  ];

  return (
    <div id="team-export-container">
      <div style={{ paddingTop: 8, paddingBottom: 48 }}>
        <style>{BASE_STYLE}</style>

        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -20, x: "-50%" }} animate={{ opacity: 1, y: 20, x: "-50%" }} exit={{ opacity: 0, y: -20, x: "-50%" }}
              style={{ position: "fixed", top: 4, left: "50%", zIndex: 100, background: "var(--card)", color: "var(--foreground)", padding: "12px 24px", borderRadius: 16, boxShadow: "0 8px 40px rgba(0,0,0,0.18)", display: "flex", alignItems: "center", gap: 12, border: "1px solid var(--border)", minWidth: 260 }}
            >
              <div style={{ borderRadius: "50%", padding: 4, display: "flex", alignItems: "center", justifyContent: "center", background: notification.includes("❌") ? "#ef4444" : "#22c55e", flexShrink: 0 }}>
                <CheckCircle2 size={16} color="white" />
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "-0.01em" }}>{notification}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Page Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 16 }}>
          <div>
            <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: "0 0 4px" }}>Pages / team</p>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--foreground)", margin: 0, letterSpacing: "-0.5px" }}>Team Management</h1>
            <p style={{ color: "var(--muted-foreground)", fontSize: 13, margin: "4px 0 0" }}>Manage team members and administrative oversight.</p>
          </div>
          {currentRole !== "staff" && (
            <button onClick={() => openForm()} style={primaryBtn}><UserPlus size={16} /> Add Member</button>
          )}
        </div>

        {/* Search + Count — di luar card, di bawah page header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
          <div style={{ position: "relative", width: "100%", maxWidth: 340 }}>
            <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)" }} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search members..."
              style={{ ...inputStyle, paddingLeft: 36, paddingRight: 16 }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 20, padding: "6px 14px", fontSize: 12, fontWeight: 700, color: "var(--foreground)" }}>
            <Activity size={13} style={{ color: "var(--primary)" }} />
            {filtered.length} members found
          </div>
        </div>

        {/* Main Card */}
        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 20, overflow: "hidden", boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>

          {/* Table */}
        <div style={{ overflowX: "auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: "60px 2fr 1.4fr 1.2fr 1fr 100px", background: "var(--primary)", padding: "0 8px" }}>
            {["No", "Profile", "Role", "Employee Status", "Level", "Actions"].map((h) => (
                <div key={h} style={{ padding: "14px 16px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#fff", textAlign: h === "Actions" ? "right" : "left" }}>
                {h === "Role" ? <HeaderFilter label="Role" value={roleFilter} options={roleOptions} onChange={(v) => { setRoleFilter(v); setCurrentPage(1); }} />
                : h === "Employee Status" ? <HeaderFilter label="Employee Status" value={statusFilter} options={statusOptions} onChange={(v) => { setStatusFilter(v); setCurrentPage(1); }} />
                : h === "Level" ? <HeaderFilter label="Level" value={levelFilter} options={levelOptions} onChange={(v) => { setLevelFilter(v); setCurrentPage(1); }} />
                : h}
              </div>
            ))}
          </div>

          {/* Rows */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "4px 8px" }}>
            {paginatedMembers.length === 0 ? (
              <div style={{ padding: 48, textAlign: "center", color: "var(--muted-foreground)", fontSize: 13 }}>No members found.</div>
            ) : (
              paginatedMembers.map((member, idx) => (
                <div
                  key={`${member._table}-${member._id}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "60px 2fr 1.4fr 1.2fr 1fr 100px",
                    alignItems: "center",
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                    transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), border-color 0.2s ease, background 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.boxShadow = "0 12px 32px rgba(219,26,26,0.13), 0 4px 12px rgba(0,0,0,0.07)";
                    e.currentTarget.style.borderColor = "rgba(219,26,26,0.25)";
                    e.currentTarget.style.background = "rgba(219,26,26,0.02)";
                    const name = e.currentTarget.querySelector(".member-name");
                    if (name) name.style.color = "var(--primary)";
                    const num = e.currentTarget.querySelector(".row-number");
                    if (num) { num.style.background = "var(--primary)"; num.style.color = "#fff"; }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.background = "var(--card)";
                    const name = e.currentTarget.querySelector(".member-name");
                    if (name) name.style.color = "var(--foreground)";
                    const num = e.currentTarget.querySelector(".row-number");
                    if (num) { num.style.background = "var(--muted)"; num.style.color = "var(--primary)"; }
                  }}
                >
                  {/* No */}
                  <div style={{ padding: "16px 12px", textAlign: "center" }}>
                    <span
                      className="row-number"
                      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, borderRadius: 8, background: "var(--muted)", fontSize: 11, fontWeight: 700, color: "var(--primary)", transition: "background 0.18s ease, color 0.18s ease" }}
                    >
                      {(currentPage - 1) * rowsPerPage + idx + 1}
                    </span>
                  </div>

                  {/* Profile */}
                  <div style={{ padding: "16px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ position: "relative" }}>
                        <Avatar src={member.avatar} name={member.name} />
                        <div style={{ position: "absolute", bottom: 2, right: 2, width: 10, height: 10, borderRadius: "50%", background: member.status === "active" ? "#22c55e" : "#ef4444", border: "2px solid var(--card)" }} />
                      </div>
                      <div>
                        <p className="member-name" style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground)", margin: 0, transition: "color 0.15s ease" }}>
                          {member.name}
                        </p>
                        <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: "3px 0 0", display: "flex", alignItems: "center", gap: 4 }}>
                          <Mail size={11} /> {member.email || "—"}
                        </p>
                        {member.phone && (
                          <p style={{ fontSize: 10, color: "var(--muted-foreground)", margin: "2px 0 0", display: "flex", alignItems: "center", gap: 4 }}>
                            <Phone size={10} /> {member.phone}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Role */}
                  <div style={{ padding: "16px 20px" }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", margin: 0 }}>{member.roleDescription}</p>
                    <p style={{ fontSize: 11, color: "var(--muted-foreground)", margin: "3px 0 0" }}>Intelligence Division</p>
                  </div>

                  {/* Status */}
                  <div style={{ padding: "16px 20px" }}>
                    <StatusBadge status={member.status} />
                  </div>

                  {/* Level */}
                  <div style={{ padding: "16px 20px" }}>
                    <RoleBadge role={member.role} />
                  </div>

                  {/* Actions */}
                  <div style={{ padding: "16px 20px", textAlign: "right" }}>
                    {canEdit(member) && (
                      <div style={{ display: "inline-flex", gap: 6 }}>
                        <button
                          onClick={() => openForm(member)}
                          style={{ width: 32, height: 32, borderRadius: "50%", border: "none", background: "rgba(219,26,26,0.08)", cursor: "pointer", color: "var(--primary)", transition: "background 0.15s ease, transform 0.15s ease", display: "flex", alignItems: "center", justifyContent: "center" }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(219,26,26,0.2)"; e.currentTarget.style.transform = "scale(1.12)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(219,26,26,0.08)"; e.currentTarget.style.transform = "scale(1)"; }}
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(member)}
                          style={{ width: 32, height: 32, borderRadius: "50%", border: "none", background: "rgba(219,26,26,0.08)", cursor: "pointer", color: "var(--primary)", transition: "background 0.15s ease, transform 0.15s ease", display: "flex", alignItems: "center", justifyContent: "center" }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(219,26,26,0.2)"; e.currentTarget.style.transform = "scale(1.12)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(219,26,26,0.08)"; e.currentTarget.style.transform = "scale(1)"; }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

          {/* Pagination */}
          {filtered.length > 0 && (
            <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>Show:</span>
                <select value={rowsPerPage} onChange={(e) => setRowsPerPage(Number(e.target.value))}
                  style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--foreground)", fontSize: 12, fontWeight: 500, cursor: "pointer", outline: "none" }}>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>entries</span>
              </div>
              <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                Showing {(currentPage - 1) * rowsPerPage + 1} to {Math.min(currentPage * rowsPerPage, filtered.length)} of {filtered.length} members
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}
                  style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", cursor: currentPage === 1 ? "not-allowed" : "pointer", opacity: currentPage === 1 ? 0.5 : 1, display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color: "var(--foreground)" }}>
                  <ChevronLeft size={12} /> Prev
                </button>
                <div style={{ display: "flex", gap: 4 }}>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) pageNum = i + 1;
                    else if (currentPage <= 3) pageNum = i + 1;
                    else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                    else pageNum = currentPage - 2 + i;
                    return (
                      <button key={pageNum} onClick={() => setCurrentPage(pageNum)}
                        style={{ minWidth: 32, height: 32, borderRadius: 8, border: currentPage === pageNum ? "1px solid var(--primary)" : "1px solid var(--border)", background: currentPage === pageNum ? "var(--primary)" : "var(--bg)", color: currentPage === pageNum ? "#fff" : "var(--foreground)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}
                  style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg)", cursor: currentPage === totalPages ? "not-allowed" : "pointer", opacity: currentPage === totalPages ? 0.5 : 1, display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color: "var(--foreground)" }}>
                  Next <ChevronRight size={12} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Delete Modal */}
        {deleteTarget && (
          <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <div onClick={() => setDeleteTarget(null)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} />
            <div style={{ position: "relative", zIndex: 10, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 20, padding: 32, maxWidth: 420, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center" }}>
                <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(219,26,26,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <AlertTriangle size={24} color="var(--primary)" />
                </div>
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--foreground)", margin: 0 }}>Delete Member?</h3>
                  <p style={{ fontSize: 13, color: "var(--muted-foreground)", margin: "8px 0 0" }}>
                    This will permanently remove <strong style={{ color: "var(--foreground)" }}>{deleteTarget.name}</strong> from the system.
                  </p>
                </div>
                <div style={{ display: "flex", gap: 12, width: "100%" }}>
                  <button onClick={() => setDeleteTarget(null)} style={cancelBtn}>Cancel</button>
                  <button onClick={handleDelete} style={{ flex: 1, padding: 10, borderRadius: 8, border: "none", background: "var(--primary)", color: "var(--primary-foreground)", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Confirm</button>
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
              <div style={{ padding: "16px 24px", background: "var(--primary)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#fff", margin: 0 }}>{editingMember ? "Edit Member" : "Add Member"}</h3>
                <button onClick={closeForm} style={{ padding: 6, borderRadius: 8, border: "none", background: "rgba(255,255,255,0.15)", cursor: "pointer", color: "#fff", display: "flex" }}><X size={16} /></button>
              </div>
              <div style={{ padding: 28, overflowY: "auto", maxHeight: "calc(90vh - 60px)" }}>
                {formError && (
                  <div style={{ marginBottom: 20, padding: "10px 14px", background: "rgba(219,26,26,0.08)", border: "1px solid rgba(219,26,26,0.2)", borderRadius: 10, color: "var(--primary)", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                    <AlertTriangle size={14} /> {formError}
                  </div>
                )}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginBottom: 24 }}>
                  <div style={{ position: "relative" }}>
                    <div style={{ width: 80, height: 80, borderRadius: "50%", overflow: "hidden", border: "3px solid var(--border)", cursor: "pointer" }} onClick={() => !avatarUploading && fileInputRef.current?.click()}>
                      {avatarUploading ? (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--muted)" }}>
                          <div style={{ width: 24, height: 24, border: "3px solid var(--border)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                        </div>
                      ) : (
                        <img src={formAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${editingMember?.name || "new"}`} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      )}
                    </div>
                    <button type="button" onClick={() => !avatarUploading && fileInputRef.current?.click()} disabled={avatarUploading}
                      style={{ position: "absolute", bottom: -2, right: -2, width: 26, height: 26, borderRadius: "50%", background: "var(--primary)", border: "none", cursor: avatarUploading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: avatarUploading ? 0.6 : 1 }}>
                      <Upload size={12} color="white" />
                    </button>
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: "none" }} />
                  <p style={{ fontSize: 10, color: "var(--muted-foreground)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>{avatarUploading ? "Uploading..." : "Click photo to update"}</p>
                  {formAvatar && !avatarUploading && (
                    <button type="button" onClick={async () => { try { await deleteFromStorage(formAvatar); } catch (_) {} setFormAvatar(null); formAvatarRef.current = null; if (fileInputRef.current) fileInputRef.current.value = ""; }}
                      style={{ fontSize: 11, color: "var(--primary)", fontWeight: 600, background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}>
                      Remove photo
                    </button>
                  )}
                </div>
                <form onSubmit={handleSubmit}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                    <div>
                      <label style={labelStyle}>Name</label>
                      <input name="name" required defaultValue={editingMember?.name} placeholder="Full name" style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Email</label>
                      <input name="email" type="email" required defaultValue={editingMember?.email} disabled={!!editingMember} placeholder="name@gmail.com" style={{ ...inputStyle, opacity: editingMember ? 0.5 : 1 }} />
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                    <div>
                      <label style={labelStyle}>Phone</label>
                      <input name="phone" defaultValue={editingMember?.phone} placeholder="+62 812..." style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Level</label>
                      <select name="role" value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} disabled={!!editingMember || currentRole === "admin"} style={{ ...inputStyle, opacity: editingMember || currentRole === "admin" ? 0.5 : 1 }}>
                        {currentRole === "super_admin" && (<><option value="super_admin">Super Admin</option><option value="admin">Admin</option></>)}
                        <option value="staff">Staff</option>
                      </select>
                    </div>
                  </div>
                  {!editingMember && selectedRole !== "staff" && (
                    <div style={{ marginBottom: 16 }}>
                      <label style={labelStyle}>Password <span style={{ color: "var(--primary)" }}>*</span></label>
                      <input name="password" type="password" placeholder="Create password" style={inputStyle} />
                    </div>
                  )}
                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Role Description</label>
                    <input name="roleDescription" required defaultValue={editingMember?.roleDescription} placeholder="e.g. Lead Talent Coordinator" style={inputStyle} />
                  </div>
                  <div style={{ marginBottom: 24 }}>
                    <label style={labelStyle}>Employee Status</label>
                    <select name="status" defaultValue={editingMember?.status || "active"} style={inputStyle}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                  <div style={{ display: "flex", gap: 12 }}>
                    <button type="button" onClick={closeForm} style={cancelBtn}>Cancel</button>
                    <button type="submit" disabled={submitting || avatarUploading}
                      style={{ flex: 1, padding: 10, borderRadius: 8, border: "none", background: "var(--primary)", color: "var(--primary-foreground)", fontWeight: 700, fontSize: 13, cursor: "pointer", opacity: submitting || avatarUploading ? 0.7 : 1 }}>
                      {submitting ? "Saving..." : avatarUploading ? "Uploading photo..." : editingMember ? "Save Changes" : "Add Member"}
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