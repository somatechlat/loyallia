import { VaultField } from './types';

/**
 * Vault field definitions grouped by integration key.
 */
export const INTEGRATION_FIELDS: Record<string, VaultField[]> = {
  google_wallet: [
    { key: 'google_wallet_enabled', label: 'Habilitado', type: 'select', options: ['true', 'false'], description: 'Requiere reinicio del contenedor API para activar/desactivar' },
    { key: 'google_wallet_issuer_id', label: 'Issuer ID', type: 'text', description: 'Requiere reinicio del contenedor API para aplicar cambios' },
    { key: 'google_service_account_json', label: 'Service Account JSON', type: 'textarea', description: 'Requiere reinicio del contenedor API para aplicar cambios' },
    { key: 'google_oauth_client_id', label: 'OAuth Client ID', type: 'text', description: 'Requiere reinicio del contenedor API para aplicar cambios' },
    { key: 'google_oauth_client_secret', label: 'OAuth Client Secret', type: 'password', description: 'Requiere reinicio del contenedor API para aplicar cambios' },
  ],
  google_oauth: [
    { key: 'google_oauth_client_id', label: 'Client ID', type: 'text' },
    { key: 'google_oauth_client_secret', label: 'Client Secret', type: 'password' },
  ],
  apple_wallet: [
    { key: 'apple_wallet_enabled', label: 'Habilitado', type: 'select', options: ['true', 'false'], description: 'Requiere reinicio del contenedor API para activar/desactivar' },
    { key: 'apple_pass_type_identifier', label: 'Pass Type ID', type: 'text', description: 'Requiere reinicio del contenedor API para aplicar cambios' },
    { key: 'apple_team_identifier', label: 'Team ID', type: 'text', description: 'Requiere reinicio del contenedor API para aplicar cambios' },
    { key: 'apple_cert_pem', label: 'Certificate PEM', type: 'textarea', description: 'Requiere reinicio del contenedor API para aplicar cambios' },
    { key: 'apple_cert_key_pem', label: 'Private Key PEM', type: 'textarea', description: 'Requiere reinicio del contenedor API para aplicar cambios' },
    { key: 'apple_wwdr_cert_pem', label: 'WWDR Certificate PEM', type: 'textarea', description: 'Requiere reinicio del contenedor API para aplicar cambios' },
  ],
  payment_gateway: [
    { key: 'payment_gateway_enabled', label: 'Habilitado', type: 'select', options: ['true', 'false'] },
    { key: 'payment_gateway_provider', label: 'Proveedor', type: 'select', options: ['none', 'manual', 'disabled'] },
    { key: 'payment_gateway_login', label: 'Login / Merchant ID', type: 'text' },
    { key: 'payment_gateway_tran_key', label: 'Transaction Key', type: 'password' },
    { key: 'payment_gateway_webhook_secret', label: 'Webhook Secret', type: 'password' },
  ],
  mailjet: [
    { key: 'mailjet_api_key', label: 'Mailjet API Key', type: 'text' },
    { key: 'mailjet_secret_key', label: 'Mailjet Secret Key', type: 'password' },
    { key: 'mailjet_sender_email', label: 'Sender Email', type: 'text' },
    { key: 'mailjet_sender_name', label: 'Sender Name', type: 'text' },
  ],
  whatsapp_bridge: [
    { key: 'whatsapp_bridge_url', label: 'Bridge URL', type: 'text' },
    { key: 'whatsapp_bridge_api_key', label: 'Bridge API Key', type: 'password' },
  ],
  twilio_sms: [
    { key: 'twilio_account_sid', label: 'Account SID', type: 'text' },
    { key: 'twilio_auth_token', label: 'Auth Token', type: 'password' },
    { key: 'twilio_from_number', label: 'From Number', type: 'text' },
    { key: 'twilio_use_test_mode', label: 'Usar Credenciales de Prueba', type: 'select', options: ['true', 'false'], description: 'Cuando está activo, SMS y Verify usan credenciales de test de Twilio (sandbox seguro)' },
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
  apple_nfc: [
    { key: 'apple_nfc_enabled', label: 'Habilitado', type: 'select', options: ['true', 'false'] },
    { key: 'apple_nfc_encryption_public_key', label: 'NFC Encryption Public Key', type: 'textarea' },
  ],
  ai_agent: [
    { key: 'ai_agent_base_url', label: 'Agent Base URL', type: 'text' },
    { key: 'ai_agent_api_key', label: 'Agent API Key', type: 'password' },
  ],
  backup_config: [
    { key: 'system_mode', label: 'System Mode', type: 'select', options: ['production', 'development'], description: 'Production = daily backups. Development = every 15 days.' },
    { key: 'backup_frequency', label: 'Backup Frequency', type: 'select', options: ['daily', '15days', 'weekly', 'monthly'] },
    { key: 'backup_retention', label: 'Backup Retention (days)', type: 'text', description: 'How many days to keep backups (1-365)' },
    { key: 'cron_hour', label: 'Cron Hour (0-23)', type: 'text', description: 'Hour of day to run backups' },
    { key: 'vault_thresholds', label: 'Vault Thresholds (JSON)', type: 'textarea', description: 'e.g. {"max_secret_ttl_days": 90, "max_init_age_days": 365}' },
  ],
};

/**
 * @description Extracts a human-readable error message from an unknown error.
 * @param {unknown} err - Error object or value
 * @param {string} fallback - Fallback message if extraction fails
 * @returns {string} Error message
 */
export const errorMessage = (err: unknown, fallback: string) => {
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

/**
 * @description Returns the appropriate file accept string for a vault field.
 * @param {string} fieldKey - Vault field key
 * @returns {string | undefined} File accept value
 */
export const fileAcceptFor = (fieldKey: string) => {
  if (fieldKey.endsWith('_json')) return '.json,application/json';
  if (fieldKey.endsWith('_pem')) return '.pem,.cer,.crt,.key,text/plain';
  return undefined;
};

const DIAGNOSTIC_MAPPING: Record<string, string> = {
  google_wallet_issuer_id: 'issuer_id_present',
  google_service_account_json: 'service_account_present',
  google_oauth_client_id: 'client_id_present',
  google_oauth_client_secret: 'client_secret_present',
  apple_pass_type_identifier: 'pass_type_id_present',
  apple_team_identifier: 'team_id_present',
  apple_cert_pem: 'cert_pem_present',
  apple_cert_key_pem: 'cert_key_pem_present',
  apple_wwdr_cert_pem: 'wwdr_cert_pem_present',
  mailjet_api_key: 'api_key_present',
  mailjet_secret_key: 'secret_key_present',
  mailjet_sender_email: 'sender_email_present',
  whatsapp_bridge_api_key: 'api_key_present',
  twilio_account_sid: 'account_sid_present',
  twilio_auth_token: 'auth_token_present',
  twilio_from_number: 'from_number_present',
  twilio_use_test_mode: 'use_test_mode',
  twilio_verify_enabled: 'verify_enabled',
  twilio_verify_service_sid: 'service_sid_present',
  twilio_verify_default_channel: 'default_channel',
  twilio_api_key_sid: 'api_key_sid_present',
  twilio_api_key_secret: 'api_key_secret_present',
  twilio_test_account_sid: 'test_account_sid_present',
  twilio_test_auth_token: 'test_auth_token_present',
  apple_nfc_encryption_public_key: 'public_key_present',
  ai_agent_api_key: 'api_key_present',
};

/**
 * @description Looks up a diagnostic value for a given integration field.
 * @param {Record<string, unknown>} diagnostics - Diagnostic data
 * @param {string} fieldKey - Field key to look up
 * @returns {string} Diagnostic display value
 */
export const getDiagnosticValue = (
  diagnostics: Record<string, unknown>,
  fieldKey: string
): string => {
  const diagKey = DIAGNOSTIC_MAPPING[fieldKey];
  if (diagKey && diagKey in diagnostics) {
    const val = diagnostics[diagKey];
    return val === true ? 'Configurado' : 'No configurado';
  }
  return '';
};

/**
 * @description Returns vault fields for a given integration key.
 * @param {string} key - Integration key
 * @returns {VaultField[]} Array of vault fields
 */
export const vaultFieldsFor = (key: string) => INTEGRATION_FIELDS[key] || [];

/**
 * @description Checks if an integration key is editable.
 * @param {string} key - Integration key
 * @returns {boolean} Whether the integration can be edited
 */
export const canEditIntegration = (key: string) => key in INTEGRATION_FIELDS;
