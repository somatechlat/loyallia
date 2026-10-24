/**
 * Readable-preview colour derivation: user palette colours survive when they
 * clear the WCAG AA contrast floor and are otherwise replaced by a derived
 * black/white foreground so preview text is never illegible.
 */
import { describe, it, expect } from 'vitest';
import {
  MIN_TEXT_CONTRAST_RATIO,
  autoForeground,
  ensureReadableText,
  getLuminance,
  resolveReadableCardColors,
} from '@/components/wallet/utils/colors';

describe('ensureReadableText', () => {
  it('keeps the preferred colour when contrast already passes', () => {
    expect(ensureReadableText('#FFFFFF', '#111111')).toBe('#111111');
    expect(ensureReadableText('#1A1A2E', '#FFFFFF')).toBe('#FFFFFF');
  });

  it('derives black text on a light background when the preference is illegible', () => {
    expect(ensureReadableText('#FFFFFF', '#FFFFFF')).toBe('#000000');
    expect(ensureReadableText('#FFF2CC', '#FFFFFF')).toBe('#000000');
  });

  it('derives white text on a dark background when the preference is illegible', () => {
    expect(ensureReadableText('#111827', '#1F2937')).toBe('#FFFFFF');
    expect(ensureReadableText('#000000', '#333333')).toBe('#FFFFFF');
  });

  it('falls back to the derived colour for invalid preferred colours', () => {
    expect(ensureReadableText('#FFFFFF', 'rgba(255, 255, 255, 0.4)')).toBe('#000000');
  });

  it('exposes the WCAG AA floor as 4.5', () => {
    expect(MIN_TEXT_CONTRAST_RATIO).toBe(4.5);
  });
});

describe('resolveReadableCardColors', () => {
  it('returns null without a usable background so callers keep their palette', () => {
    expect(resolveReadableCardColors(undefined, { text: '#fff', label: '#fff', accent: '#fff' })).toBeNull();
    expect(
      resolveReadableCardColors({ background: 'not-a-color' }, { text: '#fff', label: '#fff', accent: '#fff' }),
    ).toBeNull();
    expect(
      resolveReadableCardColors({}, { text: '#fff', label: '#fff', accent: '#fff' }),
    ).toBeNull();
  });

  it('derives readable text/label/accent against the user background', () => {
    const colors = resolveReadableCardColors(
      { background: '#FFFFFF', foreground: '#FFFFFF', label: '#EEEEEE', accent: '#FDE68A' },
      { text: '#F9FAFB', label: '#9CA3AF', accent: '#60A5FA' },
    );
    expect(colors).not.toBeNull();
    expect(colors?.background).toBe('#FFFFFF');
    expect(colors?.text).toBe('#000000');
    expect(colors?.label).toBe('#000000');
    expect(colors?.accent).toBe('#000000');
  });

  it('keeps user colours that already read well on the background', () => {
    const colors = resolveReadableCardColors(
      { background: '#111827', foreground: '#F9FAFB', label: '#D1D5DB', accent: '#FBBF24' },
      { text: '#000000', label: '#000000', accent: '#000000' },
    );
    expect(colors?.text).toBe('#F9FAFB');
    expect(colors?.label).toBe('#D1D5DB');
    expect(colors?.accent).toBe('#FBBF24');
  });

  it('uses the caller fallback colours when the palette omits them', () => {
    const colors = resolveReadableCardColors(
      { background: '#1A1A2E' },
      { text: '#FFFFFF', label: '#C7C7CC', accent: '#FBBF24' },
    );
    // Fallbacks pass the contrast floor on the dark background and are kept.
    expect(colors?.text).toBe('#FFFFFF');
    expect(colors?.label).toBe('#C7C7CC');
    expect(colors?.accent).toBe('#FBBF24');
  });

  it('autoForeground picks the higher-contrast side', () => {
    expect(autoForeground('#FFFFFF')).toBe('#000000');
    expect(autoForeground('#000000')).toBe('#FFFFFF');
    expect(getLuminance('#FFFFFF')).toBeGreaterThan(getLuminance('#000000'));
  });
});
