'use client';

import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import api, { superAdminApi } from '@/lib/api';
import IntegrationSettings from './IntegrationSettings';
import PlatformSettings from './PlatformSettings';
import SysAdminOperations from './SysAdminOperations';
import { Integration, PlatformSetting } from '@/components/superadmin/settings/types';
import { errorMessage } from '@/components/superadmin/settings/constants';

export default function SuperAdminSettings() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);

  const [platformSettings, setPlatformSettings] = useState<PlatformSetting[]>([]);

  const [platformMode, setPlatformMode] = useState<'development' | 'production'>('production');
  const [loadingMode, setLoadingMode] = useState(false);

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

  const togglePlatformMode = async () => {
    const nextMode = platformMode === 'production' ? 'development' : 'production';
    const confirmMessage =
      nextMode === 'development'
        ? '¿Cambiar a MODO DESARROLLO? Los SMS usarán credenciales de prueba, los respaldos serán cada 15 días, y Twilio usará sandbox.'
        : '¿Cambiar a MODO PRODUCCIÓN? Los SMS usarán credenciales reales (con costo), los respaldos serán diarios, y todas las integraciones usarán entornos reales.';
    if (!window.confirm(confirmMessage)) return;

    setLoadingMode(true);
    const toastId = toast.loading(`Cambiando a ${nextMode}...`);
    try {
      const { data } = await superAdminApi.togglePlatformMode(nextMode);
      const newMode = data.mode === 'development' ? 'development' : 'production';
      setPlatformMode(newMode);
      toast.success(
        newMode === 'development'
          ? '🟡 Modo Desarrollo activado. Sandbox seguro para pruebas.'
          : '🟢 Modo Producción activado. Operaciones reales habilitadas.',
        { id: toastId },
      );
      loadIntegrations();
    } catch (err: unknown) {
      toast.error(errorMessage(err, 'Error al cambiar modo de plataforma'), { id: toastId });
    } finally {
      setLoadingMode(false);
    }
  };

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

      <SysAdminOperations
        mode={platformMode}
        onToggleMode={togglePlatformMode}
        loadingMode={loadingMode}
      />
    </div>
  );
}
