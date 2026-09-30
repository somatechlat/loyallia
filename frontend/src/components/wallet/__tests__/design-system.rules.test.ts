/**
 * Design-system enforcement for Apple Wallet card previews.
 *
 * Reads the source of the rebuilt previews and asserts the hard bans:
 * no sub-11px type, no low-opacity text, no 52px label traps, and
 * palettes/type/ chrome imported from `design-system.ts`.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..');

const SOURCES = {
  apple: join(ROOT, 'src/components/wallet/AppleWalletPreview.tsx'),
  programs: join(ROOT, 'src/components/programs/WalletPreviewContent.tsx'),
} as const;

function readSource(key: keyof typeof SOURCES): string {
  return readFileSync(SOURCES[key], 'utf8');
}

describe('design-system rules on Apple preview sources', () => {
  const apple = readSource('apple');
  const programs = readSource('programs');

  it('has no sub-11px type in AppleWalletPreview', () => {
    expect(apple).not.toMatch(/text-\[(8|9|10)px\]/);
  });

  it('has no sub-11px type in WalletPreviewContent', () => {
    expect(programs).not.toMatch(/text-\[(8|9|10)px\]/);
  });

  it('has no opacity-30/40/50 text dimming in either file', () => {
    expect(apple).not.toMatch(/opacity-(30|40|50)/);
    expect(programs).not.toMatch(/opacity-(30|40|50)/);
  });

  it('has no max-w-[52px] label trap', () => {
    expect(apple).not.toContain('max-w-[52px]');
    expect(programs).not.toContain('max-w-[52px]');
  });

  it('imports palettes and type scale from design-system.ts', () => {
    for (const src of [apple, programs]) {
      expect(src).toMatch(/from ['"]@\/components\/wallet\/design-system['"]/);
      expect(src).toMatch(/getCardPalette/);
      expect(src).toMatch(/CARD_TYPE_SCALE/);
    }
  });

  it('imports CARD_CHROME and radius/shadow tokens', () => {
    expect(apple).toMatch(/CARD_CHROME/);
    expect(apple).toMatch(/CARD_RADIUS/);
    expect(apple).toMatch(/CARD_SHADOW/);
  });

  it('wires real stamp icons via StampIcons (no block glyphs)', () => {
    expect(apple).toMatch(/from ['"]@\/components\/ui\/StampIcons['"]/);
    expect(apple).not.toMatch(/[█░]/);
    expect(programs).not.toMatch(/[█░]/);
  });

  it('uses the design-system type scale rather than ad-hoc font sizes', () => {
    // Every font-size class in the two previews must come from CARD_TYPE_SCALE.*
    const adHoc = /text-\[(1[2-9]|2[0-9])px\]/;
    expect(apple).not.toMatch(adHoc);
    expect(programs).not.toMatch(adHoc);
  });
});

describe('design-system exports stay the single source of truth', () => {
  it('MIN_CARD_FONT_PX is 11 and scales only expose ≥11px', async () => {
    const ds = await import('@/components/wallet/design-system');
    expect(ds.MIN_CARD_FONT_PX).toBe(11);
    const sizes = Object.values(ds.CARD_TYPE_SCALE).map((cls) => {
      const m = /text-\[(\d+)px\]/.exec(cls);
      return m ? Number(m[1]) : Number.NaN;
    });
    expect(sizes.every((n) => n >= 11)).toBe(true);
    expect(sizes).toContain(28);
  });

  it('progressSlots fills then empties and clamps out-of-range input', async () => {
    const { progressSlots } = await import('@/components/wallet/design-system');
    expect(progressSlots(2, 5)).toEqual(['filled', 'filled', 'empty', 'empty', 'empty']);
    expect(progressSlots(0, 0)).toEqual([]);
    expect(progressSlots(9, 3)).toEqual(['filled', 'filled', 'filled']);
    expect(progressSlots(-2, 4)).toEqual(['empty', 'empty', 'empty', 'empty']);
  });
});
