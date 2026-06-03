/**
 * WCAG 2.1 contrast calculation utilities.
 * Pure functions only — no side effects.
 */

import { getLuminance, normalizeHex } from './colors';

/**
 * Calculate the contrast ratio between two hex colors.
 * Ratio range: 1 (identical) to 21 (black vs white).
 */
export function contrastRatio(hex1: string, hex2: string): number {
  const l1 = getLuminance(hex1);
  const l2 = getLuminance(hex2);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if two colors meet WCAG 2.1 AA requirements.
 * - Normal text: ratio >= 4.5
 * - Large text:  ratio >= 3.0
 */
export function meetsWCAGAA(
  foreground: string,
  background: string,
  isLargeText = false
): boolean {
  const ratio = contrastRatio(foreground, background);
  return ratio >= (isLargeText ? 3.0 : 4.5);
}

/**
 * Check if two colors meet WCAG 2.1 AAA requirements.
 * - Normal text: ratio >= 7.0
 * - Large text:  ratio >= 4.5
 */
export function meetsWCAGAAA(
  foreground: string,
  background: string,
  isLargeText = false
): boolean {
  const ratio = contrastRatio(foreground, background);
  return ratio >= (isLargeText ? 4.5 : 7.0);
}

/**
 * Get the WCAG conformance level for a color pair.
 */
export function getWCAGLevel(
  foreground: string,
  background: string,
  isLargeText = false
): 'AAA' | 'AA' | 'FAIL' {
  if (meetsWCAGAAA(foreground, background, isLargeText)) return 'AAA';
  if (meetsWCAGAA(foreground, background, isLargeText)) return 'AA';
  return 'FAIL';
}

export interface ContrastReport {
  ratio: number;
  level: 'AAA' | 'AA' | 'FAIL';
  meetsAA: boolean;
  meetsAAA: boolean;
  suggestion?: string;
}

/**
 * Generate a full contrast report for a color pair.
 */
export function getContrastReport(
  foreground: string,
  background: string,
  isLargeText = false
): ContrastReport {
  const ratio = contrastRatio(foreground, background);
  const level = getWCAGLevel(foreground, background, isLargeText);

  const report: ContrastReport = {
    ratio: Number(ratio.toFixed(2)),
    level,
    meetsAA: level === 'AAA' || level === 'AA',
    meetsAAA: level === 'AAA',
  };

  if (level !== 'AAA') {
    const suggestion = suggestContrastColor(background);
    const suggestedRatio = contrastRatio(suggestion, background);
    if (suggestedRatio > ratio) {
      report.suggestion = suggestion;
    }
  }

  return report;
}

/**
 * Suggest a foreground color (black or white) for a given background
 * that meets at least the target contrast ratio.
 */
export function suggestContrastColor(
  background: string,
  targetRatio = 4.5
): string {
  const bg = normalizeHex(background);
  const blackRatio = contrastRatio('#000000', bg);
  const whiteRatio = contrastRatio('#FFFFFF', bg);

  if (blackRatio >= targetRatio && blackRatio >= whiteRatio) {
    return '#000000';
  }
  if (whiteRatio >= targetRatio) {
    return '#FFFFFF';
  }
  // Return whichever is higher even if it doesn't meet target
  return blackRatio > whiteRatio ? '#000000' : '#FFFFFF';
}
