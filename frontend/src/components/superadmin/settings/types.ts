/**
 * Represents a third-party integration configuration.
 */
export type Integration = {
  /** Integration key identifier */
  key: string;
  /** Display name */
  name: string;
  /** Whether the integration is enabled */
  enabled: boolean;
  /** Whether the integration is fully configured */
  configured: boolean;
  /** Current status text */
  status: string;
  /** Detailed status message */
  detail: string;
  /** Diagnostic data */
  diagnostics: Record<string, unknown>;
  /** Preview values for display */
  preview_values: Record<string, string>;
};

/**
 * Field definition for Vault configuration forms.
 */
export type VaultField = {
  /** Field key */
  key: string;
  /** Display label */
  label: string;
  /** Input type */
  type: 'text' | 'textarea' | 'select' | 'password';
  /** Select options (when type is 'select') */
  options?: string[];
  /** Helpful description */
  description?: string;
};

/**
 * Platform-wide setting entry.
 */
export type PlatformSetting = {
  /** Setting key */
  key: string;
  /** Current value */
  value: string;
  /** Description of the setting */
  description: string;
  /** Category grouping */
  category: string;
  /** Whether a restart is required after change */
  requires_restart: boolean;
  /** Last updated timestamp */
  updated_at: string;
};
