// frontend/src/App.jsx
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AdminLayout } from './components/layout/AdminLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import Dashboard from './pages/admin/Dashboard';
import Revenue from './pages/admin/Revenue';
import Brands from './pages/admin/Brands';
import Team from './pages/admin/Team';
import Profile from './pages/admin/Profile';
import Map from './pages/admin/Leads';
import AdminLogin from './pages/auth/AdminLogin';
import AdminResetPassword from './pages/auth/AdminResetPassword';
import AdminAuthCallback from './pages/auth/AdminAuthCallback';
import Leads from './pages/admin/Leads';

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/auth/reset-password" element={<AdminResetPassword />} />
        <Route path="/admin/auth/callback" element={<AdminAuthCallback />} />

        <Route path="/admin" element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="revenue" element={<Revenue />} />
          <Route path="brands" element={<Brands />} />
          <Route path="team" element={<Team />} />
          <Route path="profile" element={<Profile />} />
          <Route path="leads" element={<Leads />} />
        </Route>

        <Route path="/" element={<Navigate to="/admin" replace />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </HashRouter>
  );
}

export default App;