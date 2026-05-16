import { defineConfig, devices } from '@playwright/test';

// ═══════════════════════════════════════════════════════════════════════════════
// PLAYWRIGHT CONFIGURATION — Loyallia E2E Tests
//
// SECURITY: No hardcoded credentials. No env-var password fallbacks.
// ALL credentials are loaded from HashiCorp Vault at runtime via
// tests/e2e/helpers/vault-credentials.ts.
//
// VAULT_TOKEN must be exported before running tests.
// ═══════════════════════════════════════════════════════════════════════════════

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:33906';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
  expect: { timeout: 15000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    ignoreHTTPSErrors: true,
    // Pre-accept cookie consent to prevent the banner from blocking clicks
    storageState: {
      cookies: [],
      origins: [{
        origin: baseURL,
        localStorage: [{ name: 'loyallia_cookie_consent', value: 'true' }],
      }],
    },
  },
  projects: [
    // --- Setup: authenticate all roles via Vault ---
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },

    // --- Module-based projects ---
    {
      name: 'auth',
      testMatch: /suite\/01-auth\.spec\.ts/,
      dependencies: ['setup'],
    },
    {
      name: 'programs',
      testMatch: /suite\/(02|14|16)-.*\.spec\.ts/,
      dependencies: ['setup'],
      grep: /@programs/,
    },
    {
      name: 'customers',
      testMatch: /suite\/03-.*\.spec\.ts/,
      dependencies: ['setup'],
      grep: /@customers/,
    },
    {
      name: 'team',
      testMatch: /suite\/04-.*\.spec\.ts/,
      dependencies: ['setup'],
      grep: /@team/,
    },
    {
      name: 'locations',
      testMatch: /suite\/05-.*\.spec\.ts/,
      dependencies: ['setup'],
      grep: /@locations/,
    },
    {
      name: 'analytics',
      testMatch: /suite\/(06|13)-.*\.spec\.ts/,
      dependencies: ['setup'],
      grep: /@analytics/,
    },
    {
      name: 'automation',
      testMatch: /suite\/07-.*\.spec\.ts/,
      dependencies: ['setup'],
      grep: /@automation/,
    },
    {
      name: 'campaigns',
      testMatch: /suite\/(08|17|19|21|23|24)-.*\.spec\.ts/,
      dependencies: ['setup'],
      grep: /@campaigns/,
    },
    {
      name: 'settings-billing',
      testMatch: /suite\/09-.*\.spec\.ts/,
      dependencies: ['setup'],
      grep: /@settings/,
    },
    {
      name: 'scanner',
      testMatch: /suite\/10-.*\.spec\.ts/,
      dependencies: ['setup'],
      grep: /@scanner/,
    },
    {
      name: 'superadmin',
      testMatch: /suite\/(11|26|27|28|29|30|31)-.*\.spec\.ts/,
      dependencies: ['setup'],
      grep: /@superadmin/,
    },
    {
      name: 'role-isolation',
      testMatch: /suite\/12-.*\.spec\.ts/,
      dependencies: ['setup'],
      grep: /@role-isolation/,
    },
    {
      name: 'wallet',
      testMatch: /suite\/22-.*\.spec\.ts/,
      dependencies: ['setup'],
      grep: /@wallet/,
    },
    {
      name: 'security',
      testMatch: /suite\/16-.*\.spec\.ts/,
      dependencies: ['setup'],
      grep: /@security/,
    },
    {
      name: 'whatsapp',
      testMatch: /suite\/(17|18|24|31)-.*\.spec\.ts/,
      dependencies: ['setup'],
      grep: /@whatsapp/,
    },
    {
      name: 'phone',
      testMatch: /suite\/15-.*\.spec\.ts/,
      dependencies: ['setup'],
      grep: /@phone/,
    },
    {
      name: 'billing',
      testMatch: /suite\/32-.*\.spec\.ts/,
      dependencies: ['setup'],
      grep: /@billing/,
    },
    // --- Full suite ---
    {
      name: 'full',
      testMatch: /suite\/.*\.spec\.ts/,
      dependencies: ['setup'],
    },
  ],
});
