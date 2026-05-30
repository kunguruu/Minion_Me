import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export const clearAuthStorage = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  localStorage.removeItem('isAuthenticated');
};

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - clear local session traces
      clearAuthStorage();

      // Allow callers (like auth bootstrap) to skip redirect on expected checks
      if (!error.config?.skipAuthRedirect) {
        window.location.href = '/login';
      }
    }
    const message = error.response?.data?.message || error.message || 'An error occurred';
    console.error('API Error:', message);
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  verifyEmail: (token) => api.get(`/auth/verify-email?token=${encodeURIComponent(token)}`),
  resendVerification: (email) => api.post('/auth/resend-verification', { email }),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post('/auth/reset-password', { token, password }),
  getCurrentUser: (config = {}) => api.get('/auth/me', config),
  updateProfile: (profileData) => api.put('/auth/profile', profileData),
  updateClientProfile: (profileData) => api.put('/auth/profile', profileData),
  getMinions: () => api.get('/auth/minions'),
  getMinionById: (id) => api.get(`/auth/minions/${id}`),
};

// Tasks API
export const tasksAPI = {
  getAll: () => api.get('/tasks'),
  getById: (id) => api.get(`/tasks/${id}`),
  create: (taskData) => api.post('/tasks', taskData),
  update: (id, taskData) => api.put(`/tasks/${id}`, taskData),
  delete: (id) => api.delete(`/tasks/${id}`),
  updateStatus: (taskId, status) =>
    api.put(`/assignments/task/${taskId}/status`, { status }),
};

// Assignments API
export const assignmentsAPI = {
  apply: (taskId, message) =>
    api.post(`/assignments/apply/${taskId}`, { message }),
  accept: (applicationId) =>
    api.post(`/assignments/accept/${applicationId}`, {}),
  getTaskApplications: (taskId) => 
    api.get(`/assignments/task/${taskId}`),
  getMinionApplications: (minionId) => 
    api.get(`/assignments/minion/${minionId}`),
};

// Payments API
export const paymentsAPI = {
  initiateStkPush: (taskId) => api.post(`/payments/stk-push/${taskId}`),
  recordPayment: (taskId) => api.post(`/payments/record/${taskId}`),
  getTaskPayment: (taskId) => api.get(`/payments/task/${taskId}`),
  getMinionEarnings: () => api.get('/payments/minion/earnings'),
};

export const disputesAPI = {
  getTaskDisputes: (taskId) => api.get(`/disputes/task/${taskId}`),
  create: (taskId, disputeData) => api.post(`/disputes/task/${taskId}`, disputeData),
  getAdminDisputes: () => api.get('/disputes/admin'),
  updateAdminDispute: (disputeId, disputeData) => api.put(`/disputes/${disputeId}/admin`, disputeData),
};

// Ratings API
export const ratingsAPI = {
  rateTask: (taskId, rating) => api.post(`/ratings/task/${taskId}`, { rating }),
  getMyRatings: () => api.get('/ratings/my'),
};

// Admin API
export const adminAPI = {
  getOverview: () => api.get('/admin/overview'),
  getUsers: () => api.get('/admin/users'),
  verifyUser: (userId) => api.patch(`/admin/users/${userId}/verify`),
  unverifyUser: (userId) => api.patch(`/admin/users/${userId}/unverify`),
  deactivateUser: (userId) => api.patch(`/admin/users/${userId}/deactivate`),
  reactivateUser: (userId) => api.patch(`/admin/users/${userId}/reactivate`),
  deleteUser: (userId) => api.delete(`/admin/users/${userId}`),
  getTasks: () => api.get('/admin/tasks'),
  getPayments: () => api.get('/admin/payments'),
  getTaskById: (taskId) => api.get(`/admin/tasks/${taskId}`),
  getTaskAudit: (taskId) => api.get(`/admin/tasks/${taskId}/audit`),
  updateTask: (taskId, taskData) => api.put(`/admin/tasks/${taskId}`, taskData),
};

export const notificationsAPI = {
  getAll: () => api.get('/notifications'),
  markRead: (notificationId) => api.post(`/notifications/${notificationId}/read`),
  markAllRead: () => api.post('/notifications/read-all'),
  clearAll: () => api.delete('/notifications')
};

export const safariAPI = {
  discover: (preferences) => api.post('/safari/discover', preferences),
  getActivity: (activityId, params = {}) => api.get(`/safari/activity/${activityId}`, { params }),
  getMeta: () => api.get('/safari/meta'),
};

// Health check
export const checkHealth = () => api.get('/health');

export default api;
