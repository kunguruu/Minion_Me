import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { authAPI } from '../services/api';
import { useAuth } from '../context/useAuth';
import { UserCircle2 } from 'lucide-react';

function MinionProfile() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();

  const [minion, setMinion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMinion = async () => {
      try {
        setLoading(true);
        const response = await authAPI.getMinionById(id);
        setMinion(response.data);
        setError('');
      } catch (err) {
        console.error('Error fetching minion profile:', err);
        setError(err.response?.data?.message || 'Failed to load minion profile.');
      } finally {
        setLoading(false);
      }
    };

    fetchMinion();
  }, [id]);

  if (!user?.id || user.role !== 'client') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-minion-blue to-minion-blue-light px-4">
        <div className="rounded-2xl bg-white p-8 text-center shadow-xl">
          <h2 className="text-2xl font-bold text-minion-blue">Access Denied</h2>
          <p className="mt-3 text-gray-600">Only clients can view minion profiles.</p>
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
        <div className="mx-auto max-w-5xl">
          <button
            onClick={() => navigate('/browse-minions')}
            className="mb-4 text-sm font-semibold text-blue-100 transition hover:text-white"
          >
            ← Back to Browse Minions
          </button>
          <h1 className="text-4xl font-bold text-white">Minion Profile</h1>
          <p className="mt-2 text-lg text-blue-100">
            Review this minion’s services, experience, and contact details before posting work.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8">
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-minion-yellow border-t-minion-blue"></div>
          </div>
        )}

        {error && (
          <div className="rounded-xl border-2 border-red-300 bg-red-50 px-6 py-4 text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && minion && (
          <div className="space-y-6">
            <div className="rounded-3xl bg-white p-8 shadow-md">
              <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                <div className="flex items-start gap-5">
                  {minion.profile_photo_url ? (
                    <img
                      src={minion.profile_photo_url}
                      alt={`${minion.first_name} ${minion.last_name} profile`}
                      className="h-24 w-24 rounded-3xl object-cover shadow-md ring-4 ring-blue-100"
                    />
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-blue-50 text-minion-blue shadow-md ring-4 ring-blue-100">
                      <UserCircle2 className="h-12 w-12" />
                    </div>
                  )}

                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.25em] text-minion-blue">Verified Minion</p>
                    <h2 className="mt-3 text-4xl font-bold text-gray-900">
                      {minion.first_name} {minion.last_name}
                    </h2>
                    <p className="mt-3 text-lg text-gray-600">{minion.location || 'Location not provided'}</p>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-1 text-xl text-amber-500">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span
                            key={star}
                            aria-hidden="true"
                            className={star <= Math.round(Number(minion.average_rating || 0)) ? 'text-amber-500' : 'text-gray-300'}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                      <p className="text-sm font-semibold text-gray-700">
                        {Number(minion.average_rating || 0).toFixed(1)} / 5
                      </p>
                      <p className="text-sm text-gray-500">
                        ({minion.rating_count || 0} {Number(minion.rating_count || 0) === 1 ? 'rating' : 'ratings'})
                      </p>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl bg-minion-yellow px-5 py-3 text-center text-black shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-[0.2em]">Availability</p>
                  <p className="mt-2 text-lg font-bold">{minion.availability || 'Not set'}</p>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="rounded-2xl bg-blue-50 p-5">
                  <p className="text-sm font-semibold text-minion-blue">Services Offered</p>
                  <p className="mt-3 whitespace-pre-line text-gray-700">
                    {minion.skills || 'No services listed yet.'}
                  </p>
                </div>
                <div className="rounded-2xl bg-yellow-50 p-5">
                  <p className="text-sm font-semibold text-yellow-700">Experience</p>
                  <p className="mt-3 whitespace-pre-line text-gray-700">
                    {minion.experience || 'No experience summary provided.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="rounded-2xl bg-white p-6 shadow-md">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">Email</p>
                <p className="mt-3 break-all text-lg font-semibold text-gray-800">{minion.email}</p>
              </div>
              <div className="rounded-2xl bg-white p-6 shadow-md">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">Phone</p>
                <p className="mt-3 text-lg font-semibold text-gray-800">{minion.phone || 'Not provided'}</p>
              </div>
              <div className="rounded-2xl bg-white p-6 shadow-md">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">Joined</p>
                <p className="mt-3 text-lg font-semibold text-gray-800">
                  {new Date(minion.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="rounded-3xl bg-white p-8 shadow-md">
              <h3 className="text-2xl font-bold text-gray-900">Ready to work with this minion?</h3>
              <p className="mt-3 max-w-2xl text-gray-600">
                Post a task with a clear description, fair budget, and your preferred location so this minion can apply if the work is a fit.
              </p>
              <div className="mt-6 flex flex-wrap gap-4">
                <button
                  onClick={() => navigate('/post-task', {
                    state: {
                      preferredMinion: {
                        id: minion.id,
                        firstName: minion.first_name,
                        lastName: minion.last_name,
                        skills: minion.skills,
                        availability: minion.availability,
                        location: minion.location
                      }
                    }
                  })}
                  className="rounded-xl bg-minion-blue px-6 py-3 font-semibold text-white transition hover:bg-minion-blue-light"
                >
                  Hire / Invite to Task
                </button>
                <button
                  onClick={() => navigate('/browse-minions')}
                  className="rounded-xl border border-gray-300 px-6 py-3 font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  Browse More Minions
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MinionProfile;
