import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authAPI } from '../services/api';
import { useAuth } from '../context/useAuth';
import PasswordInput from '../components/PasswordInput';

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showResend, setShowResend] = useState(false);
  const [resending, setResending] = useState(false);
  const [infoMessage, setInfoMessage] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setInfoMessage("");
    setShowResend(false);

    try {
      const response = await authAPI.login(formData);

      console.log("Login successful:", response);

      // Store tokens and user data
    localStorage.setItem('token', response.token);
    login(response.user);

    alert(`Welcome back, ${response.user.first_name}!`);

      // Redirect based on user role
      if (response.user.role === 'client') {
        navigate('/client-dashboard');
      } else if (response.user.role === 'minion') {
        navigate('/minion-dashboard');
      } else if (response.user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/');
      }

    } catch (err) {
    console.error("Login error:", err);
    const errorMessage = err.response?.data?.message || "Invalid email or password";
    setError(errorMessage);
    setShowResend(Boolean(err.response?.data?.requiresEmailVerification));
  } finally {
    setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!formData.email.trim()) {
      setError("Enter your email address first.");
      return;
    }

    try {
      setResending(true);
      setError("");
      const response = await authAPI.resendVerification(formData.email.trim());
      setInfoMessage(response.message || "Verification email sent.");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to resend verification email.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-yellow-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-600">Welcome Back</h1>
          <p className="text-gray-600 mt-2">
            Log in to get help or manage your minion life
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
        {infoMessage && (
          <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            {infoMessage}
          </div>
        )}

        {/* Form */}
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              name="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <PasswordInput
              name="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              required
              inputClassName="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white py-2 rounded-lg font-semibold hover:bg-blue-600 transition disabled:bg-gray-400"
          >
            {loading ? "Logging in..." : "Log In"}
          </button>
        </form>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link to="/client/forgot-password" className="font-medium text-blue-600 hover:underline">
            Forgot client password?
          </Link>
          <Link to="/minion/forgot-password" className="font-medium text-blue-600 hover:underline">
            Forgot minion password?
          </Link>
        </div>
        {showResend && (
          <div className="mt-4 rounded-xl bg-slate-50 p-4">
            <p className="text-sm text-slate-600">
              Need a fresh link? Resend the verification email or open the verification page.
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={resending}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:bg-slate-400"
              >
                {resending ? "Sending..." : "Resend email"}
              </button>
              <Link
                to={`/verify-email?email=${encodeURIComponent(formData.email)}`}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Open verification page
              </Link>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-600">
          Don't have an account?{" "}
          <Link
            to="/sign-up"
            className="text-blue-500 font-medium hover:underline"
          >
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Login;
