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

  // MFA states
  const [needsMfa, setNeedsMfa] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [factorId, setFactorId] = useState(null);
  const [mfaLoading, setMfaLoading] = useState(false);

useEffect(() => {
  const href = window.location.href;
  const codeMatch = href.match(/[?&]code=([^&#]+)/);
  const code = codeMatch ? codeMatch[1] : sessionStorage.getItem('reset_code');

  let exchanged = false;

  // ✅ Cek session dulu — mungkin useAuth sudah exchange duluan
  supabase.auth.getSession().then(({ data }) => {
    if (data?.session) {
      exchanged = true;
      sessionStorage.removeItem('reset_code');
      setSessionReady(true);
      return;
    }

    // Kalau belum ada session, baru exchange code
    if (code) {
      sessionStorage.removeItem('reset_code');
      supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
        if (data?.session) {
          exchanged = true;
          setSessionReady(true);
          setError('');
        } else {
          setError('Session not found. Please request a new reset link.');
        }
      });
    } else {
      setTimeout(() => {
        if (!exchanged) {
          setError('Session not found. Please request a new reset link.');
        }
      }, 5000);
    }
  });

  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
      exchanged = true;
      setSessionReady(true);
      setError('');
    }
  });

  return () => subscription.unsubscribe();
}, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      const currentLevel = aalData?.currentLevel;
      const nextLevel = aalData?.nextLevel;

      if (currentLevel === 'aal2' || nextLevel === 'aal1') {
        await updatePassword();
        return;
      }

      const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
      if (factorsError) throw factorsError;

      const totpFactor = factorsData?.totp?.[0];
      if (!totpFactor) {
        await updatePassword();
        return;
      }

      setFactorId(totpFactor.id);
      setNeedsMfa(true);
    } catch (err) {
      setError(err.message || 'Failed to verify session.');
    } finally {
      setLoading(false);
    }
  };

  const handleMfaVerify = async (e) => {
    e.preventDefault();
    setError('');
    setMfaLoading(true);

    try {
      const { data: freshChallenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: freshChallenge.id,
        code: mfaCode.trim(),
      });
      if (verifyError) throw verifyError;

      await updatePassword();
    } catch (err) {
      setError(err.message || 'Invalid or expired MFA code.');
      setMfaCode('');
    } finally {
      setMfaLoading(false);
    }
  };

  const updatePassword = async () => {
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) throw new Error(updateError.message);

    await supabase.auth.signOut();
    navigate('/admin/login', {
      replace: true,
      state: { message: '✓ Password updated! Please sign in with your new password.' },
    });
  };

  return (
    <>
      <style>{`
        input::-ms-reveal, input::-ms-clear { display: none; }
        input::-webkit-credentials-auto-fill-button,
        input::-webkit-strong-password-auto-fill-button {
          display: none !important;
          visibility: hidden;
          pointer-events: none;
        }
      `}</style>

      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0A0A0A]">
        <div className="max-w-md w-full space-y-6 p-8 bg-white dark:bg-[#141414] rounded-xl shadow-lg border border-transparent dark:border-[#262626]">

          <div>
            <h2 className="text-center text-3xl font-bold text-gray-900 dark:text-white">
              {needsMfa ? 'Verify MFA' : 'Set New Password'}
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
              {needsMfa
                ? 'Enter the code from your authenticator app'
                : 'Enter your new password below'}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm border border-red-100 dark:border-red-900/50">
              {error}
            </div>
          )}

          {!sessionReady && !error && (
            <div className="flex justify-center py-4">
              <div className="w-8 h-8 border-2 border-gray-200 dark:border-gray-700 border-t-black dark:border-t-white rounded-full animate-spin" />
            </div>
          )}

          {/* Password form */}
          {sessionReady && !needsMfa && (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">New Password</label>
                <div className="relative mt-1">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="block w-full px-3 py-2 pr-10 border border-gray-300 dark:border-[#262626] rounded-md shadow-sm focus:outline-none focus:ring-[#DB1A1A] focus:border-[#DB1A1A] text-sm bg-white dark:bg-[#1f1f1f] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors z-10">
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Confirm Password</label>
                <div className="relative mt-1">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="block w-full px-3 py-2 pr-10 border border-gray-300 dark:border-[#262626] rounded-md shadow-sm focus:outline-none focus:ring-[#DB1A1A] focus:border-[#DB1A1A] text-sm bg-white dark:bg-[#1f1f1f] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600"
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors z-10">
                    {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#DB1A1A] hover:bg-[#b81515] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#DB1A1A] dark:focus:ring-offset-[#141414] disabled:opacity-50 transition-colors">
                {loading ? 'Checking...' : 'Save New Password'}
              </button>
            </form>
          )}

          {/* MFA form */}
          {sessionReady && needsMfa && (
            <form className="space-y-4" onSubmit={handleMfaVerify}>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Authenticator Code (6 digits)
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••••"
                  autoComplete="one-time-code"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-[#262626] rounded-md shadow-sm focus:outline-none focus:ring-[#DB1A1A] focus:border-[#DB1A1A] text-sm bg-white dark:bg-[#1f1f1f] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 tracking-widest text-center text-lg"
                />
              </div>

              <button type="submit" disabled={mfaLoading || mfaCode.length !== 6}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#DB1A1A] hover:bg-[#b81515] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#DB1A1A] dark:focus:ring-offset-[#141414] disabled:opacity-50 transition-colors">
                {mfaLoading ? 'Verifying...' : 'Verify & Save Password'}
              </button>

              <button type="button" onClick={() => { setNeedsMfa(false); setMfaCode(''); setError(''); }}
                className="w-full text-center text-sm text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors">
                ← Back
              </button>
            </form>
          )}

          {error && !needsMfa && (
            <button onClick={() => navigate('/admin/login', { replace: true })}
              className="w-full text-center text-sm text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors">
              ← Back to Sign in
            </button>
          )}

        </div>
      </div>
    </>
  );
};

export default AdminResetPassword;