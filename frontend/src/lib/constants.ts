/** Build a QR code image URL via a configurable service (no hardcoded fallback) */
export function getQrUrl(text: string, size: number = APP_CONFIG.QR_CODE_SIZE): string {
  const base = process.env.NEXT_PUBLIC_QR_SERVICE_URL || '';
  if (!base) {
    return `https://api.qrserver.com/v1/create-qr-code/?text=${encodeURIComponent(text)}&size=${size}x${size}&margin=2&color=1a1a2e&bgcolor=ffffff&ecc=M`;
  }
  return `${base}/qr?text=${encodeURIComponent(text)}&size=${size}&margin=2&dark=1a1a2e&light=ffffff&ecLevel=M&format=png`;
}

/** Build a WhatsApp share link via a configurable base URL (no hardcoded fallback) */
export function getWhatsAppShareUrl(text: string): string {
  const base = process.env.NEXT_PUBLIC_WHATSAPP_SHARE_URL || '';
  if (!base) {
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  }
  return `${base}/?text=${encodeURIComponent(text)}`;
}

/** Nominatim geocoding base URLs (configurable, no hardcoded fallback) */
export const NOMINATIM_URL = process.env.NEXT_PUBLIC_NOMINATIM_URL || '';
export const NOMINATIM_REVERSE_URL = process.env.NEXT_PUBLIC_NOMINATIM_REVERSE_URL || '';

/** Leaflet icon CDN prefix (configurable, no hardcoded fallback) */
export const LEAFLET_ICON_URL = process.env.NEXT_PUBLIC_LEAFLET_ICON_URL || '';

/**
 * Environment variables REQUIRED for map features (LocationPicker / LocationMap).
 * When any is missing the map components must render a clear configuration
 * notice instead of silently doing nothing (empty search results / invisible
 * marker icons).
 */
export const MAPS_REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_NOMINATIM_URL',
  'NEXT_PUBLIC_NOMINATIM_REVERSE_URL',
  'NEXT_PUBLIC_LEAFLET_ICON_URL',
] as const;

/**
 * @description Validate the map environment variables.
 * @param {Record<string, string | undefined>} [env=process.env] - Environment to validate
 * @returns {string | null} Spanish, user-facing error message, or null when configured
 */
export function getMapsConfigError(env: Record<string, string | undefined> = process.env): string | null {
  const missing = MAPS_REQUIRED_ENV_VARS.filter((key) => !env[key]);
  if (missing.length === 0) return null;
  return `Configuración de mapas incompleta. Falta definir: ${missing.join(', ')}. El mapa no estará disponible hasta configurar estas variables de entorno.`;
}

/** Validated at module load so misconfiguration is visible immediately. */
export const MAPS_CONFIG_ERROR = getMapsConfigError();

/**
 * @description Build the Nominatim forward-geocoding (search) URL.
 * @param {string} base - Configured Nominatim base URL
 * @param {string} query - Address query
 * @param {number} [limit=5] - Max results
 * @returns {string} Absolute search URL
 */
export function buildNominatimSearchUrl(base: string, query: string, limit = 5): string {
  return `${base}?format=json&q=${encodeURIComponent(query)}&countrycodes=ec&limit=${limit}`;
}

/**
 * @description Build the Nominatim reverse-geocoding URL.
 * @param {string} base - Configured Nominatim reverse URL
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {string} Absolute reverse URL
 */
export function buildNominatimReverseUrl(base: string, lat: number, lng: number): string {
  return `${base}?format=json&lat=${lat}&lon=${lng}&zoom=18`;
}

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

