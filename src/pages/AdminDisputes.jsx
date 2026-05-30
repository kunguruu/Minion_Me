import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { disputesAPI } from '../services/api';
import { useAuth } from '../context/useAuth';
import { disputeStatusLabels, disputeStatusTone, formatDisputeReason } from '../lib/disputes';

function AdminDisputes() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const loadDisputes = async () => {
      try {
        setLoading(true);
        const response = await disputesAPI.getAdminDisputes();
        setDisputes(response.data || []);
        setError('');
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load disputes.');
      } finally {
        setLoading(false);
      }
    };

    loadDisputes();
  }, []);

  if (!user?.id || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="rounded-[28px] bg-white p-8 shadow-xl">
          <h1 className="text-2xl font-black text-slate-900">Admin access required</h1>
          <p className="mt-3 text-slate-600">Only admins can review platform disputes.</p>
        </div>
      </div>
    );
  }

  const filteredDisputes = disputes.filter((dispute) => filter === 'all' || dispute.status === filter);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-linear-to-r from-minion-blue to-minion-blue-light px-4 py-10 shadow-lg">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-minion-yellow">Minion Me Control Room</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-white">Admin Disputes</h1>
            <p className="mt-3 max-w-2xl text-blue-50">
              Review open issues, move cases into review, and close disputes with a clearer operational queue.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/admin')}
            className="rounded-full border-2 border-white/35 bg-white/10 px-5 py-3 font-semibold text-white transition hover:bg-white/20"
          >
            Back to Admin
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-minion-blue">Dispute Register</p>
              <h2 className="mt-3 text-2xl font-black text-slate-900">All dispute cases</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'all', label: 'All' },
                { value: 'open', label: 'Open' },
                { value: 'under_review', label: 'Under Review' },
                { value: 'resolved', label: 'Resolved' },
                { value: 'rejected', label: 'Rejected' }
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFilter(option.value)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    filter === option.value
                      ? 'bg-minion-blue text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center text-slate-500">Loading disputes...</div>
          ) : error ? (
            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">{error}</div>
          ) : filteredDisputes.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center text-slate-500">
              No disputes match the selected filter.
            </div>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-slate-500">
                  <tr className="border-b border-slate-200">
                    <th className="pb-4 pr-6 font-semibold">Task Title</th>
                    <th className="pb-4 pr-6 font-semibold">Raised By</th>
                    <th className="pb-4 pr-6 font-semibold">Reason</th>
                    <th className="pb-4 pr-6 font-semibold">Status</th>
                    <th className="pb-4 pr-6 font-semibold">Created Date</th>
                    <th className="pb-4 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDisputes.map((dispute) => (
                    <tr key={dispute.id} className="border-b border-slate-100 align-top">
                      <td className="py-4 pr-6">
                        <p className="font-semibold text-slate-900">{dispute.task_title}</p>
                        <p className="mt-1 text-xs text-slate-500">Task #{dispute.task_id}</p>
                      </td>
                      <td className="py-4 pr-6 text-slate-600">
                        {dispute.raised_by_name || 'Unknown'} ({dispute.raised_by_role})
                      </td>
                      <td className="py-4 pr-6 text-slate-600">{formatDisputeReason(dispute.reason)}</td>
                      <td className="py-4 pr-6">
                        <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase ${disputeStatusTone[dispute.status] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                          {disputeStatusLabels[dispute.status] || dispute.status}
                        </span>
                      </td>
                      <td className="py-4 pr-6 text-slate-600">{new Date(dispute.created_at).toLocaleString()}</td>
                      <td className="py-4 text-right">
                        <button
                          type="button"
                          onClick={() => navigate('/admin')}
                          className="rounded-xl border border-minion-blue px-3 py-2 text-xs font-semibold text-minion-blue transition hover:bg-blue-50"
                        >
                          Open Admin
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminDisputes;
