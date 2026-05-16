/**
 * Loyallia — E2E Test Configuration
 *
 * Test user emails are DEMO DATA (not secrets) and match the backend
 * seed_test_data management command output.
 *
 * SECURITY:
 * - Passwords are NOT stored here.
 * - Passwords are NOT fetched from Vault.
 * - Set LOYALLIA_SEED_PASSWORD env var to match the password used when
 *   running: python manage.py seed_test_data --password $LOYALLIA_SEED_PASSWORD
 */

export type E2ERole = 'owner' | 'manager' | 'staff' | 'superadmin';

export const E2E_TEST_USERS: Record<E2ERole, { email: string }> = {
  owner: { email: 'owner@example.com' },
  manager: { email: 'manager@example.com' },
  staff: { email: 'staff@example.com' },
  superadmin: { email: 'admin@loyallia.com' },
};

export function getE2ESeedPassword(): string {
  const pwd = process.env.LOYALLIA_SEED_PASSWORD;
  if (!pwd) {
    throw new Error(
      'LOYALLIA_SEED_PASSWORD is required for Playwright E2E tests.\n' +
      'Run the backend seed command first:\n' +
      '  python manage.py seed_test_data --password <your_password>\n' +
      'Then export the same password:\n' +
      '  export LOYALLIA_SEED_PASSWORD=<your_password>\n' +
      'Never commit passwords to code.',
    );
  }
  return pwd;
}
