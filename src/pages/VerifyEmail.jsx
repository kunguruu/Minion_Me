import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authAPI } from '../services/api';

function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const presetEmail = searchParams.get('email') || '';

  const [status, setStatus] = useState(token ? 'verifying' : 'idle');
  const [message, setMessage] = useState(
    token ? 'Confirming your email address...' : 'Open the verification link from your email, or request a new one below.'
  );
  const [email, setEmail] = useState(presetEmail);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!token) {
      return;
    }

    const verify = async () => {
      try {
        const response = await authAPI.verifyEmail(token);
        setStatus('success');
        setMessage(response.message || 'Email verified successfully. You can now log in.');
      } catch (err) {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Verification link is invalid or expired.');
      }
    };

    verify();
  }, [token]);

  const handleResend = async (event) => {
    event.preventDefault();

    if (!email.trim()) {
      setStatus('error');
      setMessage('Enter the email address used during signup.');
      return;
    }

    try {
      setSending(true);
      const response = await authAPI.resendVerification(email.trim());
      setStatus('resent');
      setMessage(response.message || 'Verification email sent.');
    } catch (err) {
      setStatus('error');
      setMessage(err.response?.data?.message || 'Failed to resend verification email.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-yellow-50 px-4">
      <div className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-xl">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-600">Email Verification</p>
        <h1 className="mt-3 text-3xl font-bold text-slate-900">Verify your account</h1>
        <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-slate-700">{message}</p>

        {(status === 'idle' || status === 'error' || status === 'resent') && (
          <form className="mt-6 space-y-4" onSubmit={handleResend}>
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
              disabled={sending}
              className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:bg-slate-400"
            >
              {sending ? 'Sending...' : 'Resend verification email'}
            </button>
          </form>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/login"
            className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Go to login
          </Link>
          <Link
            to="/sign-up"
            className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Create client account
          </Link>
          <Link
            to="/become-minion"
            className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Create minion account
          </Link>
        </div>
      </div>
    </div>
  );
}

export default VerifyEmail;
