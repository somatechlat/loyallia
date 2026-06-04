/**
 * Design Score panel for Wallet Pass Studio sidebar.
 *
 * Displays a color-coded score bar, checklist of design checks,
 * and a call-to-action for improvement suggestions.
 * SRS-003 Section 10.
 */

'use client';

import React from 'react';
import type {
  DesignScoreResult,
  DesignScoreCheck,
} from '@/hooks/useDesignScore';

export interface DesignScoreProps {
  result: DesignScoreResult;
  onAutoFix?: (checkId: string) => void;
  onViewDetails?: () => void;
}

/* ── Helpers ─────────────────────────────────────────────────────── */

function getLevelLabel(level: DesignScoreResult['level']): string {
  switch (level) {
    case 'excelente':
      return 'EXCELENTE';
    case 'bueno':
      return 'BUENO';
    case 'aceptable':
      return 'ACEPTABLE';
    case 'necesita_trabajo':
      return 'NECESITA TRABAJO';
  }
}

function getLevelColorClass(level: DesignScoreResult['level']): string {
  switch (level) {
    case 'excelente':
      return 'text-green-600 dark:text-green-400';
    case 'bueno':
      return 'text-blue-600 dark:text-blue-400';
    case 'aceptable':
      return 'text-yellow-600 dark:text-yellow-400';
    case 'necesita_trabajo':
      return 'text-red-600 dark:text-red-400';
  }
}

function getLevelBgClass(level: DesignScoreResult['level']): string {
  switch (level) {
    case 'excelente':
      return 'bg-green-500';
    case 'bueno':
      return 'bg-blue-500';
    case 'aceptable':
      return 'bg-yellow-500';
    case 'necesita_trabajo':
      return 'bg-red-500';
  }
}

function getLevelBorderClass(level: DesignScoreResult['level']): string {
  switch (level) {
    case 'excelente':
      return 'border-green-200 dark:border-green-800';
    case 'bueno':
      return 'border-blue-200 dark:border-blue-800';
    case 'aceptable':
      return 'border-yellow-200 dark:border-yellow-800';
    case 'necesita_trabajo':
      return 'border-red-200 dark:border-red-800';
  }
}

/* ── Inline SVGs (no lucide-react) ───────────────────────────────── */

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 3v18h18" />
      <path d="M18 17V9" />
      <path d="M13 17V5" />
      <path d="M8 17v-3" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
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
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function WarningIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function WrenchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

/* ── Sub-components ──────────────────────────────────────────────── */

function ScoreBar({
  score,
  level,
}: {
  score: number;
  level: DesignScoreResult['level'];
}) {
  const segments = 10;
  const filledCount = Math.floor(score);
  const hasPartial = score - filledCount >= 0.5;
  const bgClass = getLevelBgClass(level);

  return (
    <div
      className="flex items-center gap-0.5"
      role="img"
      aria-label={`Puntuación ${score.toFixed(1)} de 10`}
    >
      {Array.from({ length: segments }).map((_, i) => {
        const isFilled = i < filledCount;
        const isPartial = i === filledCount && hasPartial;
        return (
          <div
            key={i}
            className={`w-2 h-4 rounded-sm transition-colors ${
              isFilled
                ? bgClass
                : isPartial
                  ? bgClass + ' opacity-50'
                  : 'bg-neutral-200 dark:bg-neutral-700'
            }`}
          />
        );
      })}
    </div>
  );
}

function CheckItem({
  check,
  onAutoFix,
}: {
  check: DesignScoreCheck;
  onAutoFix?: (checkId: string) => void;
}) {
  return (
    <div className="flex items-start gap-2 py-0.5">
      <div
        className={`mt-0.5 flex-shrink-0 ${
          check.passed ? 'text-green-500' : 'text-yellow-500'
        }`}
      >
        {check.passed ? (
          <CheckIcon className="w-4 h-4" />
        ) : (
          <WarningIcon className="w-4 h-4" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <span
          className={`text-xs ${
            check.passed
              ? 'text-neutral-600 dark:text-neutral-300'
              : 'text-neutral-700 dark:text-neutral-200'
          }`}
        >
          {check.label}
          {check.message && (
            <span className="text-neutral-500 dark:text-neutral-400">
              {' '}
              {check.message}
            </span>
          )}
        </span>
        {!check.passed && onAutoFix && check.autoFixable && (
          <button
            type="button"
            onClick={() => onAutoFix(check.id)}
            className="ml-1 text-[10px] text-blue-600 dark:text-blue-400 hover:underline"
          >
            Arreglar
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────────── */

export function DesignScore({
  result,
  onAutoFix,
  onViewDetails,
}: DesignScoreProps) {
  const { score, level, checks } = result;
  const levelLabel = getLevelLabel(level);
  const levelColor = getLevelColorClass(level);
  const levelBorder = getLevelBorderClass(level);

  return (
    <div
      className={`border-t ${levelBorder} bg-white dark:bg-neutral-900`}
      data-testid="design-score-panel"
    >
      <div className="px-4 py-3 space-y-3">
        {/* Header */}
        <div className="flex items-center gap-2">
          <ChartIcon className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-700 dark:text-neutral-200">
            Design Score
          </h3>
        </div>

        {/* Score bar */}
        <div className="flex items-center gap-3">
          <ScoreBar score={score} level={level} />
          <span className={`text-sm font-bold ${levelColor}`}>
            {score.toFixed(1)}/10
          </span>
          <span className={`text-xs font-semibold ${levelColor}`}>
            {levelLabel}
          </span>
        </div>

        {/* Checklist */}
        <div className="space-y-0.5 max-h-[200px] overflow-y-auto">
          {checks.map((check) => (
            <CheckItem
              key={check.id}
              check={check}
              onAutoFix={onAutoFix}
            />
          ))}
        </div>

        {/* CTA */}
        {onViewDetails && (
          <button
            type="button"
            onClick={onViewDetails}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-md border border-neutral-200 dark:border-neutral-700 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <WrenchIcon className="w-3.5 h-3.5" />
            Ver sugerencias de mejora
            <ArrowRightIcon className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}
