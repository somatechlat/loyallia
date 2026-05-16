import { defineConfig, devices } from '@playwright/test';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { execSync } from 'child_process';

// ═══════════════════════════════════════════════════════════════════════════════
// VAULT BOOTSTRAP — Read ALL secrets from HashiCorp Vault. NO .env.test.
// Uses synchronous curl because Playwright config is loaded via require().
// ═══════════════════════════════════════════════════════════════════════════════

const vaultAddr = process.env.VAULT_ADDR || 'http://127.0.0.1:33908';
let vaultToken = process.env.VAULT_TOKEN || '';

if (!vaultToken) {
  try {
    const initData = JSON.parse(readFileSync(resolve(__dirname, '../.agents/vault_init_rescue.json'), 'utf-8'));
    vaultToken = initData.root_token || '';
  } catch {
    // No rescue file — will fail below if still empty
  }
}

if (!vaultToken) {
  throw new Error(
    'VAULT_TOKEN is required. ' +
    'Set VAULT_TOKEN env var or ensure .agents/vault_init_rescue.json exists with root_token.',
  );
}

// Synchronous Vault read (config file cannot use top-level await)
const vaultResp = execSync(
  `curl -s -H "X-Vault-Token: ${vaultToken}" "${vaultAddr}/v1/secret/data/loyallia/e2e"`,
  { encoding: 'utf-8', timeout: 10000 },
);
const vaultJson = JSON.parse(vaultResp);
const secrets: Record<string, string> = vaultJson.data?.data || {};

// Inject secrets into process.env so getE2EBaseURL() and getRoleCredentials() work
for (const [key, value] of Object.entries(secrets)) {
  if (!process.env[key]) process.env[key] = value;
}

const baseURL = process.env.PLAYWRIGHT_BASE_URL;
if (!baseURL) {
  throw new Error('PLAYWRIGHT_BASE_URL not found in Vault secret loyallia/e2e');
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
