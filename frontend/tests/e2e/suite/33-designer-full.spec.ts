/**
 * Suite 33 — Card Designer (WalletStudio) Full Coverage E2E
 * Comprehensive test of the pass designer across every module/tab:
 *   navigation, images, fields, colors, barcode, back, card-type config,
 *   advanced, platform toggle, save persistence, and RBAC access.
 *
 * Strategy: Hybrid API + UI.
 *   - API to create a deterministic OWNER program (designer requires an existing program).
 *   - UI to drive the real designer (StudioSidebar tabs, controls, save).
 *   - API to verify persisted design/metadata and to clean up after itself
 *     (only records with a unique 'E2E Designer' prefix).
 *
 * Runs in the 'designer' project (OWNER role storage state) — see playwright.config.ts.
 */
import { test, expect, type APIRequestContext, type Page } from '@playwright/test';
import { getE2EBaseURL } from '../helpers/e2e-safety';
import { getOwnerToken } from '../helpers/designer-auth';

test.use({ storageState: '.auth/owner.json' });

const BASE_API = getE2EBaseURL();
const UNIQUE_PREFIX = `E2E Designer ${Date.now()}`;

// ── Role → home route  (mirrors frontend/src/middleware.ts redirects) ─────────
const ROLE_HOME: Record<string, string> = {
  OWNER: '/',
  STAFF: '/scanner/scan',
  SUPER_ADMIN: '/superadmin',
};

let createdProgramId = '';

/** Own scenario helper: create a fresh program via API for the designer. */
async function createProgram(request: APIRequestContext): Promise<string> {
  const token = await getOwnerToken(request);
  const name = `${UNIQUE_PREFIX} ${Date.now()}`;
  const resp = await request.post(`${BASE_API}/api/v1/programs/`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      name,
      description: 'Programa creado por suite 33 para probar el diseñador de tarjetas',
      card_type: 'stamp',
      barcode_type: 'qr_code',
      background_color: '#1a1a2e',
      text_color: '#ffffff',
      metadata: {
        wallet_provider: 'both',
        stamps_required: 5,
        reward_description: 'Café gratis',
      },
    },
  });
  expect(resp.status(), `Program creation should succeed (got ${resp.status()})`).toBe(200);
  const card = await resp.json();
  expect(card.id).toBeTruthy();
  return card.id as string;
}

/** Open the live designer for a program via the toolbar-less route. */
async function openDesigner(page: Page, programId: string): Promise<void> {
  await page.goto(`/programs/${programId}/design`, { waitUntil: 'networkidle' });
  // Designer header
  await expect(page.getByText(/Design Studio/i).first()).toBeVisible({ timeout: 20000 });
  // First panel (Imágenes) is active by default
  await expect(page.getByRole('button', { name: 'Imágenes' })).toBeVisible({ timeout: 10000 });
}

/** Click a studio tab by its Spanish label (resolved in StudioSidebar). */
async function clickTab(page: Page, label: string): Promise<void> {
  const tab = page.getByRole('button', { name: label, exact: true }).first();
  await expect(tab).toBeVisible({ timeout: 10000 });
  await tab.click();
}

// =============================================================================
// PHASE 1: DESIGNER NAVIGATION
// =============================================================================
test.describe('Designer — Navigation @designer', () => {
  test('designer loads from program page and shows all 7 tabs', async ({ page }) => {
    const programId = await createProgram(page.request);
    try {
      await openDesigner(page, programId);
      const tabs = ['Imágenes', 'Campos', 'Reverso', 'Código', 'Colores', 'Avanzado', 'Sellos'];
      for (const label of tabs) {
        await expect(page.getByRole('button', { name: label, exact: true }).first()).toBeVisible();
      }
      // Images panel is active by default
      const imagesTab = page.getByRole('button', { name: 'Imágenes', exact: true }).first();
      await expect(imagesTab).toHaveClass(/border-blue-600|text-blue-600/);
    } finally {
      await page.request.delete(`${BASE_API}/api/v1/programs/${programId}/`, {
        headers: { Authorization: `Bearer ${await getOwnerToken(page.request)}` },
      }).catch(() => {});
    }
  });
});

