import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { assignmentsAPI, tasksAPI, paymentsAPI, disputesAPI } from '../services/api';
import { useNotification } from '../context/useNotification';
import { useAuth } from '../context/useAuth';
import DisputeModal from '../components/DisputeModal';
import { disputeStatusLabels, disputeStatusTone, formatDisputeReason } from '../lib/disputes';

function MyJobs() {
  const navigate = useNavigate();
  const { notify } = useNotification();
  const { user } = useAuth();

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // all, pending, accepted, rejected
  const [paymentHistoryByTask, setPaymentHistoryByTask] = useState({});
  const [disputesByTask, setDisputesByTask] = useState({});
  const [disputeModalTask, setDisputeModalTask] = useState(null);
  const [disputeForm, setDisputeForm] = useState({
    reason: 'scope_change',
    description: ''
  });
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);

  const fetchMyApplications = useCallback(async () => {
    if (!user?.id) {
      setApplications([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await assignmentsAPI.getMinionApplications(user.id);
      setApplications(response.data);
      setError('');
    } catch (err) {
      console.error('Error fetching applications:', err);
      setError('Failed to load your applications. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchMyApplications();
  }, [fetchMyApplications]);

  useEffect(() => {
    const acceptedTaskIds = [
      ...new Set(
        applications
          .filter((app) => app.status === 'accepted')
          .map((app) => app.task_id)
      )
    ];

    if (acceptedTaskIds.length === 0) {
      setPaymentHistoryByTask({});
      return;
    }

    const loadPaymentHistory = async () => {
      const entries = await Promise.all(
        acceptedTaskIds.map(async (taskId) => {
          try {
            const response = await paymentsAPI.getTaskPayment(taskId);
            return [taskId, response.data?.payment || null];
          } catch {
            return [taskId, null];
          }
        })
      );
      setPaymentHistoryByTask(Object.fromEntries(entries));
    };

    loadPaymentHistory();
  }, [applications]);

  useEffect(() => {
    const relevantTaskIds = [
      ...new Set(
        applications
          .filter((app) => app.status === 'accepted')
          .map((app) => app.task_id)
      )
    ];

    if (relevantTaskIds.length === 0) {
      setDisputesByTask({});
      return;
    }

    const loadDisputes = async () => {
      const entries = await Promise.all(
        relevantTaskIds.map(async (taskId) => {
          try {
            const response = await disputesAPI.getTaskDisputes(taskId);
            return [taskId, response.data || []];
          } catch {
            return [taskId, []];
          }
        })
      );

      setDisputesByTask(Object.fromEntries(entries));
    };

    loadDisputes();
  }, [applications]);

const updateTaskStatus = async (taskId, newStatus) => {
  try {
    console.log('Updating task status:', { 
      taskId, 
      newStatus, 
      userId: user.id, 
      role: user.role 
    });

    await tasksAPI.updateStatus(taskId, newStatus);
    
    notify({
      type: 'success',
      title: 'Status Updated',
      message: `Task marked as ${newStatus.replace('_', ' ')}.`
    });
    fetchMyApplications(); // Refresh
  } catch (err) {
    console.error('Error updating status:', err);
    console.error('Error response:', err.response?.data);
    
    const errorMsg = err.response?.data?.message || 'Failed to update task status.';
    notify({
      type: 'error',
      title: 'Update Failed',
      message: errorMsg
    });
  }
};

  const openDisputeModal = (app) => {
    setDisputeModalTask(app);
    setDisputeForm({
      reason: 'scope_change',
      description: ''
    });
  };

  const closeDisputeModal = () => {
    setDisputeModalTask(null);
    setDisputeSubmitting(false);
  };

  const submitDispute = async () => {
    if (!disputeModalTask) {
      return;
    }

    try {
      setDisputeSubmitting(true);
      const response = await disputesAPI.create(disputeModalTask.task_id, disputeForm);
      const disputesResponse = await disputesAPI.getTaskDisputes(disputeModalTask.task_id);
      setDisputesByTask((current) => ({
        ...current,
        [disputeModalTask.task_id]: disputesResponse.data || []
      }));
      fetchMyApplications();
      notify({
        type: 'success',
        title: 'Dispute Raised',
        message: response.message || 'Your dispute has been submitted for admin review.'
      });
      closeDisputeModal();
    } catch (err) {
      notify({
        type: 'error',
        title: 'Dispute Failed',
        message: err.response?.data?.message || 'Failed to raise dispute.'
      });
      setDisputeSubmitting(false);
    }
  };

  const getLatestDispute = (taskId) => disputesByTask[taskId]?.[0] || null;

  const canRaiseDispute = (app) =>
    app.status === 'accepted'
    && ['assigned', 'in_progress', 'completed'].includes(app.task_status)
    && !app.has_active_dispute;

  const filteredApplications = applications.filter(app => {
    if (filter === 'all') return true;
    return app.status === filter;
  });

  // Group applications by status
  const pending = applications.filter(app => app.status === 'pending');
  const accepted = applications.filter(app => app.status === 'accepted');
  const rejected = applications.filter(app => app.status === 'rejected');

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      accepted: 'bg-green-100 text-green-800 border-green-300',
      rejected: 'bg-red-100 text-red-800 border-red-300'
    };
    const icons = {
      pending: '⏳',
      accepted: '✅',
      rejected: '❌'
    };
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border-2 ${badges[status]}`}>
        {icons[status]} {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (!user?.id || user.role !== 'minion') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-minion-yellow to-minion-yellow-light">
        <div className="text-center bg-white p-8 rounded-2xl shadow-xl">
          <h2 className="text-2xl font-bold text-minion-blue mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-4">Only minions can view this page.</p>
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
          <h1 className="text-4xl font-bold text-black mb-2">📋 My Jobs</h1>
          <p className="text-gray-800 text-lg">
            Track your applications and manage your accepted tasks
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-md p-6 border-2 border-yellow-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-semibold">⏳ Pending</p>
                <p className="text-4xl font-bold text-yellow-600">{pending.length}</p>
              </div>
              <div className="bg-yellow-100 p-4 rounded-full">
                <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-6 border-2 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-semibold">✅ Accepted</p>
                <p className="text-4xl font-bold text-green-600">{accepted.length}</p>
              </div>
              <div className="bg-green-100 p-4 rounded-full">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-6 border-2 border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-semibold">❌ Rejected</p>
                <p className="text-4xl font-bold text-red-600">{rejected.length}</p>
              </div>
              <div className="bg-red-100 p-4 rounded-full">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-2xl shadow-md p-4 mb-6 border-2 border-minion-yellow/20">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-6 py-2 rounded-lg font-semibold transition ${
                filter === 'all'
                  ? 'bg-minion-yellow text-black'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({applications.length})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-6 py-2 rounded-lg font-semibold transition ${
                filter === 'pending'
                  ? 'bg-yellow-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              ⏳ Pending ({pending.length})
            </button>
            <button
              onClick={() => setFilter('accepted')}
              className={`px-6 py-2 rounded-lg font-semibold transition ${
                filter === 'accepted'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              ✅ Accepted ({accepted.length})
            </button>
            <button
              onClick={() => setFilter('rejected')}
              className={`px-6 py-2 rounded-lg font-semibold transition ${
                filter === 'rejected'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              ❌ Rejected ({rejected.length})
            </button>
            <button
              onClick={fetchMyApplications}
              className="ml-auto px-6 py-2 bg-minion-blue text-white rounded-lg font-semibold hover:bg-minion-blue-light transition"
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-minion-yellow border-t-minion-blue"></div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border-2 border-red-400 text-red-700 px-6 py-4 rounded-xl mb-6 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={fetchMyApplications} className="font-semibold underline">
              Retry
            </button>
          </div>
        )}

        {/* Applications List */}
        {!loading && !error && (
          <>
            {filteredApplications.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-md p-12 text-center border-2 border-dashed border-gray-300">
                <div className="text-gray-400 text-6xl mb-4">📭</div>
                <h3 className="text-2xl font-bold text-gray-700 mb-2">
                  No applications found
                </h3>
                <p className="text-gray-500 mb-6">
                  {filter === 'all' 
                    ? "You haven't applied to any tasks yet. Start browsing tasks!"
                    : `No ${filter} applications.`}
                </p>
                <button
                  onClick={() => navigate('/find-gigs')}
                  className="bg-minion-yellow hover:bg-minion-yellow-light text-black font-bold py-3 px-6 rounded-xl transition shadow-md"
                >
                  🔍 Browse Available Tasks
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {filteredApplications.map((app) => (
                  <div
                    key={app.id}
                    className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 p-6 border-2 border-transparent hover:border-minion-yellow"
                  >
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      {/* Left Side - Task Info */}
                      <div className="flex-1">
                        <div className="flex items-start gap-3 mb-3">
                          {getStatusBadge(app.status)}
                          <span className="bg-minion-blue text-white text-xs font-bold px-3 py-1 rounded-full">
                            {app.category}
                          </span>
                          {app.has_active_dispute && (
                            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold uppercase ${disputeStatusTone[app.active_dispute_status] || 'bg-rose-100 text-rose-700 border-rose-200'}`}>
                              Dispute {disputeStatusLabels[app.active_dispute_status] || 'Open'}
                            </span>
                          )}
                        </div>

                        <h3 className="text-2xl font-bold text-gray-900 mb-2">
                          {app.title}
                        </h3>

                        <p className="text-gray-600 mb-4">
                          {app.description}
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center text-gray-600">
                            <svg className="w-4 h-4 mr-2 text-minion-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="font-medium">Location:</span> {app.location || 'Not specified'}
                          </div>

                          <div className="flex items-center text-gray-600">
                            <svg className="w-4 h-4 mr-2 text-minion-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span className="font-medium">Client:</span> {app.client_name}
                          </div>

                          <div className="flex items-center text-gray-600">
                            <svg className="w-4 h-4 mr-2 text-minion-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="font-medium">Applied:</span> {new Date(app.created_at).toLocaleDateString()}
                          </div>

                          <div className="flex items-center text-minion-yellow font-bold text-lg">
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            KSh {Number(app.budget).toLocaleString()}
                          </div>
                        </div>

                        {app.message && (
                          <div className="mt-4 bg-blue-50 border-l-4 border-minion-blue p-4 rounded">
                            <p className="text-sm text-gray-700">
                              <span className="font-semibold">Your message:</span> {app.message}
                            </p>
                          </div>
                        )}

                        {(paymentHistoryByTask[app.task_id] || app.task_status === 'paid') && (
                          <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm">
                            <p className="font-semibold text-emerald-800 mb-2">Payment History</p>
                            <p className="text-gray-700">
                              Receipt: {paymentHistoryByTask[app.task_id]?.mpesa_receipt_number || 'Pending'}
                            </p>
                            <p className="text-gray-700">
                              Amount: {paymentHistoryByTask[app.task_id]?.amount ? `KSh ${Number(paymentHistoryByTask[app.task_id].amount).toLocaleString()}` : 'N/A'}
                            </p>
                            <p className="text-gray-700">
                              Paid Time: {paymentHistoryByTask[app.task_id]?.paid_at ? new Date(paymentHistoryByTask[app.task_id].paid_at).toLocaleString() : 'Not paid yet'}
                            </p>
                          </div>
                        )}

                        {getLatestDispute(app.task_id) && (
                          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold uppercase ${disputeStatusTone[getLatestDispute(app.task_id).status] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                                {disputeStatusLabels[getLatestDispute(app.task_id).status] || getLatestDispute(app.task_id).status}
                              </span>
                              <span className="font-semibold text-rose-800">
                                {formatDisputeReason(getLatestDispute(app.task_id).reason)}
                              </span>
                            </div>
                            <p className="mt-3 text-slate-700">
                              {getLatestDispute(app.task_id).description || 'No extra dispute details were provided.'}
                            </p>
                            {getLatestDispute(app.task_id).admin_note ? (
                              <p className="mt-2 text-xs text-slate-600">
                                Admin note: {getLatestDispute(app.task_id).admin_note}
                              </p>
                            ) : null}
                          </div>
                        )}
                      </div>

                      {/* Right Side - Actions */}
                      <div className="md:w-48">
                        {app.status === 'accepted' && (
                          <div className="space-y-2">
                            {app.task_status === 'assigned' && (
                              <button
                                onClick={() => updateTaskStatus(app.task_id, 'in_progress')}
                                className="w-full bg-minion-blue hover:bg-minion-blue-light text-white font-bold py-2 px-4 rounded-lg transition shadow-md"
                              >
                                🚀 Start Task
                              </button>
                            )}
                            {app.task_status === 'in_progress' && (
                              <button
                                onClick={() => updateTaskStatus(app.task_id, 'completed')}
                                className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition shadow-md"
                              >
                                ✅ Complete
                              </button>
                            )}
                            {app.task_status === 'completed' && (
                              <div className="text-center text-sm text-green-700 font-semibold">
                                Task completed
                              </div>
                            )}
                            {app.task_status === 'paid' && (
                              <div className="text-center text-sm text-emerald-700 font-semibold">
                                Payment released
                              </div>
                            )}
                            {app.task_status === 'cancelled' && (
                              <div className="text-center text-sm text-red-600 font-semibold">
                                Task cancelled by client
                              </div>
                            )}

                            {canRaiseDispute(app) && (
                              <button
                                onClick={() => openDisputeModal(app)}
                                className="w-full rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 font-semibold text-rose-700 transition hover:bg-rose-100"
                              >
                                Raise Dispute
                              </button>
                            )}

                            {app.has_active_dispute && (
                              <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-center text-sm font-semibold text-rose-700">
                                Active dispute in review
                              </div>
                            )}
                          </div>
                        )}

                        {app.status === 'pending' && (
                          <div className="text-center text-sm text-gray-500 italic">
                            Waiting for client response...
                          </div>
                        )}

                        {app.status === 'rejected' && (
                          <div className="text-center text-sm text-red-500 font-semibold">
                            Application declined
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <DisputeModal
        open={Boolean(disputeModalTask)}
        taskTitle={disputeModalTask?.title || ''}
        form={disputeForm}
        submitting={disputeSubmitting}
        onClose={closeDisputeModal}
        onChange={(field, value) => setDisputeForm((current) => ({ ...current, [field]: value }))}
        onSubmit={submitDispute}
      />
    </div>
  );
}

export default MyJobs;
