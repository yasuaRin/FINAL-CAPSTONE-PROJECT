import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabase';

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

const AdminResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('EVENT:', event, 'SESSION:', session);
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true);
      } else if (event === 'SIGNED_IN' && session) {
        setSessionReady(true);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) {
        setSessionReady(true);
      } else {
        // Tunggu event dulu, jangan langsung error
        setTimeout(() => {
          if (!sessionReady) {
            setError('Link tidak valid atau sudah expired. Silakan request ulang.');
          }
        }, 3000);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('Password tidak cocok.');
      return;
    }
    if (password.length < 8) {
      setError('Password minimal 8 karakter.');
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw new Error(updateError.message);

      await supabase.auth.signOut();
      navigate('/admin/login', {
        replace: true,
        state: { message: 'Password berhasil diubah. Silakan login.' },
      });
    } catch (err) {
      setError(err.message || 'Gagal mengubah password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* ✅ Hide browser's built-in password manager icons */}
      <style>{`
        input::-ms-reveal,
        input::-ms-clear {
          display: none;
        }
        input::-webkit-credentials-auto-fill-button,
        input::-webkit-strong-password-auto-fill-button {
          display: none !important;
          visibility: hidden;
          pointer-events: none;
        }
      `}</style>

      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-6 p-8 bg-white rounded-xl shadow-lg">

          <div>
            <h2 className="text-center text-3xl font-bold text-gray-900">Set New Password</h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Enter your new password below
            </p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>
          )}

          {!sessionReady && !error && (
            <div className="flex justify-center py-4">
              <div className="w-8 h-8 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
            </div>
          )}

          {sessionReady && (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-medium text-gray-700">New Password</label>
                <div className="relative mt-1">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 transition-colors z-10"
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
                <div className="relative mt-1">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 transition-colors z-10"
                  >
                    {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save New Password'}
              </button>
            </form>
          )}

          {error && (
            <button
              onClick={() => navigate('/admin/login', { replace: true })}
              className="w-full text-center text-sm text-gray-500 hover:text-black transition-colors"
            >
              ← Back to Sign in
            </button>
          )}

        </div>
      </div>
    </>
  );
};

export default AdminResetPassword;