import { test, expect } from '@playwright/test';
import { getE2EBaseURL } from '../helpers/e2e-safety';

const BASE_API = getE2EBaseURL();
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

test('capture upload request/response', async ({ page }) => {
  await page.goto('/programs/new', { waitUntil: 'networkidle' });

  // reach step 2 (designer / Images tab)
  await page.getByRole('button', { name: 'Tarjeta de Sellos' }).click().catch(async () => {
    await page.getByText('Tarjeta de Sellos').click();
  });
  await page.getByRole('button', { name: /siguiente/i }).click();
  await page.getByText('Sellos requeridos').waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  await page.getByRole('button', { name: /siguiente/i }).click();

  await page.waitForSelector('#logo-upload', { state: 'attached', timeout: 15000 });

  const logs: string[] = [];
  page.on('request', (req) => {
    if (req.url().includes('/api/v1/upload/')) {
      logs.push(`REQ ${req.method()} ${req.url()}`);
      logs.push(`  CT: ${req.headers()['content-type']}`);
      logs.push(`  postData: ${JSON.stringify(req.postData())}`);
      logs.push(`  postDataBuffer: ${req.postDataBuffer() ? `len=${req.postDataBuffer()!.length}` : 'null'}`);
    }
  });
  page.on('response', (res) => {
    if (res.url().includes('/api/v1/upload/')) {
      logs.push(`RESP ${res.status()}`);
    }
  });

  const chooser = page.waitForEvent('filechooser', { timeout: 15000 });
  await page.locator('#logo-upload').locator('xpath=..').click();
  (await chooser).setFiles({ name: 'logo.png', mimeType: 'image/png', buffer: PNG });

  await page.waitForTimeout(3000);
  expect(logs.join('\n')).toContain('REQ POST');
  console.log('=== UPLOAD LOGS ===\n' + logs.join('\n'));
});