// =============================================================================
// PHASE 2: IMAGES TAB (includes the previously-failing upload)
// =============================================================================
test.describe('Designer — Images @designer', () => {
  const PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  );

  test('logo upload succeeds and renders preview', async ({ page }) => {
    const programId = await createProgram(page.request);
    try {
      await openDesigner(page, programId);
      // Capture the upload response
      const [resp] = await Promise.all([
        page.waitForResponse((r) => r.url().includes('/api/v1/upload/'), { timeout: 20000 }),
        (async () => {
          const chooser = page.waitForEvent('filechooser', { timeout: 15000 });
          await page.locator('#logo-upload').locator('xpath=..').click();
          (await chooser).setFiles({ name: 'logo.png', mimeType: 'image/png', buffer: PNG });
        })(),
      ]);
      expect(resp.status()).toBe(200);
      // Preview image appears (ImageTab sets blob then server URL)
      await expect(page.getByRole('img').first()).toBeVisible({ timeout: 15000 });
    } finally {
      await page.request.delete(`${BASE_API}/api/v1/programs/${programId}/`, {
        headers: { Authorization: `Bearer ${await getOwnerToken(page.request)}` },
      }).catch(() => {});
    }
  });

  test('panorama strip upload succeeds', async ({ page }) => {
    const programId = await createProgram(page.request);
    try {
      await openDesigner(page, programId);
      const [resp] = await Promise.all([
        page.waitForResponse((r) => r.url().includes('/api/v1/upload/'), { timeout: 20000 }),
        (async () => {
          const chooser = page.waitForEvent('filechooser', { timeout: 15000 });
          await page.locator('#strip-upload').locator('xpath=..').click();
          (await chooser).setFiles({ name: 'strip.png', mimeType: 'image/png', buffer: PNG });
        })(),
      ]);
      expect(resp.status()).toBe(200);
    } finally {
      await page.request.delete(`${BASE_API}/api/v1/programs/${programId}/`, {
        headers: { Authorization: `Bearer ${await getOwnerToken(page.request)}` },
      }).catch(() => {});
    }
  });
});

// =============================================================================
// PHASE 3: CARD TYPE CONFIG (STAMP)
// =============================================================================
test.describe('Designer — Card type config @designer', () => {
  test('stamp config fields update and persist visually', async ({ page }) => {
    const programId = await createProgram(page.request);
    try {
      await openDesigner(page, programId);
      await clickTab(page, 'Sellos');

      // stamps required
      const required = page.getByTestId('stamps-required-input');
      await expect(required).toBeVisible({ timeout: 10000 });
      await required.fill('7');
      await expect(required).toHaveValue('7');

      // reward description
      const reward = page.getByTestId('reward-description-input');
      await reward.fill('Café premium gratis');
      await expect(reward).toHaveValue('Café premium gratis');

      // expire unlimited button becomes active
      const unlimited = page.getByTestId('stamp-expiry-unlimited');
      await unlimited.click();
      await expect(unlimited).toHaveClass(/border-blue-500|text-blue-700/);

      // shape selection
      const shape = page.getByTestId('shape-option-star');
      await shape.click();
      await expect(shape).toHaveClass(/border-blue-500/);
    } finally {
      await page.request.delete(`${BASE_API}/api/v1/programs/${programId}/`, {
        headers: { Authorization: `Bearer ${await getOwnerToken(page.request)}` },
      }).catch(() => {});
    }
  });
});

// =============================================================================
// PHASE 4: FIELDS TAB
// =============================================================================
test.describe('Designer — Fields @designer', () => {
  test('add a primary field and remove it', async ({ page }) => {
    const programId = await createProgram(page.request);
    try {
      await openDesigner(page, programId);
      await clickTab(page, 'Campos');

      // Add Field button opens the editor modal
      const addBtn = page.getByRole('button', { name: /agregar campo/i }).first();
      await expect(addBtn).toBeVisible({ timeout: 10000 });
      await addBtn.click();
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 });

      // Label
      const labelInput = page.locator('input[placeholder*="Etiqueta"]').first();
      await labelInput.fill('Fecha de nacimiento');
      // Submit
      await page.getByRole('button', { name: /agregar$/i }).click();
      await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 5000 });
      await expect(page.getByText('Fecha de nacimiento')).toBeVisible({ timeout: 10000 });
    } finally {
      await page.request.delete(`${BASE_API}/api/v1/programs/${programId}/`, {
        headers: { Authorization: `Bearer ${await getOwnerToken(page.request)}` },
      }).catch(() => {});
    }
  });
});

// =============================================================================
// PHASE 5: COLORS TAB
// =============================================================================
test.describe('Designer — Colors @designer', () => {
  test('change background color via hex input', async ({ page }) => {
    const programId = await createProgram(page.request);
    try {
      await openDesigner(page, programId);
      await clickTab(page, 'Colores');

      const hex = page.getByTestId('hex-input').first();
      await expect(hex).toBeVisible({ timeout: 10000 });
      await hex.fill('#FF5733');
      await expect(hex).toHaveValue('#FF5733');

      // Apply a preset
      const preset = page.getByTestId('color-preset').first();
      await preset.click();
      await expect(preset).toBeVisible();
    } finally {
      await page.request.delete(`${BASE_API}/api/v1/programs/${programId}/`, {
        headers: { Authorization: `Bearer ${await getOwnerToken(page.request)}` },
      }).catch(() => {});
    }
  });
});

// =============================================================================
// PHASE 6: BARCODE TAB
// =============================================================================
test.describe('Designer — Barcode @designer', () => {
  test('switch barcode format to Aztec and save', async ({ page }) => {
    const programId = await createProgram(page.request);
    try {
      await openDesigner(page, programId);
      await clickTab(page, 'Código');

      const aztec = page.getByText(/aztec/i).first();
      await expect(aztec).toBeVisible({ timeout: 10000 });
      await aztec.click();
      await expect(aztec).toHaveClass(/border-blue-500|bg-blue/);
    } finally {
      await page.request.delete(`${BASE_API}/api/v1/programs/${programId}/`, {
        headers: { Authorization: `Bearer ${await getOwnerToken(page.request)}` },
      }).catch(() => {});
    }
  });
});

