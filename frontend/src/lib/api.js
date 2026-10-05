import axios from 'axios';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const api = axios.create({ baseURL: `${API_URL}/api` });

// attach JWT from localStorage on every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('mg_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// normalise error message
api.interceptors.response.use(
  (res) => res,
  (err) => {
    err.userMessage = err.response?.data?.message || err.message || 'Something went wrong';
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('mg_token');
      localStorage.removeItem('mg_user');
      if (!window.location.pathname.startsWith('/login')) window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-');
export const fmtTime = (d) => (d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '-');
export const fmtDateTime = (d) => (d ? `${fmtDate(d)} ${fmtTime(d)}` : '-');
export const money = (n) => `Rs ${Number(n || 0).toLocaleString('en-IN')}`;
export const todayStr = () => new Date().toISOString().slice(0, 10);
