import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  LayoutDashboard, Users, LogOut, Bell, Search, Map as MapIcon,
  TrendingUp, Menu, X, Settings, Briefcase, User, Calendar, Radar
} from 'lucide-react';

export const AdminLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/admin' },
    { icon: TrendingUp, label: 'Revenue', path: '/admin/revenue' },
    { icon: Briefcase, label: 'Brands', path: '/admin/brands' },
    { icon: Radar, label: 'Lead Radar', path: '/admin/leads' },
    { icon: Calendar, label: 'AI Schedule', path: '/admin/schedule' },
    { icon: Bell, label: 'Intelligence', path: '/admin/notifications' },
    { icon: Users, label: 'Staff', path: '/admin/team' },
    { icon: User, label: 'My Profile', path: '/admin/profile' },
    { icon: Settings, label: 'Settings', path: '/admin/settings' }
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login', { replace: true });
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden relative">
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-72 flex flex-col transition-transform duration-300 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        {/* Sidebar Header */}
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sidebar-primary rounded-lg flex items-center justify-center">
              <LayoutDashboard size={20} className="text-sidebar-primary-foreground" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-sidebar-foreground">VidHelp</h2>
              <p className="text-xs text-sidebar-foreground/70">Intelligence Console</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path));

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `
                  flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-200
                  ${isActive 
                    ? 'primary-gradient text-white shadow-md' 
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'}
                `}
              >
                <span className="shrink-0"><Icon size={20} /></span>
                <span className="text-sm font-light">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-sidebar-accent rounded-full flex items-center justify-center">
              <User size={16} className="text-sidebar-accent-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {user?.full_name || user?.email || 'Admin'}
              </p>
              <p className="text-xs text-sidebar-foreground/70 capitalize">
                {user?.role || 'Administrator'}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-auto">
        <header className="h-20 flex items-center justify-between px-6 lg:px-8 z-30 shrink-0 border-b border-border bg-card">
          {/* Mobile menu button */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <Menu size={20} />
          </button>

          {/* Page title */}
          <div className="flex-1 lg:flex-none">
            <h1 className="text-xl font-bold text-foreground">
              {navItems.find(item => location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path)))?.label || 'Dashboard'}
            </h1>
          </div>

          {/* Header actions */}
          <div className="flex items-center gap-4">
            <button className="p-2 rounded-lg hover:bg-muted transition-colors">
              <Search size={20} className="text-muted-foreground" />
            </button>
            <button className="p-2 rounded-lg hover:bg-muted transition-colors relative">
              <Bell size={20} className="text-muted-foreground" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-destructive rounded-full"></span>
            </button>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto pt-4">
            <Outlet />
          </div>
        </section>
      </main>
    </div>
  );
};