'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import Cookies from 'js-cookie';
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => { fetchUser(); }, [fetchUser]);

  const login = async (email: string, password: string): Promise<User> => {
    const { data } = await authApi.login(email, password);
    const isProd = window.location.protocol === 'https:';
    Cookies.set('access_token', data.access_token, { expires: 1/24, secure: isProd, sameSite: 'strict' });
    Cookies.set('refresh_token', data.refresh_token, { expires: 7, secure: isProd, sameSite: 'strict' });
    const userData = await fetchUser();
    if (!userData) throw new Error("Login falló al obtener perfil de usuario");
    return userData;
  };

  const loginWithGoogle = async (credential: string, businessName?: string): Promise<User> => {
    const { data } = await authApi.googleLogin(credential, businessName);
    const isProd = window.location.protocol === 'https:';
    Cookies.set('access_token', data.access_token, { expires: 1/24, secure: isProd, sameSite: 'strict' });
    Cookies.set('refresh_token', data.refresh_token, { expires: 7, secure: isProd, sameSite: 'strict' });
    const userData = await fetchUser();
    if (!userData) throw new Error("Login con Google falló al obtener perfil de usuario");
    return userData;
  };

  const logout = async () => {
    try { await authApi.logout(); } catch {}
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
