/**
 * LimitReached fallback component.
 *
 * Displayed when a tenant has reached their plan quota
 * for a specific resource.
 */

'use client';

import React from 'react';

export interface LimitReachedProps {
  limitName: string;
  current: number;
  limit: number;
  onUpgrade?: () => void;
}

function AlertTriangleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

export function LimitReached({ limitName, current, limit, onUpgrade }: LimitReachedProps) {
  const percentage = limit > 0 ? Math.min(100, Math.round((current / limit) * 100)) : 0;
  const isAtLimit = current >= limit;

  return (
    <div className="flex flex-col gap-4 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
      <div className="flex items-center gap-3">
        <div
          className={`flex items-center justify-center w-10 h-10 rounded-full ${
            isAtLimit
              ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
              : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
          }`}
        >
          <AlertTriangleIcon className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Límite alcanzado
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Has usado todo tu cupo de {limitName}.
          </p>
        </div>
      </div>

      {/* Usage bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-neutral-500 dark:text-neutral-400">
          <span>Uso actual</span>
          <span className="tabular-nums">
            {current} / {limit}
          </span>
        </div>
        <div className="w-full h-2.5 rounded-full bg-neutral-200 dark:bg-neutral-700 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              isAtLimit ? 'bg-red-500' : 'bg-amber-500'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {onUpgrade && (
        <button
          type="button"
          onClick={onUpgrade}
          className="w-full px-4 py-2 text-sm font-medium text-white rounded-lg bg-purple-600 hover:bg-purple-700 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          Mejorar plan
        </button>
      )}
    </div>
  );
}
