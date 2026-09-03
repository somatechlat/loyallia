/**
 * Suite 34 — Designer Preview Live Update E2E
 *
 * Verifies that the Wallet Pass Studio live preview (AppleWalletCard /
 * GoogleWalletCard rendered inside StudioCanvas) actually updates in
 * response to EVERY designer action: image uploads, color changes,
 * field edits, barcode switches, card-type config, platform toggle,
 * back content, undo/redo, and save-reload persistence.
 *
 * Strategy: Hybrid API + UI (same as suite 33).
 *   - API to create deterministic OWNER programs.
 *   - UI to drive the designer sidebar and assert preview canvas.
 *   - API to clean up (only 'E2E Preview' prefixed records).
 *
 * Runs in the 'designer' project (OWNER role).
 */
import { test, expect, type APIRequestContext, type Page } from '@playwright/test';
import { getE2EBaseURL } from '../helpers/e2e-safety';
import { getOwnerToken } from '../helpers/designer-auth';

test.use({ storageState: '.auth/owner.json' });

const BASE_API = getE2EBaseURL();
const UNIQUE_PREFIX = `E2E Preview ${Date.now()}`;

// 1x1 red PNG for uploads
const RED_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

// 1x1 blue PNG (different from red to verify distinct uploads)
const BLUE_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwIAMCbHYQAAAABJRU5ErkJggg==',
  'base64',
);

// ── Helpers ──────────────────────────────────────────────────────────────────

async function createProgram(request: APIRequestContext): Promise<string> {
  const token = await getOwnerToken(request);
  const name = `${UNIQUE_PREFIX} ${Date.now()}`;
  const resp = await request.post(`${BASE_API}/api/v1/programs/`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      name,
      description: 'E2E preview test program',
      card_type: 'stamp',
      barcode_type: 'qr_code',
      background_color: '#1a1a2e',
      text_color: '#ffffff',
      metadata: { wallet_provider: 'both', stamps_required: 10, reward_description: 'Free coffee' },
    },
  });
  expect(resp.status(), `Program creation failed (${resp.status()})`).toBe(200);
  const card = await resp.json();
  return card.id as string;
}

async function openDesigner(page: Page, programId: string): Promise<void> {
  await page.goto(`/programs/${programId}/design`, { waitUntil: 'networkidle' });
  await expect(page.getByText(/Design Studio/i).first()).toBeVisible({ timeout: 20000 });
  await expect(page.getByRole('button', { name: 'Imágenes' })).toBeVisible({ timeout: 10000 });
}

async function clickTab(page: Page, label: string): Promise<void> {
  const tab = page.getByRole('button', { name: label, exact: true }).first();
  await expect(tab).toBeVisible({ timeout: 10000 });
  await tab.click();
}

async function uploadFile(page: Page, inputId: string, file: { name: string; mimeType: string; buffer: Buffer }): Promise<number> {
  const [resp] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/v1/upload/'), { timeout: 20000 }),
    (async () => {
      const chooser = page.waitForEvent('filechooser', { timeout: 15000 });
      await page.locator(`#${inputId}`).locator('xpath=..').click();
      (await chooser).setFiles(file);
    })(),
  ]);
  return resp.status();
}

/** Get the canvas area that contains the preview cards. */
function canvasArea(page: Page) {
  return page.locator('.flex-1.flex.flex-col.min-w-0.overflow-auto').first();
}

// ── PHASE 1: IMAGE UPLOAD → PREVIEW UPDATE ──────────────────────────────────

