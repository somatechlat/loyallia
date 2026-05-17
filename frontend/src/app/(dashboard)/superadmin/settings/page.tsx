'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api, { superAdminApi } from '@/lib/api';
import PlatformModeBanner from '@/components/superadmin/settings/PlatformModeBanner';
import PlatformSettingsSection from '@/components/superadmin/settings/PlatformSettingsSection';
import IntegrationsManager from '@/components/superadmin/settings/IntegrationsManager';
import SystemOperationsPanel from '@/components/superadmin/settings/SystemOperationsPanel';
import BroadcastPanel from '@/components/superadmin/settings/BroadcastPanel';
import { Integration, PlatformSetting } from '@/components/superadmin/settings/types';
import { errorMessage } from '@/components/superadmin/settings/constants';

export default function SuperAdminSettings() {
  const [broadcastForm, setBroadcastForm] = useState({ subject: '', message: '' });
  const [sending, setSending] = useState(false);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingVault, setEditingVault] = useState<string | null>(null);
  const [vaultForm, setVaultForm] = useState<Record<string, string>>({});
  const [savingVault, setSavingVault] = useState(false);

  const [platformSettings, setPlatformSettings] = useState<PlatformSetting[]>([]);
  const [settingForm, setSettingForm] = useState<Record<string, string>>({});
  const [savingSetting, setSavingSetting] = useState<string | null>(null);

  const [platformMode, setPlatformMode] = useState<'development' | 'production'>('production');
  const [loadingMode, setLoadingMode] = useState(false);

  const [seedingDemo, setSeedingDemo] = useState(false);
  const [seedOutput, setSeedOutput] = useState('');
  const [resetStep, setResetStep] = useState<'idle' | 'otp_sent' | 'confirming'>('idle');
  const [resetOtp, setResetOtp] = useState('');
  const [requestingReset, setRequestingReset] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);

  useEffect(() => {
    loadIntegrations();
    loadSettings();
    loadPlatformMode();
  }, []);

  const loadIntegrations = () => {
    api.get('/api/v1/admin/platform/integrations/')
      .then(({ data }) => setIntegrations(data))
      .catch(() => setIntegrations([]))
      .finally(() => setLoading(false));
  };

  const loadSettings = () => {
    api.get('/api/v1/admin/platform/settings/')
      .then(({ data }) => {
        setPlatformSettings(data);
        const initialForm: Record<string, string> = {};
        data.forEach((s: PlatformSetting) => { initialForm[s.key] = s.value; });
        setSettingForm(initialForm);
      })
      .catch(() => setPlatformSettings([]));
  };

  const loadPlatformMode = () => {
    superAdminApi.getPlatformMode()
      .then(({ data }) => {
        const mode = data.mode === 'development' ? 'development' : 'production';
        setPlatformMode(mode);
        setSettingForm((prev) => ({ ...prev, PLATFORM_MODE: mode }));
      })
      .catch(() => {});
  };

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
      setSettingForm((prev) => ({ ...prev, PLATFORM_MODE: newMode }));
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

  const updateSetting = async (key: string) => {
    const value = settingForm[key];
    if (value === undefined) return;
    setSavingSetting(key);
    try {
      const { data } = await api.put(`/api/v1/admin/platform/settings/${key}/`, { value });
      toast.success(data.message || `Setting '${key}' updated`);
      loadSettings();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `Error updating ${key}`;
      toast.error(msg);
    } finally {
      setSavingSetting(null);
    }
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    const toastId = toast.loading('Enviando a todos los propietarios...');
    try {
      const { data } = await api.post('/api/v1/admin/broadcast/', broadcastForm);
      toast.success(data.message || 'Enviado', { id: toastId });
      setBroadcastForm({ subject: '', message: '' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al enviar';
      toast.error(msg, { id: toastId });
    } finally {
      setSending(false);
    }
  };

  const openVaultEditor = (integrationKey: string) => {
    if (editingVault === integrationKey) {
      setEditingVault(null);
    } else {
      setEditingVault(integrationKey);
      const integration = integrations.find((i) => i.key === integrationKey);
      const initialForm: Record<string, string> = {};
      if (integration?.preview_values) {
        Object.entries(integration.preview_values).forEach(([k, v]) => {
          if (typeof v === 'string') initialForm[k] = v;
        });
      }
      setVaultForm(initialForm);
    }
  };

  const saveVaultSecret = async (integrationKey: string, secretKey: string) => {
    const value = vaultForm[secretKey];
    if (value === undefined || value === '') {
      toast.error('El valor no puede estar vacío');
      return;
    }
    setSavingVault(true);
    try {
      await superAdminApi.updateIntegrationSecret(integrationKey, secretKey, value);
      toast.success(`${secretKey} actualizado en Vault`);
      setVaultForm((prev) => ({ ...prev, [secretKey]: '' }));
      loadIntegrations();
    } catch (err: unknown) {
      toast.error(errorMessage(err, 'Error al guardar en Vault'));
    } finally {
      setSavingVault(false);
    }
  };

  const saveVaultIntegration = async (integrationKey: string) => {
    const fields = require('@/components/superadmin/settings/constants').vaultFieldsFor(integrationKey);
    const updates = fields
      .map((field: { key: string }) => ({ key: field.key, value: vaultForm[field.key] || '' }))
      .filter(({ value }: { value: string }) => value.trim().length > 0);

    if (updates.length === 0) {
      toast.error('No hay valores para guardar');
      return;
    }

    setSavingVault(true);
    const toastId = toast.loading('Guardando credenciales en Vault...');
    try {
      for (const update of updates) {
        await superAdminApi.updateIntegrationSecret(integrationKey, update.key, update.value);
      }
      toast.success(`${updates.length} valor(es) actualizados en Vault`, { id: toastId });
      setVaultForm({});
      loadIntegrations();
    } catch (err: unknown) {
      toast.error(errorMessage(err, 'Error al guardar credenciales'), { id: toastId });
    } finally {
      setSavingVault(false);
    }
  };

  const setIntegrationEnabled = async (integrationKey: string, enabled: boolean) => {
    const field = require('@/components/superadmin/settings/constants').vaultFieldsFor(integrationKey).find(
      (item: { key: string }) => item.key.endsWith('_enabled')
    );
    if (!field) return;
    setSavingVault(true);
    try {
      await superAdminApi.updateIntegrationSecret(integrationKey, field.key, enabled ? 'true' : 'false');
      toast.success(enabled ? 'Integración habilitada' : 'Integración deshabilitada');
      loadIntegrations();
      setVaultForm((prev) => ({ ...prev, [field.key]: enabled ? 'true' : 'false' }));
    } catch (err: unknown) {
      toast.error(errorMessage(err, 'Error al cambiar estado'));
    } finally {
      setSavingVault(false);
    }
  };

  const toggleTwilioTestMode = async (integration: Integration) => {
    const currentValue = integration.preview_values?.twilio_use_test_mode === 'true';
    const newValue = !currentValue;
    setSavingVault(true);
    const toastId = toast.loading(newValue ? 'Activando modo prueba...' : 'Activando modo producción...');
    try {
      await superAdminApi.updateIntegrationSecret('twilio_sms', 'twilio_use_test_mode', newValue ? 'true' : 'false');
      toast.success(
        newValue
          ? '🧪 Modo prueba activado. SMS usan credenciales de test (sin costo).'
          : '💰 Modo producción activado. SMS usan credenciales reales (con costo).',
        { id: toastId },
      );
      loadIntegrations();
    } catch (err: unknown) {
      toast.error(errorMessage(err, 'Error al cambiar modo'), { id: toastId });
    } finally {
      setSavingVault(false);
    }
  };

  const handleVaultFileUpload = (fieldKey: string, file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setVaultForm((prev) => ({ ...prev, [fieldKey]: String(reader.result || '') }));
      toast.success(`${file.name} cargado`);
    };
    reader.onerror = () => toast.error('No se pudo leer el archivo');
    reader.readAsText(file);
  };

  const handleSeedDemo = async () => {
    if (!window.confirm('¿Cargar datos de demostración? Esto puede tardar unos segundos.')) return;
    setSeedingDemo(true);
    setSeedOutput('');
    try {
      const { data } = await superAdminApi.seedDemoData();
      toast.success(data.message || 'Datos demo cargados');
      setSeedOutput(data.output || '');
    } catch (err) {
      toast.error(errorMessage(err, 'Error al cargar datos demo'));
    } finally {
      setSeedingDemo(false);
    }
  };

  const handleFactoryResetRequest = async () => {
    if (!window.confirm('¿Solicitar código para restaurar de fábrica? Se enviará a su email y teléfono.')) return;
    setRequestingReset(true);
    try {
      const { data } = await superAdminApi.factoryResetRequest();
      toast.success(data.message || 'Código enviado');
      setResetStep('otp_sent');
    } catch (err) {
      toast.error(errorMessage(err, 'Error al solicitar código'));
    } finally {
      setRequestingReset(false);
    }
  };

  const handleFactoryResetConfirm = async () => {
    if (!window.confirm('⚠️ ÚLTIMA ADVERTENCIA: ¿Restaurar el sistema a estado de fábrica? Esta acción es IRREVERSIBLE y eliminará TODOS los datos de negocios.')) return;
    setConfirmingReset(true);
    try {
      const { data } = await superAdminApi.factoryResetConfirm(resetOtp);
      toast.success(data.message || 'Sistema restaurado');
      setResetStep('idle');
      setResetOtp('');
    } catch (err) {
      toast.error(errorMessage(err, 'Código inválido o expirado'));
    } finally {
      setConfirmingReset(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl">
      <header>
        <h1 className="text-3xl font-black text-surface-900 dark:text-white tracking-tight">Configuración Global</h1>
        <p className="text-surface-500 mt-1">Ajustes de la plataforma Loyallia</p>
      </header>

      <PlatformModeBanner
        platformMode={platformMode}
        loadingMode={loadingMode}
        onToggle={togglePlatformMode}
      />

      <PlatformSettingsSection
        settings={platformSettings}
        form={settingForm}
        savingKey={savingSetting}
        onChange={(key, value) => setSettingForm((prev) => ({ ...prev, [key]: value }))}
        onSave={updateSetting}
      />

      <IntegrationsManager
        integrations={integrations}
        loading={loading}
        editingVault={editingVault}
        vaultForm={vaultForm}
        savingVault={savingVault}
        onOpenVaultEditor={openVaultEditor}
        onVaultFormChange={(key, value) => setVaultForm((prev) => ({ ...prev, [key]: value }))}
        onFileUpload={handleVaultFileUpload}
        onSaveVaultSecret={saveVaultSecret}
        onSaveVaultIntegration={saveVaultIntegration}
        onSetIntegrationEnabled={setIntegrationEnabled}
        onToggleTwilioTestMode={toggleTwilioTestMode}
      />

      <SystemOperationsPanel
        seedingDemo={seedingDemo}
        seedOutput={seedOutput}
        resetStep={resetStep}
        resetOtp={resetOtp}
        requestingReset={requestingReset}
        confirmingReset={confirmingReset}
        onSeedDemo={handleSeedDemo}
        onFactoryResetRequest={handleFactoryResetRequest}
        onFactoryResetConfirm={handleFactoryResetConfirm}
        onResetOtpChange={setResetOtp}
        onCancelReset={() => { setResetStep('idle'); setResetOtp(''); }}
      />

      <BroadcastPanel
        subject={broadcastForm.subject}
        message={broadcastForm.message}
        sending={sending}
        onSubjectChange={(v) => setBroadcastForm((prev) => ({ ...prev, subject: v }))}
        onMessageChange={(v) => setBroadcastForm((prev) => ({ ...prev, message: v }))}
        onSubmit={handleBroadcast}
      />
    </div>
  );
}
