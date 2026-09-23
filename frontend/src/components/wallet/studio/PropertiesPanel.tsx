'use client';

import React from 'react';
import { useI18n } from '@/lib/i18n';
import type { WalletPassStudioState } from '@/components/wallet/types/unified-state';

interface PropertiesPanelProps {
  state: WalletPassStudioState;
  selectedFieldId: string | null;
  designScore?: number;
}

function ScoreCircle({ score }: { score: number }) {
  const level = score >= 9 ? 'excellent' : score >= 7 ? 'good' : score >= 5 ? 'fair' : 'needsWork';
  const colors = {
    excellent: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400', ring: 'stroke-emerald-500' },
    good: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', ring: 'stroke-blue-500' },
    fair: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400', ring: 'stroke-amber-500' },
    needsWork: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400', ring: 'stroke-red-500' },
  };
  const c = colors[level];
  const pct = Math.round((score / 10) * 100);
  const circumference = 2 * Math.PI * 18;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-12 h-12">
        <svg className="w-12 h-12 -rotate-90" viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="18" fill="none" strokeWidth="3" className="stroke-neutral-200 dark:stroke-neutral-700" />
          <circle cx="20" cy="20" r="18" fill="none" strokeWidth="3" className={c.ring} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} />
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${c.text}`}>{score.toFixed(1)}</span>
      </div>
    </div>
  );
}

export function PropertiesPanel({ state, selectedFieldId, designScore }: PropertiesPanelProps) {
  const { t } = useI18n();

  const selectedField = selectedFieldId ? state.fields.find((f) => f.id === selectedFieldId) : null;

  // Field selected — show field properties
  if (selectedField) {
    return (
      <aside className="w-[280px] h-full bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 flex flex-col shrink-0 overflow-y-auto">
        <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
          <h3 className="text-xs font-bold text-neutral-800 dark:text-neutral-100 uppercase tracking-wider">{t('wallet.studio.properties.fieldTitle')}</h3>
        </div>
        <div className="p-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{t('wallet.studio.properties.label')}</label>
            <p className="text-sm font-medium text-neutral-900 dark:text-white">{selectedField.label || '—'}</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{t('wallet.studio.properties.value')}</label>
            <p className="text-sm text-neutral-700 dark:text-neutral-300">{selectedField.value || '—'}</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{t('wallet.studio.properties.group')}</label>
            <p className="text-sm text-neutral-700 dark:text-neutral-300 capitalize">{selectedField.fieldGroup}</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{t('wallet.studio.properties.platform')}</label>
            <div className="flex gap-2">
              <span className={`text-xs px-2 py-0.5 rounded ${selectedField.showOnApple ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400'}`}>
                {t('wallet.studio.properties.apple')}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded ${selectedField.showOnGoogle ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400'}`}>
                {t('wallet.studio.properties.google')}
              </span>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">{t('wallet.studio.properties.type')}</label>
            <p className="text-sm text-neutral-700 dark:text-neutral-300 capitalize">{selectedField.dataType || 'text'}</p>
          </div>
        </div>
      </aside>
    );
  }

  // Nothing selected — card overview
  return (
    <aside className="w-[280px] h-full bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 flex flex-col shrink-0 overflow-y-auto">
      <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
        <h3 className="text-xs font-bold text-neutral-800 dark:text-neutral-100 uppercase tracking-wider">{t('wallet.studio.properties.cardOverview')}</h3>
      </div>
      <div className="p-4 space-y-4">
        {/* Card info */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-[10px] text-neutral-500 dark:text-neutral-400">{t('wallet.studio.properties.type')}</span>
            <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200 capitalize">{state.cardType.replace(/_/g, ' ')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[10px] text-neutral-500 dark:text-neutral-400">{t('wallet.studio.properties.industry')}</span>
            <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200 capitalize">{state.industry}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[10px] text-neutral-500 dark:text-neutral-400">{t('wallet.studio.properties.fields')}</span>
            <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200">{state.fields.length}</span>
          </div>
        </div>

        {/* Design Score */}
        {typeof designScore === 'number' && (
          <div className="border-t border-neutral-100 dark:border-neutral-800 pt-4">
            <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2 block">{t('wallet.studio.properties.designScore')}</label>
            <div className="flex justify-center">
              <ScoreCircle score={designScore} />
            </div>
          </div>
        )}

        {/* Platform status */}
        <div className="border-t border-neutral-100 dark:border-neutral-800 pt-4">
          <label className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2 block">{t('wallet.studio.properties.platformStatus')}</label>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs text-neutral-700 dark:text-neutral-300">{t('wallet.studio.properties.appleReady')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs text-neutral-700 dark:text-neutral-300">{t('wallet.studio.properties.googleReady')}</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