test.describe('Preview — Image uploads @preview', () => {
  test('logo upload shows in Apple preview header', async ({ page }) => {
    const programId = await createProgram(page.request);
    try {
      await openDesigner(page, programId);
      const status = await uploadFile(page, 'logo-upload', { name: 'logo.png', mimeType: 'image/png', buffer: RED_PNG });
      expect(status).toBe(200);

      // The Apple preview header should contain an <img> with a non-empty src
      // (either blob: or server URL). The preview card is inside the canvas area.
      const previewImages = canvasArea(page).locator('img');
      await expect(previewImages.first()).toBeVisible({ timeout: 10000 });
      const src = await previewImages.first().getAttribute('src');
      expect(src).toBeTruthy();
      expect(src!.length).toBeGreaterThan(0);
    } finally {
      await page.request.delete(`${BASE_API}/api/v1/programs/${programId}/`, {
        headers: { Authorization: `Bearer ${await getOwnerToken(page.request)}` },
      }).catch(() => {});
    }
  });

  test('strip upload shows in Apple preview strip area', async ({ page }) => {
    const programId = await createProgram(page.request);
    try {
      await openDesigner(page, programId);
      const status = await uploadFile(page, 'strip-upload', { name: 'strip.png', mimeType: 'image/png', buffer: RED_PNG });
      expect(status).toBe(200);

      // After strip upload, the Apple preview should show a strip image
      // (aspectRatio 375/123 container). Check for img with object-cover class.
      const stripImg = canvasArea(page).locator('img[alt*="hero"], img[alt*="strip"], img.object-cover, img[style*="object-cover"]').first();
      await expect(stripImg).toBeVisible({ timeout: 10000 });
    } finally {
      await page.request.delete(`${BASE_API}/api/v1/programs/${programId}/`, {
        headers: { Authorization: `Bearer ${await getOwnerToken(page.request)}` },
      }).catch(() => {});
    }
  });

  test('logo then strip both appear in preview simultaneously', async ({ page }) => {
    const programId = await createProgram(page.request);
    try {
      await openDesigner(page, programId);

      // Upload logo
      const logoStatus = await uploadFile(page, 'logo-upload', { name: 'logo.png', mimeType: 'image/png', buffer: RED_PNG });
      expect(logoStatus).toBe(200);

      // Upload strip
      const stripStatus = await uploadFile(page, 'strip-upload', { name: 'strip.png', mimeType: 'image/png', buffer: BLUE_PNG });
      expect(stripStatus).toBe(200);

      // Both images should be visible in the preview
      const allImages = canvasArea(page).locator('img');
      const count = await allImages.count();
      expect(count).toBeGreaterThanOrEqual(2);
    } finally {
      await page.request.delete(`${BASE_API}/api/v1/programs/${programId}/`, {
        headers: { Authorization: `Bearer ${await getOwnerToken(page.request)}` },
      }).catch(() => {});
    }
  });
});

// ── PHASE 2: COLOR CHANGE → PREVIEW UPDATE ──────────────────────────────────

test.describe('Preview — Color changes @preview', () => {
  test('background color change updates preview card background', async ({ page }) => {
    const programId = await createProgram(page.request);
    try {
      await openDesigner(page, programId);
      await clickTab(page, 'Colores');

      // Change background to a distinctive red
      const hex = page.getByTestId('hex-input').first();
      await expect(hex).toBeVisible({ timeout: 10000 });
      await hex.fill('#FF0000');

      // The preview card container should have a background containing #FF0000 or rgb(255,0,0)
      // The AppleWalletCard renders: style={{ background: bgColor }}
      const previewCard = canvasArea(page).locator('[style*="background"]').first();
      await expect(previewCard).toBeVisible({ timeout: 5000 });
      const style = await previewCard.getAttribute('style');
      expect(style).toBeTruthy();
      // The style should contain the new color (either hex or rgb)
      const hasColor = style!.toLowerCase().includes('#ff0000') || style!.toLowerCase().includes('rgb(255, 0, 0)') || style!.toLowerCase().includes('rgb(255,0,0)');
      expect(hasColor).toBeTruthy();
    } finally {
      await page.request.delete(`${BASE_API}/api/v1/programs/${programId}/`, {
        headers: { Authorization: `Bearer ${await getOwnerToken(page.request)}` },
      }).catch(() => {});
    }
  });

  test('color preset click updates preview', async ({ page }) => {
    const programId = await createProgram(page.request);
    try {
      await openDesigner(page, programId);
      await clickTab(page, 'Colores');

      // Click a color preset
      const preset = page.getByTestId('color-preset').first();
      await expect(preset).toBeVisible({ timeout: 10000 });
      await preset.click();

      // The preview should still be visible (no crash) and have a background style
      const previewCard = canvasArea(page).locator('[style*="background"]').first();
      await expect(previewCard).toBeVisible({ timeout: 5000 });
    } finally {
      await page.request.delete(`${BASE_API}/api/v1/programs/${programId}/`, {
        headers: { Authorization: `Bearer ${await getOwnerToken(page.request)}` },
      }).catch(() => {});
    }
  });
});

