import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { tasksAPI, assignmentsAPI } from '../services/api';
import { useAuth } from '../context/useAuth';

function FindGigs() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [applyingTo, setApplyingTo] = useState(null);
  const [applicationMessage, setApplicationMessage] = useState('');

  const [filters, setFilters] = useState({
    category: '',
    searchTerm: ''
  });

  const categories = [
    'All',
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

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await tasksAPI.getAll();
      const openTasks = response.data.filter(task => task.status === 'open');
      setTasks(openTasks);
      setError('');
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError('Failed to load tasks. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = useCallback(() => {
    let filtered = [...tasks];

    if (filters.category && filters.category !== 'All') {
      filtered = filtered.filter(task => task.category === filters.category);
    }

    if (filters.searchTerm) {
      const search = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(search) ||
        task.description?.toLowerCase().includes(search) ||
        task.location?.toLowerCase().includes(search)
      );
    }

    setFilteredTasks(filtered);
  }, [tasks, filters]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value
    });
  };

  const handleApplyClick = (taskId) => {
    setApplyingTo(taskId);
    setApplicationMessage('');
  };

  const submitApplication = async (taskId) => {
    try {
      await assignmentsAPI.apply(taskId, applicationMessage);
      alert('Application submitted successfully! 🎉');
      setApplyingTo(null);
      setApplicationMessage('');
      fetchTasks(); // Refresh to update task status
    } catch (err) {
      console.error('Error applying:', err);
      const errorMsg = err.response?.data?.message || 'Failed to apply. Please try again.';
      alert(errorMsg);
    }
  };

  if (!user?.id || user.role !== 'minion') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-minion-yellow to-minion-yellow-light">
        <div className="text-center bg-white p-8 rounded-2xl shadow-xl">
          <h2 className="text-2xl font-bold text-minion-blue mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-4">Only minions can browse tasks.</p>
          <button
            onClick={() => navigate('/login')}
            className="bg-minion-blue text-white px-6 py-2 rounded-lg hover:bg-minion-blue-light transition font-semibold"
          >
            Login as Minion
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Minion Theme */}
      <div className="bg-linear-to-r from-minion-yellow to-minion-yellow-light py-8 px-4 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold text-black mb-2">🔍 Find Gigs</h1>
          <p className="text-gray-800 text-lg">
            Browse available tasks and start earning today!
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-md p-6 mb-6 border-2 border-minion-yellow/20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                🔎 Search Tasks
              </label>
              <input
                type="text"
                name="searchTerm"
                placeholder="Search by title, description, or location..."
                value={filters.searchTerm}
                onChange={handleFilterChange}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-minion-yellow focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                📂 Category
              </label>
              <select
                name="category"
                value={filters.category}
                onChange={handleFilterChange}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-minion-yellow focus:border-transparent"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-600 font-medium">
              📊 Showing <span className="text-minion-blue font-bold">{filteredTasks.length}</span> of <span className="text-minion-blue font-bold">{tasks.length}</span> tasks
            </p>
            <button
              onClick={fetchTasks}
              className="text-sm text-minion-blue hover:text-minion-blue-dark font-semibold flex items-center gap-1"
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-minion-yellow border-t-minion-blue"></div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border-2 border-red-400 text-red-700 px-6 py-4 rounded-xl mb-6 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={fetchTasks} className="font-semibold underline">
              Retry
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            {filteredTasks.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-md p-12 text-center border-2 border-dashed border-gray-300">
                <div className="text-gray-400 text-6xl mb-4">📭</div>
                <h3 className="text-2xl font-bold text-gray-700 mb-2">
                  No tasks found
                </h3>
                <p className="text-gray-500">
                  {filters.category || filters.searchTerm
                    ? 'Try adjusting your filters'
                    : 'Check back soon for new opportunities!'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTasks.map((task) => (
                  <div
                    key={task.id}
                    className="bg-white rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 p-6 border-2 border-transparent hover:border-minion-yellow"
                  >
                    {/* Category Badge */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="bg-minion-blue text-white text-xs font-bold px-3 py-1 rounded-full">
                        {task.category}
                      </span>
                      <span className="text-2xl font-extrabold text-minion-yellow">
                        KSh {Number(task.budget).toLocaleString()}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {task.title}
                    </h3>

                    {/* Description */}
                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                      {task.description}
                    </p>

                    {/* Details */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <svg className="w-4 h-4 mr-2 text-minion-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {task.location || 'Location not specified'}
                      </div>

                      <div className="flex items-center text-sm text-gray-600">
                        <svg className="w-4 h-4 mr-2 text-minion-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Posted by: {task.client_name || 'Client'}
                      </div>

                      <div className="flex items-center text-sm text-gray-600">
                        <svg className="w-4 h-4 mr-2 text-minion-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {new Date(task.created_at).toLocaleDateString()}
                      </div>
                    </div>

                    {/* Apply Section */}
                    {applyingTo === task.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={applicationMessage}
                          onChange={(e) => setApplicationMessage(e.target.value)}
                          placeholder="Why are you a good fit for this task? (optional)"
                          rows="3"
                          className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-minion-yellow"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => submitApplication(task.id)}
                            className="flex-1 bg-minion-yellow hover:bg-minion-yellow-light text-black font-bold py-2 px-4 rounded-lg transition-all shadow-md"
                          >
                            ✅ Submit
                          </button>
                          <button
                            onClick={() => setApplyingTo(null)}
                            className="px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg transition"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleApplyClick(task.id)}
                        className="w-full bg-minion-blue hover:bg-minion-blue-light text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md hover:shadow-lg"
                      >
                        🚀 Apply for Task
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default FindGigs;
