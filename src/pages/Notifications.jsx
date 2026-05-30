import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../context/useNotification';
import { useAuth } from '../context/useAuth';

function Notifications() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    history,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearHistory
  } = useNotification();

  useEffect(() => {
    if (unreadCount > 0) {
      markAllAsRead();
    }
  }, [unreadCount, markAllAsRead]);

  const typeStyleMap = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    error: 'border-red-200 bg-red-50 text-red-900',
    info: 'border-blue-200 bg-blue-50 text-blue-900'
  };

  if (!user?.id) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="rounded-2xl bg-white p-8 shadow-xl text-center">
          <h2 className="text-2xl font-bold text-minion-blue">Access Denied</h2>
          <p className="mt-3 text-gray-600">Log in to view your notification history.</p>
          <button
            onClick={() => navigate('/login')}
            className="mt-5 rounded-lg bg-minion-blue px-6 py-2 font-semibold text-white transition hover:bg-minion-blue-light"
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-linear-to-r from-minion-blue to-minion-blue-light py-8 px-4 shadow-lg">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-4xl font-bold text-white">Notification Center</h1>
          <p className="mt-2 text-lg text-blue-100">
            Review your latest action updates across registration, tasks, acceptance, and completion.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-700">
            Total: <span className="font-bold">{history.length}</span> notifications
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={markAllAsRead}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
            >
              Mark All Read
            </button>
            <button
              onClick={clearHistory}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
            >
              Clear History
            </button>
          </div>
        </div>

        {history.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-gray-300 bg-white p-12 text-center shadow-sm">
            <div className="text-5xl text-gray-300">🔔</div>
            <p className="mt-3 text-lg font-semibold text-gray-700">No notifications yet</p>
            <p className="mt-2 text-sm text-gray-500">Action feedback will appear here once you start using the app.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((item) => (
              <div
                key={item.id}
                className={`rounded-xl border p-4 shadow-sm ${typeStyleMap[item.type] || typeStyleMap.info}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold">{item.title || 'Update'}</p>
                    <p className="mt-1 text-sm">{item.message}</p>
                    <p className="mt-2 text-xs opacity-80">
                      {item.createdAt ? new Date(item.createdAt).toLocaleString() : 'Recently'}
                    </p>
                  </div>
                  {!item.readAt && (
                    <button
                      onClick={() => markAsRead(item.id)}
                      className="rounded-md border border-white/70 bg-white/70 px-3 py-1 text-xs font-semibold transition hover:bg-white"
                    >
                      Mark Read
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Notifications;
