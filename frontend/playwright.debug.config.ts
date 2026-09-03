import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 120000,
  workers: 1,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'https://rewards.loyallia.com',
    ignoreHTTPSErrors: true,
    trace: 'on-first-retry',
    storageState: '.auth/owner.json',
  },
  projects: [
    { name: 'debug', testMatch: /suite\/99-upload-debug\.spec\.ts/ },
  ],
});