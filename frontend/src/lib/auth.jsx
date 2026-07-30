import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import api from './api';

const AuthContext = createContext(null);
const TOKEN_KEY = 'rbt_lab_token';
const USER_KEY = 'rbt_lab_user';
const SESSION_EXPIRES_KEY = 'rbt_lab_session_expires_at';
const SESSION_DURATION_MS = 10 * 60 * 60 * 1000;

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    if (isSessionExpired()) {
      clearStoredSession();
      return null;
    }

    return localStorage.getItem(TOKEN_KEY);
  });
  const [user, setUser] = useState(() => {
    if (isSessionExpired()) {
      clearStoredSession();
      return null;
    }

    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  });

  useEffect(() => {
    api.get('/health').catch(() => {});
  }, []);

  useEffect(() => {
    if (!token) return undefined;

    const expiresAt = Number(localStorage.getItem(SESSION_EXPIRES_KEY));
    const remaining = expiresAt - Date.now();

    if (!Number.isFinite(expiresAt) || remaining <= 0) {
      logout();
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      logout();
      window.location.assign('/login');
    }, remaining);

    return () => window.clearTimeout(timeout);
  }, [token]);

  async function login(credentials) {
    const { data } = await api.post('/auth/login', credentials);
    saveSession(data);
    return data;
  }

  async function register(payload) {
    const { data } = await api.post('/auth/register', payload);
    saveSession(data);
    return data;
  }

  function saveSession(data) {
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.usuario));
    localStorage.setItem(SESSION_EXPIRES_KEY, String(Date.now() + SESSION_DURATION_MS));
    setToken(data.token);
    setUser(data.usuario);
  }

  function logout() {
    clearStoredSession();
    setToken(null);
    setUser(null);
  }

  function updateUser(nextUser) {
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
  }

  const value = useMemo(
    () => ({
      token,
      user,
      login,
      register,
      updateUser,
      logout
    }),
    [token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider.');
  }

  return context;
}

function isSessionExpired() {
  const expiresAt = Number(localStorage.getItem(SESSION_EXPIRES_KEY));
  return Number.isFinite(expiresAt) && expiresAt <= Date.now();
}

function clearStoredSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(SESSION_EXPIRES_KEY);
}
