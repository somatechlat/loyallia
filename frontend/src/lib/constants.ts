export const COOKIE_CONFIG = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  ACCESS_TOKEN_EXPIRY: 1/24, // 1 hour
  REFRESH_TOKEN_EXPIRY: 7, // 7 days
  SAME_SITE: 'strict' as const,
} as const;

export const API_CONFIG = {
  // LYL-H-FE-007: Use environment variable, no hardcoded fallback
  BASE_URL: typeof window !== 'undefined' ? '' : (process.env.NEXT_PUBLIC_API_URL || ''),
  TIMEOUT: 30000,
} as const;

/** Build a QR code image URL via a configurable service (no hardcoded fallback) */
export function getQrUrl(text: string, size: number = APP_CONFIG.QR_CODE_SIZE): string {
  const base = process.env.NEXT_PUBLIC_QR_SERVICE_URL || '';
  if (!base) {
    throw new Error('NEXT_PUBLIC_QR_SERVICE_URL is not configured');
  }
  return `${base}/qr?text=${encodeURIComponent(text)}&size=${size}&margin=2&dark=1a1a2e&light=ffffff&ecLevel=M&format=png`;
}

/** Build a WhatsApp share link via a configurable base URL (no hardcoded fallback) */
export function getWhatsAppShareUrl(text: string): string {
  const base = process.env.NEXT_PUBLIC_WHATSAPP_SHARE_URL || '';
  if (!base) {
    throw new Error('NEXT_PUBLIC_WHATSAPP_SHARE_URL is not configured');
  }
  return `${base}/?text=${encodeURIComponent(text)}`;
}

/** Nominatim geocoding base URLs (configurable, no hardcoded fallback) */
export const NOMINATIM_URL = process.env.NEXT_PUBLIC_NOMINATIM_URL || '';
export const NOMINATIM_REVERSE_URL = process.env.NEXT_PUBLIC_NOMINATIM_REVERSE_URL || '';

/** Leaflet icon CDN prefix (configurable, no hardcoded fallback) */
export const LEAFLET_ICON_URL = process.env.NEXT_PUBLIC_LEAFLET_ICON_URL || '';

/** App-wide numeric constants to replace magic numbers */
export const APP_CONFIG = {
  /** QR code image size in pixels */
  QR_CODE_SIZE: 280,
  /** Default automation cooldown in hours */
  DEFAULT_COOLDOWN_HOURS: 24,
  /** Long-running operation timeout (export/delete) in ms */
  LONG_OPERATION_TIMEOUT: 120_000,
  /** Toast notification duration in ms */
  TOAST_DURATION: 4000,
  /** Impersonation session max duration in ms (1 hour) */
  MAX_IMPERSONATION_MS: 60 * 60 * 1000,
  /** Sidebar nav polling interval in ms */
  NAV_POLL_INTERVAL_MS: 30000,
  /** Token refresh buffer before expiry in ms (5 minutes) */
  TOKEN_REFRESH_BUFFER_MS: 5 * 60 * 1000,
  /** Minimum token refresh interval in ms (30 seconds) */
  MIN_REFRESH_INTERVAL_MS: 30 * 1000,
  /** Focus restoration delay after modal close in ms */
  FOCUS_RESTORE_DELAY_MS: 50,
  /** Modal focus trap initial delay in ms */
  MODAL_FOCUS_DELAY_MS: 100,
  /** Page size for paginated lists */
  PAGE_SIZE: 20,
} as const;

/** Human-readable role labels for UI display */
export const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Propietario',
  MANAGER: 'Gerente',
  STAFF: 'Personal',
  SUPER_ADMIN: 'Super Admin',
} as const;
