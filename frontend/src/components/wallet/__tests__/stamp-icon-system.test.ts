/**
 * Stamp icon system — motif/shape inventory and resolution guarantees.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ICON_LIBRARY,
  STAMP_MOTIF_ICONS,
  STAMP_SHAPE_ICONS,
  getStampIcons,
  getStampEmptyIcons,
  getStampShapes,
  getIconById,
  getStampIconsByGroup,
  searchIcons,
} from '@/components/wallet/icon-library';
import { STAMP_SHAPE_PATHS, STAMP_SHAPE_IDS } from '@/components/wallet/icons/shapes';
import { MOTIF_ART, MOTIF_META } from '@/components/wallet/icons/motifs';

const ROOT = join(__dirname, '..', '..', '..', '..');

describe('stamp motif inventory', () => {
  it('exposes at least 24 curated stamp motifs', () => {
    const motifs = STAMP_MOTIF_ICONS.filter((i) => !i.outline);
    expect(motifs.length).toBeGreaterThanOrEqual(24);
  });

  it('exposes at least 12 empty/outlined variants', () => {
    expect(getStampEmptyIcons().length).toBeGreaterThanOrEqual(12);
  });

  it('every motif has non-empty SVG path art', () => {
    for (const icon of STAMP_MOTIF_ICONS) {
      expect(icon.svgPaths?.length ?? 0).toBeGreaterThan(0);
      for (const d of icon.svgPaths ?? []) {
        expect(d.length).toBeGreaterThan(4);
      }
    }
  });

  it('empty variants pair with a filled counterpart', () => {
    for (const empty of getStampEmptyIcons()) {
      expect(empty.filledId).toBeTruthy();
      const filled = getIconById(empty.filledId!);
      expect(filled).toBeDefined();
      expect(filled?.outline).toBeFalsy();
    }
  });

  it('MOTIF_ART covers every motif id', () => {
    for (const icon of STAMP_MOTIF_ICONS) {
      expect(MOTIF_ART[icon.id]).toBeDefined();
      expect(MOTIF_META[icon.id]?.name).toBe(icon.name);
    }
  });

  it('getStampIcons returns the curated motif set', () => {
    const stamps = getStampIcons();
    expect(stamps.length).toBeGreaterThanOrEqual(24);
    expect(stamps.every((i) => i.category === 'stamp')).toBe(true);
  });

  it('icon-library source uses object-literal ids for motifs', () => {
    const source = readFileSync(
      join(ROOT, 'src/components/wallet/icon-library.ts'),
      'utf8',
    );
    const idCount = (source.match(/id: '/g) ?? []).length;
    expect(idCount).toBeGreaterThanOrEqual(24);
  });
});

describe('stamp shape inventory', () => {
  it('defines at least 10 stamp shapes', () => {
    expect(STAMP_SHAPE_IDS.length).toBeGreaterThanOrEqual(10);
    expect(Object.keys(STAMP_SHAPE_PATHS).length).toBeGreaterThanOrEqual(10);
  });

  it('covers the required shape set', () => {
    const required = [
      'circle', 'square', 'rounded', 'heart', 'star',
      'shield', 'hexagon', 'diamond', 'ticket', 'flower',
    ];
    for (const id of required) {
      expect(STAMP_SHAPE_PATHS[id as keyof typeof STAMP_SHAPE_PATHS]).toBeTruthy();
    }
  });

  it('every shape path is a closed-looking 24×24 silhouette', () => {
    for (const id of STAMP_SHAPE_IDS) {
      const path = STAMP_SHAPE_PATHS[id];
      expect(path.startsWith('M')).toBe(true);
      expect(path.length).toBeGreaterThan(10);
    }
  });

  it('getStampShapes maps every shape id', () => {
    const shapes = getStampShapes();
    expect(shapes.length).toBe(STAMP_SHAPE_IDS.length);
    for (const shape of shapes) {
      expect(shape.path).toBe(STAMP_SHAPE_PATHS[shape.id]);
    }
  });

  it('STAMP_SHAPE_ICONS resolve in the library', () => {
    for (const icon of STAMP_SHAPE_ICONS) {
      expect(getIconById(icon.id)).toBeDefined();
    }
  });

  it('preview-decorations SHAPE_PATHS lists all required shapes', () => {
    const source = readFileSync(
      join(ROOT, 'src/components/wallet/preview-decorations.tsx'),
      'utf8',
    );
    const matches = source.match(
      /^\s+(circle|square|rounded|heart|star|shield|hexagon|diamond|ticket|flower):/gm,
    ) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(10);
  });
});

describe('icon search', () => {
  it('finds curated motifs by name', () => {
    const hits = searchIcons('coffee');
    expect(hits.some((i) => i.id === 'motif-coffee')).toBe(true);
  });

  it('filters motifs by group', () => {
    const hits = getStampIconsByGroup('loyalty');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((i) => i.group === 'loyalty' && i.category === 'stamp')).toBe(true);
  });

  it('every ICON_LIBRARY entry has an id and name', () => {
    for (const icon of ICON_LIBRARY) {
      expect(icon.id.length).toBeGreaterThan(0);
      expect(icon.name.length).toBeGreaterThan(0);
    }
  });
});