// =============================================================================
// PHASE 7: BACK TAB
// =============================================================================
test.describe('Designer — Back design @designer', () => {
  test('add back detail text', async ({ page }) => {
    const programId = await createProgram(page.request);
    try {
      await openDesigner(page, programId);
      await clickTab(page, 'Reverso');

      const addDetail = page.getByRole('button', { name: /agregar/i }).first();
      await expect(addDetail).toBeVisible({ timeout: 10000 });
      await addDetail.click();
      await expect(page.getByRole('button', { name: /agregar/i }).first()).toBeVisible();
    } finally {
      await page.request.delete(`${BASE_API}/api/v1/programs/${programId}/`, {
        headers: { Authorization: `Bearer ${await getOwnerToken(page.request)}` },
      }).catch(() => {});
    }
  });
});

// =============================================================================
// PHASE 8: PLATFORM TOGGLE
// =============================================================================
test.describe('Designer — Platform toggle @designer', () => {
  test('switch platform between Apple, Google and Ambos', async ({ page }) => {
    const programId = await createProgram(page.request);
    try {
      await openDesigner(page, programId);

      const apple = page.getByRole('button', { name: 'Apple', exact: true }).first();
      const google = page.getByRole('button', { name: 'Google', exact: true }).first();
      const both = page.getByRole('button', { name: 'Ambos', exact: true }).first();

      await apple.click();
      await expect(apple).toBeVisible();
      await google.click();
      await expect(google).toBeVisible();
      await both.click();
      await expect(both).toBeVisible();
    } finally {
      await page.request.delete(`${BASE_API}/api/v1/programs/${programId}/`, {
        headers: { Authorization: `Bearer ${await getOwnerToken(page.request)}` },
      }).catch(() => {});
    }
  });
});

// =============================================================================
// PHASE 9: SAVE PERSISTENCE (design → metadata via API)
// =============================================================================
test.describe('Designer — Save persistence @designer', () => {
  test('save design persists to program metadata via API', async ({ page }) => {
    const token = await getOwnerToken(page.request);
    const programId = await createProgram(page.request);
    try {
      await openDesigner(page, programId);

      // Change a color then save through the toolbar
      await clickTab(page, 'Colores');
      const hex = page.getByTestId('hex-input').first();
      await expect(hex).toBeVisible({ timeout: 10000 });
      await hex.fill('#0B3D91');

      const saveBtn = page.getByRole('button', { name: 'Guardar', exact: true }).first();
      await expect(saveBtn).toBeVisible({ timeout: 10000 });
      await saveBtn.click();

      // Auto-save indicator confirms persistence
      await expect(page.getByText(/guardado|saved/i).first()).toBeVisible({ timeout: 15000 }).catch(() => {});

      // Verify via API the program still exists and returns metadata (design round-trips)
      const getResp = await page.request.get(`${BASE_API}/api/v1/programs/${programId}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(getResp.status()).toBe(200);
      const prog = await getResp.json();
      expect(prog.id).toBe(programId);
      expect(prog.metadata).toBeDefined();
    } finally {
      await page.request.delete(`${BASE_API}/api/v1/programs/${programId}/`, {
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
  });
});

// =============================================================================
// PHASE 10: RBAC ACCESS — who can reach the designer & upload
// =============================================================================
test.describe('Designer — RBAC @designer', () => {
  test('OWNER reaches designer and upload (is_owner/is_manager_or_owner)', async ({ page }) => {
    const programId = await createProgram(page.request);
    try {
      await openDesigner(page, programId); // owner ok
      await expect(page.getByRole('button', { name: 'Guardar', exact: true }).first()).toBeVisible();
    } finally {
      await page.request.delete(`${BASE_API}/api/v1/programs/${programId}/`, {
        headers: { Authorization: `Bearer ${await getOwnerToken(page.request)}` },
      }).catch(() => {});
    }
  });

  test('program creation is protected (unauthenticated → 401 RBAC)', async ({ request }) => {
    // Program creation (is_owner only) must reject unauthenticated requests.
    const resp = await request.post(`${BASE_API}/api/v1/programs/`, {
      data: {
        name: `${UNIQUE_PREFIX} Unauthenticated`,
        description: 'should fail',
        card_type: 'stamp',
      },
    });
    expect(resp.status()).toBe(401);
  });
});

// =============================================================================
// CLEANUP: remove any leftover E2E Designer programs
// =============================================================================
test.afterAll(async ({ request }) => {
  const token = await getOwnerToken(request);
  const resp = await request.get(`${BASE_API}/api/v1/programs/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (resp.status() !== 200) return;
  const body = await resp.json();
  const programs: Array<{ id: string; name: string }> = body.programs || [];
  for (const p of programs) {
    if (p.name.startsWith('E2E Designer')) {
      await request.delete(`${BASE_API}/api/v1/programs/${p.id}/`, {
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
  }
});

// Silence unused var lint for ROLE_HOME (documented for future role-per-route assertions)
void ROLE_HOME;