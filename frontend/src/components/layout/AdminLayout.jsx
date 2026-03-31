// frontend/src/components/layout/AdminLayout.tsx
import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const menuItems = [
    { path: '/admin/dashboard', icon: 'fa-chart-line', label: 'Dashboard' },
    { path: '/admin/revenue', icon: 'fa-dollar-sign', label: 'Revenue' },
    { path: '/admin/brands', icon: 'fa-building', label: 'Brands' },
    { path: '/admin/team', icon: 'fa-users', label: 'Team' },
    { path: '/admin/map', icon: 'fa-map', label: 'Smart Map' },
    { path: '/admin/schedule', icon: 'fa-calendar', label: 'Schedule' },
  ];

  const isActive = (path) => location.pathname === path;
  const currentPageTitle = menuItems.find(item => isActive(item.path))?.label || 'Dashboard';

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login', { replace: true }); // ← was '/login'
  };

  return (
    <div className="d-flex vh-100 overflow-hidden">
      <aside
        className={`bg-dark text-white d-flex flex-column position-fixed position-lg-static h-100 ${
          sidebarOpen ? 'd-flex' : 'd-none d-lg-flex'
        }`}
        style={{ width: '280px', zIndex: 1045, transition: 'all 0.3s ease-in-out' }}
      >
        {/* Logo */}
        <div className="p-4 border-bottom border-secondary">
          <h2 className="h4 mb-0 text-white">
            <i className="fas fa-chart-simple me-2"></i>
            VIDHELP
          </h2>
          <p className="text-white-50 small mb-0 mt-1">Admin Portal</p>
        </div>

        {/* User Info */}
        <div className="p-4 border-bottom border-secondary">
          <div className="d-flex align-items-center gap-3">
            <div
              className="bg-primary rounded-circle d-flex align-items-center justify-content-center"
              style={{ width: '48px', height: '48px' }}
            >
              <i className="fas fa-user fa-lg text-white"></i>
            </div>
            <div>
              <h6 className="mb-0 text-white">{user?.full_name || 'Administrator'}</h6>
              <small className="text-white-50 text-capitalize">{user?.role || 'Admin'}</small>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-grow-1 py-4">
          <ul className="nav flex-column">
            {menuItems.map((item) => {
              const active = isActive(item.path);
              return (
                <li key={item.path} className="nav-item px-3 mb-2">
                  <Link
                    to={item.path}
                    className={`nav-link rounded-3 py-2 px-3 d-flex align-items-center gap-3 ${
                      active ? 'bg-primary text-white active' : 'text-white-50 hover-text-white'
                    }`}
                    style={{ transition: 'all 0.2s ease' }}
                  >
                    <i className={`fas ${item.icon} fa-fw`}></i>
                    <span>{item.label}</span>
                    {active && <i className="fas fa-chevron-right ms-auto fa-xs"></i>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Logout */}
        <div className="p-4 border-top border-secondary mt-auto">
          <button
            onClick={handleLogout}
            className="btn btn-outline-danger w-100 d-flex align-items-center justify-content-center gap-2"
          >
            <i className="fas fa-sign-out-alt"></i>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="flex-grow-1 bg-light overflow-auto">
        {/* Top Navbar */}
        <nav className="navbar navbar-expand-lg bg-white shadow-sm sticky-top">
          <div className="container-fluid px-4">
            <div>
              <h5 className="mb-0 fw-semibold">{currentPageTitle}</h5>
              <small className="text-muted">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </small>
            </div>

            <div className="d-flex align-items-center gap-3">
              {/* Notifications */}
              <div className="dropdown">
                <button
                  className="btn btn-link text-dark position-relative"
                  data-bs-toggle="dropdown"
                >
                  <i className="fas fa-bell fs-5"></i>
                  <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                    3
                  </span>
                </button>
                <ul className="dropdown-menu dropdown-menu-end p-0" style={{ width: '300px' }}>
                  <li className="px-3 py-2 border-bottom">
                    <h6 className="mb-0">Notifications</h6>
                  </li>
                  <li>
                    <a className="dropdown-item py-3" href="#">
                      <div className="d-flex gap-3">
                        <i className="fas fa-dollar-sign text-success mt-1"></i>
                        <div>
                          <p className="mb-0 small">New revenue recorded</p>
                          <small className="text-muted">2 minutes ago</small>
                        </div>
                      </div>
                    </a>
                  </li>
                  <li className="border-top">
                    <a className="dropdown-item text-center py-2 small" href="#">
                      View all notifications
                    </a>
                  </li>
                </ul>
              </div>

              {/* User Dropdown */}
              <div className="dropdown">
                <button
                  className="btn btn-link text-dark dropdown-toggle d-flex align-items-center gap-2"
                  data-bs-toggle="dropdown"
                >
                  <i className="fas fa-user-circle fs-4"></i>
                  <span className="d-none d-md-inline">
                    {user?.full_name?.split(' ')[0] || 'Admin'}
                  </span>
                </button>
                <ul className="dropdown-menu dropdown-menu-end">
                  <li>
                    <Link className="dropdown-item" to="/admin/profile">
                      <i className="fas fa-user me-2"></i> My Profile
                    </Link>
                  </li>
                  <li>
                    <Link className="dropdown-item" to="/admin/settings">
                      <i className="fas fa-cog me-2"></i> Settings
                    </Link>
                  </li>
                  <li><hr className="dropdown-divider" /></li>
                  <li>
                    <button className="dropdown-item text-danger" onClick={handleLogout}>
                      <i className="fas fa-sign-out-alt me-2"></i> Logout
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </nav>

        <div className="p-4">
          <Outlet />
        </div>
      </main>
    </div>
  );
};