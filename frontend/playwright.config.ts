import { defineConfig } from '@playwright/test';

// ⚠️ CRITICAL: E2E tests MUST run against the LOCAL Docker cluster.
//   cd frontend && PLAYWRIGHT_BASE_URL=http://localhost:33906 npx playwright test
// Do NOT run against production URLs unless E2E_ALLOW_HOSTS is explicitly set.
// The backend API (loyallia-api), database, and Vault run inside Docker only.
//
// ═══════════════════════════════════════════════════════════════════════════════
// PLAYWRIGHT CONFIGURATION — Loyallia E2E Tests
//
// SECURITY: No hardcoded credentials. User passwords are not Vault secrets.
// Auth setup reads the ignored local .auth/e2e-credentials.json file created
// by the development RBAC provisioning command and logs in through the real API.
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
    actionTimeout: 15000,
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
    // --- Setup: authenticate all roles through the real login API ---
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
      use: { storageState: '.auth/owner.json' },
    },
    {
      name: 'customers',
      testMatch: /suite\/03-.*\.spec\.ts/,
      dependencies: ['setup'],
      grep: /@customers/,
      use: { storageState: '.auth/owner.json' },
    },
    {
      name: 'team',
      testMatch: /suite\/04-.*\.spec\.ts/,
      dependencies: ['setup'],
      grep: /@team/,
      use: { storageState: '.auth/owner.json' },
    },
    {
      name: 'locations',
      testMatch: /suite\/05-.*\.spec\.ts/,
      dependencies: ['setup'],
      grep: /@locations/,
      use: { storageState: '.auth/owner.json' },
    },
    {
      name: 'analytics',
      testMatch: /suite\/(06|13)-.*\.spec\.ts/,
      dependencies: ['setup'],
      grep: /@analytics/,
      use: { storageState: '.auth/owner.json' },
    },
    {
      name: 'automation',
      testMatch: /suite\/07-.*\.spec\.ts/,
      dependencies: ['setup'],
      grep: /@automation/,
      use: { storageState: '.auth/owner.json' },
    },
    {
      name: 'campaigns',
      testMatch: /suite\/(08|19|21|23)-.*\.spec\.ts/,
      dependencies: ['setup'],
      grep: /@campaigns/,
      use: { storageState: '.auth/owner.json' },
    },
    {
      name: 'settings-billing',
      testMatch: /suite\/09-.*\.spec\.ts/,
      dependencies: ['setup'],
      grep: /@settings/,
      use: { storageState: '.auth/owner.json' },
    },
    {
      name: 'scanner',
      testMatch: /suite\/10-.*\.spec\.ts/,
      dependencies: ['setup'],
      grep: /@scanner/,
      use: { storageState: '.auth/owner.json' },
    },
    {
      name: 'superadmin',
      testMatch: /suite\/(11|26|27|28|29|30|31)-.*\.spec\.ts/,
      dependencies: ['setup'],
      grep: /@superadmin/,
      use: { storageState: '.auth/superadmin.json' },
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
      use: { storageState: '.auth/owner.json' },
    },
    {
      name: 'security',
      testMatch: /suite\/16-.*\.spec\.ts/,
      dependencies: ['setup'],
      grep: /@security/,
      use: { storageState: '.auth/owner.json' },
    },
    {
      name: 'whatsapp',
      testMatch: /suite\/(17|18|31)-.*\.spec\.ts/,
      dependencies: ['setup'],
      grep: /@whatsapp/,
      use: { storageState: '.auth/owner.json' },
    },
    {
      name: 'phone',
      testMatch: /suite\/15-.*\.spec\.ts/,
      dependencies: ['setup'],
      grep: /@phone/,
      use: { storageState: '.auth/owner.json' },
    },
    {
      name: 'billing',
      testMatch: /suite\/32-.*\.spec\.ts/,
      dependencies: ['setup'],
      grep: /@billing/,
      use: { storageState: '.auth/owner.json' },
    },
    // --- Full suite ---
    {
      name: 'full',
      testMatch: /suite\/.*\.spec\.ts/,
      dependencies: ['setup'],
      grepInvert: /@auth/,
      use: { storageState: '.auth/owner.json' },
    },
  ],
});
