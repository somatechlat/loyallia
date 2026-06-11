/**
 * Field value formatting utilities for Wallet Pass Studio previews.
 *
 * Formats values based on dataType for consistent display across
 * Apple and Google wallet previews.
 */

import type { FieldDataType } from '@/components/wallet/types/unified-field';

const DEFAULT_LOCALE = typeof navigator !== 'undefined' ? navigator.language : 'es-ES';
const DEFAULT_CURRENCY = 'USD';

export function formatFieldValue(
  value: string,
  dataType: FieldDataType,
  options?: { locale?: string; currency?: string }
): string {
  if (!value) return value;

  const locale = options?.locale || DEFAULT_LOCALE;
  const currency = options?.currency || DEFAULT_CURRENCY;

  switch (dataType) {
    case 'date': {
      try {
        const d = new Date(value);
        if (isNaN(d.getTime())) return value;
        return d.toLocaleDateString(locale, {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });
      } catch {
        return value;
      }
    }
    case 'number': {
      const n = parseFloat(value);
      if (isNaN(n)) return value;
      return n.toLocaleString(locale);
    }
    case 'currency': {
      const c = parseFloat(value);
      if (isNaN(c)) return value;
      return c.toLocaleString(locale, {
        style: 'currency',
        currency,
      });
    }
    case 'phone': {
      // Simple phone formatting for display
      const digits = value.replace(/\D/g, '');
      if (digits.length === 10) {
        return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
      }
      return value;
    }
    case 'email':
    case 'url':
    case 'text':
    default:
      return value;
  }
}

/**
 * Get the appropriate HTML input type for a field data type.
 */
export function getInputType(dataType: FieldDataType): string {
  switch (dataType) {
    case 'date':
      return 'date';
    case 'number':
    case 'currency':
      return 'number';
    case 'email':
      return 'email';
    case 'url':
      return 'url';
    case 'phone':
      return 'tel';
    case 'text':
    default:
      return 'text';
  }
}
