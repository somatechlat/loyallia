'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api, { superAdminApi } from '@/lib/api';

type Integration = {
  key: string;
  name: string;
  enabled: boolean;
  configured: boolean;
  status: string;
  detail: string;
  diagnostics: Record<string, unknown>;
  preview_values: Record<string, string>;
};

type VaultField = {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'password';
  options?: string[];
};

type PlatformSetting = {
  key: string;
  value: string;
  description: string;
  category: string;
  requires_restart: boolean;
  updated_at: string;
};

const INTEGRATION_FIELDS: Record<string, VaultField[]> = {
  google_wallet: [
    { key: 'google_wallet_enabled', label: 'Habilitado', type: 'select', options: ['true', 'false'] },
    { key: 'google_wallet_issuer_id', label: 'Issuer ID', type: 'text' },
    { key: 'google_service_account_json', label: 'Service Account JSON', type: 'textarea' },
    { key: 'google_oauth_client_id', label: 'OAuth Client ID', type: 'text' },
    { key: 'google_oauth_client_secret', label: 'OAuth Client Secret', type: 'password' },
  ],
  google_oauth: [
    { key: 'google_oauth_client_id', label: 'Client ID', type: 'text' },
    { key: 'google_oauth_client_secret', label: 'Client Secret', type: 'password' },
  ],
  apple_wallet: [
    { key: 'apple_wallet_enabled', label: 'Habilitado', type: 'select', options: ['true', 'false'] },
    { key: 'apple_pass_type_identifier', label: 'Pass Type ID', type: 'text' },
    { key: 'apple_team_identifier', label: 'Team ID', type: 'text' },
    { key: 'apple_cert_pem', label: 'Certificate PEM', type: 'textarea' },
    { key: 'apple_cert_key_pem', label: 'Private Key PEM', type: 'textarea' },
    { key: 'apple_wwdr_cert_pem', label: 'WWDR Certificate PEM', type: 'textarea' },
  ],
  payment_gateway: [
    { key: 'payment_gateway_enabled', label: 'Habilitado', type: 'select', options: ['true', 'false'] },
    { key: 'payment_gateway_provider', label: 'Proveedor', type: 'select', options: ['none', 'manual', 'disabled'] },
    { key: 'payment_gateway_login', label: 'Login / Merchant ID', type: 'text' },
    { key: 'payment_gateway_tran_key', label: 'Transaction Key', type: 'password' },
    { key: 'payment_gateway_webhook_secret', label: 'Webhook Secret', type: 'password' },
  ],
  email: [
    { key: 'email_host_user', label: 'SMTP Usuario', type: 'text' },
    { key: 'email_host_password', label: 'SMTP Contraseña', type: 'password' },
  ],
  whatsapp_bridge: [
    { key: 'whatsapp_bridge_url', label: 'Bridge URL', type: 'text' },
    { key: 'whatsapp_bridge_api_key', label: 'Bridge API Key', type: 'password' },
  ],
  twilio_sms: [
    { key: 'twilio_account_sid', label: 'Account SID', type: 'text' },
    { key: 'twilio_auth_token', label: 'Auth Token', type: 'password' },
    { key: 'twilio_from_number', label: 'From Number', type: 'text' },
  ],
  twilio_verify: [
    { key: 'twilio_verify_enabled', label: 'Habilitado', type: 'select', options: ['true', 'false'] },
    { key: 'twilio_verify_service_sid', label: 'Verify Service SID', type: 'text' },
    { key: 'twilio_verify_default_channel', label: 'Canal por Defecto', type: 'select', options: ['sms', 'whatsapp', 'voice', 'email', 'push', 'totp', 'sna'] },
  ],
  twilio_api_key: [
    { key: 'twilio_api_key_sid', label: 'API Key SID', type: 'text' },
    { key: 'twilio_api_key_secret', label: 'API Key Secret', type: 'password' },
  ],
  twilio_test: [
    { key: 'twilio_test_account_sid', label: 'Test Account SID', type: 'text' },
    { key: 'twilio_test_auth_token', label: 'Test Auth Token', type: 'password' },
  ],
  listmonk: [
    { key: 'listmonk_url', label: 'Listmonk URL', type: 'text' },
    { key: 'listmonk_api_user', label: 'API User', type: 'text' },
    { key: 'listmonk_api_token', label: 'API Token', type: 'password' },
  ],
  apple_nfc: [
    { key: 'apple_nfc_enabled', label: 'Habilitado', type: 'select', options: ['true', 'false'] },
    { key: 'apple_nfc_encryption_public_key', label: 'NFC Encryption Public Key', type: 'textarea' },
  ],
  ai_agent: [
    { key: 'ai_agent_base_url', label: 'Agent Base URL', type: 'text' },
    { key: 'ai_agent_api_key', label: 'Agent API Key', type: 'password' },
  ],
};

