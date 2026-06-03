'use client';

import { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import type { WalletPlatform, ProgramOption } from './CampaignWizard';

interface ProgramSelectorProps {
  programs: ProgramOption[];
  programCounts: Record<string, { total: number; apple: number; google: number }>;
  selectedId: string | 'all';
  isWallet: boolean;
  onSelect: (id: string) => void;
}

export default function ProgramSelector({ programs, programCounts, selectedId, isWallet, onSelect }: ProgramSelectorProps) {
  const { t } = useI18n();
  const [search, setSearch] = useState('');

  const filtered = programs.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="relative">
        <input
          type="text"
          placeholder={t('campaigns.searchProgram')}
          className="input w-full pr-10"
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
        />
        <svg className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-surface-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
        </svg>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map(program => {
          const counts = programCounts[program.id] || { total: 0, apple: 0, google: 0 };
          const isSelected = selectedId === program.id;
          return (
            <button
              key={program.id}
              type="button"
              onClick={() => onSelect(program.id)}
              className={`text-left p-4 rounded-xl border-2 transition-all duration-200
                ${isSelected
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 shadow-md'
                  : 'border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 hover:border-surface-300 dark:hover:border-surface-600'
                }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-surface-900 dark:text-white truncate">{program.name}</span>
                {isSelected && (
                  <svg className="w-5 h-5 text-brand-500 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                )}
              </div>
              <p className="text-xs text-brand-600 dark:text-brand-400 font-bold mt-2">
                👥 {counts.total.toLocaleString()} {t('campaigns.enrolled')}
              </p>
              {isWallet && counts.total > 0 && (
                <p className="text-[10px] text-surface-400 mt-1">
                  🍎 {counts.apple.toLocaleString()} | 🤖 {counts.google.toLocaleString()}
                </p>
              )}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => onSelect('all')}
        className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200
          ${selectedId === 'all'
            ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
            : 'border-dashed border-surface-300 dark:border-surface-600 hover:border-brand-300'
          }`}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🌍</span>
          <div>
            <p className="font-semibold text-sm text-surface-900 dark:text-white">{t('campaigns.allPrograms')}</p>
            <p className="text-xs text-surface-500">{t('campaigns.allProgramsDesc')}</p>
          </div>
        </div>
      </button>
    </div>
  );
}
