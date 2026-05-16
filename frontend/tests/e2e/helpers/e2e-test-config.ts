/**
 * Loyallia E2E credentials.
 *
 * User passwords are not Vault secrets. Playwright reads them from the ignored
 * local file written by the development RBAC provisioning command:
 *   backend: python manage.py provision_development_rbac_test_users --generate
 */
import fs from 'node:fs';
import path from 'node:path';

export type E2ERole = 'owner' | 'manager' | 'staff' | 'superadmin';

type CredentialFile = {
  users?: Partial<Record<E2ERole, { email?: string; password?: string }>>;
  provider_secrets?: Record<string, string>;
};

const CREDENTIAL_FILE = path.resolve(process.cwd(), '.auth/e2e-credentials.json');

export function getE2ECredentialFilePath(): string {
  return CREDENTIAL_FILE;
}

export function getE2ECredentials(): Record<E2ERole, { email: string; password: string }> {
  if (!fs.existsSync(CREDENTIAL_FILE)) {
    throw new Error(
      `Missing local E2E credential file: ${CREDENTIAL_FILE}\n` +
      'Run in the development backend container/environment:\n' +
      '  python manage.py provision_development_rbac_test_users --generate\n' +
      'The file is ignored by Git and must never be committed.',
    );
  }

  const parsed = JSON.parse(fs.readFileSync(CREDENTIAL_FILE, 'utf8')) as CredentialFile;
  const users = parsed.users || {};
  const roles: E2ERole[] = ['owner', 'manager', 'staff', 'superadmin'];
  const result = {} as Record<E2ERole, { email: string; password: string }>;

  for (const role of roles) {
    const item = users[role];
    if (!item?.email || !item?.password) {
      throw new Error(`Missing ${role} email/password in ${CREDENTIAL_FILE}`);
    }
    result[role] = { email: item.email, password: item.password };
  }

  return result;
}

export function getE2ERoleCredential(role: E2ERole): { email: string; password: string } {
  return getE2ECredentials()[role];
}

export function getLocalProviderSecret(key: string): string {
  const parsed = JSON.parse(fs.readFileSync(CREDENTIAL_FILE, 'utf8')) as CredentialFile;
  const value = parsed.provider_secrets?.[key];
  if (!value) {
    throw new Error(
      `Missing provider secret '${key}' in ${CREDENTIAL_FILE}. ` +
      'Load it from the development Vault path into the ignored local file before running direct provider tests.',
    );
  }
  return value;
}