const errorMessage = (err: unknown, fallback: string) => {
  if (typeof err === 'object' && err !== null && 'response' in err) {
    const response = (err as { response?: { data?: unknown } }).response;
    const data = response?.data;
    if (typeof data === 'string') return data;
    if (typeof data === 'object' && data !== null) {
      const detail = (data as { detail?: unknown }).detail;
      const message = (data as { message?: unknown }).message;
      if (typeof detail === 'string') return detail;
      if (typeof message === 'string') return message;
    }
  }
  return err instanceof Error ? err.message : fallback;
};

const fileAcceptFor = (fieldKey: string) => {
  if (fieldKey.endsWith('_json')) return '.json,application/json';
  if (fieldKey.endsWith('_pem')) return '.pem,.cer,.crt,.key,text/plain';
  return undefined;
};

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

  // --- SysAdmin Operations (LYL-BOOT-001) ---
  const [seedingDemo, setSeedingDemo] = useState(false);
  const [seedOutput, setSeedOutput] = useState('');
  const [resetStep, setResetStep] = useState<'idle' | 'otp_sent' | 'confirming'>('idle');
  const [resetOtp, setResetOtp] = useState('');
  const [requestingReset, setRequestingReset] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);

  useEffect(() => {
    loadIntegrations();
    loadSettings();
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
      // Pre-populate non-secret preview values from API
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
      loadIntegrations();
    } catch (err: unknown) {
      toast.error(errorMessage(err, 'Error al guardar credenciales'), { id: toastId });
    } finally {
      setSavingVault(false);
    }
  };

  const setIntegrationEnabled = async (integrationKey: string, enabled: boolean) => {
    const field = vaultFieldsFor(integrationKey).find((item) => item.key.endsWith('_enabled'));
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

  const getDiagnosticValue = (integration: Integration, fieldKey: string): string => {
    const diag = integration.diagnostics || {};
    // Map field keys to diagnostic keys
    const mapping: Record<string, string> = {
      google_wallet_issuer_id: 'issuer_id_present',
      google_service_account_json: 'service_account_present',
      google_oauth_client_id: 'client_id_present',
      google_oauth_client_secret: 'client_secret_present',
      apple_pass_type_identifier: 'pass_type_id_present',
      apple_team_identifier: 'team_id_present',
      apple_cert_pem: 'cert_pem_present',
      apple_cert_key_pem: 'cert_key_pem_present',
      apple_wwdr_cert_pem: 'wwdr_cert_pem_present',
      email_host_user: 'user_present',
      email_host_password: 'pass_present',
      whatsapp_bridge_api_key: 'api_key_present',
      twilio_account_sid: 'account_sid_present',
      twilio_auth_token: 'auth_token_present',
      twilio_from_number: 'from_number_present',
      twilio_verify_enabled: 'verify_enabled',
      twilio_verify_service_sid: 'service_sid_present',
      twilio_verify_default_channel: 'default_channel',
      twilio_api_key_sid: 'api_key_sid_present',
      twilio_api_key_secret: 'api_key_secret_present',
      twilio_test_account_sid: 'test_account_sid_present',
      twilio_test_auth_token: 'test_auth_token_present',
      listmonk_api_user: 'api_user_present',
      listmonk_api_token: 'api_token_present',
      apple_nfc_encryption_public_key: 'public_key_present',
      ai_agent_api_key: 'api_key_present',
    };
    const diagKey = mapping[fieldKey];
    if (diagKey && diagKey in diag) {
      const val = diag[diagKey];
      return val === true ? '✅ Configurado' : '❌ No configurado';
    }
    return '';
  };

  const vaultFieldsFor = (key: string) => INTEGRATION_FIELDS[key] || [];

  const canEditIntegration = (key: string) => key in INTEGRATION_FIELDS;

  return (
    <div className="space-y-8 max-w-5xl">
      <header>
        <h1 className="text-3xl font-black text-surface-900 dark:text-white tracking-tight">Configuración Global</h1>
        <p className="text-surface-500 mt-1">Ajustes de la plataforma Loyallia</p>
      </header>

      {/* Platform Settings */}
      <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-700 shadow-sm p-6 space-y-6">
        <h2 className="text-lg font-bold text-surface-900 dark:text-white border-b border-surface-100 pb-3">Parámetros del Sistema</h2>
        {platformSettings.length === 0 ? (
          <div className="text-sm text-surface-400">Cargando parámetros...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {platformSettings.map((s) => (
              <div key={s.key}>
                <label className="block text-sm font-medium text-surface-700 mb-1">
                  {s.description || s.key}
                  {s.requires_restart && (
                    <span className="ml-2 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
                      Requiere reinicio
                    </span>
                  )}
                </label>
                <div className="flex gap-2">
                  <input
                    type={s.key.includes('DAYS') || s.key.includes('PRICE') || s.key.includes('RATE') ? 'number' : 'text'}
                    step={s.key.includes('RATE') ? '0.01' : undefined}
                    className="flex-1 px-3 py-2 rounded-xl border border-surface-200 dark:border-surface-700 bg-white/60 text-sm"
                    value={settingForm[s.key] || ''}
                    onChange={(e) => setSettingForm((prev) => ({ ...prev, [s.key]: e.target.value }))}
                  />
                  <button
                    onClick={() => updateSetting(s.key)}
                    disabled={savingSetting === s.key || (settingForm[s.key] ?? '') === s.value}
                    className="bg-brand-500 hover:bg-brand-600 disabled:bg-surface-300 text-white disabled:text-surface-500 px-3 py-2 rounded-xl text-sm font-medium transition-all"
                  >
                    {savingSetting === s.key ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
                <p className="text-xs text-surface-400 mt-1">{s.key} — actualizado {new Date(s.updated_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Integrations */}
      <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-700 shadow-sm p-6 space-y-4">
        <h2 className="text-lg font-bold text-surface-900 dark:text-white border-b border-surface-100 pb-3">Integraciones</h2>
        {loading && <p className="text-sm text-surface-400">Cargando integraciones...</p>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {integrations.map((int) => (
            <div key={int.key} className="p-4 rounded-xl border border-surface-100 space-y-3">
              <div className="flex items-center gap-3">
                <span className={`w-3 h-3 rounded-full shrink-0 ${
                  int.enabled && int.configured ? 'bg-green-500' : int.enabled ? 'bg-yellow-500' : 'bg-surface-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-surface-900 dark:text-white">{int.name}</p>
                  <p className="text-xs text-surface-400 truncate">{int.detail}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                  int.enabled && int.configured ? 'bg-green-100 text-green-700' : int.enabled ? 'bg-yellow-100 text-yellow-700' : 'bg-surface-100 text-surface-600'
                }`}>
                  {int.status}
                </span>
              </div>

              {/* Diagnostic Errors */}
              {Array.isArray(int.diagnostics?.errors) && (int.diagnostics.errors as string[]).length > 0 && (
                <div className="bg-red-50 border border-red-100 rounded-lg p-3 space-y-1">
                  <p className="text-xs font-semibold text-red-700 uppercase">Errores detectados:</p>
                  {(int.diagnostics.errors as string[]).map((err, i) => (
                    <p key={i} className="text-xs text-red-600">• {err}</p>
                  ))}
                </div>
              )}

              {/* Vault Editor Toggle */}
              {canEditIntegration(int.key) && (
                <button
                  onClick={() => openVaultEditor(int.key)}
                  className="text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors"
                >
                  {editingVault === int.key ? 'Cerrar editor' : 'Configurar credenciales en Vault →'}
                </button>
              )}

              {/* Vault Secret Editor */}
              {editingVault === int.key && (
                <div className="bg-surface-50 rounded-lg p-3 space-y-3 border border-surface-200">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-surface-600 uppercase">Editor de Vault — {int.name}</p>
                    {vaultFieldsFor(int.key).some((field) => field.key.endsWith('_enabled')) && (
                      <div className="flex rounded-lg border border-surface-200 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setIntegrationEnabled(int.key, true)}
                          disabled={savingVault}
                          className={`px-2.5 py-1 text-[10px] font-semibold ${int.enabled ? 'bg-green-600 text-white' : 'bg-white text-surface-500 hover:bg-green-50'}`}
                        >
                          ON
                        </button>
                        <button
                          type="button"
                          onClick={() => setIntegrationEnabled(int.key, false)}
                          disabled={savingVault}
                          className={`px-2.5 py-1 text-[10px] font-semibold border-l border-surface-200 ${!int.enabled ? 'bg-surface-700 text-white' : 'bg-white text-surface-500 hover:bg-surface-100'}`}
                        >
                          OFF
                        </button>
                      </div>
                    )}
                  </div>
                  {vaultFieldsFor(int.key).map((field) => (
                    <div key={field.key} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-surface-700">{field.label}</label>
                        <span className="text-[10px] text-surface-400">{getDiagnosticValue(int, field.key)}</span>
                      </div>
                      {field.type === 'textarea' ? (
                        <div className="space-y-2">
                          {fileAcceptFor(field.key) && (
                            <input
                              type="file"
                              accept={fileAcceptFor(field.key)}
                              aria-label={`Subir archivo para ${field.label}`}
                              onChange={(e) => handleVaultFileUpload(field.key, e.target.files?.[0])}
                              className="block w-full text-xs text-surface-600 file:mr-3 file:rounded-lg file:border-0 file:bg-surface-900 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-surface-800"
                            />
                          )}
                          <textarea
                            rows={3}
                            value={vaultForm[field.key] || ''}
                            onChange={(e) => setVaultForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                            placeholder={`Nuevo valor para ${field.label}`}
                            className="w-full px-3 py-2 rounded-xl border border-surface-200 bg-white text-xs text-surface-800 placeholder:text-surface-300 focus:outline-none focus:ring-2 focus:ring-brand-400/40 focus:border-brand-300 transition-all font-mono"
                          />
                        </div>
                      ) : field.type === 'select' ? (
                        <select
                          value={vaultForm[field.key] || ''}
                          onChange={(e) => setVaultForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                          className="w-full px-3 py-2 rounded-xl border border-surface-200 bg-white text-xs text-surface-800 focus:outline-none focus:ring-2 focus:ring-brand-400/40 focus:border-brand-300 transition-all"
                        >
                          <option value="">Seleccionar...</option>
                          {field.options?.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : field.type === 'password' ? (
                        <input
                          type="password"
                          value={vaultForm[field.key] || ''}
                          onChange={(e) => setVaultForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                          placeholder={`Nuevo valor para ${field.label}`}
                          className="w-full px-3 py-2 rounded-xl border border-surface-200 bg-white text-xs text-surface-800 placeholder:text-surface-300 focus:outline-none focus:ring-2 focus:ring-brand-400/40 focus:border-brand-300 transition-all"
                        />
                      ) : (
                        <input
                          type="text"
                          value={vaultForm[field.key] || ''}
                          onChange={(e) => setVaultForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                          placeholder={`Nuevo valor para ${field.label}`}
                          className="w-full px-3 py-2 rounded-xl border border-surface-200 bg-white text-xs text-surface-800 placeholder:text-surface-300 focus:outline-none focus:ring-2 focus:ring-brand-400/40 focus:border-brand-300 transition-all"
                        />
                      )}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => saveVaultSecret(int.key, field.key)}
                          disabled={savingVault || !((vaultForm[field.key] || '').length > 0)}
                          className="text-xs bg-brand-500 hover:bg-brand-600 disabled:bg-surface-300 text-white disabled:text-surface-500 px-3 py-1.5 rounded-lg font-medium transition-all"
                        >
                          {savingVault ? 'Guardando...' : 'Guardar en Vault'}
                        </button>
                        {getDiagnosticValue(int, field.key) === '✅ Configurado' && (
                          <span className="text-[10px] text-green-600 font-medium">✓ En Vault</span>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-surface-200 flex justify-end">
                    <button
                      type="button"
                      onClick={() => saveVaultIntegration(int.key)}
                      disabled={savingVault || Object.values(vaultForm).every((value) => !value.trim())}
                      className="text-xs bg-surface-900 hover:bg-surface-800 disabled:bg-surface-300 text-white disabled:text-surface-500 px-4 py-2 rounded-lg font-semibold transition-all"
                    >
                      {savingVault ? 'Guardando...' : 'Guardar todos los valores escritos'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ================================================================= */}
      {/* System Operations (LYL-BOOT-001) */}
      {/* ================================================================= */}
      <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-700 shadow-sm p-6 space-y-6">
        <h2 className="text-lg font-bold text-surface-900 dark:text-white border-b border-surface-100 pb-3">Operaciones del Sistema</h2>

        {/* --- Seed Demo Data --- */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-5 border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-3 mb-3">
            <span className="text-2xl">📦</span>
            <div>
              <h3 className="font-semibold text-surface-900 dark:text-white">Datos de Demostración</h3>
              <p className="text-sm text-surface-500 mt-1">
                Carga datos de ejemplo (negocios, clientes, transacciones) para demostración del sistema.
              </p>
            </div>
          </div>
          <button
            id="btn-seed-demo"
            disabled={seedingDemo}
            onClick={async () => {
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
            }}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-surface-300 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all"
          >
            {seedingDemo ? 'Cargando datos...' : '📦 Cargar Datos Demo'}
          </button>
          {seedOutput && (
            <pre className="mt-3 bg-surface-100 dark:bg-surface-800 rounded-lg p-3 text-xs text-surface-600 dark:text-surface-400 max-h-40 overflow-auto whitespace-pre-wrap">
              {seedOutput}
            </pre>
          )}
        </div>

        {/* --- Factory Reset --- */}
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-5 border border-red-200 dark:border-red-800">
          <div className="flex items-start gap-3 mb-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <h3 className="font-semibold text-red-700 dark:text-red-400">Restaurar de Fábrica</h3>
              <p className="text-sm text-surface-500 mt-1">
                Elimina <strong>TODOS</strong> los datos de tenants, clientes y transacciones.
                El sistema regresa a estado inicial con solo el SysAdmin y planes.
                Se requiere un código de verificación enviado a su email/teléfono.
              </p>
            </div>
          </div>

          {resetStep === 'idle' && (
            <button
              id="btn-factory-reset-request"
              disabled={requestingReset}
              onClick={async () => {
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
              }}
              className="bg-red-600 hover:bg-red-700 disabled:bg-surface-300 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all"
            >
              {requestingReset ? 'Enviando código...' : '🔑 Solicitar Código de Verificación'}
            </button>
          )}

          {resetStep === 'otp_sent' && (
            <div className="space-y-3">
              <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">
                ✉️ Código enviado a su email (y SMS si está configurado). Ingrese el código de 6 dígitos:
              </p>
              <div className="flex gap-3 items-center flex-wrap">
                <input
                  id="input-factory-otp"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  className="w-40 px-4 py-2.5 rounded-xl border-2 border-red-300 dark:border-red-700 bg-white dark:bg-surface-800 text-center text-lg font-mono tracking-widest"
                  placeholder="000000"
                  value={resetOtp}
                  onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                />
                <button
                  id="btn-factory-reset-confirm"
                  disabled={confirmingReset || resetOtp.length !== 6}
                  onClick={async () => {
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
                  }}
                  className="bg-red-700 hover:bg-red-800 disabled:bg-surface-300 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all"
                >
                  {confirmingReset ? 'Procesando...' : '🔥 Confirmar Restauración'}
                </button>
                <button
                  onClick={() => { setResetStep('idle'); setResetOtp(''); }}
                  className="text-surface-500 hover:text-surface-700 text-sm underline"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Broadcast */}
      <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-700 shadow-sm p-6">
        <h2 className="text-lg font-bold text-surface-900 dark:text-white border-b border-surface-100 pb-3 mb-4">Anuncio Global (Broadcast)</h2>
        <p className="text-sm text-surface-500 mb-4">Envía un email a todos los propietarios de negocios registrados en la plataforma.</p>
        <form onSubmit={handleBroadcast} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Asunto</label>
            <input
              type="text"
              className="w-full px-3 py-2 rounded-xl border border-surface-200 dark:border-surface-700 bg-white/60 text-sm"
              value={broadcastForm.subject}
              onChange={(e) => setBroadcastForm({ ...broadcastForm, subject: e.target.value })}
              placeholder="Mantenimiento programado..."
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Mensaje</label>
            <textarea
              rows={4}
              className="w-full px-3 py-2 rounded-xl border border-surface-200 dark:border-surface-700 bg-white/60 text-sm"
              value={broadcastForm.message}
              onChange={(e) => setBroadcastForm({ ...broadcastForm, message: e.target.value })}
              placeholder="Escribe el mensaje aquí..."
              required
            />
          </div>
          <button
            type="submit"
            disabled={sending}
            className="bg-brand-500 hover:bg-brand-600 disabled:bg-surface-300 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all"
          >
            {sending ? 'Enviando...' : 'Enviar a todos los propietarios'}
          </button>
        </form>
      </div>
    </div>
  );
}