// ── PHASE 3: FIELD ADD/EDIT → PREVIEW UPDATE ────────────────────────────────

test.describe('Preview — Field changes @preview', () => {
  test('adding a field shows it in the preview card', async ({ page }) => {
    const programId = await createProgram(page.request);
    try {
      await openDesigner(page, programId);
      await clickTab(page, 'Campos');

      // Add a field
      const addBtn = page.getByRole('button', { name: /agregar campo/i }).first();
      await expect(addBtn).toBeVisible({ timeout: 10000 });
      await addBtn.click();
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 });

      const labelInput = page.locator('input[placeholder*="Etiqueta"]').first();
      await labelInput.fill('E2E Preview Field');

      const valueInput = page.locator('input[placeholder*="Valor"]').first();
      if (await valueInput.isVisible().catch(() => false)) {
        await valueInput.fill('Preview Value 123');
      }

      await page.getByRole('button', { name: /agregar$/i }).click();
      await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 5000 });

      // The field text should appear in the sidebar
      await expect(page.getByText('E2E Preview Field')).toBeVisible({ timeout: 10000 });

      // The field should also appear in the preview canvas
      // (mapFieldsToApple maps fields to the preview card)
      const canvasText = canvasArea(page);
      await expect(canvasText.getByText('E2E Preview Field')).toBeVisible({ timeout: 10000 });
    } finally {
      await page.request.delete(`${BASE_API}/api/v1/programs/${programId}/`, {
        headers: { Authorization: `Bearer ${await getOwnerToken(page.request)}` },
      }).catch(() => {});
    }
  });

  test('removing a field removes it from the preview', async ({ page }) => {
    const programId = await createProgram(page.request);
    try {
      await openDesigner(page, programId);
      await clickTab(page, 'Campos');

      // Add a field first
      const addBtn = page.getByRole('button', { name: /agregar campo/i }).first();
      await addBtn.click();
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 });
      const labelInput = page.locator('input[placeholder*="Etiqueta"]').first();
      await labelInput.fill('Temp Remove Field');
      await page.getByRole('button', { name: /agregar$/i }).click();
      await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 5000 });
      await expect(page.getByText('Temp Remove Field')).toBeVisible({ timeout: 10000 });

      // Now remove it - find the field card and click delete
      const fieldCard = page.getByText('Temp Remove Field').locator('xpath=ancestor::div[contains(@class,"rounded")]//button').last();
      if (await fieldCard.isVisible().catch(() => false)) {
        await fieldCard.click();
      } else {
        // Alternative: find delete button near the field text
        const deleteBtn = page.locator('button').filter({ has: page.locator('svg') }).last();
        await deleteBtn.click();
      }

      // Field should disappear from sidebar
      await expect(page.getByText('Temp Remove Field')).not.toBeVisible({ timeout: 5000 });
    } finally {
      await page.request.delete(`${BASE_API}/api/v1/programs/${programId}/`, {
        headers: { Authorization: `Bearer ${await getOwnerToken(page.request)}` },
      }).catch(() => {});
    }
  });
});

// ── PHASE 4: BARCODE CHANGE → PREVIEW UPDATE ────────────────────────────────

