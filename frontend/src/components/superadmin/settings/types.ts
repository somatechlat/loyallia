export type Integration = {
  key: string;
  name: string;
  enabled: boolean;
  configured: boolean;
  status: string;
  detail: string;
  diagnostics: Record<string, unknown>;
  preview_values: Record<string, string>;
};

export type VaultField = {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'password';
  options?: string[];
  description?: string;
};

export type PlatformSetting = {
  key: string;
  value: string;
  description: string;
  category: string;
  requires_restart: boolean;
  updated_at: string;
};
