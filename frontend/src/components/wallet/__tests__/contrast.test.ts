import { describe, it, expect } from 'vitest';
import {
  contrastRatio,
  meetsWCAGAA,
  meetsWCAGAAA,
  getWCAGLevel,
  suggestContrastColor,
  getContrastReport,
} from '../utils/contrast';

describe('contrastRatio', () => {
  it('white vs black is ~21', () => {
    expect(contrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 1);
  });

  it('same color is 1', () => {
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5);
  });

  it('order does not matter', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
  });
});

describe('meetsWCAGAA', () => {
  it('white on black passes', () => {
    expect(meetsWCAGAA('#FFFFFF', '#000000')).toBe(true);
  });

  it('light gray on white fails', () => {
    expect(meetsWCAGAA('#CCCCCC', '#FFFFFF')).toBe(false);
  });

  it('large text has lower threshold', () => {
    expect(meetsWCAGAA('#CCCCCC', '#FFFFFF', true)).toBe(false);
  });
});

describe('meetsWCAGAAA', () => {
  it('white on black passes', () => {
    expect(meetsWCAGAAA('#FFFFFF', '#000000')).toBe(true);
  });

  it('light gray on white fails for normal text', () => {
    expect(meetsWCAGAAA('#CCCCCC', '#FFFFFF')).toBe(false);
  });
});

describe('getWCAGLevel', () => {
  it('white on black is AAA', () => {
    expect(getWCAGLevel('#FFFFFF', '#000000')).toBe('AAA');
  });

  it('medium gray on white is FAIL', () => {
    expect(getWCAGLevel('#777777', '#FFFFFF')).toBe('FAIL');
  });

  it('dark gray on white is AAA', () => {
    expect(getWCAGLevel('#595959', '#FFFFFF')).toBe('AAA');
  });
});

describe('suggestContrastColor', () => {
  it('suggests black for white background', () => {
    expect(suggestContrastColor('#FFFFFF')).toBe('#000000');
  });

  it('suggests white for black background', () => {
    expect(suggestContrastColor('#000000')).toBe('#FFFFFF');
  });

  it('suggests a color that meets target ratio when possible', () => {
    const bg = '#777777';
    const suggestion = suggestContrastColor(bg);
    const ratio = contrastRatio(suggestion, bg);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});

describe('getContrastReport', () => {
  it('returns full report for passing colors', () => {
    const report = getContrastReport('#FFFFFF', '#000000');
    expect(report.ratio).toBeCloseTo(21, 1);
    expect(report.level).toBe('AAA');
    expect(report.meetsAA).toBe(true);
    expect(report.meetsAAA).toBe(true);
    expect(report.suggestion).toBeUndefined();
  });

  it('returns suggestion for failing colors', () => {
    const report = getContrastReport('#777777', '#FFFFFF');
    expect(report.level).toBe('FAIL');
    expect(report.meetsAA).toBe(false);
    expect(report.suggestion).toBeDefined();
  });
});
