'use client';

import { useEffect, useState, useCallback } from 'react';
import api, { superAdminApi } from '@/lib/api';
import IntegrationSettings from './IntegrationSettings';
import PlatformSettings from './PlatformSettings';
import SysAdminOperations from './SysAdminOperations';
import { Integration, PlatformSetting } from '@/components/superadmin/settings/types';

export default function SuperAdminSettings() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);

  const [platformSettings, setPlatformSettings] = useState<PlatformSetting[]>([]);

  const [platformMode, setPlatformMode] = useState<'development' | 'production'>('production');

  const loadIntegrations = useCallback(() => {
    api.get('/api/v1/admin/platform/integrations/')
      .then(({ data }) => setIntegrations(data))
      .catch(() => setIntegrations([]))
      .finally(() => setLoading(false));
  }, []);

  const loadSettings = useCallback(() => {
    api.get('/api/v1/admin/platform/settings/')
      .then(({ data }) => setPlatformSettings(data))
      .catch(() => setPlatformSettings([]));
  }, []);

  const loadPlatformMode = useCallback(() => {
    superAdminApi.getPlatformMode()
      .then(({ data }) => {
        const mode = data.mode === 'development' ? 'development' : 'production';
        setPlatformMode(mode);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadIntegrations();
    loadSettings();
    loadPlatformMode();
  }, [loadIntegrations, loadSettings, loadPlatformMode]);

  return (
    <div className="space-y-8 max-w-5xl">
      <header>
        <h1 className="text-3xl font-black text-surface-900 dark:text-white tracking-tight">Configuración Global</h1>
        <p className="text-surface-500 mt-1">Ajustes de la plataforma Loyallia</p>
      </header>

      <IntegrationSettings
        integrations={integrations}
        loading={loading}
        onRefresh={loadIntegrations}
      />

      <PlatformSettings
        settings={platformSettings}
        mode={platformMode}
        onRefresh={loadSettings}
      />

      <SysAdminOperations mode={platformMode} />
    </div>
  );
}
