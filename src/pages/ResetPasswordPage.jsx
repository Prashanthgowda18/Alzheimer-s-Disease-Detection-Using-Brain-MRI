import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleReset = (e) => {
    e.preventDefault();
    // TODO: integrate real password reset logic via backend API
    setSent(true);
  };

  return (
    <main className="demo-page demo-center min-h-[80vh] px-4 py-8">
      <div className="demo-panel rise-in w-full max-w-md rounded-3xl p-6 sm:p-10 shadow-2xl text-center">
        <h1 className="demo-title text-2xl font-bold tracking-tight mb-2">Password Recovery</h1>
        <p className="demo-muted text-sm mb-6">Enter your email below to receive a password reset link.</p>
        {sent ? (
          <div className="space-y-4">
            <div className="demo-alert text-sm border-amber-500/25 bg-amber-500/5 text-amber-500">
              Recovery instructions have been sent to <strong>{email}</strong> if an account exists.
            </div>
            <button
              onClick={() => navigate('/auth')}
              className="demo-button w-full justify-center mt-4"
            >
              Back to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4 text-left">
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
            <button
              type="submit"
              className="demo-button w-full justify-center bg-blue-600 text-white font-bold py-2.5 mt-2"
            >
              Send Reset Link
            </button>
            <button
              type="button"
              onClick={() => navigate('/auth')}
              className="demo-button demo-button-secondary w-full justify-center"
            >
              Cancel
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

export default ResetPasswordPage;
