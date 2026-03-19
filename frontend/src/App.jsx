import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AdminLayout } from './components/layout/AdminLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';

// Public pages
const Landing = lazy(() => import('./pages/public/Landing'));
const Booking = lazy(() => import('./pages/public/Booking'));

// Auth pages
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));

// Admin pages
const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
const Revenue = lazy(() => import('./pages/admin/Revenue'));
const Brands = lazy(() => import('./pages/admin/Brands'));
const Leads = lazy(() => import('./pages/admin/Leads'));
const Team = lazy(() => import('./pages/admin/Team'));
const Profile = lazy(() => import('./pages/admin/Profile'));

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      }>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/booking" element={<Booking />} />

          {/* Auth Routes */}
          <Route path="/admin/login" element={<Login />} />
          <Route path="/admin/signup" element={<Register />} />
          <Route path="/admin/forgot-password" element={<ForgotPassword />} />

          {/* Protected Admin Routes */}
          <Route path="/admin" element={
            <ProtectedRoute>
              <AdminLayout>
                <Dashboard />
              </AdminLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/admin/revenue" element={
            <ProtectedRoute>
              <AdminLayout>
                <Revenue />
              </AdminLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/admin/brands" element={
            <ProtectedRoute>
              <AdminLayout>
                <Brands />
              </AdminLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/admin/leads" element={
            <ProtectedRoute>
              <AdminLayout>
                <Leads />
              </AdminLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/admin/team" element={
            <ProtectedRoute>
              <AdminLayout>
                <Team />
              </AdminLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/admin/profile" element={
            <ProtectedRoute>
              <AdminLayout>
                <Profile />
              </AdminLayout>
            </ProtectedRoute>
          } />

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;