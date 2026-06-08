import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, getToken, setToken } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session on load if a token is present.
  useEffect(() => {
    let cancelled = false;
    async function restore() {
      if (!getToken()) { setLoading(false); return; }
      try {
        const me = await api.get('/auth/me');
        if (!cancelled) setUser(me);
      } catch {
        setToken(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    restore();
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await api.post('/auth/login', { email, password });
    setToken(data.access_token);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (token, email, password, displayName) => {
    const data = await api.post('/auth/register', {
      token, email, password, display_name: displayName || null,
    });
    setToken(data.access_token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  // Patch the current user's profile (e.g. default tee gender). Optimistic so
  // toggles feel instant; reconciles with the server's response on success.
  const updateProfile = useCallback(async (patch) => {
    setUser(prev => (prev ? { ...prev, ...patch } : prev));
    const saved = await api.put('/auth/me', patch);
    setUser(saved);
    return saved;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
