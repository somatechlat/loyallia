/**
 * System template preset quality gates.
 *
 * Every card type ships ≥3 presets with a design-system palette, curated
 * fields with Spanish display copy, valid stamp shape, and back content.
 */

import { describe, it, expect } from 'vitest';
import { SYSTEM_TEMPLATES, CARD_TYPE_ORDER } from '@/components/wallet/templates/registry';
import { getCardPalette, CARD_PALETTES_ALL } from '@/components/wallet/design-system';
import type { WalletTemplate } from '@/components/wallet/types/templates';

const VALID_STAMP_SHAPES = new Set([
  'circle',
  'square',
  'star',
  'heart',
  'diamond',
  'hexagon',
]);

const VALID_STAMP_LAYOUTS = new Set(['3x3', '4x4', '5x2', '6x2', 'dynamic']);

function byType(cardType: string): WalletTemplate[] {
  return SYSTEM_TEMPLATES.filter((t) => t.cardType === cardType);
}

describe('system template presets', () => {
  it('covers all 10 card types', () => {
    for (const cardType of CARD_TYPE_ORDER) {
      expect(byType(cardType).length, `missing presets for ${cardType}`).toBeGreaterThanOrEqual(3);
    }
  });

  it('ships at least 30 presets in total', () => {
    expect(SYSTEM_TEMPLATES.length).toBeGreaterThanOrEqual(30);
  });

  it('has unique ids across the registry', () => {
    const ids = SYSTEM_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every preset has palette + fields + valid paletteKey', () => {
    for (const template of SYSTEM_TEMPLATES) {
      expect(template.paletteKey, template.id).toBeTruthy();
      expect(CARD_PALETTES_ALL[template.paletteKey], template.id).toBeDefined();
      expect(template.fields.length, template.id).toBeGreaterThanOrEqual(2);
      expect(template.colors.background, template.id).toBeTruthy();
      expect(template.colors.foreground, template.id).toBeTruthy();
      expect(template.colors.accent, template.id).toBeTruthy();
    }
  });

  it('every preset colors derive from its design-system palette', () => {
    for (const template of SYSTEM_TEMPLATES) {
      const palette = getCardPalette(template.paletteKey);
      expect(template.colors.background, template.id).toBe(palette.base);
      expect(template.colors.foreground, template.id).toBe(palette.text);
      expect(template.colors.accent, template.id).toBe(palette.accent);
    }
  });

  it('every stamp preset has a valid stampShape and grid layout', () => {
    for (const template of byType('stamp')) {
      const cfg = template.cardTypeConfig;
      expect(cfg.cardType).toBe('stamp');
      if (cfg.cardType === 'stamp') {
        expect(VALID_STAMP_SHAPES.has(cfg.stampShape), `${template.id} shape`).toBe(true);
        expect(VALID_STAMP_LAYOUTS.has(cfg.stampGridLayout), `${template.id} layout`).toBe(true);
        expect(cfg.stampsRequired).toBeGreaterThan(0);
        expect(cfg.rewardDescription.length).toBeGreaterThan(0);
      }
    }
  });

  it('every preset ships curated Spanish field labels', () => {
    const labelPattern = /[A-ZÁÉÍÓÚÑ]/;
    for (const template of SYSTEM_TEMPLATES) {
      for (const field of template.fields) {
        expect(field.label.length, `${template.id}/${field.id}`).toBeGreaterThan(0);
        expect(labelPattern.test(field.label), `${template.id}/${field.id} label=${field.label}`).toBe(true);
        expect(field.value.length, `${template.id}/${field.id}`).toBeGreaterThan(0);
      }
    }
  });

  it('every preset has back content with terms and contact', () => {
    for (const template of SYSTEM_TEMPLATES) {
      const labels = template.backContent.fields.map((f) => f.label.toLowerCase());
      expect(labels.some((l) => l.includes('regla') || l.includes('término') || l.includes('termino')), template.id).toBe(true);
      expect(template.backContent.fields.length, template.id).toBeGreaterThanOrEqual(2);
      expect(template.backContent.links.length, template.id).toBeGreaterThanOrEqual(1);
    }
  });

  it('every preset has a barcode config', () => {
    for (const template of SYSTEM_TEMPLATES) {
      expect(template.barcode.format, template.id).toBeTruthy();
      expect(template.barcode.messageEncoding, template.id).toBeTruthy();
    }
  });

  it('art direction is distinct within each card type', () => {
    for (const cardType of CARD_TYPE_ORDER) {
      const presets = byType(cardType);
      const paletteKeys = new Set(presets.map((p) => p.paletteKey));
      // At least two distinct palettes among the three presets
      expect(paletteKeys.size, `${cardType} palette variety`).toBeGreaterThanOrEqual(2);
      const names = new Set(presets.map((p) => p.name));
      expect(names.size).toBe(presets.length);
    }
  });

  it('declares Apple and Google platform metadata', () => {
    for (const template of SYSTEM_TEMPLATES) {
      expect(template.apple.organizationName.length, template.id).toBeGreaterThan(0);
      expect(template.apple.passStyle, template.id).toBeTruthy();
      expect(template.google.programName.length, template.id).toBeGreaterThan(0);
      expect(template.google.passType, template.id).toBeTruthy();
    }
  });
});
