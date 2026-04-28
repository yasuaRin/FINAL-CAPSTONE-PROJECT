import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import {
  UserPlus, Search, Mail, Phone, Edit3, Trash2,
  AlertTriangle, X, Upload, MoreVertical, Activity
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const Avatar = ({ src, name, size = 40 }) => (
  <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
    <img
      src={src || `https://api.dicebear.com/7.x/bottts/svg?seed=${name}`}
      alt={name}
      referrerPolicy="no-referrer"
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: '1px solid #e4e1db' }}
    />
  </div>
);

const StatusBadge = ({ status }) => (
  <div style={{
    display: 'inline-flex', alignItems: 'center', gap: '5px',
    padding: '3px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.06em',
    background: status === 'active' ? 'rgba(76,175,80,0.1)' : 'rgba(0,0,0,0.06)',
    color: status === 'active' ? '#4caf50' : '#7b809a',
  }}>
    <div style={{
      width: 6, height: 6, borderRadius: '50%',
      background: status === 'active' ? '#4caf50' : '#7b809a',
      animation: status === 'active' ? 'pulse 2s infinite' : 'none',
    }} />
    {status}
  </div>
);

const RoleBadge = ({ role }) => {
  const colors = {
    super_admin: { color: '#4caf50', bg: 'rgba(76,175,80,0.1)' },
    admin:       { color: '#fb8c00', bg: 'rgba(251,140,0,0.1)' },
    staff:       { color: '#7b809a', bg: 'rgba(0,0,0,0.06)' },
  };
  const c = colors[role] || colors.staff;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
      <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: c.color }}>
        {role?.replace('_', ' ') || 'staff'}
      </span>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Team() {
  const { user, role: currentRole } = useAuth();
  const formAvatarRef = useRef(null);
  const fileInputRef = useRef(null);

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [formError, setFormError] = useState('');
  const [formAvatar, setFormAvatar] = useState(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedRole, setSelectedRole] = useState('staff');

  // ── Fetch: merge admins + staff ──────────────────────────────────────────
  const fetchMembers = async () => {
    setLoading(true);
    try {
      const [{ data: admins, error: adminsError }, { data: staff, error: staffError }] = await Promise.all([
        supabase.from('admins').select('id, full_name, email, role, is_active, avatar_url, phone').order('created_at', { ascending: false }),
        supabase.from('staff').select('id, name, email, phone, role, status, avatar_url').order('created_at', { ascending: false }),
      ]);

      if (adminsError) console.error('Admins fetch error:', adminsError);
      if (staffError) console.error('Staff fetch error:', staffError);

      const adminList = (admins || []).map(a => ({
        _id:    a.id,
        _table: 'admins',
        name:   a.full_name || a.email,
        email:  a.email,
        phone:  a.phone || '',
        role:   a.role,
        status: a.is_active ? 'active' : 'inactive',
        avatar: a.avatar_url,
        roleDescription: a.role === 'super_admin' ? 'Super Admin' : 'Admin',
      }));

      const staffList = (staff || []).map(s => ({
        _id:    s.id,
        _table: 'staff',
        name:   s.name,
        email:  s.email,
        phone:  s.phone || '',
        role:   'staff',
        status: s.status || 'active',
        avatar: s.avatar_url || null,
        roleDescription: s.role || 'Staff',
      }));

      setMembers([...adminList, ...staffList]);
    } catch (err) {
      console.error('Error fetching members:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMembers(); }, []);

  // ── Filter ───────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return members.filter(m =>
      (m.name || '').toLowerCase().includes(q)
    );
  }, [members, searchTerm]);

  // ── Permission check ─────────────────────────────────────────────────────
  const canEdit = (member) => {
    if (currentRole === 'super_admin') return true;
    if (currentRole === 'admin' && member.role !== 'super_admin') return true;
    return false;
  };

  // ── Helper: extract storage path from public URL ──────────────────────────
  const getStoragePath = (url) => {
    if (!url || !url.includes('/avatars/')) return null;
    return url.split('/avatars/')[1];
  };

  const deleteFromStorage = async (url) => {
    const path = getStoragePath(url);
    if (!path) return;
    await supabase.storage.from('avatars').remove([path]);
  };

  // ── Avatar upload → Supabase Storage ────────────────────────────────────
  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarUploading(true);
    setFormError('');
    try {
      // Delete old photo from storage first
      if (formAvatar) await deleteFromStorage(formAvatar);

      const ext = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const filePath = `members/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setFormAvatar(data.publicUrl);
      formAvatarRef.current = data.publicUrl;
    } catch (err) {
      console.error('Avatar upload error:', err);
      setFormError('Failed to upload avatar. Please try again.');
    } finally {
      setAvatarUploading(false);
    }
  };

  // ── Open / close form ─────────────────────────────────────────────────────
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
    setIsFormOpen(false);
    setEditingMember(null);
    setFormAvatar(null);
    formAvatarRef.current = null;
    setFormError('');
    setSelectedRole('staff');
    setAvatarUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    const fd = new FormData(e.currentTarget);
    const name            = fd.get('name');
    const email           = fd.get('email') || editingMember?.email;
    const phone           = fd.get('phone');
    const role            = fd.get('role') || editingMember?.role || 'staff';
    const status          = fd.get('status') || 'active';
    const password        = fd.get('password');
    const roleDescription = fd.get('roleDescription');

    try {
      if (editingMember) {
        // ── UPDATE ──
        if (editingMember._table === 'admins') {
          const { error } = await supabase.from('admins').update({
            full_name:  name,
            phone:      phone || null,
            is_active:  status === 'active',
            avatar_url: formAvatarRef.current,
          }).eq('id', editingMember._id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('staff').update({
            name, email, phone,
            role: roleDescription,
            status,
            avatar_url: formAvatarRef.current,
          }).eq('id', editingMember._id);
          if (error) throw error;
        }
      } else {
        // ── CREATE ──
        if (role === 'staff') {
          const { error } = await supabase.from('staff').insert({
            name,
            email,
            phone: phone || null,
            role: roleDescription,
            status,
            avatar_url: formAvatar || null,
          });
          if (error) throw error;
        } else {
          if (!password) {
            setFormError('Password is required for Admin / Super Admin accounts.');
            setSubmitting(false);
            return;
          }
          const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
          });
          if (authError) throw authError;

          const { error: insertError } = await supabase.from('admins').insert({
            id:         authData.user.id,
            email,
            full_name:  name,
            phone:      phone || null,
            role,
            is_active:  true,
            avatar_url: formAvatar || null,
          });
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

  // ── Delete ────────────────────────────────────────────────────────────────
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
      <div style={{ width: 40, height: 40, border: '3px solid #f0f2f5', borderTopColor: '#1a1a1a', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: '#7b809a', fontSize: 13, fontWeight: 500 }}>Loading team data...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ paddingTop: 8, paddingBottom: 48 }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
      `}</style>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#344767', margin: 0, letterSpacing: '-0.5px' }}>Team Management</h1>
          <p style={{ color: '#7b809a', fontSize: 14, margin: '4px 0 0' }}>Manage team members and administrative oversight.</p>
        </div>
        {currentRole !== 'staff' && (
          <button
            onClick={() => openForm()}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 20px', borderRadius: 10, border: 'none',
              background: '#1a1a1a', color: 'white', fontWeight: 700,
              fontSize: 13, cursor: 'pointer',
            }}
          >
            <UserPlus size={16} /> Add Member
          </button>
        )}
      </div>

      {/* ── Search + Count ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: 380 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#7b809a' }} />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search members..."
            style={{
              width: '100%', paddingLeft: 38, paddingRight: 16, paddingTop: 10, paddingBottom: 10,
              border: '1px solid #e4e1db', borderRadius: 10, fontSize: 13,
              outline: 'none', background: 'white', color: '#344767', boxSizing: 'border-box',
            }}
          />
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'white', border: '1px solid #e4e1db',
          borderRadius: 20, padding: '6px 14px', fontSize: 12, fontWeight: 700, color: '#344767',
        }}>
          <Activity size={13} style={{ color: '#1a1a1a' }} />
          {filtered.length} members found
        </div>
      </div>

      {/* ── Table ── */}
      <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e4e1db', overflow: 'hidden' }}>
        <div style={{
          padding: '14px 20px', background: '#1a1a1a',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <p style={{ color: 'white', fontWeight: 700, fontSize: 13, margin: 0 }}>Team Management</p>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, margin: '2px 0 0' }}>Manage team members and administrative oversight.</p>
          </div>
          <MoreVertical size={16} style={{ color: 'rgba(255,255,255,0.5)' }} />
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f0f2f5' }}>
                {['PROFILE', 'ROLE', 'EMPLOYEE STATUS', 'LEVEL', 'ACTIONS'].map((h, i) => (
                  <th key={h} style={{
                    padding: '12px 20px', fontSize: 10, fontWeight: 700,
                    color: '#7b809a', textTransform: 'uppercase', letterSpacing: '0.08em',
                    textAlign: i === 4 ? 'right' : 'left',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((member, idx) => (
                <tr key={`${member._table}-${member._id}`} style={{
                  borderBottom: idx < filtered.length - 1 ? '1px solid #f0f2f5' : 'none',
                  transition: 'background 0.15s',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Avatar src={member.avatar} name={member.name} />
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 700, color: '#344767', margin: 0 }}>{member.name}</p>
                        <p style={{ fontSize: 11, color: '#7b809a', margin: '3px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Mail size={11} /> {member.email}
                        </p>
                        {member.phone && (
                          <p style={{ fontSize: 10, color: '#7b809a', margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Phone size={10} /> {member.phone}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  <td style={{ padding: '16px 20px' }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#344767', margin: 0 }}>{member.roleDescription}</p>
                    <p style={{ fontSize: 11, color: '#7b809a', margin: '3px 0 0' }}>Intelligence Division</p>
                  </td>

                  <td style={{ padding: '16px 20px' }}>
                    <StatusBadge status={member.status} />
                  </td>

                  <td style={{ padding: '16px 20px' }}>
                    <RoleBadge role={member.role} />
                  </td>

                  <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                    {canEdit(member) && (
                      <div style={{ display: 'inline-flex', gap: 4 }}>
                        <button
                          onClick={() => openForm(member)}
                          style={{ padding: '6px', borderRadius: 6, border: 'none', background: 'none', cursor: 'pointer', color: '#7b809a' }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#f0f2f5'; e.currentTarget.style.color = '#344767'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#7b809a'; }}
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(member)}
                          style={{ padding: '6px', borderRadius: 6, border: 'none', background: 'none', cursor: 'pointer', color: '#7b809a' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(234,6,6,0.08)'; e.currentTarget.style.color = '#ea0606'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#7b809a'; }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div style={{ padding: '48px', textAlign: 'center', color: '#7b809a', fontSize: 13 }}>
              No members found.
            </div>
          )}
        </div>
      </div>

      {/* ── Delete Confirm Modal ── */}
      {deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={() => setDeleteTarget(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }} />
          <div style={{
            position: 'relative', zIndex: 10, background: 'white', borderRadius: 16,
            padding: 32, maxWidth: 420, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            border: '1px solid #e4e1db',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(234,6,6,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={24} color="#ea0606" />
              </div>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: '#344767', margin: 0 }}>De-authorize Member?</h3>
                <p style={{ fontSize: 13, color: '#7b809a', margin: '8px 0 0' }}>
                  This will permanently remove <strong>{deleteTarget.name}</strong> from the system.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 12, width: '100%' }}>
                <button onClick={() => setDeleteTarget(null)} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #e4e1db', background: 'white', color: '#344767', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button onClick={handleDelete} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: '#ea0606', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
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
          <div onClick={closeForm} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }} />
          <div style={{
            position: 'relative', zIndex: 10, background: 'white', borderRadius: 16,
            padding: 32, maxWidth: 600, width: '100%', maxHeight: '90vh', overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)', border: '1px solid #e4e1db',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#344767', margin: 0 }}>
                {editingMember ? 'Edit Member' : 'Add Member'}
              </h3>
              <button onClick={closeForm} style={{ padding: 8, borderRadius: 8, border: 'none', background: 'none', cursor: 'pointer', color: '#7b809a' }}>
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div style={{ marginBottom: 20, padding: '10px 14px', background: 'rgba(234,6,6,0.08)', border: '1px solid rgba(234,6,6,0.2)', borderRadius: 8, color: '#ea0606', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={14} /> {formError}
              </div>
            )}

            {/* Avatar upload */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 24 }}>
              <div style={{ position: 'relative' }}>
                <div style={{ width: 80, height: 80, borderRadius: '50%', overflow: 'hidden', border: '3px solid #e4e1db', cursor: 'pointer' }}
                  onClick={() => !avatarUploading && fileInputRef.current?.click()}>
                  {avatarUploading ? (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f2f5' }}>
                      <div style={{ width: 24, height: 24, border: '3px solid #e4e1db', borderTopColor: '#1a1a1a', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    </div>
                  ) : (
                    <img
                      src={formAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${editingMember?.name || 'new'}`}
                      alt="avatar"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => !avatarUploading && fileInputRef.current?.click()}
                  disabled={avatarUploading}
                  style={{ position: 'absolute', bottom: -2, right: -2, width: 26, height: 26, borderRadius: '50%', background: '#1a1a1a', border: 'none', cursor: avatarUploading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: avatarUploading ? 0.6 : 1 }}
                >
                  <Upload size={12} color="white" />
                </button>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: 'none' }} />
              <p style={{ fontSize: 10, color: '#7b809a', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
                {avatarUploading ? 'Uploading...' : 'Click photo to update'}
              </p>
              {formAvatar && !avatarUploading && (
                <button
                  type="button"
                  onClick={async () => {
                    try { await deleteFromStorage(formAvatar); } catch (_) {}
                    setFormAvatar(null);
                    formAvatarRef.current = null;
                    setAvatarUploading(false);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  style={{ fontSize: 11, color: '#ea0606', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                >
                  Remove photo
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                {/* Name */}
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#7b809a', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Name</label>
                  <input name="name" required defaultValue={editingMember?.name} placeholder="Full name"
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #e4e1db', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box', color: '#344767' }} />
                </div>
                {/* Email */}
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#7b809a', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Email</label>
                  <input name="email" type="email" required defaultValue={editingMember?.email}
                    disabled={!!editingMember}
                    placeholder="name@gmail.com"
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #e4e1db', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box', color: '#344767', opacity: editingMember ? 0.6 : 1 }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                {/* Phone */}
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#7b809a', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Phone</label>
                  <input name="phone" defaultValue={editingMember?.phone} placeholder="+62 812..."
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #e4e1db', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box', color: '#344767' }} />
                </div>
                {/* Level */}
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#7b809a', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Level</label>
                  <select
                    name="role"
                    value={selectedRole}
                    onChange={e => setSelectedRole(e.target.value)}
                    disabled={!!editingMember || currentRole === 'admin'}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #e4e1db', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box', color: '#344767', opacity: (editingMember || currentRole === 'admin') ? 0.6 : 1 }}
                  >
                    {currentRole === 'super_admin' && (
                      <>
                        <option value="super_admin">Super Admin</option>
                        <option value="admin">Admin</option>
                      </>
                    )}
                    <option value="staff">Staff</option>
                  </select>
                </div>
              </div>

              {/* Password — only show when creating Admin or Super Admin */}
              {!editingMember && selectedRole !== 'staff' && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 10, fontWeight: 700, color: '#7b809a', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
                    Password <span style={{ color: '#ea0606' }}>*</span>
                  </label>
                  <input name="password" type="password" placeholder="Create password"
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #e4e1db', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box', color: '#344767' }} />
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#7b809a', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Role Description</label>
                <input name="roleDescription" required defaultValue={editingMember?.roleDescription} placeholder="e.g. Lead Talent Coordinator"
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #e4e1db', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box', color: '#344767' }} />
              </div>

              {/* Status */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#7b809a', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Employee Status</label>
                <select name="status" defaultValue={editingMember?.status || 'active'}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #e4e1db', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box', color: '#344767' }}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" onClick={closeForm}
                  style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #e4e1db', background: 'white', color: '#344767', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" disabled={submitting || avatarUploading}
                  style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: '#1a1a1a', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: (submitting || avatarUploading) ? 0.7 : 1 }}>
                  {submitting ? 'Saving...' : avatarUploading ? 'Uploading photo...' : editingMember ? 'Save Changes' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}