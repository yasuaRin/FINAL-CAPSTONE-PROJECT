import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  LayoutDashboard, Users, LogOut, Search,
  TrendingUp, Menu, X, Briefcase, User, Radar
} from 'lucide-react';

export const AdminLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, loading: authLoading } = useAuth();

  // Real data from auth.users — no extra table needed
  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'Admin';

  const avatarUrl =
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.picture ||
    null;

  const initials = displayName.charAt(0).toUpperCase();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/admin/login', { replace: true });
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  const navItems = [
    { icon: <LayoutDashboard size={20} />, label: 'Dashboard',  path: '/admin' },
    { icon: <TrendingUp size={20} />,      label: 'Revenue',    path: '/admin/revenue' },
    { icon: <Briefcase size={20} />,       label: 'Brands',     path: '/admin/brands' },
    { icon: <Radar size={20} />,           label: 'Lead Radar', path: '/admin/leads' },
    { icon: <Users size={20} />,           label: 'Staff',      path: '/admin/team' },
    { icon: <User size={20} />,            label: 'My Profile', path: '/admin/profile' },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login', { replace: true });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-[3px] border-muted border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }

  const pageSegment = location.pathname.split('/').filter(Boolean).pop() || 'Dashboard';

  const SidebarContent = () => (
    <div className="flex flex-col h-[calc(100vh-1rem)] sm:h-[calc(100vh-2rem)] m-2 sm:m-4 rounded-xl bg-white shadow-xl overflow-hidden border border-black/10">
      <div className="p-4 sm:p-6 flex items-center justify-between border-b border-black/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-black/5">
            <LayoutDashboard size={18} style={{ color: '#344767' }} />
          </div>
          <h1 className="text-xl font-bold tracking-tight" style={{ color: '#344767' }}>
            VidHelp
          </h1>
        </div>
        <button
          onClick={() => setIsSidebarOpen(false)}
          className="p-2 rounded-lg transition-colors hover:bg-black/5"
          style={{ color: '#7b809a' }}
        >
          <X size={20} />
        </button>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/admin'}
            className={({ isActive }) =>
              `flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive ? 'primary-gradient text-white shadow-md' : 'hover:bg-black/5'
              }`
            }
            style={({ isActive }) => isActive ? {} : { color: '#7b809a' }}
          >
            <span className="shrink-0">{item.icon}</span>
            <span className="text-sm font-light">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-black/10">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-all text-sm font-light hover:bg-black/5"
          style={{ color: '#7b809a' }}
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden relative">
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 sm:w-72 flex flex-col transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarContent />
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* ONLY CHANGE IS HERE — header */}
        <header
          className="shrink-0 z-30 px-4 sm:px-6 lg:px-8"
          style={{
            height: '80px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'nowrap',   /* ← forces single row always */
          }}
        >
          {/* LEFT: hamburger + breadcrumb — shrink-0 so it never wraps */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 hover:bg-white/50 rounded-md"
              style={{ color: '#344767' }}
              aria-label="Open sidebar"
            >
              <Menu size={22} />
            </button>
            <div>
              <p style={{ fontSize: '11px', color: '#7b809a', margin: 0, fontWeight: 300 }}>
                Pages / {pageSegment}
              </p>
              <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#344767', margin: 0, textTransform: 'capitalize' }}>
                {pageSegment}
              </h2>
            </div>
          </div>

          {/* RIGHT: pill — shrink-0 so it never wraps or squishes */}
          <div
            style={{
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              background: 'white',
              borderRadius: '16px',
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
              border: '1px solid #f1f1f1',
              padding: '8px 16px',
            }}
          >
            {/* Search — hidden on small screens via inline media won't work,
                so we keep the Tailwind class just on this inner wrapper */}
            <div className="hidden lg:flex flex-col" style={{ minWidth: '180px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Search size={16} style={{ color: '#7b809a', flexShrink: 0 }} />
                <input
                  type="text"
                  placeholder="Search..."
                  style={{
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    fontSize: '14px',
                    color: '#344767',
                    width: '100%',
                    padding: '2px 0',
                  }}
                />
              </div>
              <div style={{ height: '1px', background: '#e2e8f0', marginTop: '4px' }} />
            </div>

            {/* Divider — desktop only */}
            <div className="hidden lg:block" style={{ width: '1px', height: '28px', background: '#e2e8f0' }} />

            {/* Avatar — always visible */}
            <div
              onClick={() => navigate('/admin/profile')}
              title={displayName}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: '1px solid #e2e8f0',
                overflow: 'hidden',
                cursor: 'pointer',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#f0f2f5',
                transition: 'transform 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#344767', userSelect: 'none' }}>
                  {initials}
                </span>
              )}
            </div>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
          <div className="max-w-7xl mx-auto pt-4">
            <Outlet />
          </div>
        </section>

      </main>
    </div>
  );
};