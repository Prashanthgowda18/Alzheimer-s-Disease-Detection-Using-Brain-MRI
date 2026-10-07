import React, { useState } from 'react';
import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router';
import { signIn, signUp } from '../lib/auth';
import { mockDb } from '../lib/mockDb';

export const Route = createFileRoute('/auth')({
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const search: any = useSearch({ strict: false });
  const redirectTarget = search.redirect || '/dashboard';

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [hospitalName, setHospitalName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isSignUp) {
        await signUp(email, password, fullName, hospitalName);
      } else {
        await signIn(email, password);
      }
      navigate({ to: redirectTarget });
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (role: 'doctor' | 'admin') => {
    setLoading(true);
    try {
      if (role === 'doctor') {
        mockDb.setCurrentUser('user-doc-123');
      } else {
        mockDb.setCurrentUser('user-admin-456');
      }
      // Simple reload fallback for mock db state sync
      navigate({ to: redirectTarget }).then(() => {
        window.location.reload();
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="demo-page demo-center min-h-[85vh] px-4 py-8">
      <div className="demo-panel rise-in w-full max-w-lg rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 bg-[radial-gradient(circle,rgba(79,184,178,0.2),transparent_70%)] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-32 h-32 bg-[radial-gradient(circle,rgba(37,99,235,0.15),transparent_70%)] rounded-full pointer-events-none" />

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 mb-4">
            {/* Brain scan icon path */}
            <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="demo-title text-3xl font-extrabold tracking-tight">
            Diagnostic Portal
          </h1>
          <p className="demo-muted text-sm mt-2">
            Alzheimer stage prediction & patient management
          </p>
        </div>

        {error && (
          <div className="demo-alert demo-alert-danger text-sm mb-6 flex items-center gap-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="Dr. John Doe"
                  className="demo-input"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Hospital / Clinic Name</label>
                <input
                  type="text"
                  required
                  placeholder="Mayo Clinic Department of Neurology"
                  className="demo-input"
                  value={hospitalName}
                  onChange={(e) => setHospitalName(e.target.value)}
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Email Address</label>
            <input
              type="email"
              required
              placeholder="doctor@hospital.org"
              className="demo-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Password</label>
              {!isSignUp && (
                <a href="/reset-password" className="text-xs text-blue-500 hover:underline">
                  Forgot?
                </a>
              )}
            </div>
            <input
              type="password"
              required
              placeholder="••••••••"
              className="demo-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="demo-button w-full justify-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 mt-4"
          >
            {loading ? 'Authenticating...' : isSignUp ? 'Create Diagnostic Account' : 'Access Portal'}
          </button>
        </form>

        <div className="relative my-6 text-center">
          <span className="relative z-10 px-3 text-xs uppercase text-slate-500 bg-[var(--bg-base)] border border-[var(--line)] rounded-full py-0.5">OR TEST RUN</span>
          <div className="absolute inset-0 flex items-center"><hr className="w-full border-[var(--line)]"/></div>
        </div>

        {/* Demo Fast Login Buttons */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={() => handleQuickLogin('doctor')}
            disabled={loading}
            className="demo-button demo-button-secondary text-xs py-2.5 flex flex-col items-center gap-1 text-center font-semibold"
          >
            <span className="text-blue-500 font-bold">Doctor Role</span>
            <span className="text-[10px] opacity-75">Demo Portal</span>
          </button>
          <button
            onClick={() => handleQuickLogin('admin')}
            disabled={loading}
            className="demo-button demo-button-secondary text-xs py-2.5 flex flex-col items-center gap-1 text-center font-semibold"
          >
            <span className="text-cyan-500 font-bold">Admin Role</span>
            <span className="text-[10px] opacity-75">System Overview</span>
          </button>
        </div>

        <div className="text-center pt-2 border-t border-[var(--line)]">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-xs font-semibold text-slate-500 hover:text-blue-500 transition"
          >
            {isSignUp ? 'Already registered? Access portal' : "New clinical user? Create account"}
          </button>
        </div>
      </div>
    </main>
  );
}
