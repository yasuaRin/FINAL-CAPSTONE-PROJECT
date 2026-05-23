import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AdminLayout } from './components/layout/AdminLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import Dashboard from './pages/admin/Dashboard';
import Revenue from './pages/admin/Revenue';
import Brands from './pages/admin/Brands';
import Team from './pages/admin/Team';
import Profile from './pages/admin/Profile';
import AdminLogin from './pages/auth/AdminLogin';
import AdminResetPassword from './pages/auth/AdminResetPassword';
import AdminAuthCallback from './pages/auth/AdminAuthCallback';
import Leads from './pages/admin/Leads';
import { useState, useEffect } from 'react';
import { setExportHandlers } from './utils/exportState';
import Landing from './pages/public/Landing'; 
import PublicLayout from './components/layout/PublicLayout';
import AdminAISettings from './pages/admin/AdminAISettings';

function App() {
   const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    setExportHandlers(
      () => setIsExporting(true),
      () => setIsExporting(false)
    );
  }, []);

  return (
    <HashRouter>
      {/* ✅ MOVED: now inside HashRouter so router hooks work in page components */}
      {isExporting && (
        <div style={{
          position: 'fixed',
          left: '-9999px',
          top: 0,
          width: '1200px',
          zIndex: -1,
          pointerEvents: 'none',
          overflow: 'visible',
        }}>
          <div id="dashboard-export-container" style={{ width: '1200px' }}><Dashboard /></div>
          <div id="revenue-export-container"   style={{ width: '1200px' }}><Revenue /></div>
          <div id="brands-export-container"    style={{ width: '1200px' }}><Brands /></div>
          <div id="team-export-container"      style={{ width: '1200px' }}><Team /></div>
          <div id="leads-export-container"     style={{ width: '1200px' }}><Leads /></div>
        </div>
      )}

      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Landing />} />
        </Route>

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
          <Route path="ai-settings" element={<AdminAISettings />} />
        </Route>
        <Route path="/" element={<Navigate to="/admin" replace />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </HashRouter>
  );
}

export default App;