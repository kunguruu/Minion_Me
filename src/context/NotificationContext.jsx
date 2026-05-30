import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import NotificationContext from './notificationContextStore';
import { useAuth } from './useAuth';
import { notificationsAPI } from '../services/api';

const HISTORY_STORAGE_PREFIX = 'minion_me_notifications_v1';

const buildHistoryKey = (userId) => `${HISTORY_STORAGE_PREFIX}_${userId}`;

const getUserIdFromStorage = () => {
  try {
    const rawUser = localStorage.getItem('user');
    if (!rawUser) {
      return null;
    }

    const parsedUser = JSON.parse(rawUser);
    return parsedUser?.id || null;
  } catch {
    return null;
  }
};

export function NotificationProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [historyByKey, setHistoryByKey] = useState({});
  const [serverHistory, setServerHistory] = useState([]);
  const hasLoadedServerHistoryRef = useRef(false);
  const seenServerNotificationIdsRef = useRef(new Set());

  const currentUserId = user?.id || getUserIdFromStorage();
  const canPersist = isAuthenticated && Boolean(currentUserId);
  const historyKey = canPersist ? buildHistoryKey(currentUserId) : null;

  const localHistory = useMemo(() => {
    if (!historyKey) {
      return [];
    }

    if (Array.isArray(historyByKey[historyKey])) {
      return historyByKey[historyKey];
    }

    try {
      const storedHistory = localStorage.getItem(historyKey);
      const parsedHistory = storedHistory ? JSON.parse(storedHistory) : [];
      return Array.isArray(parsedHistory) ? parsedHistory : [];
    } catch {
      return [];
    }
  }, [historyByKey, historyKey]);

  const history = useMemo(() => {
    const merged = [...serverHistory, ...localHistory];
    return merged
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 300);
  }, [localHistory, serverHistory]);

  useEffect(() => {
    if (!historyKey) {
      return;
    }

    localStorage.setItem(historyKey, JSON.stringify(localHistory));
  }, [localHistory, historyKey]);

  const dismissNotification = useCallback((id) => {
    setNotifications((current) => current.filter((notification) => notification.id !== id));
  }, []);

  const notify = useCallback(({ type = 'info', title = '', message = '', duration = 4000 }) => {
    const timestamp = new Date().toISOString();
    const id = `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const nextNotification = {
      id,
      source: 'local',
      type,
      title,
      message,
      createdAt: timestamp
    };

    setNotifications((current) => [
      ...current,
      nextNotification
    ]);

    if (canPersist) {
      setHistoryByKey((current) => {
        const currentForKey = Array.isArray(current[historyKey]) ? current[historyKey] : localHistory;
        return {
          ...current,
          [historyKey]: [nextNotification, ...currentForKey].slice(0, 300)
        };
      });
    }

    if (duration > 0) {
      window.setTimeout(() => {
        setNotifications((current) => current.filter((notification) => notification.id !== id));
      }, duration);
    }

    return id;
  }, [canPersist, historyKey, localHistory]);

  const syncServerNotifications = useCallback(async () => {
    if (!canPersist) {
      setServerHistory([]);
      hasLoadedServerHistoryRef.current = false;
      seenServerNotificationIdsRef.current = new Set();
      return;
    }

    try {
      const response = await notificationsAPI.getAll();
      const nextServerHistory = (response.data || []).map((item) => ({
        id: `server-${item.id}`,
        serverId: item.id,
        source: 'server',
        type: item.type || 'info',
        title: item.title || '',
        message: item.message || '',
        metadata: item.metadata || null,
        createdAt: item.created_at,
        readAt: item.read_at || null
      }));

      if (!hasLoadedServerHistoryRef.current) {
        seenServerNotificationIdsRef.current = new Set(nextServerHistory.map((item) => item.id));
        hasLoadedServerHistoryRef.current = true;
      } else {
        nextServerHistory.forEach((item) => {
          if (!seenServerNotificationIdsRef.current.has(item.id)) {
            seenServerNotificationIdsRef.current.add(item.id);
            setNotifications((current) => [
              ...current,
              {
                id: item.id,
                type: item.type,
                title: item.title,
                message: item.message,
                createdAt: item.createdAt
              }
            ]);
          }
        });
      }

      setServerHistory(nextServerHistory);
    } catch (error) {
      console.error('Failed to sync notifications:', error);
    }
  }, [canPersist]);

  useEffect(() => {
    const initialSyncTimeout = window.setTimeout(() => {
      syncServerNotifications();
    }, 0);

    if (!canPersist) {
      return () => window.clearTimeout(initialSyncTimeout);
    }

    const intervalId = window.setInterval(syncServerNotifications, 30000);
    return () => {
      window.clearTimeout(initialSyncTimeout);
      window.clearInterval(intervalId);
    };
  }, [canPersist, syncServerNotifications]);

  const markAsRead = useCallback((id) => {
    if (String(id).startsWith('server-')) {
      const serverId = Number(String(id).replace('server-', ''));
      notificationsAPI.markRead(serverId).catch((error) => {
        console.error('Failed to mark notification as read:', error);
      });
      setServerHistory((current) => current.map((item) => (
        item.id === id ? { ...item, readAt: item.readAt || new Date().toISOString() } : item
      )));
      return;
    }

    if (!historyKey) {
      return;
    }

    setHistoryByKey((current) => {
      const currentForKey = Array.isArray(current[historyKey]) ? current[historyKey] : localHistory;
      return {
        ...current,
        [historyKey]: currentForKey.map((item) => (
          item.id === id ? { ...item, readAt: item.readAt || new Date().toISOString() } : item
        ))
      };
    });
  }, [historyKey, localHistory]);

  const markAllAsRead = useCallback(() => {
    const timestamp = new Date().toISOString();

    if (canPersist) {
      notificationsAPI.markAllRead().catch((error) => {
        console.error('Failed to mark all notifications as read:', error);
      });
      setServerHistory((current) => current.map((item) => (
        item.readAt ? item : { ...item, readAt: timestamp }
      )));
    }

    if (!historyKey) {
      return;
    }

    setHistoryByKey((current) => {
      const currentForKey = Array.isArray(current[historyKey]) ? current[historyKey] : localHistory;
      return {
        ...current,
        [historyKey]: currentForKey.map((item) => (
          item.readAt ? item : { ...item, readAt: timestamp }
        ))
      };
    });
  }, [canPersist, historyKey, localHistory]);

  const clearHistory = useCallback(() => {
    if (canPersist) {
      notificationsAPI.clearAll().catch((error) => {
        console.error('Failed to clear notifications:', error);
      });
      setServerHistory([]);
      seenServerNotificationIdsRef.current = new Set();
    }

    if (!historyKey) {
      return;
    }

    setHistoryByKey((current) => ({
      ...current,
      [historyKey]: []
    }));
  }, [canPersist, historyKey]);

  const unreadCount = history.filter((item) => !item.readAt).length;

  const value = useMemo(() => ({
    notify,
    dismissNotification,
    history,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearHistory
  }), [notify, dismissNotification, history, unreadCount, markAsRead, markAllAsRead, clearHistory]);

  const getStyles = (type) => {
    if (type === 'success') {
      return {
        container: 'border-emerald-300 bg-emerald-50 text-emerald-900',
        icon: '✓'
      };
    }

    if (type === 'error') {
      return {
        container: 'border-red-300 bg-red-50 text-red-900',
        icon: '!'
      };
    }

    return {
      container: 'border-blue-300 bg-blue-50 text-blue-900',
      icon: 'i'
    };
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[92vw] max-w-sm flex-col gap-3">
        {notifications.map((notification) => {
          const styles = getStyles(notification.type);

          return (
            <div
              key={notification.id}
              className={`pointer-events-auto rounded-xl border px-4 py-3 shadow-lg ${styles.container}`}
              role="status"
              aria-live="polite"
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/80 text-xs font-bold">
                  {styles.icon}
                </span>
                <div className="min-w-0 flex-1">
                  {notification.title ? (
                    <p className="text-sm font-bold">{notification.title}</p>
                  ) : null}
                  <p className="text-sm">{notification.message}</p>
                </div>
                <button
                  type="button"
                  className="rounded px-1 text-sm font-bold opacity-70 transition hover:opacity-100"
                  onClick={() => dismissNotification(notification.id)}
                  aria-label="Dismiss notification"
                >
                  ×
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </NotificationContext.Provider>
  );
}
