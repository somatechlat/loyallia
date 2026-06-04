/**
 * LockedFeature overlay — shown when a plan feature is unavailable.
 *
 * Displays a darkened overlay with upgrade messaging.
 */

'use client';

import React from 'react';

export interface LockedFeatureProps {
  featureName: string;
  requiredPlan?: string;
  children: React.ReactNode;
  isLocked: boolean;
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
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

export function LockedFeature({
  featureName,
  requiredPlan = 'Profesional',
  children,
  isLocked,
}: LockedFeatureProps) {
  if (!isLocked) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      {children}
      <div className="absolute inset-0 bg-neutral-900/60 dark:bg-neutral-950/70 backdrop-blur-[2px] rounded-lg flex flex-col items-center justify-center gap-3 p-4 z-10">
        <div className="w-12 h-12 rounded-full bg-neutral-800 dark:bg-neutral-700 flex items-center justify-center">
          <LockIcon className="w-6 h-6 text-neutral-300" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-white">
            {featureName}
          </p>
          <p className="text-xs text-neutral-300 mt-1">
            Disponible en plan {requiredPlan}
          </p>
        </div>
        <button
          type="button"
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white rounded-lg bg-purple-600 hover:bg-purple-700 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <SparklesIcon className="w-3.5 h-3.5" />
          Actualizar plan
        </button>
      </div>
    </div>
  );
}
