import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authAPI } from '../services/api';
import { validatePasswordReset } from '../lib/validation';
import PasswordInput from '../components/PasswordInput';

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Reset token is missing. Use the link from your email.');
    }
  }, [token]);

  const handleChange = (event) => {
    setFormData((current) => ({
      ...current,
      [event.target.name]: event.target.value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    const validationError = validatePasswordReset(formData);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!token) {
      setError('Reset token is missing. Use the link from your email.');
      return;
    }

    try {
      setLoading(true);
      const response = await authAPI.resetPassword(token, formData.password);
      setMessage(response.message || 'Password reset successfully. You can now log in.');
      setFormData({
        password: '',
        confirmPassword: ''
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-yellow-50 px-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-600">Password Reset</p>
        <h1 className="mt-3 text-3xl font-bold text-slate-900">Choose a new password</h1>
        <p className="mt-3 text-slate-600">
          Set a strong password for your Minion Me account. This works for both client and minion accounts.
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
            <label className="mb-2 block text-sm font-medium text-slate-700">New password</label>
            <PasswordInput
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
              minLength="8"
              inputClassName="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Confirm password</label>
            <PasswordInput
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="••••••••"
              required
              minLength="8"
              inputClassName="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !token}
            className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:bg-slate-400"
          >
            {loading ? 'Resetting password...' : 'Reset password'}
          </button>
        </form>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/login"
            className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Go to login
          </Link>
          <Link
            to="/client/forgot-password"
            className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Request another link
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;
