/**
 * Loyallia — Vault Credential Loader for E2E Tests
 *
 * ALL test credentials are fetched from HashiCorp Vault.
 * No hardcoded passwords. No env-var fallbacks.
 * Fail fast if Vault is unreachable.
 */

import { expect } from '@playwright/test';

export type E2ERole = 'owner' | 'manager' | 'staff' | 'superadmin';

const VAULT_ADDR = process.env.VAULT_ADDR || 'http://localhost:33908';
const VAULT_SECRET_PATH = 'secret/data/loyallia/production';

let vaultCredentials: Record<string, string> | null = null;

/**
 * Fetch all test credentials from Vault KV v2.
 * Cached to avoid repeated Vault calls within a test run.
 */
export async function loadVaultCredentials(): Promise<Record<string, string>> {
  if (vaultCredentials) {
    return vaultCredentials;
  }

  const vaultToken = process.env.VAULT_TOKEN;
  if (!vaultToken) {
    throw new Error(
      'VAULT_TOKEN is required for Playwright tests. ' +
      'Tests retrieve credentials from Vault exclusively. ' +
      'Export VAULT_TOKEN before running tests.',
    );
  }

  const url = `${VAULT_ADDR}/v1/${VAULT_SECRET_PATH}`;
  const headers = { 'X-Vault-Token': vaultToken };

  let response: Response;
  try {
    response = await fetch(url, { headers, method: 'GET' });
  } catch (err) {
    throw new Error(
      `Vault request failed: ${err instanceof Error ? err.message : String(err)}. ` +
      `Ensure Vault is running at ${VAULT_ADDR}.`,
    );
  }

  if (!response.ok) {
    throw new Error(
      `Vault request failed with status ${response.status}. ` +
      `Ensure Vault token is valid and path '${VAULT_SECRET_PATH}' exists.`,
    );
  }

  const body = await response.json();
  const data = body?.data?.data || {};

  if (Object.keys(data).length === 0) {
    throw new Error(`Vault returned empty secrets at path '${VAULT_SECRET_PATH}'.`);
  }

  vaultCredentials = data as Record<string, string>;
  return vaultCredentials;
}

/**
 * Clear the cached Vault credentials. Call between test runs if needed.
 */
export function clearVaultCredentials(): void {
  vaultCredentials = null;
}

/**
 * Get credentials for a specific role from Vault.
 */
export async function getRoleCredentialsFromVault(
  role: E2ERole,
): Promise<{ email: string; password: string }> {
  const creds = await loadVaultCredentials();

  const emailKey = `test_${role}_email`;
  const passwordKey = `test_${role}_password`;

  const email = creds[emailKey];
  const password = creds[passwordKey];

  if (!email || !password) {
    throw new Error(
      `Missing test credentials in Vault for role '${role}'. ` +
      `Expected keys: '${emailKey}' and '${passwordKey}' at path '${VAULT_SECRET_PATH}'.`,
    );
  }

  return { email, password };
}

/**
 * Get all role credentials from Vault as a flat record.
 * Used by auth.setup.ts for bulk credential loading.
 */
export async function getAllRoleCredentialsFromVault(): Promise<
  Record<E2ERole, { email: string; password: string }>
> {
  const creds = await loadVaultCredentials();

  const result = {} as Record<E2ERole, { email: string; password: string }>;
  const roles: E2ERole[] = ['owner', 'manager', 'staff', 'superadmin'];

  for (const role of roles) {
    const emailKey = `test_${role}_email`;
    const passwordKey = `test_${role}_password`;
    const email = creds[emailKey];
    const password = creds[passwordKey];

    if (!email || !password) {
      throw new Error(
        `Missing test credentials in Vault for role '${role}'. ` +
        `Expected keys: '${emailKey}' and '${passwordKey}'.`,
      );
    }

    result[role] = { email, password };
  }

  return result;
}

/**
 * Legacy helper kept for compatibility during transition.
 * DEPRECATED: Use getRoleCredentialsFromVault() instead.
 */
export function getRoleCredentials(role: E2ERole): { email: string; password: string } {
  throw new Error(
    'getRoleCredentials() is deprecated. ' +
    'Use getRoleCredentialsFromVault() which fetches credentials from Vault.',
  );
}
