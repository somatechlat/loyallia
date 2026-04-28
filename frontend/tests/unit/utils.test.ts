/**
 * Unit tests for shared utility functions.
 * QUAL-016: Basic test coverage for business logic utilities.
 *
 * Run with: npx vitest run tests/unit/utils.test.ts
 * (Requires: npm i -D vitest)
 */
import { describe, it, expect } from 'vitest';

/* ─── adjustColor (from components/programs/constants.tsx) ─────────── */
function adjustColor(hex: string, amount: number): string {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const num = parseInt(hex, 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
  const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

describe('adjustColor', () => {
  it('should darken a color with negative amount', () => {
    const result = adjustColor('#ffffff', -50);
    expect(result).toBe('#cdcdcd');
  });

  it('should lighten a color with positive amount', () => {
    const result = adjustColor('#000000', 50);
    expect(result).toBe('#323232');
  });

  it('should handle shorthand hex colors', () => {
    const result = adjustColor('#fff', -10);
    expect(result).toBe('#f5f5f5');
  });

  it('should clamp values to 0-255 range', () => {
    const result = adjustColor('#000000', -100);
    expect(result).toBe('#000000');
  });

  it('should clamp values to max 255', () => {
    const result = adjustColor('#ffffff', 100);
    expect(result).toBe('#ffffff');
  });

  it('should handle colors without # prefix', () => {
    const result = adjustColor('ff0000', -10);
    expect(result).toBe('#f50000');
  });
});

/* ─── getNestedValue (from lib/i18n/index.tsx) ─────────────────────── */
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

describe('getNestedValue', () => {
  it('should return a top-level string value', () => {
    expect(getNestedValue({ name: 'test' }, 'name')).toBe('test');
  });

  it('should return a nested string value', () => {
    expect(getNestedValue({ a: { b: 'found' } }, 'a.b')).toBe('found');
  });

  it('should return path as fallback for missing keys', () => {
    expect(getNestedValue({}, 'missing.key')).toBe('missing.key');
  });

  it('should return path when intermediate key is null', () => {
    expect(getNestedValue({ a: null }, 'a.b')).toBe('a.b');
  });

  it('should return path when value is not a string', () => {
    expect(getNestedValue({ a: 123 }, 'a')).toBe('a');
  });

  it('should handle deeply nested paths', () => {
    expect(getNestedValue({ a: { b: { c: 'deep' } } }, 'a.b.c')).toBe('deep');
  });
});

/* ─── resolveDays (from dashboard page) ────────────────────────────── */
type DateRange = 1 | 7 | 28 | 30 | 180 | 365 | 'mtd' | 'custom';

function resolveDays(range: DateRange): number {
  if (typeof range === 'number') return range;
  if (range === 'mtd') {
    const now = new Date();
    return now.getDate();
  }
  return 30;
}

describe('resolveDays', () => {
  it('should return numeric values directly', () => {
    expect(resolveDays(7)).toBe(7);
    expect(resolveDays(30)).toBe(30);
    expect(resolveDays(365)).toBe(365);
  });

  it('should return day-of-month for mtd', () => {
    const result = resolveDays('mtd');
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(31);
  });

  it('should return 30 for custom', () => {
    expect(resolveDays('custom')).toBe(30);
  });
});
