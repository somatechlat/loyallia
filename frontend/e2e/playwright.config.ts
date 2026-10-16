import { defineConfig, devices } from '@playwright/test';

/**
 * Loyallia — Playwright configuration for the AI chatbot ("Chatea con AiGi")
 * characterization suite.
 *
 * ⚠️ Run against the LOCAL Docker cluster only:
 *   cd frontend && npx playwright test --config=e2e/playwright.config.ts
 *   (or: npm run test:e2e:chatbot)
 *
 * The suite is intentionally SERIAL (`fullyParallel: false`, 1 worker): the
 * chatbot keeps conversational state and the network assertions in
 * tests/chatbot.spec.ts read the request stream in order.
 *
 * SECURITY: no hardcoded credentials. Credentials come from env vars
 * (E2E_EMAIL/E2E_PASSWORD, E2E_STAFF_EMAIL/E2E_STAFF_PASSWORD) or from the
 * git-ignored frontend/.auth/e2e-credentials.json written by
 * `python manage.py provision_development_rbac_test_users --generate`.
 * See e2e/README.md.
 */

// E2E_BASE_URL is the documented variable; PLAYWRIGHT_BASE_URL is honored for
// consistency with the existing suite (frontend/playwright.config.ts).
// Default matches docker-compose.yml: web container published at 127.0.0.1:33906.
const baseURL = (
  process.env.E2E_BASE_URL ||
  process.env.PLAYWRIGHT_BASE_URL ||
  'http://localhost:33906'
).replace(/\/$/, '');

// Chromium is the default. WebKit/Firefox projects are configured but opt-in
// (they require `npx playwright install webkit firefox` first):
//   E2E_BROWSERS=chromium,webkit,firefox
const requestedBrowsers = (process.env.E2E_BROWSERS || 'chromium')
  .split(',')
  .map((b) => b.trim())
  .filter(Boolean);

const browserProjects = [
  { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
].filter((p) => requestedBrowsers.includes(p.name));

export default defineConfig({
  testDir: './tests',
  // Agent replies can take 30-60 s; some scenarios send two of them.
  timeout: 180_000,
  expect: { timeout: 30_000 },
  // Chat state is sequential — never shard this suite.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  // Task contract: 1 retry locally (characterization failures are expected and
  // marked test.fail()/test.fixme, which do not consume retries).
  retries: 1,
  reporter: [
    ['html', { open: 'never', outputFolder: './playwright-report' }],
    ['list'],
  ],
  outputDir: './test-results',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ignoreHTTPSErrors: true,
    actionTimeout: 15_000,
    // Pre-accept cookie consent so the banner never blocks clicks
    // (same convention as frontend/playwright.config.ts).
    storageState: {
      cookies: [],
      origins: [
        {
          origin: baseURL,
          localStorage: [{ name: 'loyallia_cookie_consent', value: 'true' }],
        },
      ],
    },
  },
  projects: browserProjects,
});
