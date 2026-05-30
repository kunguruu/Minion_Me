import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { tasksAPI } from '../services/api';
import { useNotification } from '../context/useNotification';
import { useAuth } from '../context/useAuth';

function PostTask() {
  const navigate = useNavigate();
  const { notify } = useNotification();
  const { user } = useAuth();
  const locationState = useLocation();
  const preferredMinion = locationState.state?.preferredMinion || null;

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    category: '',
    budget: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const categories = [
    'Cleaning',
    'Plumbing',
    'Electrical',
    'Gardening',
    'Delivery',
    'Moving',
    'Carpentry',
    'Painting',
    'Repairs',
    'Errands',
    'Tutoring',
    'Beauty & Grooming',
    'Other'
  ];

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const title = formData.title.trim();
      const description = formData.description.trim();
      const location = formData.location.trim();
      const budget = Number(formData.budget);

      if (title.length < 5 || title.length > 200) {
        throw new Error('Title must be 5-200 characters.');
      }
      if (description.length < 10 || description.length > 2000) {
        throw new Error('Description must be 10-2000 characters.');
      }
      if (!categories.includes(formData.category)) {
        throw new Error('Please select a valid category.');
      }
      if (location.length > 200) {
        throw new Error('Location must be less than 200 characters.');
      }
      if (!Number.isFinite(budget) || budget < 50) {
        throw new Error('Budget must be at least KSh 50.');
      }

      const taskData = {
        ...formData,
        title,
        description,
        location,
        budget,
        invitedMinionId: preferredMinion?.id || null
      };

      const response = await tasksAPI.create(taskData);
      
      console.log('Task created:', response);
      notify({
        type: 'success',
        title: 'Task Posted',
        message: preferredMinion
          ? `Your task was sent to ${preferredMinion.firstName} ${preferredMinion.lastName}.`
          : 'Your task is live. Minions can now apply.'
      });
      navigate('/client-dashboard');

    } catch (err) {
      console.error('Error posting task:', err);
      const errorMessage = err.message || err.response?.data?.message || 'Failed to post task. Please try again.';
      setError(errorMessage);
      notify({
        type: 'error',
        title: 'Post Failed',
        message: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  // Check if user is logged in and is a client
  if (!user?.id || user.role !== 'client') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-4">Only clients can post tasks.</p>
          <button
            onClick={() => navigate('/login')}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600"
          >
            Login as Client
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Post a Task</h1>
          <p className="text-gray-600">
            Tell us what you need help with and find the perfect minion for the job.
          </p>
        </div>

        {preferredMinion && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg shadow-sm p-6 mb-6">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-minion-blue">
              Preferred Minion
            </p>
            <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {preferredMinion.firstName} {preferredMinion.lastName}
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                  {preferredMinion.location || 'Location not provided'}
                </p>
                <p className="mt-3 text-sm text-gray-700">
                  <span className="font-semibold">Services:</span> {preferredMinion.skills || 'No services listed'}
                </p>
              </div>
              <div className="rounded-xl bg-white px-4 py-3 text-sm shadow-sm">
                <p className="font-semibold text-gray-800">Availability</p>
                <p className="mt-1 text-gray-600">{preferredMinion.availability || 'Not set'}</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-minion-blue">
              This invite keeps the task visible to this minion only until they respond.
            </p>
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          {error && (
            <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Task Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Task Title *
              </label>
              <input
                type="text"
                name="title"
                placeholder="e.g., Deep clean my 2-bedroom apartment"
                value={formData.title}
                onChange={handleChange}
                required
                minLength="5"
                maxLength="200"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Task Description *
              </label>
              <textarea
                name="description"
                rows="5"
                placeholder="Provide details about what needs to be done, any specific requirements, tools needed, etc."
                value={formData.description}
                onChange={handleChange}
                required
                minLength="10"
                maxLength="2000"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                Be as specific as possible to get better matches
              </p>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <input
                type="text"
                name="location"
                placeholder="e.g., Westlands, Nairobi"
                value={formData.location}
                onChange={handleChange}
                maxLength="200"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Budget */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Budget (KSh) *
              </label>
              <input
                type="number"
                name="budget"
                placeholder="2500"
                value={formData.budget}
                onChange={handleChange}
                required
                min="50"
                step="50"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                Set a fair price to attract quality minions
              </p>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Posting Task...' : 'Post Task'}
              </button>
            </div>

            {/* Cancel Button */}
            <button
              type="button"
              onClick={() => navigate('/client-dashboard')}
              className="w-full bg-gray-200 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-300 transition"
            >
              Cancel
            </button>
          </form>
        </div>

        {/* Help Text */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">💡 Tips for posting tasks:</h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Be clear and specific about what needs to be done</li>
            <li>Mention any tools or materials the minion should bring</li>
            <li>Set a realistic budget based on the task complexity</li>
            <li>Include your availability or preferred time</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default PostTask;
