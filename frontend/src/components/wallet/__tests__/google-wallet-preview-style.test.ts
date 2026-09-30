/**
 * Style bans for the Google Wallet preview rebuild.
 *
 * Asserts the source never drops under the 11px type floor and never dims
 * text with opacity-30/40/50 — both are enforced by the design system and
 * measured regressions this rebuild fixes.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const previewSource = readFileSync(
  resolve(process.cwd(), 'src/components/wallet/GoogleWalletPreview.tsx'),
  'utf-8',
);

const deviceSource = readFileSync(
  resolve(process.cwd(), 'src/components/wallet/DeviceFrame.tsx'),
  'utf-8',
);

describe('GoogleWalletPreview style bans', () => {
  it('contains no sub-11px type utilities', () => {
    const hits = previewSource.match(/text-\[(?:8|9|10)px\]/g) ?? [];
    expect(hits).toEqual([]);
  });

  it('contains no low-opacity text utilities', () => {
    const hits = previewSource.match(/opacity-(?:30|40|50)/g) ?? [];
    expect(hits).toEqual([]);
  });

  it('never uses truncate on card copy', () => {
    const hits = previewSource.match(/\btruncate\b/g) ?? [];
    expect(hits).toEqual([]);
  });

  it('pulls type and colour from the design system', () => {
    expect(previewSource).toContain("from './design-system'");
    expect(previewSource).toContain('CARD_TYPE_SCALE');
    expect(previewSource).toContain('getCardPalette');
    expect(previewSource).toContain('progressSlots');
    expect(previewSource).toContain('CARD_CHROME');
    expect(previewSource).toContain('CARD_RADIUS.google');
    expect(previewSource).toContain('CARD_SHADOW.card');
  });

  it('renders message chips with palette accent wells', () => {
    expect(previewSource).toContain('google-messages');
    expect(previewSource).toContain('accentSoft');
    expect(previewSource).toContain('google-hero-value');
    expect(previewSource).toContain('google-progress');
  });

  it('has no raw hex colours', () => {
    const hits = previewSource.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
    expect(hits).toEqual([]);
  });
});

describe('DeviceFrame stage bans', () => {
  it('never hardcodes the old 260px or 150px stage widths', () => {
    expect(deviceSource).not.toMatch(/w-\[260px\]/);
    expect(deviceSource).not.toMatch(/w-\[150px\]/);
  });

  it('exposes a 380px max stage and responsive fill', () => {
    expect(deviceSource).toContain('DEVICE_STAGE_MAX = 380');
    expect(deviceSource).toContain("width: '100%'");
  });
});
