import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  DollarSign, 
  Users, 
  Map, 
  Settings,
  LogOut,
  Menu,
  X,
  Briefcase,
  User
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export const AdminLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const menuItems = [
    { path: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/admin/revenue', icon: DollarSign, label: 'Revenue' },
    { path: '/admin/brands', icon: Briefcase, label: 'Brands' },
    { path: '/admin/leads', icon: Map, label: 'Smart Map' },
    { path: '/admin/team', icon: Users, label: 'Team' },
    { path: '/admin/profile', icon: User, label: 'Profile' },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-primary-500 text-white rounded-lg shadow-lg"
      >
        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-40 h-screen w-64 bg-white border-r border-gray-200
        transition-transform duration-300 ease-in-out shadow-soft
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6">
          <h1 className="text-2xl font-bold text-primary-600">VIDHELP</h1>
          <p className="text-sm text-gray-500 mt-1">Admin Portal</p>
        </div>

        {/* User info */}
        <div className="px-6 py-4 border-y border-gray-100">
          <p className="font-medium text-gray-800">{user?.full_name || 'Admin'}</p>
          <p className="text-sm text-gray-500 capitalize">{user?.role || 'user'}</p>
        </div>

        {/* Navigation */}
        <nav className="p-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`sidebar-item ${isActive(item.path) ? 'active' : ''}`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-red-50 hover:text-red-600 transition-all duration-200 mt-4"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </nav>
      </aside>

      {/* Main content */}
      <main className={`
        min-h-screen transition-all duration-300 ease-in-out
        ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-64 ml-0'}
      `}>
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
};