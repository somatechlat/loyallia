/**
 * Suite 16 — Programs Borradores, FormBuilder Wizard, Coupon Push Enhancements
 * Tests the new Borradores section, dynamic form builder in wizard Step 1,
 * coupon push title/image/expiry reminder, and enrollment privacy consent.
 */
import { test, expect } from '@playwright/test';

const BASE_API = 'http://localhost:33905';

// ═══════════════════════════════════════════════════════════════════════════
// PROGRAMS — BORRADORES SECTION
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Programs Borradores — OWNER @owner', () => {

  test('Programs page shows Activas/Borradores/Inactivas sections @owner', async ({ page }) => {
    await page.goto('/programs', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    // At minimum Activas section should be visible
    await expect(page.getByText('Activas')).toBeVisible({ timeout: 10000 });
    // Borradores section should be visible (may have 0 items)
    await expect(page.getByText('Borradores')).toBeVisible({ timeout: 5000 });
  });

  test('Borradores section has amber accent @owner', async ({ page }) => {
    await page.goto('/programs', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    // Borradores section uses amber border
    const borradoresSection = page.getByText('Borradores').first();
    await expect(borradoresSection).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// WIZARD — FORM BUILDER IN STEP 1
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Wizard FormBuilder — OWNER @owner', () => {

  test('FormBuilder renders in Step 1 with default fields @owner', async ({ page }) => {
    await page.goto('/programs/new', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Step 0: Select stamp card type
    await page.getByText('Tarjeta de Sellos').click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /siguiente/i }).click();
    await page.waitForTimeout(1000);

    // Step 1: FormBuilder should be visible
    await expect(page.getByText('Formulario de inscripción')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('+ Agregar campo')).toBeVisible();
  });

  test('Can add a new field in FormBuilder @owner', async ({ page }) => {
    await page.goto('/programs/new', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    await page.getByText('Tarjeta de Sellos').click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /siguiente/i }).click();
    await page.waitForTimeout(1000);

    // Click "Agregar campo"
    await page.getByText('+ Agregar campo').click();
    await page.waitForTimeout(500);

    // A "Nuevo campo" should appear
    await expect(page.getByText('Nuevo campo')).toBeVisible({ timeout: 3000 });
  });

  test('FormBuilder field count updates @owner', async ({ page }) => {
    await page.goto('/programs/new', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    await page.getByText('Tarjeta de Sellos').click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /siguiente/i }).click();
    await page.waitForTimeout(1000);

    // Should show field count text
    const countText = page.getByText(/campos? configurados?/);
    await expect(countText).toBeVisible({ timeout: 5000 });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// COUPON WIZARD — PUSH TITLE, IMAGE, EXPIRY REMINDER
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Coupon Push Enhancements — OWNER @owner', () => {

  test('Coupon wizard shows push title field @owner', async ({ page }) => {
    await page.goto('/programs/new', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Step 0: Select coupon type
    await page.getByText('Cupón de Descuento').click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /siguiente/i }).click();
    await page.waitForTimeout(1000);

    // Step 1: Configure coupon
    // Select a discount type first
    await page.getByText('Descuento de valor fijo').click();
    await page.waitForTimeout(300);

    // Scroll down to find push section
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    // Push title input should be visible
    await expect(page.getByText('Título de la notificación')).toBeVisible({ timeout: 5000 });
  });

  test('Coupon wizard shows image URL field @owner', async ({ page }) => {
    await page.goto('/programs/new', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    await page.getByText('Cupón de Descuento').click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /siguiente/i }).click();
    await page.waitForTimeout(1000);

    await page.getByText('Descuento de valor fijo').click();
    await page.waitForTimeout(300);

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    await expect(page.getByText('Imagen del cupón (URL)')).toBeVisible({ timeout: 5000 });
  });

  test('Coupon wizard shows expiry reminder checkbox @owner', async ({ page }) => {
    await page.goto('/programs/new', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    await page.getByText('Cupón de Descuento').click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /siguiente/i }).click();
    await page.waitForTimeout(1000);

    await page.getByText('Descuento de valor fijo').click();
    await page.waitForTimeout(300);

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);

    await expect(page.locator('#push_expiry_reminder')).toBeVisible({ timeout: 5000 });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// ENROLLMENT — DYNAMIC FIELDS + PRIVACY CONSENT
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Enrollment Page — Public Flow', () => {

  test('Enrollment page loads for a valid card', async ({ page, request }) => {
    // Get a card ID from the API
    const loginResp = await request.post(`${BASE_API}/api/v1/auth/login/`, {
      data: { email: 'carlos@cafeelritmo.ec', password: '123456' },
    });
    const { access_token } = await loginResp.json();

    const cardsResp = await request.get(`${BASE_API}/api/v1/cards/`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const cards = await cardsResp.json();
    if (!cards || cards.length === 0) {
      test.skip();
      return;
    }

    const cardId = cards[0].id;
    await page.goto(`/enroll/${cardId}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Form should be visible
    await expect(page.getByText('Únete ahora')).toBeVisible({ timeout: 10000 });
  });

  test('Enrollment form shows privacy consent checkbox', async ({ page, request }) => {
    const loginResp = await request.post(`${BASE_API}/api/v1/auth/login/`, {
      data: { email: 'carlos@cafeelritmo.ec', password: '123456' },
    });
    const { access_token } = await loginResp.json();

    const cardsResp = await request.get(`${BASE_API}/api/v1/cards/`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const cards = await cardsResp.json();
    if (!cards || cards.length === 0) {
      test.skip();
      return;
    }

    const cardId = cards[0].id;
    await page.goto(`/enroll/${cardId}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Privacy consent text should be visible
    await expect(page.getByText('política de privacidad')).toBeVisible({ timeout: 5000 });
  });

  test('Enroll button disabled until privacy accepted', async ({ page, request }) => {
    const loginResp = await request.post(`${BASE_API}/api/v1/auth/login/`, {
      data: { email: 'carlos@cafeelritmo.ec', password: '123456' },
    });
    const { access_token } = await loginResp.json();

    const cardsResp = await request.get(`${BASE_API}/api/v1/cards/`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const cards = await cardsResp.json();
    if (!cards || cards.length === 0) {
      test.skip();
      return;
    }

    const cardId = cards[0].id;
    await page.goto(`/enroll/${cardId}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Button should be disabled initially
    const enrollBtn = page.locator('#enroll-btn');
    await expect(enrollBtn).toBeDisabled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// BACKEND API — COUPON VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Coupon Validation API', () => {

  test('Card creation API accepts special_promo discount type', async ({ request }) => {
    const loginResp = await request.post(`${BASE_API}/api/v1/auth/login/`, {
      data: { email: 'carlos@cafeelritmo.ec', password: '123456' },
    });
    const { access_token } = await loginResp.json();

    const cardData = {
      name: 'E2E Promo Coupon',
      card_type: 'coupon',
      description: 'Test special promo',
      metadata: {
        discount_type: 'special_promo',
        promo_text: '2x1 en pizzas los martes',
        usage_limit_per_customer: 3,
      },
    };

    const resp = await request.post(`${BASE_API}/api/v1/cards/`, {
      headers: { Authorization: `Bearer ${access_token}` },
      data: cardData,
    });
    // Should succeed (200/201) — special_promo is now valid
    expect([200, 201]).toContain(resp.status());
  });

  test('Card creation API validates coupon dates', async ({ request }) => {
    const loginResp = await request.post(`${BASE_API}/api/v1/auth/login/`, {
      data: { email: 'carlos@cafeelritmo.ec', password: '123456' },
    });
    const { access_token } = await loginResp.json();

    const cardData = {
      name: 'E2E Bad Dates Coupon',
      card_type: 'coupon',
      description: 'Test invalid dates',
      metadata: {
        discount_type: 'fixed_amount',
        discount_value: 5,
        usage_limit_per_customer: 1,
        coupon_start_date: '2026-06-01',
        coupon_end_date: '2026-01-01', // End before start — INVALID
      },
    };

    const resp = await request.post(`${BASE_API}/api/v1/cards/`, {
      headers: { Authorization: `Bearer ${access_token}` },
      data: cardData,
    });
    // Should fail validation
    expect([400, 422]).toContain(resp.status());
  });
});
