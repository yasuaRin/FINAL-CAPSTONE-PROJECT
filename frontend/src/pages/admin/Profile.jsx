import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User as UserIcon, Shield, Camera, Save, Loader2,
  CheckCircle2, X, RefreshCw, Mail, Phone,
  Lock, Smartphone, Upload, FileText, Pencil
} from 'lucide-react';
import { supabase } from '../../services/supabase';

// ── Color palette CSS vars injected globally ──────────────────────────────────
const PALETTE_STYLE = `
  :root {
    --accent:       #DB1A1A;
    --bg:           #ffffff;
    --fg:           #000000;
    --sidebar-bg:   #ffffff;
    --muted:        rgba(0,0,0,0.4);
    --border:       rgba(0,0,0,0.1);
    --surface:      rgba(0,0,0,0.04);
    --surface-hover:rgba(0,0,0,0.07);
    --input-bg:     rgba(0,0,0,0.03);
  }
  html.dark :root,
  html.dark body {
    --accent:       #DB1A1A;
    --bg:           #0A0A0A;
    --fg:           #ffffff;
    --sidebar-bg:   #000000;
    --muted:        rgba(255,255,255,0.4);
    --border:       rgba(255,255,255,0.1);
    --surface:      rgba(255,255,255,0.04);
    --surface-hover:rgba(255,255,255,0.07);
    --input-bg:     rgba(255,255,255,0.05);
  }
  * { box-sizing: border-box; }
  body { color: var(--fg); background-color: var(--bg); }
  @keyframes spin { to { transform: rotate(360deg); } }
`;

function Toast({ message, type, visible }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          style={{
            position: 'fixed', top: 16, left: 0, right: 0, margin: '0 auto',
            width: 'fit-content', maxWidth: '90vw',
            zIndex: 200, background: 'var(--bg)', border: '1px solid var(--border)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.12)', color: 'var(--fg)',
            padding: '10px 20px', borderRadius: 14,
            display: 'flex', alignItems: 'center', gap: 10,
            fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap',
          }}
        >
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: type === 'error' ? 'var(--accent)' : '#22c55e',
          }} />
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function CameraModal({ open, onClose, onCapture }) {
  const videoRef = useRef(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user' } })
      .then(stream => { if (videoRef.current) videoRef.current.srcObject = stream; })
      .catch(() => { alert('Could not access camera.'); onClose(); })
      .finally(() => setLoading(false));
    return () => {
      if (videoRef.current?.srcObject)
        videoRef.current.srcObject.getTracks().forEach(t => t.stop());
    };
  }, [open]);

  const capture = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
    onCapture(canvas.toDataURL('image/png'));
    onClose();
  };

  if (!open) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        style={{
          background: 'var(--bg)', border: '1px solid var(--border)',
          borderRadius: 20, overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)', width: '100%', maxWidth: 440,
        }}
      >
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--fg)' }}>Capture profile photo</span>
          <button onClick={onClose} style={iconBtnStyle}><X size={16} /></button>
        </div>
        <div style={{ position: 'relative', aspectRatio: '16/9', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {loading && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', gap: 8, fontSize: 13 }}>
              <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} /> Initializing camera...
            </div>
          )}
          <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div style={{ padding: '16px 20px', display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button onClick={onClose} style={cancelBtnStyle}>Cancel</button>
          <button onClick={capture} style={primaryBtnStyle}>
            <Camera size={15} /> Capture photo
          </button>
        </div>
      </motion.div>
    </div>
  );
}

const MOCK_SECRET = 'JBSWY3DPEHPK3PXP';
const MOCK_QR = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=otpauth://totp/VidHelp:admin@vidhelp.com?secret=${MOCK_SECRET}%26issuer=VidHelp`;

