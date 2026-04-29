/**
 * Standardized date formatting utilities using date-fns.
 * LYL-M-FE-023: Consistent date formatting across the app.
 * LYL-M-FE-024: Timezone handling for Ecuador (UTC-5).
 */
import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';

/** Ecuador timezone offset: UTC-5 */
const ECUADOR_TZ_OFFSET = -5;

/**
 * Convert a UTC date string to Ecuador local time.
 * Returns a Date object adjusted for display.
 */
export function toEcuadorTime(date: string | Date): Date {
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(d)) return new Date();
  const utcMs = d.getTime() + d.getTimezoneOffset() * 60_000;
  return new Date(utcMs + ECUADOR_TZ_OFFSET * 3_600_000);
}

/**
 * Format a date for short display: "29 abr 2026"
 */
export function formatDateShort(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(d)) return '—';
  return format(d, 'd MMM yyyy', { locale: es });
}

/**
 * Format a date with time: "29 abr 2026, 14:30"
 */
export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(d)) return '—';
  return format(d, "d MMM yyyy, HH:mm", { locale: es });
}

/**
 * Format a date for table cells: "29/04/2026"
 */
export function formatDateNumeric(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(d)) return '—';
  return format(d, 'dd/MM/yyyy', { locale: es });
}

/**
 * Format a relative time: "hace 3 días"
 */
export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(d)) return '—';
  return formatDistanceToNow(d, { addSuffix: true, locale: es });
}

/**
 * Format for chart XAxis labels: "04/29"
 */
export function formatChartDate(dateStr: string): string {
  if (!dateStr) return '';
  return dateStr.slice(5); // "2026-04-29" -> "04-29"
}

/**
 * Format today's date for footer display: "Hoy — 29 de abril de 2026"
 */
export function formatTodayFull(): string {
  return format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
}
