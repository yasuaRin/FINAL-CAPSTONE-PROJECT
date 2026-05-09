import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../services/supabase';

const ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'super_admin', label: 'Super Admin' },
];

const VIEW = {
  LOGIN: 'login',
  FORGOT: 'forgot',
};

const EyeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const EyeOffIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
  </svg>
);

export const AdminLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();

  const [view, setView] = useState(VIEW.LOGIN);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('admin');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [validated, setValidated] = useState(false);

  const successMessage = location.state?.message;

  useEffect(() => {
    if (!authLoading && user && validated) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [user, authLoading, validated, navigate]);

  const validateAdminAccess = async (authUser, selectedRole) => {
    const allowedDomains = ['gmail.com', 'vidhelp.com'];
    const domain = authUser.email.split('@')[1];
    if (!allowedDomains.includes(domain)) {
      await supabase.auth.signOut();
      throw new Error('Only @gmail.com or @vidhelp.com email addresses are allowed.');
    }

    const { data: adminData, error: dbError } = await supabase
      .from('admins')
      .select('role, is_active')
      .eq('id', authUser.id)
      .single();

    if (dbError || !adminData) {
      await supabase.auth.signOut();
      throw new Error('Account not found in the system. Please contact Super Admin.');
    }

    if (!adminData.is_active) {
      await supabase.auth.signOut();
      throw new Error('Your account has been deactivated. Please contact Super Admin.');
    }

    if (adminData.role === 'staff') {
      await supabase.auth.signOut();
      throw new Error('Staff accounts do not have access to the Admin Portal.');
    }

    if (adminData.role !== selectedRole) {
      await supabase.auth.signOut();
      const actualLabel = adminData.role === 'super_admin' ? 'Super Admin' : 'Admin';
      const selectedLabel = selectedRole === 'super_admin' ? 'Super Admin' : 'Admin';
      throw new Error(
        `Wrong access level selected. You selected "${selectedLabel}" but your account is registered as "${actualLabel}". Please select the correct access level and try again.`
      );
    }

    return adminData;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setValidated(false);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw new Error(signInError.message);
      if (!data.user) throw new Error('Login failed. Please try again.');

      await validateAdminAccess(data.user, role);
      setValidated(true);
    } catch (err) {
      setError(err.message || 'Login failed.');
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/#/admin/auth/callback`,
          queryParams: { selected_role: role },
        },
      });
      if (error) throw new Error(error.message);
    } catch (err) {
      setError(err.message || 'Google login failed.');
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/#/admin/auth/reset-password`, // ← fix HashRouter
      });

      if (resetError) throw new Error(resetError.message);

      setSuccess('If this email is registered, a password reset link has been sent. Please check your inbox.');
    } catch (err) {
      setError(err.message || 'Failed to send reset email.');
    } finally {
      setLoading(false);
    }
  };

  const switchView = (newView) => {
    setView(newView);
    setError('');
    setSuccess('');
    setEmail('');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  if (user && validated) return null;

  // ─── Forgot Password View ──────────────────────────────────────────────────
  if (view === VIEW.FORGOT) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-6 p-8 bg-white rounded-xl shadow-lg">

          <div>
            <h2 className="text-center text-3xl font-bold text-gray-900">Reset Password</h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Enter your email and we'll send you a reset link
            </p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>
          )}

          {success && (
            <div className="bg-green-50 text-green-600 p-3 rounded-lg text-sm">{success}</div>
          )}

          <form className="space-y-4" onSubmit={handleForgotPassword}>
            <div>
              <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="reset-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@gmail.com"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !!success}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>

          <button
            onClick={() => switchView(VIEW.LOGIN)}
            className="w-full text-center text-sm text-gray-500 hover:text-black transition-colors"
          >
            ← Back to Sign in
          </button>

        </div>
      </div>
    );
  }

  // ─── Login View ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-6 p-8 bg-white rounded-xl shadow-lg">

        <div>
          <h2 className="text-center text-3xl font-bold text-gray-900">VIDHELP Admin</h2>
          <p className="mt-2 text-center text-sm text-gray-600">Sign in to your account</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>
        )}

        {successMessage && !error && (
          <div className="bg-green-50 text-green-600 p-3 rounded-lg text-sm">{successMessage}</div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>

          {/* Access Level */}
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700">
              Access Level
            </label>
            <div className="relative mt-1">
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black text-sm appearance-none"
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@gmail.com"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black text-sm"
            />
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <button
                type="button"
                onClick={() => switchView(VIEW.FORGOT)}
                className="text-xs text-gray-500 hover:text-black transition-colors"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative mt-1">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-xs font-bold uppercase tracking-wider text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 transition-all"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">or</span>
            </div>
          </div>

          {/* Google Login */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-600 hover:text-black disabled:opacity-50 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in with Google
          </button>

        </form>

        <p className="text-center text-xs text-gray-500">
          Contact your Super Admin if you need access credentials.
        </p>

      </div>
    </div>
  );
};

export default AdminLogin;