function TwoFAModal({ open, enabled, onClose, onEnabled, onDisabled }) {
  const [step, setStep] = useState(enabled ? 'disable' : 'qr');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) { setStep(enabled ? 'disable' : 'qr'); setCode(''); setError(''); }
  }, [open, enabled]);

  const handleVerify = () => {
    if (code.length !== 6) { setError('Please enter a 6-digit code.'); return; }
    setLoading(true);
    setTimeout(() => { setLoading(false); setStep('success'); onEnabled(); }, 800);
  };

  const handleDisable = () => {
    if (code.length !== 6) { setError('Please enter a 6-digit code to confirm.'); return; }
    setLoading(true);
    setTimeout(() => { setLoading(false); onDisabled(); onClose(); }, 800);
  };

  const CodeInput = ({ id }) => (
    <input
      autoFocus id={id} type="text" inputMode="numeric" maxLength={6} value={code}
      onChange={e => { setCode(e.target.value.replace(/\D/g, '')); setError(''); }}
      placeholder="000000"
      style={{
        width: '100%', background: 'var(--input-bg)', border: '1px solid var(--border)',
        borderRadius: 12, padding: '12px 16px', color: 'var(--fg)',
        fontSize: 24, textAlign: 'center', letterSpacing: '0.6em',
        fontFamily: 'monospace', outline: 'none',
      }}
    />
  );

  if (!open) return null;
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        style={{
          background: 'var(--bg)', border: '1px solid var(--border)',
          borderRadius: 20, padding: 24, width: '100%', maxWidth: 360,
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--fg)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Smartphone size={16} style={{ color: 'var(--muted)' }} />
            {step === 'disable' ? 'Disable 2FA' : 'Enable two-factor authentication'}
          </span>
          <button onClick={onClose} style={iconBtnStyle}><X size={16} /></button>
        </div>

        {step === 'qr' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>Scan this QR code with your authenticator app.</p>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', padding: 10, borderRadius: 14 }}>
                <img src={MOCK_QR} alt="2FA QR Code" style={{ width: 176, height: 176, display: 'block' }} />
              </div>
            </div>
            <div style={{ background: 'var(--surface)', borderRadius: 10, padding: 12, border: '1px solid var(--border)' }}>
              <p style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--muted)', fontWeight: 700, margin: '0 0 4px' }}>Manual entry key</p>
              <p style={{ fontSize: 11, color: 'var(--fg)', fontFamily: 'monospace', wordBreak: 'break-all', margin: 0 }}>{MOCK_SECRET}</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={onClose} style={cancelBtnStyle}>Cancel</button>
              <button onClick={() => setStep('verify')} style={primaryBtnStyle}>Next — enter code</button>
            </div>
          </div>
        )}

        {step === 'verify' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>Enter the 6-digit code from your authenticator app.</p>
            <CodeInput id="verify-code" />
            {error && <p style={{ fontSize: 12, color: 'var(--accent)', margin: 0 }}>{error}</p>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setStep('qr')} style={cancelBtnStyle}>Back</button>
              <button onClick={handleVerify} disabled={loading || code.length !== 6} style={{ ...primaryBtnStyle, opacity: (loading || code.length !== 6) ? 0.5 : 1 }}>
                {loading && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
                {loading ? 'Verifying...' : 'Verify & enable'}
              </button>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 16, padding: '8px 0' }}>
            <div style={{
              width: 56, height: 56, background: 'rgba(219,26,26,0.1)', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto',
            }}>
              <CheckCircle2 size={28} style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <h4 style={{ margin: '0 0 4px', color: 'var(--fg)', fontWeight: 700, fontSize: 16 }}>2FA enabled!</h4>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>Your account is now protected with two-factor authentication.</p>
            </div>
            <button onClick={onClose} style={primaryBtnStyle}>Done</button>
          </div>
        )}

        {step === 'disable' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>Enter the 6-digit code from your authenticator app to disable 2FA.</p>
            <CodeInput id="disable-code" />
            {error && <p style={{ fontSize: 12, color: 'var(--accent)', margin: 0 }}>{error}</p>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={onClose} style={cancelBtnStyle}>Cancel</button>
              <button onClick={handleDisable} disabled={loading || code.length !== 6} style={{ ...primaryBtnStyle, opacity: (loading || code.length !== 6) ? 0.5 : 1 }}>
                {loading && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
                {loading ? 'Disabling...' : 'Disable 2FA'}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ── Shared style objects ───────────────────────────────────────────────────────
const iconBtnStyle = {
  padding: 6, borderRadius: 8, border: 'none', cursor: 'pointer',
  background: 'transparent', color: 'var(--muted)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'background 0.15s',
};

const primaryBtnStyle = {
  flex: 1, padding: '10px 20px', borderRadius: 12,
  background: 'var(--accent)', color: '#fff', border: 'none',
  fontSize: 12, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.05em',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  transition: 'opacity 0.15s',
};

const cancelBtnStyle = {
  flex: 1, padding: '10px 20px', borderRadius: 12,
  background: 'transparent', color: 'var(--fg)',
  border: '1px solid var(--border)', fontSize: 12, fontWeight: 600,
  cursor: 'pointer', letterSpacing: '0.05em', transition: 'background 0.15s',
};

const inputBase = {
  width: '100%', background: 'var(--input-bg)',
  border: '1px solid var(--border)', borderRadius: 12,
  padding: '10px 16px', fontSize: 13, color: 'var(--fg)', outline: 'none',
  transition: 'border-color 0.15s',
};

const inputDisabledStyle = {
  ...inputBase, opacity: 0.5, cursor: 'not-allowed', minHeight: 40,
};

function FieldLabel({ icon: Icon, children }) {
  return (
    <label style={{
      display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8,
      fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.12em', color: 'var(--muted)',
    }}>
      {Icon && <Icon size={11} />}
      {children}
    </label>
  );
}

export default function ProfileSettings() {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [saved, setSaved] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const [isTwoFAEnabled, setIsTwoFAEnabled] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const fileInputRef = useRef(null);

  const [profile, setProfile] = useState({
    full_name: '', email: '', phone: '', role: '', bio: '', avatar_url: null,
  });
  const [profileSnapshot, setProfileSnapshot] = useState(null);

  const isVerified = !!(profile.full_name && profile.email && profile.phone && profile.bio);
  const filledCount = [profile.full_name, profile.email, profile.phone, profile.bio].filter(Boolean).length;
  const progressPercent = (filledCount / 4) * 100;

  useEffect(() => {
    async function fetchProfile() {
      setFetching(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: adminData } = await supabase.from('admins').select('full_name, email, role, avatar_url, phone').eq('id', user.id).single();
        const { data: profileData } = await supabase.from('profiles').select('bio').eq('id', user.id).single();
        const fetched = {
          full_name: adminData?.full_name || user.user_metadata?.full_name || '',
          email: adminData?.email || user.email || '',
          phone: adminData?.phone || '',
          role: adminData?.role || '',
          bio: profileData?.bio || '',
          avatar_url: adminData?.avatar_url || user.user_metadata?.avatar_url || null,
        };
        setProfile(fetched);
        setProfileSnapshot(fetched);
      } catch {
        showToast('Failed to load profile.', 'error');
      } finally {
        setFetching(false);
      }
    }
    fetchProfile();
  }, []);

  function showToast(message, type = 'success') {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 3000);
  }

  const handleEdit = () => { setProfileSnapshot({ ...profile }); setIsEditing(true); };
  const handleCancel = () => { setProfile(profileSnapshot); setIsEditing(false); };
  const handlePhoneChange = e => setProfile(p => ({ ...p, phone: e.target.value.replace(/\D/g, '') }));

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { error: adminError } = await supabase.from('admins').update({ full_name: profile.full_name, phone: profile.phone, avatar_url: profile.avatar_url, updated_at: new Date().toISOString() }).eq('id', user.id);
      if (adminError) throw adminError;
      const { error: profileError } = await supabase.from('profiles').update({ full_name: profile.full_name, bio: profile.bio, avatar_url: profile.avatar_url, updated_at: new Date().toISOString() }).eq('id', user.id);
      if (profileError) throw profileError;
      setProfileSnapshot({ ...profile });
      setSaved(true); setIsEditing(false);
      showToast('Profile updated successfully.');
      setTimeout(() => setSaved(false), 3000);
    } catch {
      showToast('Failed to update profile.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const ext = file.name.split('.').pop();
      const filePath = `avatars/${user.id}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      setProfile(p => ({ ...p, avatar_url: publicUrl }));
      showToast('Avatar updated.');
    } catch {
      const reader = new FileReader();
      reader.onloadend = () => setProfile(p => ({ ...p, avatar_url: reader.result }));
      reader.readAsDataURL(file);
      showToast('Avatar preview updated (storage not configured).');
    }
  };

  const handlePasswordReset = async () => {
    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(profile.email, {
      redirectTo: `${window.location.origin}/`,
      });
      if (error) throw error;
      showToast(`Password reset email sent to ${profile.email}.`);
    } catch (err) {
      if (err?.status === 429 || err?.message?.toLowerCase().includes('rate')) {
        showToast('Too many requests. Please wait and try again.', 'error');
      } else {
        showToast('Failed to send reset email.', 'error');
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  const getInitials = () => (profile.full_name?.charAt(0) || 'A').toUpperCase();

  if (fetching) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)' }} />
      </div>
    );
  }

  return (
    <>
      <style>{PALETTE_STYLE}</style>

      <Toast {...toast} />

      <div style={{ padding: '32px 24px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>

          {/* Page header */}
          <div style={{ marginBottom: 24 }}>
            <p style={{ fontSize: 11, color: 'var(--muted)', margin: '0 0 4px' }}>Pages / profile</p>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: 'var(--fg)' }}>Profile</h1>
          </div>

          {/* Main card */}
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>

            {/* Header banner — accent red */}
            <div style={{
              padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'var(--accent)',
            }}>
              <div>
                <h2 style={{ margin: '0 0 4px', color: '#fff', fontWeight: 600, fontSize: 15 }}>Profile Settings</h2>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>Manage your administrative identity and security preferences.</p>
              </div>
              <div style={{
                width: 40, height: 40, background: 'rgba(255,255,255,0.15)',
                borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <UserIcon size={20} style={{ color: 'rgba(255,255,255,0.8)' }} />
              </div>
            </div>

            {/* Body: sidebar + form */}
            <div style={{ padding: 24, display: 'grid', gridTemplateColumns: 'minmax(220px,260px) 1fr', gap: 24 }}>

              {/* ── Left Sidebar ── */}
              <div style={{
                background: 'var(--sidebar-bg)', border: '1px solid var(--border)',
                borderRadius: 20, padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center',
              }}>
                {/* Avatar */}
                <div style={{ position: 'relative', width: 112, height: 112, marginBottom: 20 }}>
                  <div style={{
                    width: '100%', height: '100%', borderRadius: '50%',
                    background: 'var(--surface)', overflow: 'hidden',
                    border: '2px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {profile.avatar_url
                      ? <img src={profile.avatar_url} alt={profile.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : (
                        <div style={{
                          width: '100%', height: '100%', borderRadius: '50%',
                          background: 'rgba(219,26,26,0.1)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <span style={{ fontSize: 36, fontWeight: 700, color: 'var(--accent)' }}>{getInitials()}</span>
                        </div>
                      )
                    }
                  </div>
                  {/* Shield badge */}
                  <div style={{
                    position: 'absolute', bottom: 0, right: 0, width: 30, height: 30,
                    background: 'var(--accent)', borderRadius: '50%',
                    border: '2px solid var(--bg)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Shield size={13} style={{ color: '#fff' }} />
                  </div>
                  {/* Edit overlays */}
                  {isEditing && (
                    <div style={{
                      position: 'absolute', inset: 0, borderRadius: '50%',
                      background: 'rgba(0,0,0,0.45)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}>
                      <button
                        onClick={() => setIsCameraOpen(true)}
                        style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.2)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      ><Camera size={14} /></button>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.2)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      ><Upload size={14} /></button>
                    </div>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileUpload} />
                </div>

                <h3 style={{ fontWeight: 700, fontSize: 16, color: 'var(--fg)', margin: '0 0 4px', textAlign: 'center' }}>{profile.full_name || 'Admin User'}</h3>
                <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 24px', textAlign: 'center' }}>{profile.role}</p>

                {/* Progress */}
                <div style={{ width: '100%', borderTop: '1px solid var(--border)', paddingTop: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted)' }}>Employee Status</span>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: isVerified ? '#22c55e' : 'var(--accent)' }}>
                      {isVerified ? 'Verified' : `${filledCount}/4`}
                    </span>
                  </div>
                  <div style={{ height: 6, background: 'var(--surface)', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 999,
                      background: isVerified ? '#22c55e' : 'var(--accent)',
                      width: `${progressPercent}%`,
                      transition: 'width 0.5s ease',
                    }} />
                  </div>
                  {!isVerified && (
                    <p style={{ fontSize: 10, color: 'var(--muted)', marginTop: 6 }}>Fill all fields to get verified</p>
                  )}
                </div>
              </div>

              {/* ── Right: Form ── */}
              <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden' }}>
                <form onSubmit={handleSave}>
                  <div style={{ padding: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                      <h3 style={{ margin: 0, fontWeight: 700, fontSize: 16, color: 'var(--fg)' }}>Personal Information</h3>
                      {!isEditing && (
                        <button
                          type="button" onClick={handleEdit}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '8px 16px', border: '1px solid var(--border)',
                            borderRadius: 12, fontSize: 11, fontWeight: 700,
                            color: 'var(--fg)', background: 'transparent', cursor: 'pointer',
                            letterSpacing: '0.05em', transition: 'all 0.15s',
                          }}
                        >
                          <Pencil size={12} /> Edit Profile
                        </button>
                      )}
                    </div>
                    <div style={{ borderBottom: '1px solid var(--border)', marginBottom: 24 }} />

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                        <div>
                          <FieldLabel icon={UserIcon}>Full Name</FieldLabel>
                          {isEditing
                            ? <input type="text" value={profile.full_name}
                                onChange={e => setProfile(p => ({ ...p, full_name: e.target.value.replace(/[^a-zA-Z\s]/g, '') }))}
                                placeholder="Your full name" style={inputBase} />
                            : <div style={inputDisabledStyle}>{profile.full_name || '—'}</div>
                          }
                        </div>
                        <div>
                          <FieldLabel icon={Mail}>Email</FieldLabel>
                          <div style={inputDisabledStyle}>{profile.email || '—'}</div>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                        <div>
                          <FieldLabel icon={Phone}>Phone Number</FieldLabel>
                          {isEditing
                            ? <input type="tel" value={profile.phone} onChange={handlePhoneChange}
                                placeholder="08xxxxxxxxxx" inputMode="numeric" style={inputBase} />
                            : <div style={inputDisabledStyle}>{profile.phone || '—'}</div>
                          }
                        </div>
                      </div>

                      <div>
                        <FieldLabel icon={FileText}>Bio</FieldLabel>
                        {isEditing
                          ? <textarea rows={4} value={profile.bio}
                              onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))}
                              placeholder="Tell us about your role..."
                              style={{ ...inputBase, resize: 'none' }} />
                          : <div style={{ ...inputDisabledStyle, minHeight: 100 }}>{profile.bio || '—'}</div>
                        }
                      </div>
                    </div>
                  </div>

                  {isEditing && (
                    <div style={{
                      padding: '20px 24px', borderTop: '1px solid var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                      <div>
                        {saved && (
                          <motion.div
                            initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#22c55e', fontSize: 13, fontWeight: 500 }}
                          >
                            <CheckCircle2 size={15} /> Changes saved
                          </motion.div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button type="button" onClick={handleCancel} style={{ ...cancelBtnStyle, flex: 'none', padding: '10px 20px' }}>
                          <X size={13} style={{ display: 'inline', marginRight: 6 }} />Cancel
                        </button>
                        <button type="submit" disabled={loading}
                          style={{ ...primaryBtnStyle, flex: 'none', padding: '10px 24px', opacity: loading ? 0.6 : 1 }}>
                          {loading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
                          {loading ? 'Saving...' : 'Save changes'}
                        </button>
                      </div>
                    </div>
                  )}
                </form>
              </div>
            </div>
          </div>

          {/* ── Security Settings ── */}
          <div style={{
            marginTop: 20, background: 'var(--bg)', border: '1px solid var(--border)',
            borderRadius: 20, overflow: 'hidden',
          }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Shield size={13} style={{ color: 'var(--muted)' }} />
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted)' }}>Security Settings</span>
            </div>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>

              {/* Password row */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: 16, background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 14, transition: 'border-color 0.15s',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 36, height: 36, background: 'var(--bg)',
                    border: '1px solid var(--border)', borderRadius: 12,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Lock size={14} style={{ color: 'var(--muted)' }} />
                  </div>
                  <div>
                    <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 500, color: 'var(--fg)' }}>Change password</p>
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--muted)' }}>Update your account password via email</p>
                  </div>
                </div>
                <button
                  onClick={handlePasswordReset} disabled={passwordLoading}
                  style={{
                    padding: '6px 16px', border: '1px solid var(--border)',
                    background: 'var(--bg)', borderRadius: 10,
                    fontSize: 11, fontWeight: 700, color: 'var(--fg)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6,
                    opacity: passwordLoading ? 0.5 : 1, transition: 'all 0.15s',
                    letterSpacing: '0.04em',
                  }}
                >
                  {passwordLoading && <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} />}
                  {passwordLoading ? 'Sending...' : 'Change'}
                </button>
              </div>

              {/* 2FA row */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: 16, background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 14, transition: 'border-color 0.15s',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 36, height: 36, background: 'var(--bg)',
                    border: '1px solid var(--border)', borderRadius: 12,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Smartphone size={14} style={{ color: 'var(--muted)' }} />
                  </div>
                  <div>
                    <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 500, color: 'var(--fg)' }}>Two-factor authentication</p>
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--muted)' }}>
                      {isTwoFAEnabled ? 'Currently enabled — your account is protected' : 'Add an extra layer of security'}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {isTwoFAEnabled && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, color: '#22c55e',
                      background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
                      padding: '2px 8px', borderRadius: 6, letterSpacing: '0.1em',
                    }}>ON</span>
                  )}
                  <button
                    onClick={() => setShow2FA(true)}
                    style={{
                      padding: '6px 16px', border: '1px solid var(--border)',
                      background: isTwoFAEnabled ? 'var(--accent)' : 'var(--bg)',
                      color: isTwoFAEnabled ? '#fff' : 'var(--fg)',
                      borderColor: isTwoFAEnabled ? 'var(--accent)' : 'var(--border)',
                      borderRadius: 10, fontSize: 11, fontWeight: 700,
                      cursor: 'pointer', letterSpacing: '0.04em', transition: 'all 0.15s',
                    }}
                  >
                    {isTwoFAEnabled ? 'Disable 2FA' : 'Enable 2FA'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isCameraOpen && (
          <CameraModal
            open={isCameraOpen}
            onClose={() => setIsCameraOpen(false)}
            onCapture={dataUrl => { setProfile(p => ({ ...p, avatar_url: dataUrl })); showToast('Avatar updated.'); }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {show2FA && (
          <TwoFAModal
            open={show2FA}
            enabled={isTwoFAEnabled}
            onClose={() => setShow2FA(false)}
            onEnabled={() => setIsTwoFAEnabled(true)}
            onDisabled={() => setIsTwoFAEnabled(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}