/**
 * Real stamp glyphs for wallet card progress grids.
 *
 * Filled / empty slots come from `progressSlots()` in the wallet design system.
 * Never render block characters (`█`/`░`) for stamp progress.
 */

import React from 'react';
import { progressSlots } from '@/components/wallet/design-system';

export type StampShape = 'circle' | 'square' | 'star' | 'heart' | 'diamond' | 'hexagon';

/** Outline paths in a 24×24 viewBox. */
const SHAPE_PATHS: Record<StampShape, string> = {
  circle: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z',
  square: 'M4 4h16v16H4z',
  star: 'M12 2.6l2.9 5.88 6.5.95-4.7 4.58 1.1 6.46L12 17.4l-5.8 3.07 1.1-6.46-4.7-4.58 6.5-.95L12 2.6z',
  heart: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z',
  diamond: 'M12 2l10 10-10 10L2 12z',
  hexagon: 'M21 16.5l-9 5.2-9-5.2v-9l9-5.2 9 5.2z',
};

export interface StampIconProps {
  shape?: StampShape;
  /** True renders the collected / punched stamp. */
  filled?: boolean;
  /** Accent for filled slots (design-system `palette.accent`). */
  filledColor: string;
  /** Soft accent for empty slots (design-system `palette.accentSoft`). */
  emptyColor: string;
  className?: string;
}

/**
 * @description One stamp slot — filled or empty — as a real SVG glyph.
 */
export function StampIcon({
  shape = 'circle',
  filled = false,
  filledColor,
  emptyColor,
  className = 'w-5 h-5',
}: StampIconProps) {
  const path = SHAPE_PATHS[shape] ?? SHAPE_PATHS.circle;
  const color = filled ? filledColor : emptyColor;
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d={path}
        fill={filled ? color : 'none'}
        stroke={color}
        strokeWidth={filled ? 1.5 : 2}
        strokeLinejoin="round"
      />
      {filled && (
        <path
          d="M8 12.2l2.4 2.4L16 9"
          fill="none"
          stroke="rgba(0, 0, 0, 0.55)"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.55}
        />
      )}
    </svg>
  );
}

export interface StampProgressGridProps {
  filled: number;
  total: number;
  shape?: StampShape;
  filledColor: string;
  emptyColor: string;
  className?: string;
  /** Accessible description of the stamp progress. */
  label: string;
}

/**
 * @description Stamp / progress bar built from `progressSlots(filled, total)`.
 */
export function StampProgressGrid({
  filled,
  total,
  shape = 'circle',
  filledColor,
  emptyColor,
  className = '',
  label,
}: StampProgressGridProps) {
  const slots = progressSlots(filled, total);
  return (
    <div
      role="img"
      aria-label={label}
      data-testid="stamp-progress-grid"
      className={`flex flex-wrap items-center justify-center gap-1.5 ${className}`}
    >
      {slots.map((slot, i) => (
        <StampIcon
          key={i}
          shape={shape}
          filled={slot === 'filled'}
          filledColor={filledColor}
          emptyColor={emptyColor}
          className="w-5 h-5"
        />
      ))}
    </div>
  );
}
