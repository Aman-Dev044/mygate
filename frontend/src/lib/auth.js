'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { io } from 'socket.io-client';
import api, { API_URL } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);
  const [unread, setUnread] = useState(0);
  const socketRef = useRef(null);
  const listeners = useRef(new Set()); // pages subscribe to realtime events

  const toast = useCallback((message, kind = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
  }, []);

  const refreshUnread = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications?unread=1');
      setUnread(data.unreadCount);
    } catch (_) {}
  }, []);

  // restore session
  useEffect(() => {
    const token = localStorage.getItem('mg_token');
    const saved = localStorage.getItem('mg_user');
    if (token && saved) {
      setUser(JSON.parse(saved));
      api.get('/auth/me').then(({ data }) => setUser((u) => ({ ...u, ...data.user }))).catch(() => {});
    }
    setLoading(false);
  }, []);

  // socket connection whenever we have a user
  useEffect(() => {
    const token = localStorage.getItem('mg_token');
    if (!user || !token) return undefined;
    refreshUnread();
    const socket = io(API_URL, { auth: { token } });
    socketRef.current = socket;
    socket.on('notification', (n) => {
      toast(`${n.title}: ${n.message}`, n.type === 'visitor' ? 'visitor' : 'info');
      setUnread((c) => c + 1);
      listeners.current.forEach((fn) => fn('notification', n));
    });
    socket.on('visitor:response', (v) => {
      toast(`Flat ${v.flatNo} ${v.status} ${v.name}`, v.status === 'approved' ? 'success' : 'error');
      listeners.current.forEach((fn) => fn('visitor:response', v));
    });
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  const subscribe = useCallback((fn) => {
    listeners.current.add(fn);
    return () => listeners.current.delete(fn);
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('mg_token', data.token);
    localStorage.setItem('mg_user', JSON.stringify(data.user));
    setUser(data.user);
    router.push('/dashboard');
  };

  const register = async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    localStorage.setItem('mg_token', data.token);
    localStorage.setItem('mg_user', JSON.stringify(data.user));
    setUser(data.user);
    router.push('/dashboard');
  };

  const logout = () => {
    localStorage.removeItem('mg_token');
    localStorage.removeItem('mg_user');
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, toast, subscribe, unread, setUnread, refreshUnread }}>
      {children}
      {/* toast stack */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`rounded-lg px-4 py-3 text-sm shadow-lg text-white ${
              t.kind === 'error' ? 'bg-red-600' : t.kind === 'success' ? 'bg-emerald-600' : t.kind === 'visitor' ? 'bg-amber-600' : 'bg-slate-800'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