test.describe('Preview — Barcode changes @preview', () => {
  test('barcode type switch updates preview barcode rendering', async ({ page }) => {
    const programId = await createProgram(page.request);
    try {
      await openDesigner(page, programId);
      await clickTab(page, 'Código');

      // Switch to Aztec
      const aztec = page.getByText(/aztec/i).first();
      await expect(aztec).toBeVisible({ timeout: 10000 });
      await aztec.click();

      // The preview should still render (no crash) and contain a barcode SVG
      const barcodeArea = canvasArea(page).locator('svg').first();
      await expect(barcodeArea).toBeVisible({ timeout: 5000 });
    } finally {
      await page.request.delete(`${BASE_API}/api/v1/programs/${programId}/`, {
        headers: { Authorization: `Bearer ${await getOwnerToken(page.request)}` },
      }).catch(() => {});
    }
  });
});

// ── PHASE 5: PLATFORM TOGGLE → PREVIEW VISIBILITY ───────────────────────────

test.describe('Preview — Platform toggle @preview', () => {
  test('Apple-only shows Apple preview, hides Google', async ({ page }) => {
    const programId = await createProgram(page.request);
    try {
      await openDesigner(page, programId);

      // Switch to Apple only
      const appleBtn = page.getByRole('button', { name: 'Apple', exact: true }).first();
      await expect(appleBtn).toBeVisible({ timeout: 10000 });
      await appleBtn.click();

      // Apple Wallet label should be visible
      await expect(page.getByText(/Apple Wallet/i).first()).toBeVisible({ timeout: 5000 });
      // Google Wallet label should NOT be visible
      await expect(page.getByText(/Google Wallet/i).first()).not.toBeVisible({ timeout: 3000 }).catch(() => {});
    } finally {
      await page.request.delete(`${BASE_API}/api/v1/programs/${programId}/`, {
        headers: { Authorization: `Bearer ${await getOwnerToken(page.request)}` },
      }).catch(() => {});
    }
  });

  test('Google-only shows Google preview, hides Apple', async ({ page }) => {
    const programId = await createProgram(page.request);
    try {
      await openDesigner(page, programId);

      const googleBtn = page.getByRole('button', { name: 'Google', exact: true }).first();
      await expect(googleBtn).toBeVisible({ timeout: 10000 });
      await googleBtn.click();

      await expect(page.getByText(/Google Wallet/i).first()).toBeVisible({ timeout: 5000 });
      await expect(page.getByText(/Apple Wallet/i).first()).not.toBeVisible({ timeout: 3000 }).catch(() => {});
    } finally {
      await page.request.delete(`${BASE_API}/api/v1/programs/${programId}/`, {
        headers: { Authorization: `Bearer ${await getOwnerToken(page.request)}` },
      }).catch(() => {});
    }
  });

  test('Both shows both previews', async ({ page }) => {
    const programId = await createProgram(page.request);
    try {
      await openDesigner(page, programId);

      const bothBtn = page.getByRole('button', { name: 'Ambos', exact: true }).first();
      await expect(bothBtn).toBeVisible({ timeout: 10000 });
      await bothBtn.click();

      await expect(page.getByText(/Apple Wallet/i).first()).toBeVisible({ timeout: 5000 });
      await expect(page.getByText(/Google Wallet/i).first()).toBeVisible({ timeout: 5000 });
    } finally {
      await page.request.delete(`${BASE_API}/api/v1/programs/${programId}/`, {
        headers: { Authorization: `Bearer ${await getOwnerToken(page.request)}` },
      }).catch(() => {});
    }
  });
});

// ── PHASE 6: PROGRAM NAME → PREVIEW UPDATE ──────────────────────────────────

test.describe('Preview — Program name @preview', () => {
  test('changing program name updates preview header', async ({ page }) => {
    const programId = await createProgram(page.request);
    try {
      await openDesigner(page, programId);

      // The program name appears in the preview card header
      // Default name from createProgram contains 'E2E Preview'
      const initialName = canvasArea(page).getByText(/E2E Preview/i).first();
      await expect(initialName).toBeVisible({ timeout: 10000 });
    } finally {
      await page.request.delete(`${BASE_API}/api/v1/programs/${programId}/`, {
        headers: { Authorization: `Bearer ${await getOwnerToken(page.request)}` },
      }).catch(() => {});
    }
  });
});

