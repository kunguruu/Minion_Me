import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { useAuth } from '../context/useAuth';

function BrowseMinions() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [minions, setMinions] = useState([]);
  const [filteredMinions, setFilteredMinions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    searchTerm: '',
    availability: 'All'
  });

  const availabilityOptions = ['All', 'weekdays', 'weekends', 'evenings', 'flexible'];

  useEffect(() => {
    fetchMinions();
  }, []);

  useEffect(() => {
    let nextMinions = [...minions];
    const search = filters.searchTerm.trim().toLowerCase();

    if (search) {
      nextMinions = nextMinions.filter((minion) =>
        `${minion.first_name} ${minion.last_name}`.toLowerCase().includes(search) ||
        (minion.skills || '').toLowerCase().includes(search) ||
        (minion.location || '').toLowerCase().includes(search)
      );
    }

    if (filters.availability !== 'All') {
      nextMinions = nextMinions.filter((minion) => minion.availability === filters.availability);
    }

    setFilteredMinions(nextMinions);
  }, [filters, minions]);

  const fetchMinions = async () => {
    try {
      setLoading(true);
      const response = await authAPI.getMinions();
      setMinions(response.data);
      setError('');
    } catch (err) {
      console.error('Error fetching minions:', err);
      setError(err.response?.data?.message || 'Failed to load minions.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (event) => {
    setFilters((current) => ({
      ...current,
      [event.target.name]: event.target.value
    }));
  };

  if (!user?.id || user.role !== 'client') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-minion-blue to-minion-blue-light px-4">
        <div className="rounded-2xl bg-white p-8 text-center shadow-xl">
          <h2 className="text-2xl font-bold text-minion-blue">Access Denied</h2>
          <p className="mt-3 text-gray-600">Only clients can browse registered minions.</p>
          <button
            onClick={() => navigate('/login')}
            className="mt-5 rounded-lg bg-minion-blue px-6 py-2 font-semibold text-white transition hover:bg-minion-blue-light"
          >
            Login as Client
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-linear-to-r from-minion-blue to-minion-blue-light py-8 px-4 shadow-lg">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-4xl font-bold text-white mb-2">👥 Browse Minions</h1>
          <p className="text-blue-100 text-lg">
            Review registered minions, their services, and availability before posting work.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 rounded-2xl border-2 border-minion-blue/15 bg-white p-6 shadow-md">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Search minions</label>
              <input
                type="text"
                name="searchTerm"
                value={filters.searchTerm}
                onChange={handleFilterChange}
                placeholder="Search by name, services, or location..."
                className="w-full rounded-lg border-2 border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-minion-blue"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Availability</label>
              <select
                name="availability"
                value={filters.availability}
                onChange={handleFilterChange}
                className="w-full rounded-lg border-2 border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-minion-blue"
              >
                {availabilityOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === 'All' ? 'All' : option.charAt(0).toUpperCase() + option.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm font-medium text-gray-600">
              Showing <span className="font-bold text-minion-blue">{filteredMinions.length}</span> of{' '}
              <span className="font-bold text-minion-blue">{minions.length}</span> registered minions
            </p>
            <button
              onClick={fetchMinions}
              className="font-semibold text-minion-blue transition hover:text-minion-blue-dark"
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-minion-yellow border-t-minion-blue"></div>
          </div>
        )}

        {error && (
          <div className="mb-6 flex items-center justify-between rounded-xl border-2 border-red-300 bg-red-50 px-6 py-4 text-red-700">
            <span>{error}</span>
            <button onClick={fetchMinions} className="font-semibold underline">
              Retry
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            {filteredMinions.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-gray-300 bg-white p-12 text-center shadow-md">
                <div className="mb-4 text-6xl text-gray-400">🧑‍🔧</div>
                <h3 className="text-2xl font-bold text-gray-700">No minions found</h3>
                <p className="mt-2 text-gray-500">Try adjusting your search or availability filter.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {filteredMinions.map((minion) => (
                  <div
                    key={minion.id}
                    className="rounded-2xl border-2 border-transparent bg-white p-6 shadow-md transition-all duration-300 hover:border-minion-yellow hover:shadow-xl"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900">
                          {minion.first_name} {minion.last_name}
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">{minion.location || 'Location not provided'}</p>
                      </div>
                      <span className="rounded-full bg-minion-yellow px-3 py-1 text-xs font-bold text-black">
                        {minion.availability || 'Availability not set'}
                      </span>
                    </div>

                    <div className="mt-5 rounded-xl bg-blue-50 p-4">
                      <p className="text-sm font-semibold text-minion-blue">Services</p>
                      <p className="mt-2 text-sm leading-6 text-gray-700">
                        {minion.skills || 'No services listed yet.'}
                      </p>
                    </div>

                    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-amber-800">Client Rating</p>
                      <div className="mt-2 flex items-center gap-3">
                        <div className="flex items-center gap-1 text-lg">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span
                              key={star}
                              className={star <= Math.round(Number(minion.average_rating || 0)) ? 'text-amber-500' : 'text-gray-300'}
                              aria-hidden="true"
                            >
                              ★
                            </span>
                          ))}
                        </div>
                        <p className="text-sm font-semibold text-gray-800">
                          {Number(minion.average_rating || 0).toFixed(1)} / 5
                        </p>
                        <p className="text-xs text-gray-600">
                          ({minion.rating_count || 0})
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-3 text-sm text-gray-600">
                      <p>
                        <span className="font-semibold text-gray-800">Experience:</span>{' '}
                        {minion.experience || 'No experience summary provided.'}
                      </p>
                      <p>
                        <span className="font-semibold text-gray-800">Phone:</span>{' '}
                        {minion.phone || 'Not provided'}
                      </p>
                      <p>
                        <span className="font-semibold text-gray-800">Email:</span>{' '}
                        {minion.email}
                      </p>
                    </div>

                    <div className="mt-5 flex items-center justify-between border-t border-gray-200 pt-4">
                      <p className="text-xs text-gray-500">
                        Joined {new Date(minion.created_at).toLocaleDateString()}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate(`/browse-minions/${minion.id}`)}
                          className="rounded-lg border border-minion-blue px-4 py-2 text-sm font-semibold text-minion-blue transition hover:bg-blue-50"
                        >
                          View Profile
                        </button>
                        <button
                          onClick={() => navigate('/post-task')}
                          className="rounded-lg bg-minion-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-minion-blue-light"
                        >
                          Post a Task
                        </button>
                      </div>
                    </div>
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

export default BrowseMinions;
