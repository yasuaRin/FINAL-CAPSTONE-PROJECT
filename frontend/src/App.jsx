// frontend/src/App.jsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminLayout } from './components/layout/AdminLayout';
import { Dashboard } from './pages/admin/Dashboard';
import { Login } from './pages/auth/AdminLogin';
import ForgotPassword  from './pages/auth/ForgotPassword';
import  Register from './pages/auth/Register';
import { useAuth } from './hooks/useAuth';
import Brands from './pages/admin/Brands';
import Revenue from './pages/admin/Revenue';
import Team from './pages/admin/Team';
import Leads from './pages/admin/Leads';
import Profile from './pages/admin/Profile';

const ProtectedRoute = ({ children }) => {
  const { loading } = useAuth();
  const token = localStorage.getItem('token');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/admin/login" replace />} />
      <Route path="/admin/login" element={<Login />} />
      <Route path="/admin/forgot-password" element={<ForgotPassword />} />
      <Route path="/admin/register" element={<Register />} />

      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="revenue" element={<Revenue />} />
        <Route path="brands" element={<Brands />} />
        <Route path="team" element={<Team />} />
        <Route path="leads" element={<Leads />} />
        <Route path="profile" element={<Profile />} />
        <Route path="settings" element={<div>Settings Page</div>} />
      </Route>

      <Route path="*" element={<Navigate to="/admin/login" replace />} />
    </Routes>
  );
}

export default App;