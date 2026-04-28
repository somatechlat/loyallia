/**
 * Loyallia — i18n Provider & Hook (REQ-I18N-001)
 * Client-side translation system for Next.js.
 * Supports ES, EN, FR, DE with nested key lookup.
 * Language resolution: user preference → tenant default → browser → 'es'
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

import de from "./locales/de.json";
import en from "./locales/en.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";

// ---- Types ----
export type SupportedLocale = "es" | "en" | "fr" | "de";

const LOCALES: Record<SupportedLocale, Record<string, unknown>> = {
  es,
  en,
  fr,
  de,
};

const LOCALE_NAMES: Record<SupportedLocale, string> = {
  es: "Español",
  en: "English",
  fr: "Français",
  de: "Deutsch",
};

const STORAGE_KEY = "loyallia_lang";
const DEFAULT_LOCALE: SupportedLocale = "es";

// ---- Nested key lookup ----
function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split(".");
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || current === undefined) return path;
    if (typeof current !== "object") return path;
    current = (current as Record<string, unknown>)[key];
  }

  return typeof current === "string" ? current : path;
}

// ---- Context ----
interface I18nContextValue {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  localeNames: Record<SupportedLocale, string>;
  supportedLocales: SupportedLocale[];
}

const I18nContext = createContext<I18nContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  t: (key: string) => key,
  localeNames: LOCALE_NAMES,
  supportedLocales: Object.keys(LOCALES) as SupportedLocale[],
});

// ---- Provider ----
export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY) as SupportedLocale | null;
      if (stored && LOCALES[stored]) return stored;
      const browserLang = navigator.language?.slice(0, 2).toLowerCase();
      if (browserLang && LOCALES[browserLang as SupportedLocale]) return browserLang as SupportedLocale;
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

// ---- Hook ----
export function useI18n() {
  return useContext(I18nContext);
}
