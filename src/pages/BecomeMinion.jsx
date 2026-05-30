import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authAPI } from '../services/api';
import { KENYAN_PHONE_INPUT_PATTERN, NAME_INPUT_PATTERN, validateSharedSignupFields } from '../lib/validation';
import { useNotification } from '../context/useNotification';
import PasswordInput from '../components/PasswordInput';

function BecomeMinion() {
  const navigate = useNavigate();
  const { notify } = useNotification();
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    location: "",
    skills: "",
    availability: "",
    experience: "",
    password: ""
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

    try {
      const signupValidationError = validateSharedSignupFields(formData);
      if (signupValidationError) {
        throw new Error(signupValidationError);
      }

      const response = await authAPI.register({
        ...formData,
        role: "minion"
      });

      console.log("Minion registration successful:", response);
      notify({
        type: 'success',
        title: 'Registration Submitted',
        message: 'Application submitted. Check your email for the verification link.'
      });
      navigate(`/verify-email?email=${encodeURIComponent(formData.email)}`);

    } catch (err) {
      console.error("Registration error:", err);
      const errorMessage = err.message || err.response?.data?.message || "Registration failed. Please try again.";
      setError(errorMessage);
      notify({
        type: 'error',
        title: 'Registration Failed',
        message: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-yellow-50 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-3xl font-bold text-center text-blue-600 mb-2">
          Become a Minion
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Turn your skills into opportunities. Help people. Get paid.
        </p>

        {error && (
          <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                First Name *
              </label>
              <input
                type="text"
                name="firstName"
                placeholder="Kevin"
                value={formData.firstName}
                onChange={handleChange}
                required
                minLength="2"
                maxLength="50"
                pattern={NAME_INPUT_PATTERN}
                className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Last Name *
              </label>
              <input
                type="text"
                name="lastName"
                placeholder="Otieno"
                value={formData.lastName}
                onChange={handleChange}
                required
                minLength="2"
                maxLength="50"
                pattern={NAME_INPUT_PATTERN}
                className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                placeholder="+254 7XX XXX XXX"
                value={formData.phone}
                onChange={handleChange}
                pattern={KENYAN_PHONE_INPUT_PATTERN}
                className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Email Address *
              </label>
              <input
                type="email"
                name="email"
                placeholder="minion@example.com"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Location *
            </label>
            <input
              type="text"
              name="location"
              placeholder="Nairobi, Kenya"
              value={formData.location}
              onChange={handleChange}
              required
              className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* Skills */}
          <div>
            <label className="block text-sm font-medium mb-1">
              What skills can you offer? *
            </label>
            <textarea
              name="skills"
              rows="3"
              placeholder="Cleaning, delivery, repairs, moving, errands..."
              value={formData.skills}
              onChange={handleChange}
              required
              className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* Availability */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Availability *
            </label>
            <select
              name="availability"
              value={formData.availability}
              onChange={handleChange}
              required
              className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">Select availability</option>
              <option value="weekdays">Weekdays</option>
              <option value="weekends">Weekends</option>
              <option value="evenings">Evenings</option>
              <option value="flexible">Flexible</option>
            </select>
          </div>

          {/* Experience */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Previous experience (optional)
            </label>
            <textarea
              name="experience"
              rows="3"
              placeholder="Briefly describe your experience"
              value={formData.experience}
              onChange={handleChange}
              className="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Create Password *
            </label>
              <PasswordInput
                name="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
                minLength="8"
                inputClassName="w-full rounded-lg border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-400"
          >
            {loading ? "Submitting Application..." : "Apply to Become a Minion"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-6">
          Already a minion?{" "}
          <Link to="/login" className="text-blue-600 font-medium hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default BecomeMinion;
