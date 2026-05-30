import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../services/api';

function ForgotPassword({ audience = 'client' }) {
  const isMinion = audience === 'minion';
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await authAPI.forgotPassword(email.trim());
      setMessage(response.message || 'If that email exists, a password reset link has been sent.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to request password reset.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-yellow-50 px-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-600">
          {isMinion ? 'Minion Access' : 'Client Access'}
        </p>
        <h1 className="mt-3 text-3xl font-bold text-slate-900">
          Forgot {isMinion ? 'your minion' : 'your client'} password?
        </h1>
        <p className="mt-3 text-slate-600">
          Enter the email address for your {isMinion ? 'minion' : 'client'} account and we will send a reset link.
        </p>

        {error && (
          <div className="mt-4 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-rose-700">
            {error}
          </div>
        )}

        {message && (
          <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-emerald-700">
            {message}
          </div>
        )}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Email address</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:bg-slate-400"
          >
            {loading ? 'Sending reset link...' : 'Send reset link'}
          </button>
        </form>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/login"
            className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Back to login
          </Link>
          <Link
            to={isMinion ? '/client/forgot-password' : '/minion/forgot-password'}
            className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            {isMinion ? 'Client reset page' : 'Minion reset page'}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
