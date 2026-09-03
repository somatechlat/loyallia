/**
 * Loyallia — i18n Provider & Hook (REQ-I18N-001)
 * Client-side translation system for Next.js.
 * Supports ES (default) and EN with nested key lookup.
 * Language resolution: user preference → tenant default → 'es'
 */

"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import en from "./locales/en.json";
import es from "./locales/es.json";

// Types
export type SupportedLocale = "es" | "en";

const LOCALES: Record<SupportedLocale, Record<string, unknown>> = {
  es,
  en,
};

const LOCALE_NAMES: Record<SupportedLocale, string> = {
  es: "Español",
  en: "English",
};

const STORAGE_KEY = "loyallia_lang";
const DEFAULT_LOCALE: SupportedLocale = "es";

// Nested key lookup — supports both dot-notation flat keys and nested objects
export function getNestedValue(obj: Record<string, unknown>, path: string): string {
  // Prefer exact key match first (e.g. "auth.login.title" as a top-level key)
  const exact = obj[path];
  if (typeof exact === "string") return exact;

  const keys = path.split(".");
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || current === undefined) return path;
    if (typeof current !== "object") return path;
    current = (current as Record<string, unknown>)[key];
  }

  return typeof current === "string" ? current : path;
}

// Context
interface I18nContextValue {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  localeNames: Record<SupportedLocale, string>;
  supportedLocales: SupportedLocale[];
}

export const I18nContext = createContext<I18nContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  t: (key: string) => key,
  localeNames: LOCALE_NAMES,
  supportedLocales: Object.keys(LOCALES) as SupportedLocale[],
});

// Provider
/** Props for the {@link I18nProvider} component. */
export interface I18nProviderProps {
  /** React tree to wrap. */
  children: ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<SupportedLocale>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY) as SupportedLocale | null;
      if (stored && LOCALES[stored]) return stored;
      // Spanish is the mandatory default; browser language is NOT auto-detected.
      // Users change language explicitly via Settings.
    }
    return DEFAULT_LOCALE;
  });

  // Apply lang attribute on mount
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((newLocale: SupportedLocale) => {
    if (!LOCALES[newLocale]) return;
    setLocaleState(newLocale);
    localStorage.setItem(STORAGE_KEY, newLocale);
    document.documentElement.lang = newLocale;
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>): string => {
      // Try requested locale, fallback to Spanish
      let value = getNestedValue(
        LOCALES[locale] as Record<string, unknown>,
        key
      );
      if (value === key && locale !== DEFAULT_LOCALE) {
        value = getNestedValue(
          LOCALES[DEFAULT_LOCALE] as Record<string, unknown>,
          key
        );
      }

      // Interpolate variables: {days} → value
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          value = value.replace(`{${k}}`, String(v));
        }
      }

      return value;
    },
    [locale]
  );

  return (
    <I18nContext.Provider
      value={{
        locale,
        setLocale,
        t,
        localeNames: LOCALE_NAMES,
        supportedLocales: Object.keys(LOCALES) as SupportedLocale[],
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

// Hook
export function useI18n() {
  return useContext(I18nContext);
}
