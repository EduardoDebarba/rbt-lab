import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import api from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('rbt_lab_token'));
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('rbt_lab_user');
    return raw ? JSON.parse(raw) : null;
  });

  useEffect(() => {
    api.get('/health').catch(() => {});
  }, []);

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
    localStorage.setItem('rbt_lab_token', data.token);
    localStorage.setItem('rbt_lab_user', JSON.stringify(data.usuario));
    setToken(data.token);
    setUser(data.usuario);
  }

  function logout() {
    localStorage.removeItem('rbt_lab_token');
    localStorage.removeItem('rbt_lab_user');
    setToken(null);
    setUser(null);
  }

  function updateUser(nextUser) {
    localStorage.setItem('rbt_lab_user', JSON.stringify(nextUser));
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
