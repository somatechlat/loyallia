/**
 * Stamp slot silhouette paths.
 *
 * Every shape is a single closed path in a 24×24 viewBox, optically balanced
 * so a row of mixed shapes reads as one system. Paths are painted with
 * `currentColor` — never raw hex.
 */

export type StampShapeId =
  | 'circle'
  | 'square'
  | 'rounded'
  | 'heart'
  | 'star'
  | 'shield'
  | 'hexagon'
  | 'diamond'
  | 'ticket'
  | 'flower';

export const STAMP_SHAPE_IDS: StampShapeId[] = [
  'circle',
  'square',
  'rounded',
  'heart',
  'star',
  'shield',
  'hexagon',
  'diamond',
  'ticket',
  'flower',
];

/** Closed silhouettes for stamp slots (24×24). */
export const STAMP_SHAPE_PATHS: Record<StampShapeId, string> = {
  circle: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z',
  square: 'M3 3h18v18H3z',
  rounded: 'M8 3h8a5 5 0 0 1 5 5v8a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5V8a5 5 0 0 1 5-5z',
  heart:
    'M12 20.7l-1.1-1C5.1 14.5 2 11.7 2 8.2 2 5.4 4.2 3.2 7 3.2c1.6 0 3.1.7 4 2 .9-1.3 2.4-2 4-2 2.8 0 5 2.2 5 5 0 3.5-3.1 6.3-8.9 11.5l-1.1 1z',
  star: 'M12 2.5l2.8 6.2 6.7.6-5 4.4 1.5 6.6L12 16.7 5.9 20.3l1.5-6.6-5-4.4 6.7-.6L12 2.5z',
  shield:
    'M12 2.2l8.5 3.2v6.2c0 5.2-3.6 9.6-8.5 11.2-4.9-1.6-8.5-6-8.5-11.2V5.4L12 2.2z',
  hexagon: 'M12 2l8.66 5v10L12 22l-8.66-5V7L12 2z',
  diamond: 'M12 2l10 10-10 10L2 12 12 2z',
  ticket: 'M3 6h18v3.2a1.8 1.8 0 0 0 0 3.6V18H3v-5.2a1.8 1.8 0 0 0 0-3.6V6z',
  flower:
    'M12 2.2c.9 0 1.7.7 1.9 1.6.5 2 1.6 2.9 3.5 2.9.9 0 1.7.8 1.7 1.7 0 2-.7 3.2-2.8 4.2 2 1 2.8 2.3 2.8 4.2 0 .9-.8 1.7-1.7 1.7-1.9 0-3-.9-3.5-2.9-.2-.9-1-1.6-1.9-1.6s-1.7.7-1.9 1.6c-.5 2-1.6 2.9-3.5 2.9-.9 0-1.7-.8-1.7-1.7 0-1.9.8-3.2 2.8-4.2-2.1-1-2.8-2.2-2.8-4.2 0-.9.8-1.7 1.7-1.7 1.9 0 3-.9 3.5-2.9.2-.9 1-1.6 1.9-1.6z',
};

/** Shapes that read best as a true silhouette slot rather than a bordered box. */
export const SVG_SLOT_SHAPES: ReadonlySet<StampShapeId> = new Set([
  'heart',
  'star',
  'shield',
  'hexagon',
  'diamond',
  'ticket',
  'flower',
]);

/** CSS radius for box-like slots. */
export function getShapeClass(shape: string): string {
  switch (shape) {
    case 'circle':
      return 'rounded-full';
    case 'square':
      return 'rounded-sm';
    case 'rounded':
    case 'ticket':
      return 'rounded-lg';
    case 'star':
    case 'heart':
    case 'shield':
    case 'hexagon':
    case 'diamond':
    case 'flower':
      return 'rounded-none';
    default:
      return 'rounded-full';
  }
}

export function getShapePath(shape: string): string {
  return STAMP_SHAPE_PATHS[shape as StampShapeId] ?? STAMP_SHAPE_PATHS.circle;
}
