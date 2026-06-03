'use client';

import { Integration } from './types';
import { getDiagnosticValue, vaultFieldsFor, canEditIntegration, fileAcceptFor } from './constants';
import { FlaskConical, DollarSign, AlertTriangle } from '@/components/ui/LucideIcons';

/**
 * Props for the IntegrationsManager component.
 */
interface IntegrationsManagerProps {
  /** List of integrations */
  integrations: Integration[];
  /** Whether integrations are loading */
  loading: boolean;
  /** Currently edited integration key */
  editingVault: string | null;
  /** Current vault form values */
  vaultForm: Record<string, string>;
  /** Whether vault secrets are saving */
  savingVault: boolean;
  /** Opens the vault editor for an integration */
  onOpenVaultEditor: (key: string) => void;
  /** Updates a vault form field */
  onVaultFormChange: (key: string, value: string) => void;
  /** Handles file upload for a vault field */
  onFileUpload: (fieldKey: string, file?: File) => void;
  /** Saves a single vault secret */
  onSaveVaultSecret: (integrationKey: string, secretKey: string) => void;
  /** Saves all vault values for an integration */
  onSaveVaultIntegration: (integrationKey: string) => void;
  /** Enables or disables an integration */
  onSetIntegrationEnabled: (integrationKey: string, enabled: boolean) => void;
  /** Toggles Twilio test mode */
  onToggleTwilioTestMode: (integration: Integration) => void;
}

/**
 * @description SuperAdmin panel for managing third-party integrations and vault secrets.
 * @param {IntegrationsManagerProps} props - Component props
 * @returns JSX.Element
 */
