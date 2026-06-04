/**
 * LimitReached banner — shown when a plan limit is exceeded.
 *
 * Displays usage stats and upgrade CTA inline.
 */

'use client';

import React from 'react';

export interface LimitReachedProps {
  resourceName: string;
  used: number;
  limit: number;
  className?: string;
}

function AlertTriangleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  );
}

export function LimitReached({ resourceName, used, limit, className = '' }: LimitReachedProps) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 ${className}`}
      role="alert"
    >
      <AlertTriangleIcon className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
          Límite de {resourceName} alcanzado
        </p>
        <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
          {used} de {limit} usados ({pct}%)
        </p>
      </div>
      <button
        type="button"
        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white rounded-md bg-purple-600 hover:bg-purple-700 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 flex-shrink-0"
      >
        <SparklesIcon className="w-3 h-3" />
        Actualizar
      </button>
    </div>
  );
}
