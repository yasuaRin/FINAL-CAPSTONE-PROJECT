// src/pages/auth/ForgotPassword.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Forgot password requested for:', email);
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full space-y-8 p-8 bg-card rounded-xl shadow-lg border border-border">
        <div className="text-center">
          {/* Page Title - text-3xl font-bold tracking-tight */}
          <h2 className="text-3xl font-bold tracking-tight text-foreground">VIDHELP</h2>
          <p className="text-xs font-light text-muted-foreground mt-2">Reset your password</p>
        </div>

        {!submitted ? (
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-background border border-input rounded-lg text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                required
                placeholder="Enter your email"
              />
            </div>

            <button
              type="submit"
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-xs font-bold uppercase tracking-wider text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all"
            >
              Send Reset Link
            </button>

            <div className="text-center">
              <Link to="/admin/login" className="text-xs font-bold uppercase tracking-wider text-primary hover:text-primary/80 transition-colors">
                Back to Login
              </Link>
            </div>
          </form>
        ) : (
          <div className="text-center space-y-4">
            <div className="bg-emerald-500/10 text-emerald-600 p-4 rounded-lg border border-emerald-500/20">
              <p className="text-xs font-bold uppercase tracking-wider">Reset link sent!</p>
              <p className="text-xs font-light mt-1 text-muted-foreground">
                If an account exists for {email}, you'll receive a password reset email.
              </p>
            </div>
            <Link
              to="/admin/login"
              className="inline-block text-xs font-bold uppercase tracking-wider text-primary hover:text-primary/80 transition-colors"
            >
              Return to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;