export default function IntegrationsManager({
  integrations,
  loading,
  editingVault,
  vaultForm,
  savingVault,
  onOpenVaultEditor,
  onVaultFormChange,
  onFileUpload,
  onSaveVaultSecret,
  onSaveVaultIntegration,
  onSetIntegrationEnabled,
  onToggleTwilioTestMode,
}: IntegrationsManagerProps) {
  return (
    <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-700 shadow-sm p-6 space-y-4">
      <h2 className="text-lg font-bold text-surface-900 dark:text-white border-b border-surface-100 pb-3">Integraciones</h2>
      {loading && <p className="text-sm text-surface-400">Cargando integraciones...</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {integrations.map((int) => (
          <div key={int.key} className="p-4 rounded-xl border border-surface-100 space-y-3">
            <div className="flex items-center gap-3">
              <span className={`w-3 h-3 rounded-full shrink-0 shadow-sm ${
                int.enabled && int.configured
                  ? 'bg-emerald-500 shadow-emerald-500/50'
                  : int.enabled
                    ? 'bg-amber-500 shadow-amber-500/50'
                    : 'bg-surface-400'
              }`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-surface-900 dark:text-white">{int.name}</p>
                <p className="text-xs text-surface-400 truncate">{int.detail}</p>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-bold shrink-0 border ${
                int.enabled && int.configured
                  ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700'
                  : int.enabled
                    ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700'
                    : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 border-surface-200 dark:border-surface-700'
              }`}>
                {int.status}
              </span>
            </div>

            {Array.isArray(int.diagnostics?.errors) && (int.diagnostics.errors as string[]).length > 0 && (
              <div className="bg-red-50 border border-red-100 rounded-lg p-3 space-y-1">
                <p className="text-xs font-semibold text-red-700 uppercase">Errores detectados:</p>
                {(int.diagnostics.errors as string[]).map((err, i) => (
                  <p key={i} className="text-xs text-red-600">• {err}</p>
                ))}
              </div>
            )}

            {int.key === 'twilio_sms' && (
              <div className={`rounded-lg p-3 border space-y-2 ${
                int.preview_values?.twilio_use_test_mode === 'true'
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {int.preview_values?.twilio_use_test_mode === 'true' ? <FlaskConical className="w-4 h-4 text-amber-500" /> : <DollarSign className="w-4 h-4 text-green-500" />}
                    </span>
                    <div>
                      <p className={`text-xs font-bold uppercase ${
                        int.preview_values?.twilio_use_test_mode === 'true'
                          ? 'text-amber-700'
                          : 'text-red-700'
                      }`}>
                        {int.preview_values?.twilio_use_test_mode === 'true'
                          ? 'MODO PRUEBA (Sandbox)'
                          : 'MODO PRODUCCIÓN (Real)'}
                      </p>
                      <p className={`text-[10px] ${
                        int.preview_values?.twilio_use_test_mode === 'true'
                          ? 'text-amber-600'
                          : 'text-red-600'
                      }`}>
                        {int.preview_values?.twilio_use_test_mode === 'true'
                          ? 'SMS de test sin costo — seguro para desarrollo'
                          : <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> SMS reales con costo por mensaje</span>}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onToggleTwilioTestMode(int)}
                    disabled={savingVault}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                      int.preview_values?.twilio_use_test_mode === 'true'
                        ? 'bg-amber-500 hover:bg-amber-600 text-white'
                        : 'bg-red-600 hover:bg-red-700 text-white'
                    } disabled:opacity-50`}
                  >
                    {savingVault
                      ? 'Guardando...'
                      : int.preview_values?.twilio_use_test_mode === 'true'
                        ? 'Desactivar Modo Prueba'
                        : 'Activar Modo Prueba'}
                  </button>
                </div>
              </div>
            )}

            {int.key === 'backup_config' && int.diagnostics && (
              <div className="bg-surface-50 rounded-lg p-3 border border-surface-200 space-y-2">
                <p className="text-xs font-bold text-surface-600 uppercase">Estado de Respaldos</p>
                <div className="grid grid-cols-4 gap-2 text-[10px] font-medium text-surface-500 border-b border-surface-200 pb-1">
                  <span>Componente</span>
                  <span>Último Resp.</span>
                  <span>Antigüedad</span>
                  <span>Tamaño</span>
                </div>
                {['pg', 'redis', 'vault', 'minio', 'certs', 'env'].map((comp) => {
                  const diag = (int.diagnostics as Record<string, unknown>)[comp] as Record<string, unknown> | undefined;
                  return (
                    <div key={comp} className="grid grid-cols-4 gap-2 text-[11px] text-surface-700">
                      <span className="font-semibold uppercase">{comp}</span>
                      <span className="truncate">{String(diag?.latest ?? '—')}</span>
                      <span>{diag?.age_hours != null ? `${String(diag.age_hours)}h` : '—'}</span>
                      <span>{diag?.size_bytes != null ? `${Math.round(Number(diag.size_bytes) / 1024)}KB` : '—'}</span>
                    </div>
                  );
                })}
                {int.preview_values?.system_mode && (
                  <div className="pt-2 border-t border-surface-200 flex gap-4 text-[10px] text-surface-500">
                    <span>Modo: <strong className="text-surface-700">{int.preview_values.system_mode}</strong></span>
                    <span>Frecuencia: <strong className="text-surface-700">{int.preview_values.backup_frequency}</strong></span>
                    <span>Retención: <strong className="text-surface-700">{int.preview_values.backup_retention}d</strong></span>
                    <span>Cron: <strong className="text-surface-700">{int.preview_values.cron_hour}:00</strong></span>
                  </div>
                )}
              </div>
            )}

            {canEditIntegration(int.key) && (
              <button
                onClick={() => onOpenVaultEditor(int.key)}
                className="text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors"
              >
                {editingVault === int.key ? 'Cerrar editor' : 'Configurar credenciales en Vault →'}
              </button>
            )}

            {editingVault === int.key && (
              <div className="bg-surface-50 rounded-lg p-3 space-y-3 border border-surface-200">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-surface-600 uppercase">Editor de Vault — {int.name}</p>
                  {vaultFieldsFor(int.key).some((field) => field.key.endsWith('_enabled')) && (
                    <div className="flex rounded-lg border border-surface-200 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => onSetIntegrationEnabled(int.key, true)}
                        disabled={savingVault}
                        className={`px-2.5 py-1 text-[10px] font-semibold ${int.enabled ? 'bg-green-600 text-white' : 'bg-white text-surface-500 hover:bg-green-50'}`}
                      >
                        ON
                      </button>
                      <button
                        type="button"
                        onClick={() => onSetIntegrationEnabled(int.key, false)}
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
                      <span className="text-[10px] text-surface-400">{getDiagnosticValue(int.diagnostics as Record<string, unknown>, field.key)}</span>
                    </div>
                    {field.type === 'textarea' ? (
                      <div className="space-y-2">
                        {fileAcceptFor(field.key) && (
                          <input
                            type="file"
                            accept={fileAcceptFor(field.key)}
                            aria-label={`Subir archivo para ${field.label}`}
                            onChange={(e) => onFileUpload(field.key, e.target.files?.[0])}
                            className="block w-full text-xs text-surface-600 file:mr-3 file:rounded-lg file:border-0 file:bg-surface-900 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-surface-800"
                          />
                        )}
                        <textarea
                          rows={3}
                          value={vaultForm[field.key] || ''}
                          onChange={(e) => onVaultFormChange(field.key, e.target.value)}
                          placeholder={`Nuevo valor para ${field.label}`}
                          className="w-full px-3 py-2 rounded-xl border border-surface-200 bg-white text-xs text-surface-800 placeholder:text-surface-300 focus:outline-none focus:ring-2 focus:ring-brand-400/40 focus:border-brand-300 transition-all font-mono"
                        />
                      </div>
                    ) : field.type === 'select' ? (
                      <select
                        value={vaultForm[field.key] || ''}
                        onChange={(e) => onVaultFormChange(field.key, e.target.value)}
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
                        onChange={(e) => onVaultFormChange(field.key, e.target.value)}
                        placeholder={`Nuevo valor para ${field.label}`}
                        className="w-full px-3 py-2 rounded-xl border border-surface-200 bg-white text-xs text-surface-800 placeholder:text-surface-300 focus:outline-none focus:ring-2 focus:ring-brand-400/40 focus:border-brand-300 transition-all"
                      />
                    ) : (
                      <input
                        type="text"
                        value={vaultForm[field.key] || ''}
                        onChange={(e) => onVaultFormChange(field.key, e.target.value)}
                        placeholder={`Nuevo valor para ${field.label}`}
                        className="w-full px-3 py-2 rounded-xl border border-surface-200 bg-white text-xs text-surface-800 placeholder:text-surface-300 focus:outline-none focus:ring-2 focus:ring-brand-400/40 focus:border-brand-300 transition-all"
                      />
                    )}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onSaveVaultSecret(int.key, field.key)}
                        disabled={savingVault || !((vaultForm[field.key] || '').length > 0)}
                        className="text-xs bg-brand-500 hover:bg-brand-600 disabled:bg-surface-300 text-white disabled:text-surface-500 px-3 py-1.5 rounded-lg font-medium transition-all"
                      >
                        {savingVault ? 'Guardando...' : 'Guardar en Vault'}
                      </button>
                      {getDiagnosticValue(int.diagnostics as Record<string, unknown>, field.key) === 'Configurado' && (
                        <span className="text-[10px] text-green-600 font-medium">✓ En Vault</span>
                      )}
                    </div>
                  </div>
                ))}
                <div className="pt-2 border-t border-surface-200 flex justify-end">
                  <button
                    type="button"
                    onClick={() => onSaveVaultIntegration(int.key)}
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
  );
}
