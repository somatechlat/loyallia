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
    h: h * 360,
    s: s * 100,
    l: l * 100,
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

  const lighter = Math.max(bgLum, blackLum);
  const darker = Math.min(bgLum, blackLum);
  const blackContrast = (lighter + 0.05) / (darker + 0.05);

  const lighter2 = Math.max(bgLum, whiteLum);
  const darker2 = Math.min(bgLum, whiteLum);
  const whiteContrast = (lighter2 + 0.05) / (darker2 + 0.05);

  return blackContrast > whiteContrast ? '#000000' : '#FFFFFF';
}

/**
 * WCAG AA-ish floor for text on a card face (normal text: 4.5:1).
 */
export const MIN_TEXT_CONTRAST_RATIO = 4.5;

/**
 * Contrast ratio between two hex colours (1 … 21). Mirrors the formula in
 * `utils/contrast.ts` — kept local so `colors.ts` stays dependency-free
 * (`contrast.ts` already depends on this module).
 */
function contrastAgainst(backgroundHex: string, foregroundHex: string): number {
  const bgLum = getLuminance(backgroundHex);
  const fgLum = getLuminance(foregroundHex);
  const lighter = Math.max(bgLum, fgLum);
  const darker = Math.min(bgLum, fgLum);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * @description Return a text colour that is readable on `backgroundHex`.
 * Keeps `preferredTextHex` when it already clears the WCAG AA contrast
 * floor; otherwise falls back to `autoForeground` (black/white, whichever
 * contrasts more). Invalid or non-hex preferred colours (e.g. rgba values)
 * always fall back to the derived colour.
 * @param {string} backgroundHex - Card face colour
 * @param {string} preferredTextHex - Designer-chosen text/label colour
 * @param {number} [minRatio] - Minimum contrast ratio (default 4.5, WCAG AA)
 * @returns {string} Readable text colour as #RRGGBB
 */
export function ensureReadableText(
  backgroundHex: string,
  preferredTextHex: string,
  minRatio: number = MIN_TEXT_CONTRAST_RATIO
): string {
  const background = isValidHex(backgroundHex) ? normalizeHex(backgroundHex) : '#000000';
  if (isValidHex(preferredTextHex)) {
    const preferred = normalizeHex(preferredTextHex);
    if (contrastAgainst(background, preferred) >= minRatio) return preferred;
  }
  return autoForeground(background);
}

/** User-chosen wallet_studio colours consumed by the pass previews. */
export interface StudioPaletteColors {
  background?: string;
  foreground?: string;
  label?: string;
  accent?: string;
}

/** Readable colour set derived for a preview card face. */
export interface ReadableCardColors {
  background: string;
  text: string;
  label: string;
  accent: string;
}

/**
 * @description Derive readable text/label/accent colours for a user palette.
 * Returns null when the palette carries no usable background so callers can
 * fall back to their design-system palette untouched.
 * @param {StudioPaletteColors | undefined} colors - wallet_studio colour set
 * @param {{ text: string; label: string; accent: string }} fallback - Fallback text colours
 * @returns {ReadableCardColors | null} Derived colours, or null without a background
 */
export function resolveReadableCardColors(
  colors: StudioPaletteColors | undefined,
  fallback: { text: string; label: string; accent: string }
): ReadableCardColors | null {
  if (!colors?.background || !isValidHex(colors.background)) return null;
  const background = normalizeHex(colors.background);
  return {
    background,
    text: ensureReadableText(background, colors.foreground || fallback.text),
    label: ensureReadableText(background, colors.label || fallback.label),
    accent: ensureReadableText(background, colors.accent || fallback.accent),
  };
}
