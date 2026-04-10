import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  LayoutDashboard, Users, LogOut, Search,
  TrendingUp, Menu, X, Briefcase, User, Calendar, Bell, Settings, Radar
} from 'lucide-react';

export const AdminLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/admin/login', { replace: true });
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  const navItems = [
    { icon: <LayoutDashboard size={20} />, label: 'Dashboard',   path: '/admin' },
    { icon: <TrendingUp size={20} />,      label: 'Revenue',     path: '/admin/revenue' },
    { icon: <Briefcase size={20} />,       label: 'Brands',      path: '/admin/brands' },
    { icon: <Radar size={20} />,           label: 'Lead Radar',  path: '/admin/leads' },
    { icon: <Users size={20} />,           label: 'Staff',       path: '/admin/team' },
    { icon: <User size={20} />,            label: 'My Profile',  path: '/admin/profile' },
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

      {/* Logo + close */}
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
          aria-label="Close sidebar"
          style={{ color: '#7b809a' }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Nav links */}
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

      {/* Sign out */}
      <div className="p-4 border-t border-black/10">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-all text-sm font-light hover:bg-black/5"
          style={{ color: '#7b809a' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#344767')}
          onMouseLeave={e => (e.currentTarget.style.color = '#7b809a')}
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden relative">

      {/* Backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 sm:w-72 flex flex-col transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarContent />
      </aside>

      {/* Main — flex-col, overflow-hidden so only <section> scrolls */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">

        <header className="h-16 sm:h-20 flex items-center justify-between px-4 sm:px-6 lg:px-8 z-30 shrink-0">

          {/* Left: hamburger + breadcrumb */}
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 hover:bg-white/50 rounded-md shrink-0"
              style={{ color: '#344767' }}
              aria-label="Open sidebar"
            >
              <Menu size={20} className="sm:hidden" />
              <Menu size={24} className="hidden sm:block" />
            </button>
            <div className="flex flex-col min-w-0">
              <p className="text-[10px] sm:text-xs font-light truncate" style={{ color: '#7b809a' }}>
                Pages / {pageSegment}
              </p>
              <h2 className="text-xs sm:text-sm font-bold capitalize truncate" style={{ color: '#344767' }}>
                {pageSegment}
              </h2>
            </div>
          </div>

          {/* Right: glass pill - Search on LEFT, Avatar on RIGHT */}
          <div className="flex items-center gap-2 sm:gap-4 bg-white/50 backdrop-blur-md px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl shadow-sm border border-white/20 shrink-0">

            {/* Search - LEFT side of pill, hidden below lg */}
            <div className="hidden lg:flex items-center gap-3">
              <div className="relative w-48 group">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 transition-colors text-muted-foreground group-focus-within:text-primary"
                  size={14}
                />
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full bg-transparent border-b border-border pl-8 pr-2 py-1 text-xs focus:outline-none focus:border-primary transition-all"
                  style={{ color: '#344767' }}
                />
              </div>
            </div>

            {/* Divider */}
            <div className="hidden lg:block w-px h-6 bg-border"></div>

            {/* Avatar — RIGHT side of pill */}
            <div
              className="h-7 w-7 sm:h-8 sm:w-8 rounded-full border border-border bg-muted cursor-pointer flex items-center justify-center shrink-0"
              onClick={() => navigate('/admin/profile')}
              title="Go to profile"
            >
              <span className="text-xs font-bold select-none" style={{ color: '#344767' }}>
                {(user?.full_name || user?.email || 'A').charAt(0).toUpperCase()}
              </span>
            </div>

          </div>
        </header>

        {/* Scrollable page content - ADDED SCROLLING BAR */}
        <section className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </section>

      </main>
    </div>
  );
};