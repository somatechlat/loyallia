'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useI18n } from '@/lib/i18n';
import toast from 'react-hot-toast';
import api, { superAdminApi } from '@/lib/api';
import IntegrationSettings from '@/components/superadmin/settings/IntegrationSettings';
import PlatformSettingsSection from '@/components/superadmin/settings/PlatformSettingsSection';
import SysAdminOperations from '@/components/superadmin/settings/SysAdminOperations';
import { Integration, PlatformSetting } from '@/components/superadmin/settings/types';

type Tab = 'overview' | 'integrations' | 'platform' | 'security' | 'workers' | 'operations';

const TABS: { key: Tab; labelKey: string }[] = [
  { key: 'overview', labelKey: 'superadmin.settings.tabs.overview' },
  { key: 'integrations', labelKey: 'superadmin.settings.tabs.integrations' },
  { key: 'platform', labelKey: 'superadmin.settings.tabs.platform' },
  { key: 'security', labelKey: 'superadmin.settings.tabs.security' },
  { key: 'workers', labelKey: 'superadmin.settings.tabs.workers' },
  { key: 'operations', labelKey: 'superadmin.settings.tabs.operations' },
];

export default function SuperAdminSettings() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [search, setSearch] = useState('');

  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [platformSettings, setPlatformSettings] = useState<PlatformSetting[]>([]);
  const [platformMode, setPlatformMode] = useState<'development' | 'production'>('production');

  const [settingForm, setSettingForm] = useState<Record<string, string>>({});
  const [savingSetting, setSavingSetting] = useState<string | null>(null);

  const loadIntegrations = useCallback(() => {
    api.get('/api/v1/admin/platform/integrations/')
      .then(({ data }) => setIntegrations(data))
      .catch(() => toast.error(t('superadmin.settings.loadIntegrationsError')))
      .finally(() => setLoading(false));
  }, [t]);

  const loadSettings = useCallback(() => {
    api.get('/api/v1/admin/platform/settings/')
      .then(({ data }) => {
        setPlatformSettings(data);
        const form: Record<string, string> = {};
        data.forEach((s: PlatformSetting) => { form[s.key] = s.value; });
        form['PLATFORM_MODE'] = platformMode;
        setSettingForm(form);
      })
      .catch(() => toast.error(t('superadmin.settings.loadSettingsError')));
  }, [t, platformMode]);

  const loadPlatformMode = useCallback(() => {
    superAdminApi.getPlatformMode()
      .then(({ data }) => setPlatformMode(data.mode === 'development' ? 'development' : 'production'))
      .catch(() => toast.error(t('superadmin.settings.loadPlatformModeError')));
  }, [t]);

  useEffect(() => {
    loadIntegrations();
    loadSettings();
    loadPlatformMode();
  }, [loadIntegrations, loadSettings, loadPlatformMode]);

  const updateSetting = async (key: string) => {
    const value = settingForm[key];
    if (value === undefined) return;
    setSavingSetting(key);
    try {
      const { data } = await api.put(`/api/v1/admin/platform/settings/${key}/`, { value });
      toast.success(data.message || t('superadmin.settings.platform.settingUpdated', { key }));
      loadSettings();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('superadmin.settings.platform.updateError', { key });
      toast.error(msg);
    } finally {
      setSavingSetting(null);
    }
  };

  const integrationStats = useMemo(() => {
    const total = integrations.length;
    const active = integrations.filter(i => i.enabled && i.configured).length;
    const needsConfig = integrations.filter(i => !i.configured).length;
    return { total, active, needsConfig };
  }, [integrations]);

  return (
    <div className="space-y-6 max-w-6xl">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-surface-900 dark:text-white tracking-tight">
            {t('superadmin.settings.title')}
          </h1>
          <p className="text-surface-500 text-sm mt-0.5">{t('superadmin.settings.subtitle')}</p>
        </div>
        <input
          type="text"
          placeholder={t('superadmin.settings.searchPlaceholder')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="px-3 py-2 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-sm w-64"
        />
      </header>

      <nav className="flex gap-1 border-b border-surface-200 dark:border-surface-700 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
            }`}
          >
            {t(tab.labelKey)}
          </button>
        ))}
      </nav>

      {activeTab === 'overview' && (
        <OverviewTab
          mode={platformMode}
          integrationStats={integrationStats}
          settings={platformSettings}
          integrations={integrations}
        />
      )}

      {activeTab === 'integrations' && (
        <IntegrationSettings
          integrations={integrations}
          loading={loading}
          onRefresh={loadIntegrations}
        />
      )}

      {activeTab === 'platform' && (
        <PlatformSettingsSection
          settings={platformSettings.filter(s => !['rate_limit', 'worker'].includes(s.category))}
          form={settingForm}
          savingKey={savingSetting}
          onChange={(k, v) => setSettingForm(prev => ({ ...prev, [k]: v }))}
          onSave={updateSetting}
          searchQuery={search || undefined}
        />
      )}

      {activeTab === 'security' && (
        <PlatformSettingsSection
          settings={platformSettings.filter(s => s.category === 'rate_limit')}
          form={settingForm}
          savingKey={savingSetting}
          onChange={(k, v) => setSettingForm(prev => ({ ...prev, [k]: v }))}
          onSave={updateSetting}
          searchQuery={search || undefined}
        />
      )}

      {activeTab === 'workers' && (
        <PlatformSettingsSection
          settings={platformSettings.filter(s => s.category === 'worker')}
          form={settingForm}
          savingKey={savingSetting}
          onChange={(k, v) => setSettingForm(prev => ({ ...prev, [k]: v }))}
          onSave={updateSetting}
          searchQuery={search || undefined}
        />
      )}

      {activeTab === 'operations' && (
        <SysAdminOperations mode={platformMode} />
      )}

      <footer className="text-center py-4 border-t border-surface-100 dark:border-surface-800">
        <p className="text-[10px] text-surface-300 dark:text-surface-600 font-mono tracking-wider">
          loyallia v{process.env.NEXT_PUBLIC_APP_VERSION || 'dev'} · {platformMode}
        </p>
      </footer>
    </div>
  );
}

function OverviewTab({
  mode, integrationStats, settings, integrations,
}: {
  mode: string;
  integrationStats: { total: number; active: number; needsConfig: number };
  settings: PlatformSetting[];
  integrations: Integration[];
}) {
  const { t } = useI18n();
  const backupSettings = settings.filter(s => s.category === 'backup');

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-700 p-5">
          <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2">
            {t('superadmin.settings.overview.mode')}
          </p>
          <p className={`text-2xl font-black ${mode === 'production' ? 'text-emerald-600' : 'text-amber-600'}`}>
            {mode.toUpperCase()}
          </p>
        </div>
        <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-700 p-5">
          <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2">
            {t('superadmin.settings.overview.integrations')}
          </p>
          <p className="text-2xl font-black text-surface-900 dark:text-white">
            {integrationStats.active}/{integrationStats.total}
          </p>
          {integrationStats.needsConfig > 0 && (
            <p className="text-xs text-amber-600 mt-1">{integrationStats.needsConfig} {t('superadmin.settings.overview.needsConfig')}</p>
          )}
        </div>
        <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-700 p-5">
          <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2">
            {t('superadmin.settings.overview.settings')}
          </p>
          <p className="text-2xl font-black text-surface-900 dark:text-white">{settings.length}</p>
          <p className="text-xs text-surface-400 mt-1">
            {new Set(settings.map(s => s.category)).size} {t('superadmin.settings.overview.categories')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-700 p-5">
          <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3">
            {t('superadmin.settings.overview.backups')}
          </p>
          {backupSettings.slice(0, 4).map(s => (
            <div key={s.key} className="flex justify-between py-1.5 border-b border-surface-50 dark:border-surface-800 last:border-0">
              <span className="text-sm text-surface-600 dark:text-surface-400">{s.description || s.key}</span>
              <span className="text-sm font-medium text-surface-900 dark:text-white">{s.value}</span>
            </div>
          ))}
        </div>
        <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-700 p-5">
          <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3">
            {t('superadmin.settings.overview.integrationsStatus')}
          </p>
          {integrations.slice(0, 6).map(integ => (
            <div key={integ.key} className="flex items-center justify-between py-1.5 border-b border-surface-50 dark:border-surface-800 last:border-0">
              <span className="text-sm text-surface-600 dark:text-surface-400">{integ.name}</span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                integ.enabled && integ.configured
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                  : integ.configured
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    : 'bg-surface-100 text-surface-500 dark:bg-surface-800 dark:text-surface-400'
              }`}>
                {integ.enabled && integ.configured ? '✓' : integ.configured ? '⏸' : '—'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
