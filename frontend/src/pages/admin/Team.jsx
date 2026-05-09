import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import {
  UserPlus, Search, Mail, Phone, Edit3, Trash2,
  AlertTriangle, X, Upload, MoreVertical, Activity
} from 'lucide-react';

const PALETTE_STYLE = `
  :root {
    --accent:        #DB1A1A;
    --bg:            #ffffff;
    --fg:            #000000;
    --muted:         rgba(0,0,0,0.4);
    --border:        rgba(0,0,0,0.1);
    --surface:       rgba(0,0,0,0.04);
    --surface-hover: rgba(0,0,0,0.07);
    --input-bg:      rgba(0,0,0,0.03);
  }
  @keyframes spin    { to { transform: rotate(360deg); } }
  @keyframes pulse   { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  * { font-family: 'Inter', sans-serif; box-sizing: border-box; }
`;

const Avatar = ({ src, name, size = 40 }) => (
  <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
    <img
      src={src || `https://api.dicebear.com/7.x/bottts/svg?seed=${name}`}
      alt={name}
      referrerPolicy="no-referrer"
      style={{
        width: size, height: size, borderRadius: '50%', objectFit: 'cover',
        border: '1px solid var(--border)',
      }}
    />
  </div>
);

const StatusBadge = ({ status }) => (
  <div style={{
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.06em',
    background: status === 'active' ? 'rgba(34,197,94,0.1)' : 'var(--surface)',
    color: status === 'active' ? '#22c55e' : 'var(--muted)',
  }}>
    <div style={{
      width: 6, height: 6, borderRadius: '50%',
      background: status === 'active' ? '#22c55e' : 'var(--muted)',
      animation: status === 'active' ? 'pulse 2s infinite' : 'none',
    }} />
    {status}
  </div>
);

const RoleBadge = ({ role }) => {
  const colors = {
    super_admin: { color: '#22c55e' },
    admin:       { color: '#fb8c00' },
    staff:       { color: 'var(--muted)' },
  };
  const c = colors[role] || colors.staff;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
      <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: c.color }}>
        {role?.replace('_', ' ') || 'staff'}
      </span>
    </div>
  );
};

const primaryBtn = {
  display: 'inline-flex', alignItems: 'center', gap: 8,
  padding: '10px 20px', borderRadius: 10, border: 'none',
  background: 'var(--accent)', color: '#fff',
  fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'opacity 0.15s',
};

const cancelBtn = {
  flex: 1, padding: 10, borderRadius: 8,
  border: '1px solid var(--border)', background: 'var(--bg)',
  color: 'var(--fg)', fontWeight: 600, fontSize: 13, cursor: 'pointer',
};

const inputStyle = {
  width: '100%', padding: '9px 12px',
  border: '1px solid var(--border)', borderRadius: 8,
  fontSize: 13, outline: 'none', background: 'var(--input-bg)',
  color: 'var(--fg)',
};

const labelStyle = {
  fontSize: 10, fontWeight: 700, color: 'var(--muted)',
  textTransform: 'uppercase', letterSpacing: '0.06em',
  display: 'block', marginBottom: 6,
};

