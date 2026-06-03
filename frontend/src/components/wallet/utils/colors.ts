/**
 * Color manipulation utilities for Wallet Pass Studio.
 * Pure functions only — no side effects.
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface Hsl {
  h: number;
  s: number;
  l: number;
}

/**
 * Validate a hex color string.
 * Accepts #RGB, #RGBA, #RRGGBB, #RRGGBBAA.
 */
export function isValidHex(hex: string): boolean {
  return /^#([0-9A-Fa-f]{3,4}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(hex);
}

/**
 * Normalize a hex string to 6-digit #RRGGBB (alpha is stripped).
 * Returns black (#000000) for invalid input.
 */
export function normalizeHex(hex: string): string {
  if (!isValidHex(hex)) return '#000000';

  hex = hex.replace('#', '');

  // Expand 3- or 4-digit hex
  if (hex.length === 3 || hex.length === 4) {
    hex = hex
      .split('')
      .slice(0, 3)
      .map((c) => c + c)
      .join('');
  } else if (hex.length === 8) {
    // Strip alpha from 8-digit hex
    hex = hex.slice(0, 6);
  }

  return `#${hex.toUpperCase()}`;
}

/**
 * Convert hex to RGB object.
 */
export function hexToRgb(hex: string): Rgb {
  const normalized = normalizeHex(hex).replace('#', '');
  return {
    r: parseInt(normalized.substring(0, 2), 16),
    g: parseInt(normalized.substring(2, 4), 16),
    b: parseInt(normalized.substring(4, 6), 16),
  };
}

/**
 * Convert RGB values to hex string.
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const clamped = Math.max(0, Math.min(255, Math.round(n)));
    return clamped.toString(16).padStart(2, '0').toUpperCase();
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Convert hex to HSL.
 */
export function hexToHsl(hex: string): Hsl {
  let { r, g, b } = hexToRgb(hex);
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/**
 * Convert HSL to hex.
 */
export function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;

  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));

  const r = Math.round(f(0) * 255);
  const g = Math.round(f(8) * 255);
  const b = Math.round(f(4) * 255);

  return rgbToHex(r, g, b);
}

/**
 * Calculate relative luminance of a hex color (WCAG 2.1).
 */
export function getLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);

  const toLinear = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };

  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * Darken a hex color by a percentage (0–1).
 */
export function darken(hex: string, amount: number): string {
  const { h, s, l } = hexToHsl(hex);
  return hslToHex(h, s, Math.max(0, l - amount * 100));
}

/**
 * Lighten a hex color by a percentage (0–1).
 */
export function lighten(hex: string, amount: number): string {
  const { h, s, l } = hexToHsl(hex);
  return hslToHex(h, s, Math.min(100, l + amount * 100));
}

/**
 * Automatically choose black or white foreground for a given background,
 * based on which gives higher contrast.
 */
export function autoForeground(backgroundHex: string): string {
  const bgLum = getLuminance(backgroundHex);
  const blackLum = getLuminance('#000000');
  const whiteLum = getLuminance('#FFFFFF');

  const blackContrast = (whiteLum + 0.05) / (bgLum + 0.05);
  const whiteContrast = (bgLum + 0.05) / (blackLum + 0.05);

  return blackContrast > whiteContrast ? '#000000' : '#FFFFFF';
}
