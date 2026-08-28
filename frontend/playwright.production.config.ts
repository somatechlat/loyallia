import { defineConfig } from '@playwright/test';

// ═══════════════════════════════════════════════════════════════════════════════
// PLAYWRIGHT PRODUCTION CONFIGURATION — Loyallia E2E Tests
//
// Usage:
//   export PLAYWRIGHT_BASE_URL=https://rewards.loyallia.com
//   export E2E_ALLOW_HOSTS=rewards.loyallia.com
//   cd frontend && npx playwright test --config=playwright.production.config.ts
//
// Differences from local config:
//   - Retries: 2 (production has network latency)
//   - Timeout: 120s (production is slower)
//   - Expect timeout: 30s (production UI rendering slower)
//   - Workers: 1 (serial, production safety)
//   - Traces: always on (full debugging for production issues)
// ═══════════════════════════════════════════════════════════════════════════════

const baseURL = process.env.PLAYWRIGHT_BASE_URL;
if (!baseURL) {
  throw new Error(
    'PLAYWRIGHT_BASE_URL is required for production E2E tests.\n' +
    'Example: export PLAYWRIGHT_BASE_URL=https://rewards.loyallia.com'
  );
}

if (!process.env.E2E_ALLOW_HOSTS) {
  throw new Error(
    'E2E_ALLOW_HOSTS is required for production E2E tests.\n' +
    'Example: export E2E_ALLOW_HOSTS=rewards.loyallia.com'
  );
}

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 120000,
  expect: { timeout: 30000 },
  fullyParallel: false,
  forbidOnly: true,
  retries: 2,
  workers: 1,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL,
    trace: 'on',
    screenshot: 'on',
    video: 'on-first-retry',
    ignoreHTTPSErrors: true,
    actionTimeout: 20000,
    navigationTimeout: 30000,
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
