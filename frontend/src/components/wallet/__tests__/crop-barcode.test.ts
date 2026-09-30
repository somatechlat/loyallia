import { describe, it, expect } from 'vitest';
import { applyCropStyle, cropToStyle } from '@/components/wallet/utils/crop-style';
import { encodeCode128B } from '@/components/wallet/utils/code128';
import type { ImageAsset } from '@/components/wallet/types/unified-state';

describe('applyCropStyle', () => {
  it('returns empty style when asset has no crop (non-destructive default)', () => {
    const asset: ImageAsset = { url: '/x.png', width: 10, height: 10 };
    expect(applyCropStyle(asset)).toEqual({});
    expect(applyCropStyle(undefined)).toEqual({});
  });

  it('maps zoom/offset/rotate/flip to ImageCropEditor transform semantics', () => {
    const style = applyCropStyle({
      url: '/x.png',
      width: 100,
      height: 100,
      crop: { zoom: 1.5, offsetX: 12, offsetY: -8, rotate: 90, flipH: true, flipV: false },
    });
    expect(style.transform).toBe('translate(12px, -8px) scale(-1.5, 1.5) rotate(90deg)');
    expect(style.transformOrigin).toBe('center center');
  });

  it('cropToStyle accepts a bare crop object', () => {
    const style = cropToStyle({ zoom: 2, offsetX: 0, offsetY: 0, rotate: 0, flipH: false, flipV: true });
    expect(style.transform).toBe('translate(0px, 0px) scale(2, -2) rotate(0deg)');
    expect(cropToStyle(undefined)).toEqual({});
  });
});

describe('encodeCode128B', () => {
  it('encodes Start B pattern first and Stop pattern last', () => {
    const widths = encodeCode128B('A');
    expect(widths).not.toBeNull();
    // Start B (104) = 211214
    expect(widths!.slice(0, 6).join('')).toBe('211214');
    // Stop (106) = 2331112
    expect(widths!.slice(-7).join('')).toBe('2331112');
  });

  it('rejects empty and non-ASCII payloads (no silent fake encoding)', () => {
    expect(encodeCode128B('')).toBeNull();
    expect(encodeCode128B('café')).toBeNull();
  });

  it('produces stable module widths for the same message', () => {
    const a = encodeCode128B('LOYAL-42');
    const b = encodeCode128B('LOYAL-42');
    expect(a).toEqual(b);
    expect(a!.length).toBeGreaterThan(20);
  });
});
