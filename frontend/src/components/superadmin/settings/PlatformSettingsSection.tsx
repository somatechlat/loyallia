'use client';

import { useMemo } from 'react';
import { useI18n } from '@/lib/i18n';
import { PlatformSetting } from './types';

interface PlatformSettingsSectionProps {
  settings: PlatformSetting[];
  form: Record<string, string>;
  savingKey: string | null;
  onChange: (key: string, value: string) => void;
  onSave: (key: string) => void;
  categoryFilter?: string;
  searchQuery?: string;
}

const CATEGORY_META: Record<string, { icon: string; labelKey: string }> = {
  system_mode: { icon: '⚙️', labelKey: 'superadmin.settings.categories.systemMode' },
  backup: { icon: '💾', labelKey: 'superadmin.settings.categories.backup' },
  url: { icon: '🔗', labelKey: 'superadmin.settings.categories.urls' },
  notification: { icon: '📧', labelKey: 'superadmin.settings.categories.notifications' },
  wallet: { icon: '💳', labelKey: 'superadmin.settings.categories.wallet' },
  worker: { icon: '⚡', labelKey: 'superadmin.settings.categories.workers' },
  billing: { icon: '💰', labelKey: 'superadmin.settings.categories.billing' },
  system: { icon: '🏠', labelKey: 'superadmin.settings.categories.system' },
  general: { icon: '📋', labelKey: 'superadmin.settings.categories.general' },
};

const BOOLEAN_KEYS = new Set([
  'development_mode', 'backup_encryption_enabled', 'backup_compression_enabled',
  'backup_include_media', 'backup_include_vault', 'email_use_tls',
]);

const ENUM_SELECTS: Record<string, string[]> = {
  PLATFORM_MODE: ['production', 'development'],
  backup_frequency: ['manual', 'hourly', '6h', '12h', 'daily', 'weekly'],
};

const NUMBER_KEYS = new Set([
  'TRIAL_DAYS', 'backup_hour', 'backup_minute', 'backup_retention_days',
  'celery_worker_concurrency', 'celery_task_soft_timeout', 'celery_task_hard_timeout',
  'gunicorn_workers', 'gunicorn_threads', 'gunicorn_timeout',
]);

const URL_KEYS = new Set([
  'public_base_url', 'api_base_url', 'dashboard_url', 'webhook_base_url',
  'wallet_web_service_url', 'scanner_url', 'minio_public_endpoint',
  'google_oauth_redirect_uri', 'ENROLL_BASE_URL', 'BRAND_HOME_URL',
  'whatsapp_bridge_url',
]);

function getInputType(key: string): 'toggle' | 'select' | 'number' | 'url' | 'email' | 'text' {
  if (BOOLEAN_KEYS.has(key)) return 'toggle';
  if (key in ENUM_SELECTS) return 'select';
  if (NUMBER_KEYS.has(key)) return 'number';
  if (URL_KEYS.has(key)) return 'url';
  if (key.includes('email') || key.includes('Email')) return 'email';
  return 'text';
}

export default function PlatformSettingsSection({
  settings,
  form,
  savingKey,
  onChange,
  onSave,
  categoryFilter,
  searchQuery,
}: PlatformSettingsSectionProps) {
  const { t } = useI18n();

  const filtered = useMemo(() => {
    let list = settings;
    if (categoryFilter) {
      list = list.filter(s => s.category === categoryFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(s =>
        s.key.toLowerCase().includes(q) ||
        (s.description || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [settings, categoryFilter, searchQuery]);

  const grouped = useMemo(() => {
    const groups: Record<string, PlatformSetting[]> = {};
    for (const s of filtered) {
      const cat = s.category || 'general';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(s);
    }
    return groups;
  }, [filtered]);

  if (settings.length === 0) {
    return <div className="text-sm text-surface-400 p-4">{t('common.loading')}</div>;
  }

  if (filtered.length === 0) {
    return <div className="text-sm text-surface-400 p-4">{t('common.noResults')}</div>;
  }

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([category, items]) => {
        const meta = CATEGORY_META[category] || { icon: '📋', labelKey: 'superadmin.settings.categories.general' };
        return (
          <div key={category} className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-700 shadow-sm overflow-hidden">
            <div className="px-6 py-3 bg-surface-50 dark:bg-surface-800 border-b border-surface-100 dark:border-surface-700">
              <h3 className="text-sm font-bold text-surface-800 dark:text-surface-200">
                {meta.icon} {t(meta.labelKey)}
              </h3>
            </div>
            <div className="p-4 space-y-3">
              {items.map(s => (
                <SettingRow
                  key={s.key}
                  setting={s}
                  value={form[s.key] ?? ''}
                  saving={savingKey === s.key}
                  changed={(form[s.key] ?? '') !== s.value}
                  onChange={onChange}
                  onSave={onSave}
                  t={t}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SettingRow({
  setting, value, saving, changed, onChange, onSave, t,
}: {
  setting: PlatformSetting;
  value: string;
  saving: boolean;
  changed: boolean;
  onChange: (key: string, value: string) => void;
  onSave: (key: string) => void;
  t: (key: string) => string;
}) {
  const inputType = getInputType(setting.key);

  return (
    <div className="flex items-center gap-3 py-2 border-b border-surface-50 dark:border-surface-800 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-surface-800 dark:text-surface-200 truncate">
            {setting.description || setting.key}
          </span>
          {setting.requires_restart && (
            <span className="shrink-0 text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded-full font-medium">
              ⚠ {t('superadmin.settings.requiresRestart')}
            </span>
          )}
        </div>
        <p className="text-[11px] text-surface-400 mt-0.5 font-mono">{setting.key}</p>
      </div>

      <div className="shrink-0 flex items-center gap-2">
        {inputType === 'toggle' ? (
          <button
            type="button"
            onClick={() => onChange(setting.key, value === 'true' ? 'false' : 'true')}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              value === 'true'
                ? 'bg-emerald-500'
                : 'bg-surface-300 dark:bg-surface-600'
            }`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
              value === 'true' ? 'translate-x-5' : ''
            }`} />
          </button>
        ) : inputType === 'select' ? (
          <select
            className="px-2 py-1.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-sm min-w-[140px]"
            value={value}
            onChange={(e) => onChange(setting.key, e.target.value)}
          >
            {(ENUM_SELECTS[setting.key] || []).map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        ) : inputType === 'number' ? (
          <input
            type="number"
            className="w-24 px-2 py-1.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-sm text-right"
            value={value}
            onChange={(e) => onChange(setting.key, e.target.value)}
          />
        ) : (
          <input
            type={inputType === 'email' ? 'email' : inputType === 'url' ? 'url' : 'text'}
            className="w-64 px-2 py-1.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-sm"
            value={value}
            onChange={(e) => onChange(setting.key, e.target.value)}
          />
        )}

        {inputType !== 'toggle' && (
          <button
            onClick={() => onSave(setting.key)}
            disabled={saving || !changed}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all bg-brand-500 hover:bg-brand-600 disabled:bg-surface-200 dark:disabled:bg-surface-700 text-white disabled:text-surface-400"
          >
            {saving ? '...' : t('common.save')}
          </button>
        )}
        {inputType === 'toggle' && changed && (
          <button
            onClick={() => onSave(setting.key)}
            disabled={saving}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all bg-brand-500 hover:bg-brand-600 disabled:bg-surface-200 text-white disabled:text-surface-400"
          >
            {saving ? '...' : t('common.save')}
          </button>
        )}
      </div>
    </div>
  );
}
