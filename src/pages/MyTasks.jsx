import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { tasksAPI, assignmentsAPI, paymentsAPI, ratingsAPI, disputesAPI } from '../services/api';
import { useNotification } from '../context/useNotification';
import { useAuth } from '../context/useAuth';
import DisputeModal from '../components/DisputeModal';
import { disputeStatusLabels, disputeStatusTone, formatDisputeReason } from '../lib/disputes';

function MyTasks() {
  const navigate = useNavigate();
  const { notify } = useNotification();
  const { user } = useAuth();

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedTask, setSelectedTask] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loadingApplications, setLoadingApplications] = useState(false);
  const [paymentHistoryByTask, setPaymentHistoryByTask] = useState({});
  const [ratingsByTask, setRatingsByTask] = useState({});
  const [ratingTaskIdLoading, setRatingTaskIdLoading] = useState(null);
  const [disputesByTask, setDisputesByTask] = useState({});
  const [disputeModalTask, setDisputeModalTask] = useState(null);
  const [disputeForm, setDisputeForm] = useState({
    reason: 'scope_change',
    description: ''
  });
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);

  const fetchMyTasks = useCallback(async () => {
    if (!user?.id) {
      setTasks([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await tasksAPI.getAll();
      // Filter to show only this client's tasks
      const myTasks = response.data.filter(task => task.client_id === user.id);
      setTasks(myTasks);
      setError('');
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError('Failed to load your tasks. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const fetchMyRatings = useCallback(async () => {
    try {
      const response = await ratingsAPI.getMyRatings();
      const ratingsMap = (response.data || []).reduce((acc, row) => {
        acc[row.task_id] = row;
        return acc;
      }, {});
      setRatingsByTask(ratingsMap);
    } catch (err) {
      console.error('Error fetching ratings:', err);
    }
  }, []);

  useEffect(() => {
    fetchMyTasks();
    fetchMyRatings();
  }, [fetchMyTasks, fetchMyRatings]);

  useEffect(() => {
    if (tasks.length === 0) {
      setPaymentHistoryByTask({});
      return;
    }

    const loadPaymentHistory = async () => {
      const uniqueTaskIds = [...new Set(tasks.map((task) => task.id))];
      const entries = await Promise.all(
        uniqueTaskIds.map(async (taskId) => {
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
  }, [tasks]);

  useEffect(() => {
    if (tasks.length === 0) {
      setDisputesByTask({});
      return;
    }

    const loadDisputes = async () => {
      const entries = await Promise.all(
        tasks.map(async (task) => {
          try {
            const response = await disputesAPI.getTaskDisputes(task.id);
            return [task.id, response.data || []];
          } catch {
            return [task.id, []];
          }
        })
      );

      setDisputesByTask(Object.fromEntries(entries));
    };

    loadDisputes();
  }, [tasks]);

  const fetchApplications = async (taskId) => {
    try {
      setLoadingApplications(true);
      const response = await assignmentsAPI.getTaskApplications(taskId);
      setApplications(response.data);
    } catch (err) {
      console.error('Error fetching applications:', err);
      notify({
        type: 'error',
        title: 'Load Failed',
        message: 'Failed to load applications'
      });
    } finally {
      setLoadingApplications(false);
    }
  };

  const viewApplications = (task) => {
    setSelectedTask(task);
    fetchApplications(task.id);
  };

  const acceptMinion = async (applicationId) => {
    if (!confirm('Are you sure you want to assign this minion to the task?')) {
      return;
    }

    try {
      await assignmentsAPI.accept(applicationId);
      notify({
        type: 'success',
        title: 'Application Accepted',
        message: 'Minion assigned successfully.'
      });
      setSelectedTask(null);
      fetchMyTasks(); // Refresh tasks
    } catch (err) {
      console.error('Error accepting minion:', err);
      notify({
        type: 'error',
        title: 'Assignment Failed',
        message: err.response?.data?.message || 'Failed to assign minion'
      });
    }
  };

  const deleteTask = async (taskId) => {
    if (!confirm('Are you sure you want to delete this task?')) {
      return;
    }

    try {
      await tasksAPI.delete(taskId);
      notify({
        type: 'success',
        title: 'Task Deleted',
        message: 'Task deleted successfully.'
      });
      fetchMyTasks();
    } catch (err) {
      console.error('Error deleting task:', err);
      notify({
        type: 'error',
        title: 'Delete Failed',
        message: 'Failed to delete task'
      });
    }
  };

  const payForTask = async (taskId) => {
    if (!confirm('Record this task as paid and complete the project workflow?')) {
      return;
    }

    try {
      const response = await paymentsAPI.recordPayment(taskId);
      notify({
        type: 'success',
        title: 'Payment Recorded',
        message: response.message || 'Payment recorded successfully.'
      });
      fetchMyTasks();
    } catch (err) {
      console.error('Error recording payment:', err);
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Failed to record payment';
      notify({
        type: 'error',
        title: 'Payment Failed',
        message: errorMessage
      });
    }
  };

  const submitTaskRating = async (taskId, rating) => {
    try {
      setRatingTaskIdLoading(taskId);
      await ratingsAPI.rateTask(taskId, rating);
      setRatingsByTask((current) => ({
        ...current,
        [taskId]: {
          ...(current[taskId] || {}),
          task_id: taskId,
          rating
        }
      }));
      notify({
        type: 'success',
        title: 'Rating Saved',
        message: 'Thanks for your feedback.'
      });
    } catch (err) {
      console.error('Error saving rating:', err);
      notify({
        type: 'error',
        title: 'Rating Failed',
        message: err.response?.data?.message || 'Failed to save rating'
      });
    } finally {
      setRatingTaskIdLoading(null);
    }
  };

  const openDisputeModal = (task) => {
    setDisputeModalTask(task);
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
      const response = await disputesAPI.create(disputeModalTask.id, disputeForm);
      const disputesResponse = await disputesAPI.getTaskDisputes(disputeModalTask.id);
      setDisputesByTask((current) => ({
        ...current,
        [disputeModalTask.id]: disputesResponse.data || []
      }));
      fetchMyTasks();
      notify({
        type: 'success',
        title: 'Dispute Raised',
        message: response.message || 'Your dispute has been submitted for review.'
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

  const canRaiseDispute = (task) =>
    ['assigned', 'in_progress', 'completed'].includes(task.status) && !task.has_active_dispute;

  const renderStars = (task) => {
    const currentRating = ratingsByTask[task.id]?.rating || 0;
    const canRate = ['completed', 'paid'].includes(task.status) && Boolean(task.minion_id);
    if (!canRate) {
      return null;
    }

    return (
      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
        <p className="text-sm font-semibold text-amber-800">
          Rate this minion&apos;s work
        </p>
        <div className="mt-2 flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => {
            const filled = star <= currentRating;
            return (
              <button
                key={star}
                type="button"
                disabled={ratingTaskIdLoading === task.id}
                onClick={() => submitTaskRating(task.id, star)}
                className={`text-2xl transition ${filled ? 'text-amber-500' : 'text-gray-300'} ${ratingTaskIdLoading === task.id ? 'cursor-not-allowed opacity-60' : 'hover:text-amber-600'}`}
                aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                title={`Rate ${star} star${star > 1 ? 's' : ''}`}
              >
                ★
              </button>
            );
          })}
        </div>
        <p className="mt-1 text-xs text-amber-900">
          {currentRating > 0
            ? `Your rating: ${currentRating}/5 (tap any star to update)`
            : 'No rating yet. Tap a star to rate.'}
        </p>
      </div>
    );
  };

  const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return true;
    return task.status === filter;
  });

  // Group tasks by status
  const openTasks = tasks.filter(t => t.status === 'open');
  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const assignedTasks = tasks.filter(t => t.status === 'assigned');
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const paidTasks = tasks.filter(t => t.status === 'paid');

  const getStatusBadge = (status) => {
    const badges = {
      open: 'bg-blue-100 text-blue-800 border-blue-300',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      assigned: 'bg-green-100 text-green-800 border-green-300',
      in_progress: 'bg-purple-100 text-purple-800 border-purple-300',
      completed: 'bg-gray-100 text-gray-800 border-gray-300',
      cancelled: 'bg-red-100 text-red-800 border-red-300',
      paid: 'bg-emerald-100 text-emerald-800 border-emerald-300'
    };
    const icons = {
      open: '🔓',
      pending: '⏳',
      assigned: '✅',
      in_progress: '🚀',
      completed: '✔️',
      cancelled: '❌',
      paid: '💰'
    };
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border-2 ${badges[status]}`}>
        {icons[status]} {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  if (!user?.id || user.role !== 'client') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-minion-yellow to-minion-yellow-light">
        <div className="text-center bg-white p-8 rounded-2xl shadow-xl">
          <h2 className="text-2xl font-bold text-minion-blue mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-4">Only clients can view this page.</p>
          <button
            onClick={() => navigate('/login')}
            className="bg-minion-blue text-white px-6 py-2 rounded-lg hover:bg-minion-blue-light transition font-semibold"
          >
            Login as Client
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-linear-to-r from-minion-blue to-minion-blue-light py-8 px-4 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold text-white mb-2">📋 My Tasks</h1>
          <p className="text-blue-100 text-lg">
            Manage your posted tasks and review applications
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-md p-6 border-2 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-semibold">🔓 Open</p>
                <p className="text-4xl font-bold text-blue-600">{openTasks.length}</p>
              </div>
              <div className="bg-blue-100 p-4 rounded-full">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-6 border-2 border-yellow-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-semibold">⏳ Pending</p>
                <p className="text-4xl font-bold text-yellow-600">{pendingTasks.length}</p>
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
                <p className="text-gray-500 text-sm font-semibold">✅ Assigned</p>
                <p className="text-4xl font-bold text-green-600">{assignedTasks.length}</p>
              </div>
              <div className="bg-green-100 p-4 rounded-full">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-6 border-2 border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-semibold">✔️ Completed</p>
                <p className="text-4xl font-bold text-gray-600">{completedTasks.length}</p>
              </div>
              <div className="bg-gray-100 p-4 rounded-full">
                <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-6 border-2 border-emerald-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-semibold">💰 Paid</p>
                <p className="text-4xl font-bold text-emerald-600">{paidTasks.length}</p>
              </div>
              <div className="bg-emerald-100 p-4 rounded-full">
                <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
                  ? 'bg-minion-blue text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({tasks.length})
            </button>
            <button
              onClick={() => setFilter('open')}
              className={`px-6 py-2 rounded-lg font-semibold transition ${
                filter === 'open'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🔓 Open ({openTasks.length})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-6 py-2 rounded-lg font-semibold transition ${
                filter === 'pending'
                  ? 'bg-yellow-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              ⏳ Pending ({pendingTasks.length})
            </button>
            <button
              onClick={() => setFilter('assigned')}
              className={`px-6 py-2 rounded-lg font-semibold transition ${
                filter === 'assigned'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              ✅ Assigned ({assignedTasks.length})
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-6 py-2 rounded-lg font-semibold transition ${
                filter === 'completed'
                  ? 'bg-gray-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              ✔️ Completed ({completedTasks.length})
            </button>
            <button
              onClick={() => setFilter('paid')}
              className={`px-6 py-2 rounded-lg font-semibold transition ${
                filter === 'paid'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              💰 Paid ({paidTasks.length})
            </button>
            <button
              onClick={fetchMyTasks}
              className="ml-auto px-6 py-2 bg-minion-yellow text-black rounded-lg font-semibold hover:bg-minion-yellow-light transition"
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
            <button onClick={fetchMyTasks} className="font-semibold underline">
              Retry
            </button>
          </div>
        )}

        {/* Tasks List */}
        {!loading && !error && (
          <>
            {filteredTasks.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-md p-12 text-center border-2 border-dashed border-gray-300">
                <div className="text-gray-400 text-6xl mb-4">📭</div>
                <h3 className="text-2xl font-bold text-gray-700 mb-2">
                  No tasks found
                </h3>
                <p className="text-gray-500 mb-6">
                  {filter === 'all' 
                    ? "You haven't posted any tasks yet."
                    : `No ${filter} tasks.`}
                </p>
                <button
                  onClick={() => navigate('/post-task')}
                  className="bg-minion-yellow hover:bg-minion-yellow-light text-black font-bold py-3 px-6 rounded-xl transition shadow-md"
                >
                  📝 Post a Task
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {filteredTasks.map((task) => (
                  <div
                    key={task.id}
                    className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 p-6 border-2 border-transparent hover:border-minion-blue"
                  >
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      {/* Left Side - Task Info */}
                      <div className="flex-1">
                        <div className="flex items-start gap-3 mb-3 flex-wrap">
                          {getStatusBadge(task.status)}
                          <span className="bg-minion-yellow text-black text-xs font-bold px-3 py-1 rounded-full">
                            {task.category}
                          </span>
                          {task.has_active_dispute && (
                            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold uppercase ${disputeStatusTone[task.active_dispute_status] || 'bg-rose-100 text-rose-700 border-rose-200'}`}>
                              Dispute {disputeStatusLabels[task.active_dispute_status] || 'Open'}
                            </span>
                          )}
                        </div>

                        <h3 className="text-2xl font-bold text-gray-900 mb-2">
                          {task.title}
                        </h3>

                        <p className="text-gray-600 mb-4">
                          {task.description}
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center text-gray-600">
                            <svg className="w-4 h-4 mr-2 text-minion-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="font-medium">Location:</span> {task.location || 'Not specified'}
                          </div>

                          <div className="flex items-center text-gray-600">
                            <svg className="w-4 h-4 mr-2 text-minion-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="font-medium">Posted:</span> {new Date(task.created_at).toLocaleDateString()}
                          </div>

                          <div className="flex items-center text-minion-yellow font-bold text-lg col-span-2">
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            KSh {Number(task.budget).toLocaleString()}
                          </div>
                        </div>

                        {(paymentHistoryByTask[task.id] || task.status === 'paid') && (
                          <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm">
                            <p className="font-semibold text-emerald-800 mb-2">Payment History</p>
                            <p className="text-gray-700">
                              Receipt: {paymentHistoryByTask[task.id]?.mpesa_receipt_number || 'Pending'}
                            </p>
                            <p className="text-gray-700">
                              Amount: {paymentHistoryByTask[task.id]?.amount ? `KSh ${Number(paymentHistoryByTask[task.id].amount).toLocaleString()}` : 'N/A'}
                            </p>
                            <p className="text-gray-700">
                              Paid Time: {paymentHistoryByTask[task.id]?.paid_at ? new Date(paymentHistoryByTask[task.id].paid_at).toLocaleString() : 'Not paid yet'}
                            </p>
                          </div>
                        )}

                        {getLatestDispute(task.id) && (
                          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold uppercase ${disputeStatusTone[getLatestDispute(task.id).status] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                                {disputeStatusLabels[getLatestDispute(task.id).status] || getLatestDispute(task.id).status}
                              </span>
                              <span className="font-semibold text-rose-800">
                                {formatDisputeReason(getLatestDispute(task.id).reason)}
                              </span>
                            </div>
                            <p className="mt-3 text-slate-700">
                              {getLatestDispute(task.id).description || 'No extra dispute details were provided.'}
                            </p>
                            {getLatestDispute(task.id).admin_note ? (
                              <p className="mt-2 text-xs text-slate-600">
                                Admin note: {getLatestDispute(task.id).admin_note}
                              </p>
                            ) : null}
                          </div>
                        )}

                        {renderStars(task)}
                      </div>

                      {/* Right Side - Actions */}
                      <div className="md:w-56 space-y-2">
                        {task.status === 'pending' && (
                          <button
                            onClick={() => viewApplications(task)}
                            className="w-full bg-minion-yellow hover:bg-minion-yellow-light text-black font-bold py-2 px-4 rounded-lg transition shadow-md"
                          >
                            👥 View Applications
                          </button>
                        )}

                        {task.status === 'open' && (
                          <p className="text-center text-sm text-gray-500 italic">
                            Waiting for applications...
                          </p>
                        )}

                        {(task.status === 'assigned' || task.status === 'in_progress') && (
                          <div className="text-center">
                            <p className="text-sm text-green-600 font-semibold mb-2">
                              ✅ Assigned to Minion
                            </p>
                            <p className="text-xs text-gray-500">
                              Task in progress
                            </p>
                          </div>
                        )}

                        {task.status === 'completed' && (
                          <button
                            onClick={() => payForTask(task.id)}
                            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2 px-4 rounded-lg transition"
                          >
                            💳 Record Payment
                          </button>
                        )}

                        {task.status === 'paid' && (
                          <div className="text-center">
                            <p className="text-sm text-emerald-700 font-semibold">
                              💰 Payment completed
                            </p>
                          </div>
                        )}

                        {task.status === 'open' && (
                          <button
                            onClick={() => deleteTask(task.id)}
                            className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition"
                          >
                            🗑️ Delete
                          </button>
                        )}

                        {canRaiseDispute(task) && (
                          <button
                            onClick={() => openDisputeModal(task)}
                            className="w-full rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 font-semibold text-rose-700 transition hover:bg-rose-100"
                          >
                            Raise Dispute
                          </button>
                        )}

                        {task.has_active_dispute && (
                          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-center text-sm font-semibold text-rose-700">
                            Active dispute in review
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

      {/* Applications Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-linear-to-r from-minion-yellow to-minion-yellow-light p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-black mb-1">
                    Applications for: {selectedTask.title}
                  </h2>
                  <p className="text-gray-800">
                    {applications.length} {applications.length === 1 ? 'application' : 'applications'}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedTask(null)}
                  className="bg-white text-black rounded-full p-2 hover:bg-gray-100 transition"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {loadingApplications ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-minion-yellow border-t-minion-blue"></div>
                </div>
              ) : applications.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-6xl mb-4">📭</div>
                  <p className="text-gray-600">No applications yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {applications.map((app) => (
                    <div
                      key={app.id}
                      className={`border-2 rounded-xl p-6 ${
                        app.status === 'accepted'
                          ? 'bg-green-50 border-green-300'
                          : app.status === 'rejected'
                          ? 'bg-red-50 border-red-300'
                          : 'bg-white border-gray-200 hover:border-minion-yellow'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">
                            {app.minion_name}
                          </h3>
                          <p className="text-sm text-gray-600">{app.minion_email}</p>
                          {app.minion_phone && (
                            <p className="text-sm text-gray-600">📞 {app.minion_phone}</p>
                          )}
                        </div>
                        {app.status === 'pending' ? (
                          <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-bold">
                            ⏳ PENDING
                          </span>
                        ) : app.status === 'accepted' ? (
                          <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold">
                            ✅ ACCEPTED
                          </span>
                        ) : (
                          <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-bold">
                            ❌ REJECTED
                          </span>
                        )}
                      </div>

                      {app.skills && (
                        <div className="mb-3">
                          <p className="text-sm font-semibold text-gray-700">Skills:</p>
                          <p className="text-sm text-gray-600">{app.skills}</p>
                        </div>
                      )}

                      {app.minion_location && (
                        <div className="mb-3">
                          <p className="text-sm font-semibold text-gray-700">Location:</p>
                          <p className="text-sm text-gray-600">📍 {app.minion_location}</p>
                        </div>
                      )}

                      {app.message && (
                        <div className="mb-4 bg-blue-50 border-l-4 border-minion-blue p-3 rounded">
                          <p className="text-sm font-semibold text-gray-700 mb-1">Message:</p>
                          <p className="text-sm text-gray-600">{app.message}</p>
                        </div>
                      )}

                      <div className="text-xs text-gray-500 mb-4">
                        Applied: {new Date(app.created_at).toLocaleString()}
                      </div>

                      {app.status === 'pending' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => acceptMinion(app.id)}
                            className="flex-1 bg-minion-yellow hover:bg-minion-yellow-light text-black font-bold py-2 px-4 rounded-lg transition shadow-md"
                          >
                            ✅ Accept This Minion
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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

export default MyTasks;
