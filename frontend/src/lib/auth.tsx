'use client';
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import Cookies from 'js-cookie';
import { authApi } from './api';
import { tokenManager } from './token-manager';
import type { User } from '@/types';

export type { User } from '@/types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  loginWithGoogle: (credential: string, businessName?: string, isLoginOnly?: boolean) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const isInitialLoad = useRef(true);

  const fetchUser = useCallback(async (): Promise<User | null> => {
    const token = Cookies.get('access_token');
    if (!token) {
      if (isInitialLoad.current) { setLoading(false); isInitialLoad.current = false; }
      return null;
    }
    try {
      const { data } = await authApi.me();
      setUser(data);
      return data;
    } catch {
      tokenManager.clearTokens();
      setUser(null);
      return null;
    } finally {
      if (isInitialLoad.current) { setLoading(false); isInitialLoad.current = false; }
    }
  }, []);

  useEffect(() => {
    fetchUser();
    tokenManager.scheduleRefresh();
    return () => { tokenManager.cleanup(); };
  }, [fetchUser]);

  const login = async (email: string, password: string): Promise<User> => {
    const { data } = await authApi.login(email, password);
    tokenManager.setTokens(data.access_token, data.refresh_token);
    const userData = await fetchUser();
    if (!userData) throw new Error("Login falló al obtener perfil de usuario");
    return userData;
  };

  const loginWithGoogle = async (credential: string, businessName?: string, isLoginOnly: boolean = false): Promise<User> => {
    const { data } = await authApi.googleLogin(credential, businessName, isLoginOnly);
    tokenManager.setTokens(data.access_token, data.refresh_token);
    const userData = await fetchUser();
    if (!userData) throw new Error("Login con Google falló al obtener perfil de usuario");
    return userData;
  };

  const logout = async () => {
    try { await authApi.logout(); } catch {}
    tokenManager.clearTokens();
    setUser(null);
    window.location.replace('/login');
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
