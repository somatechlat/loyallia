import { test } from '@playwright/test';
import * as path from 'path';

test('Visual QA Crawler', async ({ page }) => {
  // Login once
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.fill('input[type="email"]', 'carlos@cafeelritmo.ec');
  await page.fill('input[type="password"]', '123456');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);
  await page.waitForURL('**/', { timeout: 15000 });

  const routes = [
    { url: '/', name: '01_Dashboard_Overview' },
    { url: '/analytics', name: '02_Analytics' },
    { url: '/programs', name: '03_Programs' },
    { url: '/customers', name: '04_Customers' },
    { url: '/campaigns', name: '05_Campaigns' },
    { url: '/automation', name: '06_Automation' },
    { url: '/locations', name: '07_Locations' },
    { url: '/team', name: '08_Team' },
    { url: '/billing', name: '09_Billing' },
  ];

  for (const route of routes) {
    // Navigate
    await page.goto(route.url, { waitUntil: 'networkidle' });
    // Give React grace period
    await page.waitForTimeout(2000); 

    const screenshotPath = `/Users/macbookpro201916i964gb1tb/.gemini/antigravity/brain/52303347-f007-4b3c-8316-60f4e52f8fff/${route.name}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true });
    
    // Safety check the CRUD routes
    if (route.url === '/programs') {
      await page.goto('/programs/new', { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);
      await page.screenshot({ path: `/Users/macbookpro201916i964gb1tb/.gemini/antigravity/brain/52303347-f007-4b3c-8316-60f4e52f8fff/03A_Programs_New.png`, fullPage: true });
    }
  }
});
