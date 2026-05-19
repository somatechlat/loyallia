'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import IntegrationsManager from '@/components/superadmin/settings/IntegrationsManager';
import { Integration } from '@/components/superadmin/settings/types';
import { errorMessage, vaultFieldsFor } from '@/components/superadmin/settings/constants';
import { superAdminApi } from '@/lib/api';
import { FlaskConical, DollarSign } from '@/components/ui/LucideIcons';

interface IntegrationSettingsProps {
  integrations: Integration[];
  loading: boolean;
  onRefresh: () => void;
}

export default function IntegrationSettings({
  integrations,
  loading,
  onRefresh,
}: IntegrationSettingsProps) {
  const [editingVault, setEditingVault] = useState<string | null>(null);
  const [vaultForm, setVaultForm] = useState<Record<string, string>>({});
  const [savingVault, setSavingVault] = useState(false);

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
      onRefresh();
    } catch (err: unknown) {
      toast.error(errorMessage(err, 'Error al guardar en Vault'));
    } finally {
      setSavingVault(false);
    }
  };

  const saveVaultIntegration = async (integrationKey: string) => {
    const fields = vaultFieldsFor(integrationKey);
    const updates = fields
      .map((field) => ({ key: field.key, value: vaultForm[field.key] || '' }))
      .filter(({ value }) => value.trim().length > 0);

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
      onRefresh();
    } catch (err: unknown) {
      toast.error(errorMessage(err, 'Error al guardar credenciales'), { id: toastId });
    } finally {
      setSavingVault(false);
    }
  };

  const setIntegrationEnabled = async (integrationKey: string, enabled: boolean) => {
    const field = vaultFieldsFor(integrationKey).find(
      (item) => item.key.endsWith('_enabled')
    );
    if (!field) return;
    setSavingVault(true);
    try {
      await superAdminApi.updateIntegrationSecret(integrationKey, field.key, enabled ? 'true' : 'false');
      toast.success(enabled ? 'Integración habilitada' : 'Integración deshabilitada');
      onRefresh();
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
          ? <span className="flex items-center gap-1"><FlaskConical className="w-3.5 h-3.5" /> Modo prueba activado. SMS usan credenciales de test (sin costo).</span>
          : <span className="flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" /> Modo producción activado. SMS usan credenciales reales (con costo).</span>,
        { id: toastId },
      );
      onRefresh();
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

  return (
    <IntegrationsManager
      integrations={integrations}
      loading={loading}
      editingVault={editingVault}
      vaultForm={vaultForm}
      savingVault={savingVault}
      onOpenVaultEditor={openVaultEditor}
      onVaultFormChange={(key: string, value: string) => setVaultForm((prev) => ({ ...prev, [key]: value }))}
      onFileUpload={handleVaultFileUpload}
      onSaveVaultSecret={saveVaultSecret}
      onSaveVaultIntegration={saveVaultIntegration}
      onSetIntegrationEnabled={setIntegrationEnabled}
      onToggleTwilioTestMode={toggleTwilioTestMode}
    />
  );
}