export default function Team() {
  const { user, role: currentRole } = useAuth();
  const formAvatarRef = useRef(null);
  const fileInputRef  = useRef(null);

  const [members,         setMembers]         = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [searchTerm,      setSearchTerm]      = useState('');
  const [isFormOpen,      setIsFormOpen]      = useState(false);
  const [editingMember,   setEditingMember]   = useState(null);
  const [deleteTarget,    setDeleteTarget]    = useState(null);
  const [formError,       setFormError]       = useState('');
  const [formAvatar,      setFormAvatar]      = useState(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [submitting,      setSubmitting]      = useState(false);
  const [selectedRole,    setSelectedRole]    = useState('staff');

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const [{ data: admins, error: adminsError }, { data: staff, error: staffError }] = await Promise.all([
        supabase.from('admins').select('id, full_name, email, role, is_active, avatar_url, phone').order('created_at', { ascending: false }),
        supabase.from('staff').select('id, name, email, phone, role, status, avatar_url').order('created_at', { ascending: false }),
      ]);
      if (adminsError) console.error('Admins fetch error:', adminsError);
      if (staffError)  console.error('Staff fetch error:', staffError);

      const adminList = (admins || []).map(a => ({
        _id: a.id, _table: 'admins',
        name: a.full_name || a.email, email: a.email, phone: a.phone || '',
        role: a.role, status: a.is_active ? 'active' : 'inactive',
        avatar: a.avatar_url, roleDescription: a.role === 'super_admin' ? 'Super Admin' : 'Admin',
      }));
      const staffList = (staff || []).map(s => ({
        _id: s.id, _table: 'staff',
        name: s.name, email: s.email, phone: s.phone || '',
        role: 'staff', status: s.status || 'active',
        avatar: s.avatar_url || null, roleDescription: s.role || 'Staff',
      }));
      setMembers([...adminList, ...staffList]);
    } catch (err) {
      console.error('Error fetching members:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMembers(); }, []);

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return members.filter(m => (m.name || '').toLowerCase().includes(q));
  }, [members, searchTerm]);

  const canEdit = (member) => {
    if (currentRole === 'super_admin') return true;
    if (currentRole === 'admin' && member.role !== 'super_admin') return true;
    return false;
  };

  const getStoragePath = (url) => {
    if (!url || !url.includes('/avatars/')) return null;
    return url.split('/avatars/')[1];
  };

  const deleteFromStorage = async (url) => {
    const path = getStoragePath(url);
    if (!path) return;
    await supabase.storage.from('avatars').remove([path]);
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    setFormError('');
    try {
      if (formAvatar) await deleteFromStorage(formAvatar);
      const ext = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const filePath = `members/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      setFormAvatar(data.publicUrl);
      formAvatarRef.current = data.publicUrl;
    } catch (err) {
      console.error('Avatar upload error:', err);
      setFormError('Failed to upload avatar. Please try again.');
    } finally {
      setAvatarUploading(false);
    }
  };

  const openForm = (member = null) => {
    setEditingMember(member);
    const avatar = member?.avatar || null;
    setFormAvatar(avatar);
    formAvatarRef.current = avatar;
    setFormError('');
    setSelectedRole(member?.role || 'staff');
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false); setEditingMember(null);
    setFormAvatar(null); formAvatarRef.current = null;
    setFormError(''); setSelectedRole('staff'); setAvatarUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(''); setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const name = fd.get('name'), email = fd.get('email') || editingMember?.email;
    const phone = fd.get('phone'), role = fd.get('role') || editingMember?.role || 'staff';
    const status = fd.get('status') || 'active', password = fd.get('password');
    const roleDescription = fd.get('roleDescription');
    try {
      if (editingMember) {
        if (editingMember._table === 'admins') {
          const { error } = await supabase.from('admins').update({ full_name: name, phone: phone || null, is_active: status === 'active', avatar_url: formAvatarRef.current }).eq('id', editingMember._id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('staff').update({ name, email, phone, role: roleDescription, status, avatar_url: formAvatarRef.current }).eq('id', editingMember._id);
          if (error) throw error;
        }
      } else {
        if (role === 'staff') {
          const { error } = await supabase.from('staff').insert({ name, email, phone: phone || null, role: roleDescription, status, avatar_url: formAvatar || null });
          if (error) throw error;
        } else {
          if (!password) { setFormError('Password is required for Admin / Super Admin accounts.'); setSubmitting(false); return; }
          const { data: authData, error: authError } = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
          if (authError) throw authError;
          const { error: insertError } = await supabase.from('admins').insert({ id: authData.user.id, email, full_name: name, phone: phone || null, role, is_active: true, avatar_url: formAvatar || null });
          if (insertError) throw insertError;
        }
      }
      await fetchMembers();
      closeForm();
    } catch (err) {
      console.error('SUBMIT ERROR:', err);
      setFormError(err.message || 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget._table === 'admins') {
        await supabase.from('admins').delete().eq('id', deleteTarget._id);
      } else {
        await supabase.from('staff').delete().eq('id', deleteTarget._id);
      }
      await fetchMembers();
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setDeleteTarget(null);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12, flexDirection: 'column' }}>
      <style>{PALETTE_STYLE}</style>
      <div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: 'var(--muted)', fontSize: 13, fontWeight: 500 }}>Loading team data...</p>
    </div>
  );

  return (
    <div style={{ paddingTop: 8, paddingBottom: 48 }}>
      <style>{PALETTE_STYLE}</style>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <p style={{ fontSize: 11, color: 'var(--muted)', margin: '0 0 4px' }}>Pages / team</p>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--fg)', margin: 0, letterSpacing: '-0.5px' }}>Team Management</h1>
          <p style={{ color: 'var(--muted)', fontSize: 13, margin: '4px 0 0' }}>Manage team members and administrative oversight.</p>
        </div>
        {currentRole !== 'staff' && (
          <button onClick={() => openForm()} style={primaryBtn}>
            <UserPlus size={16} /> Add Member
          </button>
        )}
      </div>

      {/* ── Main card ── */}
      <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>

        <div style={{ padding: '16px 24px', background: 'var(--accent)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ color: '#fff', fontWeight: 700, fontSize: 13, margin: 0 }}>Team Management</p>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10, margin: '2px 0 0' }}>Manage team members and administrative oversight.</p>
          </div>
          <MoreVertical size={16} style={{ color: 'rgba(255,255,255,0.5)' }} />
        </div>

        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: 340 }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
            <input
              type="text" value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search members..."
              style={{ ...inputStyle, paddingLeft: 36, paddingRight: 16 }}
            />
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 20, padding: '6px 14px', fontSize: 12, fontWeight: 700, color: 'var(--fg)',
          }}>
            <Activity size={13} style={{ color: 'var(--accent)' }} />
            {filtered.length} members found
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['PROFILE', 'ROLE', 'EMPLOYEE STATUS', 'LEVEL', 'ACTIONS'].map((h, i) => (
                  <th key={h} style={{
                    padding: '12px 20px', fontSize: 10, fontWeight: 700,
                    color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em',
                    textAlign: i === 4 ? 'right' : 'left',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((member, idx) => (
                <tr
                  key={`${member._table}-${member._id}`}
                  style={{ borderBottom: idx < filtered.length - 1 ? '1px solid var(--border)' : 'none', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Avatar src={member.avatar} name={member.name} />
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg)', margin: 0 }}>{member.name}</p>
                        <p style={{ fontSize: 11, color: 'var(--muted)', margin: '3px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Mail size={11} /> {member.email}
                        </p>
                        {member.phone && (
                          <p style={{ fontSize: 10, color: 'var(--muted)', margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Phone size={10} /> {member.phone}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', margin: 0 }}>{member.roleDescription}</p>
                    <p style={{ fontSize: 11, color: 'var(--muted)', margin: '3px 0 0' }}>Intelligence Division</p>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <StatusBadge status={member.status} />
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <RoleBadge role={member.role} />
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                    {canEdit(member) && (
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        {/* ── Edit button — bulat + sheer merah ── */}
                        <button
                          onClick={() => openForm(member)}
                          style={{
                            width: 32, height: 32, borderRadius: '50%', border: 'none',
                            background: 'rgba(219,26,26,0.08)', cursor: 'pointer',
                            color: 'var(--accent)', transition: 'all 0.15s',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(219,26,26,0.18)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'rgba(219,26,26,0.08)'}
                        ><Edit3 size={14} /></button>

                        {/* ── Delete button — bulat + sheer merah ── */}
                        <button
                          onClick={() => setDeleteTarget(member)}
                          style={{
                            width: 32, height: 32, borderRadius: '50%', border: 'none',
                            background: 'rgba(219,26,26,0.08)', cursor: 'pointer',
                            color: 'var(--accent)', transition: 'all 0.15s',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(219,26,26,0.18)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'rgba(219,26,26,0.08)'}
                        ><Trash2 size={14} /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
              No members found.
            </div>
          )}
        </div>
      </div>

      {/* ── Delete Confirm Modal ── */}
      {deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={() => setDeleteTarget(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }} />
          <div style={{
            position: 'relative', zIndex: 10, background: 'var(--bg)', borderRadius: 20,
            padding: 32, maxWidth: 420, width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)', border: '1px solid var(--border)',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(219,26,26,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={24} color="var(--accent)" />
              </div>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--fg)', margin: 0 }}>De-authorize Member?</h3>
                <p style={{ fontSize: 13, color: 'var(--muted)', margin: '8px 0 0' }}>
                  This will permanently remove <strong>{deleteTarget.name}</strong> from the system.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 12, width: '100%' }}>
                <button onClick={() => setDeleteTarget(null)} style={cancelBtn}>Cancel</button>
                <button onClick={handleDelete} style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Add / Edit Form Modal ── */}
      {isFormOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={closeForm} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }} />
          <div style={{
            position: 'relative', zIndex: 10, background: 'var(--bg)', borderRadius: 20,
            maxWidth: 600, width: '100%', maxHeight: '90vh', overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)', border: '1px solid var(--border)',
            overflow: 'hidden',
          }}>
            <div style={{ padding: '16px 24px', background: 'var(--accent)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0 }}>
                {editingMember ? 'Edit Member' : 'Add Member'}
              </h3>
              <button onClick={closeForm} style={{ padding: 6, borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.15)', cursor: 'pointer', color: '#fff', display: 'flex' }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: 28, overflowY: 'auto', maxHeight: 'calc(90vh - 60px)' }}>
              {formError && (
                <div style={{ marginBottom: 20, padding: '10px 14px', background: 'rgba(219,26,26,0.08)', border: '1px solid rgba(219,26,26,0.2)', borderRadius: 10, color: 'var(--accent)', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertTriangle size={14} /> {formError}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                <div style={{ position: 'relative' }}>
                  <div
                    style={{ width: 80, height: 80, borderRadius: '50%', overflow: 'hidden', border: '3px solid var(--border)', cursor: 'pointer' }}
                    onClick={() => !avatarUploading && fileInputRef.current?.click()}
                  >
                    {avatarUploading ? (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)' }}>
                        <div style={{ width: 24, height: 24, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                      </div>
                    ) : (
                      <img src={formAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${editingMember?.name || 'new'}`} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    )}
                  </div>
                  <button
                    type="button" onClick={() => !avatarUploading && fileInputRef.current?.click()} disabled={avatarUploading}
                    style={{ position: 'absolute', bottom: -2, right: -2, width: 26, height: 26, borderRadius: '50%', background: 'var(--accent)', border: 'none', cursor: avatarUploading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: avatarUploading ? 0.6 : 1 }}
                  >
                    <Upload size={12} color="white" />
                  </button>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: 'none' }} />
                <p style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
                  {avatarUploading ? 'Uploading...' : 'Click photo to update'}
                </p>
                {formAvatar && !avatarUploading && (
                  <button type="button"
                    onClick={async () => {
                      try { await deleteFromStorage(formAvatar); } catch (_) {}
                      setFormAvatar(null); formAvatarRef.current = null;
                      setAvatarUploading(false);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                  >Remove photo</button>
                )}
              </div>

              <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={labelStyle}>Name</label>
                    <input name="name" required defaultValue={editingMember?.name} placeholder="Full name" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Email</label>
                    <input name="email" type="email" required defaultValue={editingMember?.email} disabled={!!editingMember} placeholder="name@gmail.com" style={{ ...inputStyle, opacity: editingMember ? 0.5 : 1 }} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={labelStyle}>Phone</label>
                    <input name="phone" defaultValue={editingMember?.phone} placeholder="+62 812..." style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Level</label>
                    <select name="role" value={selectedRole} onChange={e => setSelectedRole(e.target.value)}
                      disabled={!!editingMember || currentRole === 'admin'}
                      style={{ ...inputStyle, opacity: (editingMember || currentRole === 'admin') ? 0.5 : 1 }}
                    >
                      {currentRole === 'super_admin' && (<><option value="super_admin">Super Admin</option><option value="admin">Admin</option></>)}
                      <option value="staff">Staff</option>
                    </select>
                  </div>
                </div>

                {!editingMember && selectedRole !== 'staff' && (
                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Password <span style={{ color: 'var(--accent)' }}>*</span></label>
                    <input name="password" type="password" placeholder="Create password" style={inputStyle} />
                  </div>
                )}

                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>Role Description</label>
                  <input name="roleDescription" required defaultValue={editingMember?.roleDescription} placeholder="e.g. Lead Talent Coordinator" style={inputStyle} />
                </div>

                <div style={{ marginBottom: 24 }}>
                  <label style={labelStyle}>Employee Status</label>
                  <select name="status" defaultValue={editingMember?.status || 'active'} style={inputStyle}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <button type="button" onClick={closeForm} style={cancelBtn}>Cancel</button>
                  <button type="submit" disabled={submitting || avatarUploading}
                    style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: (submitting || avatarUploading) ? 0.7 : 1 }}
                  >
                    {submitting ? 'Saving...' : avatarUploading ? 'Uploading photo...' : editingMember ? 'Save Changes' : 'Add Member'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
