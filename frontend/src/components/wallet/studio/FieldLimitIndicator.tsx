/**
 * Visual progress bar showing field usage vs limits.
 */

'use client';

import React from 'react';
import type { FieldGroup } from '@/components/wallet/types/unified-state';
import { FIELD_GROUP_METADATA } from '@/components/wallet/constants';

export interface FieldLimitIndicatorProps {
  group: FieldGroup;
  current: number;
  max: number;
}

function getBarColor(percentage: number, isOverLimit: boolean): string {
  if (isOverLimit) return 'bg-red-500';
  if (percentage < 50) return 'bg-emerald-500';
  if (percentage <= 80) return 'bg-amber-500';
  return 'bg-red-500';
}

function getBackgroundColor(percentage: number, isOverLimit: boolean): string {
  if (isOverLimit) return 'bg-red-100 dark:bg-red-900/30';
  if (percentage < 50) return 'bg-emerald-100 dark:bg-emerald-900/30';
  if (percentage <= 80) return 'bg-amber-100 dark:bg-amber-900/30';
  return 'bg-red-100 dark:bg-red-900/30';
}

function getTextColor(percentage: number, isOverLimit: boolean): string {
  if (isOverLimit) return 'text-red-700 dark:text-red-300';
  if (percentage < 50) return 'text-emerald-700 dark:text-emerald-300';
  if (percentage <= 80) return 'text-amber-700 dark:text-amber-300';
  return 'text-red-700 dark:text-red-300';
}

export function FieldLimitIndicator({ group, current, max }: FieldLimitIndicatorProps) {
  const percentage = max > 0 ? Math.min((current / max) * 100, 100) : 0;
  const isOverLimit = current > max;
  const meta = FIELD_GROUP_METADATA[group];

  return (
    <div
      className="flex items-center gap-3"
      role="region"
      aria-label={`${meta.label} field usage: ${current} of ${max}`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300 truncate">
            {meta.label}
          </span>
          <span className={`text-xs font-semibold tabular-nums ${getTextColor(percentage, isOverLimit)}`}>
            {current} / {max}
          </span>
        </div>
        <div className={`h-2 w-full rounded-full overflow-hidden ${getBackgroundColor(percentage, isOverLimit)}`}>
          <div
            className={`h-full rounded-full transition-all duration-300 ${getBarColor(percentage, isOverLimit)}`}
            style={{ width: `${percentage}%` }}
            role="progressbar"
            aria-valuenow={current}
            aria-valuemin={0}
            aria-valuemax={max}
            aria-label={`${meta.label} usage`}
          />
        </div>
      </div>
      {isOverLimit && (
        <div className="flex-shrink-0" aria-label="Over limit warning">
          <svg
            className="w-4 h-4 text-red-500"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <line x1="12" x2="12" y1="9" y2="13" />
            <line x1="12" x2="12.01" y1="17" y2="17" />
          </svg>
        </div>
      )}
    </div>
  );
}
