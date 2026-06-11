/**
 * Design score panel for the Wallet Pass Studio.
 *
 * Displays the overall score, level badge, and a per-check grid.
 * Responsive 2-column layout for checks.
 */

import React from 'react';
import { useI18n } from '@/lib/i18n';
import type { DesignScoreResult } from '@/hooks/useDesignScore';

export interface DesignScoreProps {
  result: DesignScoreResult;
}

const LEVEL_CONFIG: Record<
  DesignScoreResult['level'],
  { labelKey: string; dotClass: string; badgeClass: string }
> = {
  excelente: {
    labelKey: 'wallet.studio.score.excellent',
    dotClass: 'bg-green-500',
    badgeClass: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800',
  },
  bueno: {
    labelKey: 'wallet.studio.score.good',
    dotClass: 'bg-blue-500',
    badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  },
  aceptable: {
    labelKey: 'wallet.studio.score.fair',
    dotClass: 'bg-yellow-500',
    badgeClass: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
  },
  necesita_trabajo: {
    labelKey: 'wallet.studio.score.needsWork',
    dotClass: 'bg-red-500',
    badgeClass: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800',
  },
};

function CheckIcon({ passed }: { passed: boolean }) {
  if (passed) {
    return (
      <svg className="w-4 h-4 text-green-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    );
  }
  return (
    <svg className="w-4 h-4 text-amber-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

export function DesignScore({ result }: DesignScoreProps) {
  const { t } = useI18n();
  const config = LEVEL_CONFIG[result.level];
  const passedCount = result.checks.filter((c) => c.passed).length;
  const progressPct = (result.score / 10) * 100;

  return (
    <div className="card p-5 space-y-4">
      {/* Header: score + progress + badge */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        {/* Big score circle */}
        <div className="flex items-center gap-3">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold border-2 ${config.badgeClass}`}
          >
            {result.score.toFixed(1)}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-surface-900 dark:text-white">
              {t('wallet.studio.score.title')}
            </h3>
            <span className={`inline-flex items-center gap-1 text-xs font-bold uppercase ${config.badgeClass} px-2 py-0.5 rounded-md border mt-0.5`}>
              <span className={`w-1.5 h-1.5 rounded-full ${config.dotClass}`} />
              {t(config.labelKey)}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-surface-500 dark:text-surface-400">
              {t('wallet.studio.score.checksPassed', { passed: passedCount, total: result.checks.length })}
            </span>
            <span className="text-[11px] font-mono text-surface-600 dark:text-surface-300">
              {result.score.toFixed(1)}/10
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-surface-200 dark:bg-surface-700 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${config.dotClass}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Checks grid — 2 columns on sm+, 1 column on mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
        {result.checks.map((check) => (
          <div
            key={check.id}
            className={`flex items-start gap-2 rounded-lg p-2 transition-colors ${
              check.passed
                ? 'bg-surface-50 dark:bg-surface-900/50'
                : 'bg-amber-50/60 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30'
            }`}
          >
            <CheckIcon passed={check.passed} />
            <div className="flex-1 min-w-0">
              <span
                className={`text-xs leading-tight block ${
                  check.passed
                    ? 'text-surface-600 dark:text-surface-400'
                    : 'text-surface-800 dark:text-surface-200 font-medium'
                }`}
              >
                {check.label}
              </span>
              {check.message && (
                <p className="text-[10px] text-surface-500 dark:text-surface-500 mt-0.5 leading-tight">
                  {check.message}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