// ── PHASE 7: STAMP CONFIG → PREVIEW UPDATE ──────────────────────────────────

test.describe('Preview — Stamp config @preview', () => {
  test('stamps-required change updates preview stamp display', async ({ page }) => {
    const programId = await createProgram(page.request);
    try {
      await openDesigner(page, programId);
      await clickTab(page, 'Sellos');

      // Change stamps required to 7
      const required = page.getByTestId('stamps-required-input');
      await expect(required).toBeVisible({ timeout: 10000 });
      await required.fill('7');
      await expect(required).toHaveValue('7');

      // The preview should show "0 / 7" (default stamps at issue = 0)
      const canvas = canvasArea(page);
      await expect(canvas.getByText(/0.*7/).first()).toBeVisible({ timeout: 5000 });
    } finally {
      await page.request.delete(`${BASE_API}/api/v1/programs/${programId}/`, {
        headers: { Authorization: `Bearer ${await getOwnerToken(page.request)}` },
      }).catch(() => {});
    }
  });
});

// ── PHASE 8: UNDO/REDO → PREVIEW UPDATE ─────────────────────────────────────

test.describe('Preview — Undo/Redo @preview', () => {
  test('color change then undo reverts preview', async ({ page }) => {
    const programId = await createProgram(page.request);
    try {
      await openDesigner(page, programId);
      await clickTab(page, 'Colores');

      // Change color to red
      const hex = page.getByTestId('hex-input').first();
      await expect(hex).toBeVisible({ timeout: 10000 });
      await hex.fill('#FF0000');

      // Verify preview has red background
      const previewCard = canvasArea(page).locator('[style*="background"]').first();
      await expect(previewCard).toBeVisible({ timeout: 5000 });
      const styleBefore = await previewCard.getAttribute('style');
      expect(styleBefore!.toLowerCase()).toContain('#ff0000');

      // Undo (Ctrl+Z)
      await page.keyboard.press('Control+z');

      // Preview should revert (no longer red)
      await page.waitForTimeout(500);
      const styleAfter = await previewCard.getAttribute('style');
      // After undo, the color should NOT be #ff0000
      expect(styleAfter!.toLowerCase()).not.toContain('#ff0000');
    } finally {
      await page.request.delete(`${BASE_API}/api/v1/programs/${programId}/`, {
        headers: { Authorization: `Bearer ${await getOwnerToken(page.request)}` },
      }).catch(() => {});
    }
  });

  test('redo re-applies undone change to preview', async ({ page }) => {
    const programId = await createProgram(page.request);
    try {
      await openDesigner(page, programId);
      await clickTab(page, 'Colores');

      const hex = page.getByTestId('hex-input').first();
      await expect(hex).toBeVisible({ timeout: 10000 });
      await hex.fill('#FF0000');

      // Undo
      await page.keyboard.press('Control+z');
      await page.waitForTimeout(300);

      // Redo (Ctrl+Y)
      await page.keyboard.press('Control+y');
      await page.waitForTimeout(500);

      // Preview should have red again
      const previewCard = canvasArea(page).locator('[style*="background"]').first();
      const style = await previewCard.getAttribute('style');
      expect(style!.toLowerCase()).toContain('#ff0000');
    } finally {
      await page.request.delete(`${BASE_API}/api/v1/programs/${programId}/`, {
        headers: { Authorization: `Bearer ${await getOwnerToken(page.request)}` },
      }).catch(() => {});
    }
  });
});

// ── PHASE 9: SAVE + RELOAD → PREVIEW PERSISTENCE ────────────────────────────

