import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
  expect: { timeout: 15000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: 'http://localhost:33906',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },
  projects: [
    // --- Setup: authenticate all roles ---
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },

    // --- Owner tests ---
    {
      name: 'owner',
      testMatch: /suite\/.+\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/owner.json',
      },
      dependencies: ['setup'],
      grep: /@owner/,
    },

    // --- Manager tests ---
    {
      name: 'manager',
      testMatch: /suite\/.+\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/manager.json',
      },
      dependencies: ['setup'],
      grep: /@manager/,
    },

    // --- Staff tests ---
    {
      name: 'staff',
      testMatch: /suite\/.+\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/staff.json',
      },
      dependencies: ['setup'],
      grep: /@staff/,
    },

    // --- SuperAdmin tests ---
    {
      name: 'superadmin',
      testMatch: /suite\/.+\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/superadmin.json',
      },
      dependencies: ['setup'],
      grep: /@superadmin/,
    },

    {
      name: 'auth-flow',
      testMatch: /suite\/01-auth\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'public-flow',
      testMatch: /.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
