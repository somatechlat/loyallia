/**
 * Design score suggestions modal with one-click auto-fix actions.
 */

'use client';

import React from 'react';
import { useI18n } from '@/lib/i18n';
import type { DesignScoreResult } from '@/hooks/useDesignScore';

export interface DesignScoreSuggestionsProps {
  result: DesignScoreResult;
  isOpen: boolean;
  onClose: () => void;
  onFixContrast: () => void;
  onFixBarcode: () => void;
  onFixBackFields: () => void;
  onFixTerms: () => void;
  onFixContact: () => void;
  onFixRules: () => void;
  onFixColors: () => void;
  onFixPlatformCompat: () => void;
}

const FIX_MAP: Record<string, { action: string; handlerKey: keyof Omit<DesignScoreSuggestionsProps, 'result' | 'isOpen' | 'onClose'> }> = {
  contrast_text: { action: 'fixContrast', handlerKey: 'onFixContrast' },
  contrast_label: { action: 'fixContrast', handlerKey: 'onFixContrast' },
  barcode_configured: { action: 'fixBarcode', handlerKey: 'onFixBarcode' },
  has_back_fields: { action: 'fixBackFields', handlerKey: 'onFixBackFields' },
  has_terms: { action: 'fixTerms', handlerKey: 'onFixTerms' },
  has_contact_info: { action: 'fixContact', handlerKey: 'onFixContact' },
  has_program_rules: { action: 'fixRules', handlerKey: 'onFixRules' },
  back_content_length: { action: 'fixBackFields', handlerKey: 'onFixBackFields' },
  color_harmony: { action: 'fixColors', handlerKey: 'onFixColors' },
  platform_compat: { action: 'fixPlatformCompat', handlerKey: 'onFixPlatformCompat' },
};

function WrenchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

export function DesignScoreSuggestions({
  result,
  isOpen,
  onClose,
  onFixContrast,
  onFixBarcode,
  onFixBackFields,
  onFixTerms,
  onFixContact,
  onFixRules,
  onFixColors,
  onFixPlatformCompat,
}: DesignScoreSuggestionsProps) {
  const { t } = useI18n();

  const failedChecks = result.checks.filter((c) => !c.passed);
  const fixable = failedChecks.filter((c) => FIX_MAP[c.id]);
  const notFixable = failedChecks.filter((c) => !FIX_MAP[c.id]);

  const handlers: Record<string, () => void> = {
    onFixContrast,
    onFixBarcode,
    onFixBackFields,
    onFixTerms,
    onFixContact,
    onFixRules,
    onFixColors,
    onFixPlatformCompat,
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-md max-h-[85vh] overflow-y-auto rounded-xl bg-white dark:bg-neutral-900 shadow-2xl border border-neutral-200 dark:border-neutral-800 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
            🔧 {t('wallet.studio.score.suggestionsTitle')}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            aria-label={t('common.close')}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        {fixable.length === 0 && notFixable.length === 0 && (
          <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center py-4">
            {t('wallet.studio.score.noSuggestions')}
          </p>
        )}

        {fixable.length > 0 && (
          <div className="space-y-2">
            {fixable.map((check) => {
              const fix = FIX_MAP[check.id];
              const handler = fix ? handlers[fix.handlerKey] : undefined;
              return (
                <div
                  key={check.id}
                  className="flex items-start gap-3 rounded-lg p-3 bg-amber-50/60 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30"
                >
                  <div className="mt-0.5">
                    <svg className="w-4 h-4 text-amber-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-neutral-800 dark:text-neutral-200">{check.label}</p>
                    {check.message && (
                      <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5">{check.message}</p>
                    )}
                  </div>
                  {handler && (
                    <button
                      type="button"
                      onClick={() => { handler(); onClose(); }}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors shrink-0"
                    >
                      <WrenchIcon className="w-3 h-3" />
                      {t('wallet.studio.score.fix')}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {notFixable.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Requiere acción manual
            </p>
            {notFixable.map((check) => (
              <div
                key={check.id}
                className="flex items-start gap-3 rounded-lg p-3 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800"
              >
                <div className="mt-0.5">
                  <svg className="w-4 h-4 text-neutral-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">{check.label}</p>
                  {check.message && (
                    <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5">{check.message}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
