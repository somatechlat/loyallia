import { defineConfig, devices } from '@playwright/test';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// Load .env.test credentials for Playwright auth setup
const envTestPath = resolve(__dirname, '.env.test');
if (existsSync(envTestPath)) {
  const envContent = readFileSync(envTestPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.substring(0, eqIdx).trim();
      const val = trimmed.substring(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

const baseURL = process.env.PLAYWRIGHT_BASE_URL;
if (!baseURL) {
  throw new Error('PLAYWRIGHT_BASE_URL is required for Playwright tests.');
}

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
      testIgnore: /suite\/01-auth\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
      grepInvert: /@owner|@manager|@staff|@superadmin/,
    },
  ],
});
