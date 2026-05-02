/**
 * Unit tests for shared utility functions.
 * QUAL-016: Basic test coverage for business logic utilities.
 *
 * Run with: npx vitest run tests/unit/utils.test.ts
 * (Requires: npm i -D vitest)
 */
import { describe, it, expect } from 'vitest';
import { adjustColor } from '@/components/programs/constants';
import { getNestedValue } from '@/lib/i18n';

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
