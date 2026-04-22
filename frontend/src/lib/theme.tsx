'use client';
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

/**
 * Theme modes:
 *  - 'light' / 'dark' — user-selected explicit preference
 *  - 'system' — follow OS / browser prefers-color-scheme
 */
type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeCtx {
  /** The actual resolved theme applied to the DOM (always 'light' or 'dark'). */
  theme: 'light' | 'dark';
  /** The user's preference (may be 'system'). */
  mode: ThemeMode;
  /** Set preference. Persists to localStorage. */
  setMode: (m: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeCtx>({
  theme: 'light',
  mode: 'system',
  setMode: () => {},
});

const STORAGE_KEY = 'loyallia-theme';

function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  }
  return mode;
}

function applyClass(theme: 'light' | 'dark') {
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(theme);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  /* Initialise from localStorage on mount */
  useEffect(() => {
    const saved = (localStorage.getItem(STORAGE_KEY) as ThemeMode) || 'system';
    setModeState(saved);
    const resolved = resolveTheme(saved);
    setTheme(resolved);
    applyClass(resolved);
  }, []);

  /* Listen to OS preference changes when mode = 'system' */
  useEffect(() => {
    if (mode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      const newTheme = e.matches ? 'dark' : 'light';
      setTheme(newTheme);
      applyClass(newTheme);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [mode]);

  const setMode = useCallback((m: ThemeMode) => {
    localStorage.setItem(STORAGE_KEY, m);
    setModeState(m);
    const resolved = resolveTheme(m);
    setTheme(resolved);
    applyClass(resolved);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, mode, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
