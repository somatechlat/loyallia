/**
 * Visual stamp grid preview for stamp cards.
 *
 * Renders filled and empty stamp slots with configurable shapes,
 * colors, icons, and layout modes.
 */

'use client';

import React, { useMemo } from 'react';
import { useI18n } from '@/lib/i18n';
import { getIconById } from '@/components/wallet/icon-library';

export interface StampGridProps {
  stampsRequired: number;
  stampsEarned?: number;
  stampShape: 'circle' | 'square' | 'star' | 'heart' | 'diamond' | 'hexagon';
  stampIcon: string;
  stampColor: string;
  layout: 'grid' | 'linear';
}

function StampShape({
  shape,
  filled,
  color,
  className,
}: {
  shape: StampGridProps['stampShape'];
  filled: boolean;
  color: string;
  className?: string;
}) {
  const fillColor = filled ? color : 'transparent';
  const strokeColor = filled ? color : '#9CA3AF';

  const paths: Record<StampGridProps['stampShape'], React.ReactNode> = {
    circle: <circle cx="12" cy="12" r="10" fill={fillColor} stroke={strokeColor} strokeWidth="1.5" />,
    square: (
      <rect x="2" y="2" width="20" height="20" rx="3" fill={fillColor} stroke={strokeColor} strokeWidth="1.5" />
    ),
    star: (
      <path
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    ),
    heart: (
      <path
        d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    ),
    diamond: (
      <path
        d="M12 2l10 10-10 10L2 12z"
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    ),
    hexagon: (
      <path
        d="M21 16.5l-9 5.2-9-5.2v-9l9-5.2 9 5.2z"
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    ),
  };

  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      {paths[shape]}
    </svg>
  );
}

function StampIcon({ iconId, className }: { iconId: string; className?: string }) {
  const icon = getIconById(iconId);
  if (!icon || !icon.svgPath) {
    return null;
  }
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={icon.svgPath} />
    </svg>
  );
}

export function StampGrid({
  stampsRequired,
  stampsEarned = 0,
  stampShape,
  stampIcon,
  stampColor,
  layout,
}: StampGridProps) {
  const slots = useMemo(() => {
    return Array.from({ length: Math.max(0, Math.min(stampsRequired, 20)) }, (_, i) => ({
      index: i,
      filled: i < stampsEarned,
    }));
  }, [stampsRequired, stampsEarned]);

  const gridCols = useMemo(() => {
    if (layout === 'linear') return 'grid-cols-none flex';
    if (stampsRequired <= 6) return 'grid-cols-3';
    if (stampsRequired <= 8) return 'grid-cols-4';
    if (stampsRequired <= 10) return 'grid-cols-5';
    if (stampsRequired <= 12) return 'grid-cols-4';
    if (stampsRequired <= 16) return 'grid-cols-4';
    return 'grid-cols-5';
  }, [stampsRequired, layout]);

  const { t } = useI18n();

  if (slots.length === 0) {
    return (
      <div className="text-xs text-neutral-400 dark:text-neutral-500 text-center py-4">
        {t('wallet.studio.stamp.noStamps')}
      </div>
    );
  }

  return (
    <div
      className={`${layout === 'linear' ? 'flex gap-1.5 overflow-x-auto py-1' : `grid ${gridCols} gap-1.5`}`}
      data-testid="stamp-grid"
    >
      {slots.map((slot) => (
        <div
          key={slot.index}
          className="relative flex items-center justify-center"
          data-testid={`stamp-slot-${slot.index}`}
          data-filled={slot.filled}
        >
          <StampShape
            shape={stampShape}
            filled={slot.filled}
            color={stampColor}
            className="w-7 h-7"
          />
          {slot.filled && stampIcon && (
            <div className="absolute inset-0 flex items-center justify-center">
              <StampIcon iconId={stampIcon} className="w-3.5 h-3.5 text-white" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
