import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/authStore';

const api = axios.create({
  baseURL: 'https://depms-backend.onrender.com/api/v1',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Token interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('depms_token');
  if (token) config.headers.Authorization = 'Bearer ' + token;
  return config;
});

// Request interceptor
api.interceptors.request.use((config) => config, Promise.reject);

// Response interceptor — handle 401 refresh
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve()));
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => api(original)).catch(Promise.reject);
      }

      original._retry = true;
      isRefreshing = true;

      try {
        await axios.post('/api/v1/auth/refresh', {}, { withCredentials: true });
        processQueue(null);
        return api(original);
      } catch (err) {
        processQueue(err);
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    const msg = error.response?.data?.message || 'Something went wrong.';
    if (error.response?.status !== 401) toast.error(msg);

    return Promise.reject(error);
  }
);

// ── API functions ─────────────────────────────────────

// Auth
export const authApi = {
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  changePassword: (data) => api.put('/auth/change-password', data),
};

// Dashboard
export const dashboardApi = {
  employee: () => api.get('/dashboard/employee'),
  leader: () => api.get('/dashboard/leader'),
  admin: () => api.get('/dashboard/admin'),
};

// Entries
export const entryApi = {
  today: () => api.get('/entries/today'),
  todayFor: (userId) => api.get(`/entries/today/${userId}`),
  updateFirstHalf: (data) => api.patch('/entries/first-half', data),
  updateSecondHalf: (data) => api.patch('/entries/second-half', data),
  submit: (data) => api.post('/entries/submit', data),
  history: (params) => api.get('/entries/history', { params }),
  historyFor: (userId, params) => api.get(`/entries/history/${userId}`, { params }),
};

// Targets
export const targetApi = {
  list: (params) => api.get('/targets', { params }),
  create: (data) => api.post('/targets', data),
  update: (id, data) => api.put(`/targets/${id}`, data),
  bulkTeam: (data) => api.post('/targets/bulk-team', data),
  progress: (userId, params) => api.get(`/targets/progress/${userId}`, { params }),
};

// Users
export const userApi = {
  list: (params) => api.get('/users', { params }),
  get: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  resetPassword: (id, data) => api.post(`/users/${id}/reset-password`, data),
};

// Teams
export const teamApi = {
  list: () => api.get('/teams'),
  get: (id) => api.get(`/teams/${id}`),
  create: (data) => api.post('/teams', data),
  update: (id, data) => api.put(`/teams/${id}`, data),
  assign: (teamId, userId) => api.post(`/teams/${teamId}/assign`, { user_id: userId }),
};

// Reports
export const reportApi = {
  daily: (params) => api.get('/reports/daily', { params }),
  monthly: (params) => api.get('/reports/monthly', { params }),
  exportExcel: (params) => api.get('/reports/export/excel', { params, responseType: 'blob' }),
  exportPDF: (params) => api.get('/reports/export/pdf', { params, responseType: 'blob' }),
};

// Notifications
export const notifApi = {
  list: () => api.get('/notifications'),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
};

// Audit logs
export const auditApi = {
  list: (params) => api.get('/audit-logs', { params }),
};

export default api;
