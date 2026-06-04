import { describe, it, expect } from 'vitest';
import {
  hexToRgb,
  rgbToHex,
  hexToHsl,
  hslToHex,
  darken,
  lighten,
  getLuminance,
  isValidHex,
  normalizeHex,
  autoForeground,
} from '../utils/colors';

/** Compare two hex colors allowing ±2 per channel rounding误差 from HSL float math. */
function hexCloseTo(a: string, b: string): boolean {
  const ra = hexToRgb(a);
  const rb = hexToRgb(b);
  return (
    Math.abs(ra.r - rb.r) <= 2 &&
    Math.abs(ra.g - rb.g) <= 2 &&
    Math.abs(ra.b - rb.b) <= 2
  );
}

describe('isValidHex', () => {
  it('accepts 6-digit hex', () => {
    expect(isValidHex('#FFFFFF')).toBe(true);
    expect(isValidHex('#ABC123')).toBe(true);
  });

  it('accepts 3-digit hex', () => {
    expect(isValidHex('#FFF')).toBe(true);
  });

  it('accepts 8-digit hex with alpha', () => {
    expect(isValidHex('#FFFFFFFF')).toBe(true);
  });

  it('accepts 4-digit hex with alpha', () => {
    expect(isValidHex('#FFFF')).toBe(true);
  });

  it('rejects invalid hex', () => {
    expect(isValidHex('FFFFFF')).toBe(false);
    expect(isValidHex('#GGGGGG')).toBe(false);
    expect(isValidHex('#FFF FF')).toBe(false);
    expect(isValidHex('')).toBe(false);
  });
});

describe('normalizeHex', () => {
  it('normalizes 3-digit to 6-digit', () => {
    expect(normalizeHex('#FFF')).toBe('#FFFFFF');
    expect(normalizeHex('#000')).toBe('#000000');
  });

  it('strips alpha from 8-digit', () => {
    expect(normalizeHex('#FFFFFFFF')).toBe('#FFFFFF');
  });

  it('returns black for invalid input', () => {
    expect(normalizeHex('invalid')).toBe('#000000');
  });
});

describe('hexToRgb', () => {
  it('converts white', () => {
    expect(hexToRgb('#FFFFFF')).toEqual({ r: 255, g: 255, b: 255 });
  });

  it('converts black', () => {
    expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
  });

  it('converts arbitrary color', () => {
    expect(hexToRgb('#ABC123')).toEqual({ r: 171, g: 193, b: 35 });
  });
});

describe('rgbToHex', () => {
  it('round-trips with hexToRgb', () => {
    const original = '#ABC123';
    const rgb = hexToRgb(original);
    expect(rgbToHex(rgb.r, rgb.g, rgb.b)).toBe(original);
  });

  it('converts RGB to hex', () => {
    expect(rgbToHex(255, 255, 255)).toBe('#FFFFFF');
    expect(rgbToHex(0, 0, 0)).toBe('#000000');
  });
});

describe('hexToHsl / hslToHex round-trip', () => {
  it('round-trips common colors', () => {
    const colors = ['#FF0000', '#00FF00', '#0000FF', '#ABC123', '#FFFFFF', '#000000'];
    for (const color of colors) {
      const hsl = hexToHsl(color);
      const back = hslToHex(hsl.h, hsl.s, hsl.l);
      // Allow small rounding differences from HSL float math
      expect(hexCloseTo(back, color)).toBe(true);
    }
  });
});

describe('darken', () => {
  it('darkens white', () => {
    expect(darken('#FFFFFF', 0.5)).toBe('#808080');
  });

  it('does not go below 0%', () => {
    expect(darken('#000000', 0.5)).toBe('#000000');
  });
});

describe('lighten', () => {
  it('lightens black', () => {
    expect(lighten('#000000', 0.5)).toBe('#808080');
  });

  it('does not go above 100%', () => {
    expect(lighten('#FFFFFF', 0.5)).toBe('#FFFFFF');
  });
});

describe('getLuminance', () => {
  it('white has highest luminance', () => {
    expect(getLuminance('#FFFFFF')).toBeCloseTo(1, 5);
  });

  it('black has lowest luminance', () => {
    expect(getLuminance('#000000')).toBeCloseTo(0, 5);
  });

  it('red luminance is ~0.2126', () => {
    expect(getLuminance('#FF0000')).toBeCloseTo(0.2126, 3);
  });
});

describe('autoForeground', () => {
  it('suggests black for light backgrounds', () => {
    expect(autoForeground('#FFFFFF')).toBe('#000000');
    expect(autoForeground('#FFFF00')).toBe('#000000');
  });

  it('suggests white for dark backgrounds', () => {
    expect(autoForeground('#000000')).toBe('#FFFFFF');
    expect(autoForeground('#0000FF')).toBe('#FFFFFF');
  });
});
