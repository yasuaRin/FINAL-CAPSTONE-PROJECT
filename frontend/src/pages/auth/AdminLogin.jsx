import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth'; // ← fixed: was ./hooks/useAuth
import { Mail, Lock, LogIn } from 'lucide-react';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login(email, password);
    
    if (result.success) {
      navigate('/admin/dashboard', { replace: true });
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-600 mb-2">VIDHELP</h1>
          <p className="text-gray-600">Admin Portal Login</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="label">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input pl-10"
                placeholder="admin@vidhelp.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="label">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input pl-10"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                <LogIn size={18} />
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>

<div className="flex items-center justify-between">
  <div className="flex items-center">
    <input
      id="remember-me"
      name="remember-me"
      type="checkbox"
      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
    />
    <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
      Remember me
    </label>
  </div>

  <div className="text-sm">
    <Link to="/admin/forgot-password" className="text-primary-600 hover:text-primary-500">
      Forgot your password?
    </Link>
  </div>
</div>

{/* After the submit button, add sign up link */}
<div className="text-center mt-4">
  <span className="text-sm text-gray-600">Don't have an account? </span>
  <Link to="/admin/register" className="text-sm text-primary-600 hover:text-primary-500 font-medium">
    Sign up
  </Link>
</div>
      </div>
    </div>
  );
};

export default Login;