/**
 * React context & provider for Loyallia authentication state.
 *
 * Handles login (credentials & Google OAuth), logout, and automatic
 * user profile hydration on mount.
 *
 * @module auth
 */

'use client';
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import Cookies from 'js-cookie';
import { authApi } from './api';
import { tokenManager } from './token-manager';
import type { User } from '@/types';

export type { User } from '@/types';

/** Value exposed by {@link AuthContext}. */
interface AuthContextType {
  /** Currently authenticated user, or `null` if unauthenticated. */
  user: User | null;
  /** `true` while the initial user fetch is in progress. */
  loading: boolean;
  /** Log in with email and password. */
  login: (email: string, password: string) => Promise<User>;
  /** Log in with a Google OAuth credential. */
  loginWithGoogle: (credential: string, businessName?: string, isLoginOnly?: boolean) => Promise<User>;
  /** Clear tokens and log the user out. */
  logout: () => Promise<void>;
  /** Re-fetch the current user profile. */
  refreshUser: () => Promise<User | null>;
}

/** Props for the {@link AuthProvider} component. */
export interface AuthProviderProps {
  /** React tree to wrap. */
  children: React.ReactNode;
}

const AuthContext = createContext<AuthContextType | null>(null);

/**
 * Provides authentication state to the React tree.
 *
 * On mount it attempts to restore the session from the access token cookie,
 * and schedules proactive token refresh via {@link tokenManager}.
 */
export function AuthProvider({ children }: AuthProviderProps) {
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
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number } };
      // Only clear tokens on 401 Unauthorized, not on network errors or 5xx
      if (axiosErr?.response?.status === 401) {
        tokenManager.clearTokens();
      }
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

/**
 * Hook to access the authentication context.
 *
 * @throws {Error} If used outside of an {@link AuthProvider}.
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