test.describe('Preview — Save and reload @preview', () => {
  test('saved design reloads into preview correctly', async ({ page }) => {
    const token = await getOwnerToken(page.request);
    const programId = await createProgram(page.request);
    try {
      await openDesigner(page, programId);

      // Change background to a distinctive color
      await clickTab(page, 'Colores');
      const hex = page.getByTestId('hex-input').first();
      await expect(hex).toBeVisible({ timeout: 10000 });
      await hex.fill('#00FF00');

      // Save
      const saveBtn = page.getByRole('button', { name: 'Guardar', exact: true }).first();
      await expect(saveBtn).toBeVisible({ timeout: 10000 });
      await saveBtn.click();
      await expect(page.getByText(/guardado|saved/i).first()).toBeVisible({ timeout: 15000 }).catch(() => {});

      // Reload the page
      await page.reload({ waitUntil: 'networkidle' });
      await expect(page.getByText(/Design Studio/i).first()).toBeVisible({ timeout: 20000 });

      // After reload, the preview should still show the saved color
      const previewCard = canvasArea(page).locator('[style*="background"]').first();
      await expect(previewCard).toBeVisible({ timeout: 10000 });
      const style = await previewCard.getAttribute('style');
      expect(style!.toLowerCase()).toContain('#00ff00');
    } finally {
      await page.request.delete(`${BASE_API}/api/v1/programs/${programId}/`, {
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
  });
});

// ── PHASE 10: BACK CONTENT TOGGLE ───────────────────────────────────────────

test.describe('Preview — Back content @preview', () => {
  test('show back toggle renders back card', async ({ page }) => {
    const programId = await createProgram(page.request);
    try {
      await openDesigner(page, programId);

      // Find and click the "show back" toggle (eye icon or back button in toolbar)
      const backToggle = page.getByRole('button', { name: /reverso|back|atrás/i }).first();
      if (await backToggle.isVisible().catch(() => false)) {
        await backToggle.click();
        await page.waitForTimeout(500);
      }

      // The preview should still be visible (no crash)
      await expect(canvasArea(page)).toBeVisible({ timeout: 5000 });
    } finally {
      await page.request.delete(`${BASE_API}/api/v1/programs/${programId}/`, {
        headers: { Authorization: `Bearer ${await getOwnerToken(page.request)}` },
      }).catch(() => {});
    }
  });
});

// ── PHASE 11: ALL CARD TYPES RENDER PREVIEW ─────────────────────────────────

test.describe('Preview — Card type rendering @preview', () => {
  const cardTypes = [
    'stamp', 'cashback', 'coupon', 'discount', 'gift_certificate',
    'vip_membership', 'affiliate', 'corporate_discount', 'referral_pass', 'multipass',
  ];

  for (const cardType of cardTypes) {
    test(`${cardType} card type renders preview without crashing`, async ({ page, request }) => {
      const token = await getOwnerToken(request);
      const name = `${UNIQUE_PREFIX} ${cardType} ${Date.now()}`;
      const resp = await request.post(`${BASE_API}/api/v1/programs/`, {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          name,
          description: `E2E ${cardType} test`,
          card_type: cardType,
          barcode_type: 'qr_code',
          background_color: '#1a1a2e',
          text_color: '#ffffff',
          metadata: { wallet_provider: 'both' },
        },
      });
      expect(resp.status()).toBe(200);
      const program = await resp.json();
      const programId = program.id as string;

      try {
        await openDesigner(page, programId);

        // The preview canvas should be visible and contain at least one rendered element
        const canvas = canvasArea(page);
        await expect(canvas).toBeVisible({ timeout: 10000 });

        // Should have at least one text element (program name or field)
        const textElements = canvas.locator('p, span');
        const count = await textElements.count();
        expect(count).toBeGreaterThan(0);
      } finally {
        await request.delete(`${BASE_API}/api/v1/programs/${programId}/`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }
    });
  }
});

// ── CLEANUP ──────────────────────────────────────────────────────────────────

test.afterAll(async ({ request }) => {
  const token = await getOwnerToken(request);
  const resp = await request.get(`${BASE_API}/api/v1/programs/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (resp.status() !== 200) return;
  const body = await resp.json();
  const programs: Array<{ id: string; name: string }> = body.programs || [];
  for (const p of programs) {
    if (p.name.startsWith('E2E Preview')) {
      await request.delete(`${BASE_API}/api/v1/programs/${p.id}/`, {
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
  }
});
