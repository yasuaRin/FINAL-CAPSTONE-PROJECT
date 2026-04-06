import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  LayoutDashboard, TrendingUp, Briefcase, Radar,
  Calendar, Bell, Users, User, Settings, LogOut,
  Menu, Search, X
} from 'lucide-react';

export const AdminLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard' },
    { icon: TrendingUp, label: 'Revenue', path: '/admin/revenue' },
    { icon: Briefcase, label: 'Brands', path: '/admin/brands' },
    { icon: Radar, label: 'Lead Radar', path: '/admin/leads' },
    { icon: Calendar, label: 'AI Schedule', path: '/admin/schedule' },
    { icon: Bell, label: 'Intelligence', path: '/admin/notifications' },
    { icon: Users, label: 'Staff', path: '/admin/team' },
    { icon: User, label: 'My Profile', path: '/admin/profile' },
    { icon: Settings, label: 'Settings', path: '/admin/settings' },
  ];

  const currentPage = navItems.find(i => location.pathname.startsWith(i.path))?.label || 'Dashboard';

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login', { replace: true });
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#f0f2f5' }}>

      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1040,
            background: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(4px)'
          }}
        />
      )}

      {/* ── Sidebar ── */}
      {[true, false].map((isDesktop) => (
        <aside
          key={isDesktop ? 'desktop' : 'mobile'}
          style={{
            width: '280px',
            minWidth: '280px',
            flexShrink: 0,
            ...(isDesktop ? {
              display: 'none'
            } : {
              position: 'fixed',
              top: 0, left: 0, bottom: 0,
              zIndex: 1045,
              transform: isSidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
              transition: 'transform 0.3s ease'
            })
          }}
          className={isDesktop ? 'd-none d-lg-block' : 'd-lg-none'}
        >
          {/* Sidebar Card */}
          <div style={{
            display: 'flex', flexDirection: 'column',
            height: 'calc(100vh - 2rem)',
            margin: '1rem',
            borderRadius: '1rem',
            background: 'white',
            boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
            border: '1px solid rgba(0,0,0,0.06)',
            overflow: 'hidden'
          }}>
            {/* Logo */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid rgba(0,0,0,0.06)',
              display: 'flex', alignItems: 'center', gap: '12px'
            }}>
              <div style={{
                width: '36px', height: '36px',
                background: 'linear-gradient(195deg, #42424a, #191919)',
                borderRadius: '10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <LayoutDashboard size={18} color="white" />
              </div>
              <div>
                <div style={{ fontSize: '16px', fontWeight: '800', color: '#344767', lineHeight: 1 }}>VidHelp</div>
                <div style={{ fontSize: '11px', color: '#7b809a', marginTop: '2px' }}>Admin Portal</div>
              </div>
              {/* Mobile close */}
              {!isDesktop && (
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#7b809a', display: 'flex', padding: '4px' }}
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {/* User */}
            <div style={{
              padding: '16px 24px',
              borderBottom: '1px solid rgba(0,0,0,0.06)',
              display: 'flex', alignItems: 'center', gap: '12px'
            }}>
              <div style={{
                width: '42px', height: '42px', flexShrink: 0,
                background: 'linear-gradient(195deg, #667eea, #764ba2)',
                borderRadius: '10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '16px', fontWeight: '700', color: 'white'
              }}>
                {(user?.full_name || 'A').charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '13px', fontWeight: '700', color: '#344767',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                }}>
                  {user?.full_name || 'Administrator'}
                </div>
                <div style={{ fontSize: '11px', color: '#7b809a', textTransform: 'capitalize' }}>
                  {user?.role || 'Admin'}
                </div>
              </div>
              <div style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: '#4caf50', flexShrink: 0,
                boxShadow: '0 0 0 2px rgba(76,175,80,0.25)'
              }} />
            </div>

            {/* Nav */}
            <nav style={{ flex: 1, padding: '12px', overflowY: 'auto' }}>
              <div style={{
                fontSize: '10px', fontWeight: '700', color: '#7b809a',
                textTransform: 'uppercase', letterSpacing: '0.1em',
                padding: '4px 12px 8px'
              }}>
                Main Menu
              </div>
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    style={({ isActive }) => ({
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '10px 16px', borderRadius: '10px',
                      marginBottom: '2px', textDecoration: 'none',
                      fontSize: '13px', fontWeight: isActive ? '600' : '400',
                      background: isActive
                        ? 'linear-gradient(195deg, #42424a 0%, #191919 100%)'
                        : 'transparent',
                      color: isActive ? 'white' : '#7b809a',
                      boxShadow: isActive ? '0 4px 12px rgba(0,0,0,0.2)' : 'none',
                      transition: 'all 0.15s ease'
                    })}
                    onMouseEnter={e => {
                      const isActive = e.currentTarget.style.background.includes('191919');
                      if (!isActive) {
                        e.currentTarget.style.background = 'rgba(0,0,0,0.04)';
                        e.currentTarget.style.color = '#344767';
                      }
                    }}
                    onMouseLeave={e => {
                      const isActive = e.currentTarget.style.background.includes('191919');
                      if (!isActive) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = '#7b809a';
                      }
                    }}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>

            {/* Sign out */}
            <div style={{ padding: '12px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
              <button
                onClick={handleLogout}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '10px 16px', borderRadius: '10px',
                  background: 'transparent', border: 'none',
                  color: '#7b809a', cursor: 'pointer',
                  fontSize: '13px', fontWeight: '400',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(234,6,6,0.06)';
                  e.currentTarget.style.color = '#ea0606';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#7b809a';
                }}
              >
                <LogOut size={18} />
                Sign Out
              </button>
            </div>
          </div>
        </aside>
      ))}

      {/* ── Main ── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* Topbar */}
        <header style={{
          height: '72px', display: 'flex', alignItems: 'center',
          padding: '0 28px', gap: '16px', flexShrink: 0,
          background: 'transparent'
        }}>
          {/* Mobile menu toggle */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="d-lg-none"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '8px', borderRadius: '8px', color: '#344767', display: 'flex'
            }}
          >
            <Menu size={22} />
          </button>

          {/* Breadcrumb */}
          <div>
            <div style={{ fontSize: '11px', color: '#7b809a', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Pages / {currentPage}
            </div>
            <div style={{ fontSize: '15px', fontWeight: '700', color: '#344767' }}>
              {currentPage}
            </div>
          </div>

          {/* Right side */}
          <div style={{
            marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px',
            background: 'rgba(255,255,255,0.7)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.8)',
            borderRadius: '12px',
            padding: '8px 16px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)'
          }}>
            {/* Search */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} className="d-none d-md-flex">
              <Search size={14} color="#7b809a" />
              <input
                type="text"
                placeholder="Search..."
                style={{
                  border: 'none', background: 'transparent', outline: 'none',
                  fontSize: '13px', color: '#344767', width: '160px',
                  borderBottom: '1px solid #d2d6da', paddingBottom: '2px'
                }}
              />
            </div>

            {/* Divider */}
            <div style={{ width: '1px', height: '20px', background: '#d2d6da' }} className="d-none d-md-block" />

            {/* Avatar */}
            <div
              onClick={() => navigate('/admin/profile')}
              style={{
                width: '34px', height: '34px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '13px', fontWeight: '700', color: 'white',
                cursor: 'pointer', border: '2px solid white',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
              }}
            >
              {(user?.full_name || 'A').charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page content */}
        <section style={{ flex: 1, overflowY: 'auto', padding: '0 28px 28px' }}>
          <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <Outlet />
          </div>
        </section>
      </main>

      {/* Desktop sidebar fix */}
      <style>{`
        @media (min-width: 992px) {
          aside.d-none.d-lg-block {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
};