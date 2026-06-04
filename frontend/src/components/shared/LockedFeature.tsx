/**
 * LockedFeature fallback component.
 *
 * Displayed when a tenant tries to access a feature not included
 * in their current subscription plan.
 */

'use client';

import React from 'react';

export interface LockedFeatureProps {
  featureName: string;
  requiredPlan: string;
  onUpgrade?: () => void;
}

function LockIcon({ className }: { className?: string }) {
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
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export function LockedFeature({ featureName, requiredPlan, onUpgrade }: LockedFeatureProps) {
  return (
    <div className="flex flex-col items-center gap-4 p-8 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900">
      <div className="flex items-center justify-center w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
        <LockIcon className="w-7 h-7" />
      </div>
      <div className="text-center space-y-1">
        <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
          Función bloqueada
        </h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {featureName} no está disponible en tu plan actual.
        </p>
        <p className="text-xs text-neutral-400 dark:text-neutral-500">
          Requiere plan: <span className="font-medium text-neutral-600 dark:text-neutral-300">{requiredPlan}</span>
        </p>
      </div>
      {onUpgrade && (
        <button
          type="button"
          onClick={onUpgrade}
          className="px-5 py-2 text-sm font-medium text-white rounded-lg bg-purple-600 hover:bg-purple-700 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          Mejorar plan
        </button>
      )}
    </div>
  );
}
