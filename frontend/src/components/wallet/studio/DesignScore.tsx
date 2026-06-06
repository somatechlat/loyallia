/**
 * Design score panel for the Wallet Pass Studio sidebar.
 *
 * Displays the overall score, level badge, and a per-check list.
 */

import React from 'react';
import type { DesignScoreResult } from '@/hooks/useDesignScore';

export interface DesignScoreProps {
  result: DesignScoreResult;
}

const LEVEL_CONFIG: Record<
  DesignScoreResult['level'],
  { label: string; colorClass: string; barColorClass: string }
> = {
  excelente: {
    label: 'EXCELENTE',
    colorClass: 'text-green-600 dark:text-green-400',
    barColorClass: 'bg-green-500',
  },
  bueno: {
    label: 'BUENO',
    colorClass: 'text-blue-600 dark:text-blue-400',
    barColorClass: 'bg-blue-500',
  },
  aceptable: {
    label: 'ACEPTABLE',
    colorClass: 'text-yellow-600 dark:text-yellow-400',
    barColorClass: 'bg-yellow-500',
  },
  necesita_trabajo: {
    label: 'NECESITA TRABAJO',
    colorClass: 'text-red-600 dark:text-red-400',
    barColorClass: 'bg-red-500',
  },
};

function ScoreBar({ score, colorClass }: { score: number; colorClass: string }) {
  const filled = Math.round(score);
  const empty = 10 - filled;
  return (
    <span className={`font-mono text-sm tracking-wider ${colorClass}`}>
      {'█'.repeat(filled)}
      {'░'.repeat(empty)}
    </span>
  );
}

export function DesignScore({ result }: DesignScoreProps) {
  const config = LEVEL_CONFIG[result.level];

  return (
    <div className="bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 p-4">
      <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-3">
        📊 Score de Diseño
      </h3>

      <div className="flex items-center gap-2 mb-3">
        <ScoreBar score={result.score} colorClass={config.barColorClass} />
        <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
          {result.score.toFixed(1)}/10
        </span>
        <span className={`text-xs font-bold uppercase ${config.colorClass}`}>
          {result.level === 'excelente' ? '✓ ' : ''}
          {config.label}
        </span>
      </div>

      <ul className="space-y-1.5">
        {result.checks.map((check) => (
          <li key={check.id} className="flex items-start gap-2 text-sm">
            <span className="mt-0.5 flex-shrink-0">
              {check.passed ? (
                <span className="text-green-500">✅</span>
              ) : (
                <span className="text-yellow-500">⚠️</span>
              )}
            </span>
            <div className="flex-1 min-w-0">
              <span
                className={
                  check.passed
                    ? 'text-neutral-700 dark:text-neutral-300'
                    : 'text-neutral-900 dark:text-neutral-100 font-medium'
                }
              >
                {check.label}
              </span>
              {check.message && (
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  {check.message}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
