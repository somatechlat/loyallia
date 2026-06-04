'use client';

import { useI18n } from '@/lib/i18n';
import { PlatformSetting } from './types';

/**
 * Props for the PlatformSettingsSection component.
 */
interface PlatformSettingsSectionProps {
  /** List of platform settings */
  settings: PlatformSetting[];
  /** Current form values */
  form: Record<string, string>;
  /** Key currently being saved */
  savingKey: string | null;
  /** Change handler for a setting */
  onChange: (key: string, value: string) => void;
  /** Save handler for a setting */
  onSave: (key: string) => void;
}

/**
 * @description SuperAdmin panel for viewing and editing platform-wide settings.
 * @param {PlatformSettingsSectionProps} props - Component props
 * @returns JSX.Element
 */
export default function PlatformSettingsSection({
  settings,
  form,
  savingKey,
  onChange,
  onSave,
}: PlatformSettingsSectionProps) {
  const { t } = useI18n();
  return (
    <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-700 shadow-sm p-6 space-y-6">
      <h2 className="text-lg font-bold text-surface-900 dark:text-white border-b border-surface-100 pb-3">{t('superadmin.settings.platformSettingsTitle')}</h2>
      {settings.length === 0 ? (
        <div className="text-sm text-surface-400">{t('common.loading')}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {settings.map((s) => (
            <div key={s.key}>
              <label className="block text-sm font-medium text-surface-700 mb-1">
                {s.description || s.key}
                {s.requires_restart && (
                  <span className="ml-2 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
                    {t('superadmin.settings.requiresRestart')}
                  </span>
                )}
              </label>
              <div className="flex gap-2">
                {s.key === 'PLATFORM_MODE' ? (
                  <select
                    className="flex-1 px-3 py-2 rounded-xl border border-surface-200 dark:border-surface-700 bg-white/60 text-sm"
                    value={form[s.key] || 'production'}
                    onChange={(e) => onChange(s.key, e.target.value)}
                  >
                    <option value="production">{t('superadmin.settings.platformMode.productionOption')}</option>
                    <option value="development">{t('superadmin.settings.platformMode.developmentOption')}</option>
                  </select>
                ) : (
                  <input
                    type={s.key.includes('DAYS') || s.key.includes('PRICE') || s.key.includes('RATE') ? 'number' : 'text'}
                    step={s.key.includes('RATE') ? '0.01' : undefined}
                    className="flex-1 px-3 py-2 rounded-xl border border-surface-200 dark:border-surface-700 bg-white/60 text-sm"
                    value={form[s.key] || ''}
                    onChange={(e) => onChange(s.key, e.target.value)}
                  />
                )}
                <button
                  onClick={() => onSave(s.key)}
                  disabled={savingKey === s.key || (form[s.key] ?? '') === s.value}
                  className="bg-brand-500 hover:bg-brand-600 disabled:bg-surface-300 text-white disabled:text-surface-500 px-3 py-2 rounded-xl text-sm font-medium transition-all"
                >
                  {savingKey === s.key ? t('common.saving') : t('common.save')}
                </button>
              </div>
              <p className="text-xs text-surface-400 mt-1">{t('superadmin.settings.lastUpdated')}: {new Date(s.updated_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
