'use client';
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import Cookies from 'js-cookie';
import axios from 'axios';
import { authApi } from './api';

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: string;
  tenant_id: string;
  tenant_name: string;
  date_joined: string;
  is_active: boolean;
  is_email_verified: boolean;
  phone_number: string;
  is_phone_verified: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  loginWithGoogle: (credential: string, businessName?: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | null>(null);

/** Parse JWT exp claim without a library (base64url decode of payload). */
function getTokenExpiry(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

/** Refresh interval: 5 minutes before expiry (in ms). Minimum 30 seconds. */
const REFRESH_BUFFER_MS = 5 * 60 * 1000;
const MIN_REFRESH_MS = 30 * 1000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Schedule a silent token refresh based on current access token expiry. */
  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    const token = Cookies.get('access_token');
    if (!token) return;
    const exp = getTokenExpiry(token);
    if (!exp) return;
    const nowSec = Math.floor(Date.now() / 1000);
    const msUntilExpiry = (exp - nowSec) * 1000;
    const delay = Math.max(msUntilExpiry - REFRESH_BUFFER_MS, MIN_REFRESH_MS);
    refreshTimerRef.current = setTimeout(async () => {
      const refresh = Cookies.get('refresh_token');
      if (!refresh) return;
      try {
        const { data } = await axios.post('/api/v1/auth/refresh/', { refresh_token: refresh });
        const isProd = typeof window !== 'undefined' && window.location.protocol === 'https:';
        Cookies.set('access_token', data.access_token, { expires: 1 / 24, secure: isProd, sameSite: 'strict' });
        scheduleRefresh(); // Re-schedule for the new token
      } catch {
        // Refresh failed — 401 interceptor in api.ts will handle on next request
      }
    }, delay);
  }, []);

  const fetchUser = useCallback(async (): Promise<User | null> => {
    const token = Cookies.get('access_token');
    if (!token) { setLoading(false); return null; }
    try {
      const { data } = await authApi.me();
      setUser(data);
      return data;
    } catch {
      Cookies.remove('access_token');
      Cookies.remove('refresh_token');
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
    scheduleRefresh();
    return () => { if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current); };
  }, [fetchUser, scheduleRefresh]);

  const login = async (email: string, password: string): Promise<User> => {
    const { data } = await authApi.login(email, password);
    const isProd = window.location.protocol === 'https:';
    Cookies.set('access_token', data.access_token, { expires: 1/24, secure: isProd, sameSite: 'strict' });
    Cookies.set('refresh_token', data.refresh_token, { expires: 7, secure: isProd, sameSite: 'strict' });
    scheduleRefresh();
    const userData = await fetchUser();
    if (!userData) throw new Error("Login falló al obtener perfil de usuario");
    return userData;
  };

  const loginWithGoogle = async (credential: string, businessName?: string): Promise<User> => {
    const { data } = await authApi.googleLogin(credential, businessName);
    const isProd = window.location.protocol === 'https:';
    Cookies.set('access_token', data.access_token, { expires: 1/24, secure: isProd, sameSite: 'strict' });
    Cookies.set('refresh_token', data.refresh_token, { expires: 7, secure: isProd, sameSite: 'strict' });
    scheduleRefresh();
    const userData = await fetchUser();
    if (!userData) throw new Error("Login con Google falló al obtener perfil de usuario");
    return userData;
  };

  const logout = async () => {
    try { await authApi.logout(); } catch {}
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    Cookies.remove('access_token');
    Cookies.remove('refresh_token');
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithGoogle, logout, refreshUser: fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
