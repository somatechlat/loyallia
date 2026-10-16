/**
 * Loyallia — shared flows for the "Chatea con AiGi" AI chatbot characterization
 * suite (T1-T5).
 *
 * Everything here drives the REAL product UI the way a person would: the login
 * form, the floating assistant button, the chat input. Network assertions read
 * the real browser request stream (the Next.js `/api/chat` route and the
 * `/api/v1/tenants/me/ai-chat/*` lifecycle endpoints the Chatbot calls).
 *
 * SECURITY: no credentials are hardcoded. They come from env vars or from the
 * git-ignored dev seed file written by
 *   python manage.py provision_development_rbac_test_users --generate
 * (see e2e/README.md).
 */
import { expect, type Locator, type Page } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { humanMove, humanType, waitForNetworkIdleAndBot } from './human';

// ---------------------------------------------------------------------------
// Credentials (dev seed — never committed)
// ---------------------------------------------------------------------------

export type E2ERole = 'owner' | 'manager' | 'staff' | 'superadmin';

export interface Credentials {
  email: string;
  password: string;
}

/** Same path convention as frontend/tests/e2e/helpers/e2e-test-config.ts. */
const CREDENTIAL_FILE = path.resolve(__dirname, '..', '..', '.auth', 'e2e-credentials.json');

const ENV_BY_ROLE: Record<E2ERole, [string, string]> = {
  owner: ['E2E_EMAIL', 'E2E_PASSWORD'],
  manager: ['E2E_MANAGER_EMAIL', 'E2E_MANAGER_PASSWORD'],
  staff: ['E2E_STAFF_EMAIL', 'E2E_STAFF_PASSWORD'],
  superadmin: ['E2E_SUPERADMIN_EMAIL', 'E2E_SUPERADMIN_PASSWORD'],
};

/**
 * Resolve credentials for a seeded role: explicit env vars win, otherwise the
 * git-ignored `.auth/e2e-credentials.json` dev seed is used.
 */
export function credentialsFor(role: E2ERole): Credentials {
  const [emailVar, passwordVar] = ENV_BY_ROLE[role];
  const envEmail = process.env[emailVar];
  const envPassword = process.env[passwordVar];
  if (envEmail && envPassword) {
    return { email: envEmail, password: envPassword };
  }

  if (fs.existsSync(CREDENTIAL_FILE)) {
    const data = JSON.parse(fs.readFileSync(CREDENTIAL_FILE, 'utf8')) as {
      users?: Partial<Record<E2ERole, { email?: string; password?: string }>>;
    };
    const entry = data.users?.[role];
    if (entry?.email && entry.password) {
      return { email: entry.email, password: entry.password };
    }
  }

  throw new Error(
    `No credentials for role '${role}'. Set ${emailVar}/${passwordVar}, or generate the ` +
      `dev seed with: python manage.py provision_development_rbac_test_users --generate ` +
      `(writes ${CREDENTIAL_FILE}).`,
  );
}

// ---------------------------------------------------------------------------
// Session / navigation flows
// ---------------------------------------------------------------------------

/** Dismiss the cookie consent banner ("Aceptar Todo") when it overlays clicks. */
export async function dismissCookieBanner(page: Page): Promise<void> {
  const accept = page.getByRole('button', { name: /aceptar todo/i });
  if (await accept.isVisible().catch(() => false)) {
    await accept.click().catch(() => undefined);
    await expect(accept).toBeHidden({ timeout: 5_000 }).catch(() => undefined);
  }
}

/**
 * Log in through the real login form with human typing. Verifies the fields
 * actually hold the credentials before submitting (dev-mode React re-renders
 * can drop keystrokes) and asserts the login API answers 200.
 */
export async function login(page: Page, creds: Credentials): Promise<void> {
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await dismissCookieBanner(page);

  // The login form uses stable ids (#email / #password); type= is the fallback.
  const email = page.locator('#email, input[type="email"]').first();
  const password = page.locator('#password, input[type="password"]').first();
  await email.waitFor({ state: 'visible', timeout: 20_000 });

  for (let attempt = 1; attempt <= 2; attempt++) {
    await humanType(email, creds.email, { maxDelayMs: 70 });
    await humanType(password, creds.password, { maxDelayMs: 70 });
    const ok =
      (await email.inputValue()) === creds.email &&
      (await password.inputValue()) === creds.password;
    if (ok) break;
    // Documented deviation: repair atomically if keystrokes were dropped.
    await email.fill(creds.email);
    await password.fill(creds.password);
  }
  expect(await email.inputValue(), 'el campo de correo debe conservar el email').toBe(creds.email);
  expect(await password.inputValue(), 'el campo de contraseña debe conservar la clave').toBe(
    creds.password,
  );

  const responsePromise = page.waitForResponse(
    (r) =>
      r.request().method() === 'POST' &&
      /\/api\/(v1\/)?auth\/login\/?$/.test(new URL(r.url()).pathname),
    { timeout: 30_000 },
  );
  const submit = page.getByRole('button', { name: /iniciar sesión|ingresar/i }).first();
  await humanMove(page, submit);
  await submit.click();

  const response = await responsePromise;
  if (!response.ok()) {
    const body = await response.text().catch(() => '');
    throw new Error(`Login HTTP ${response.status()} for ${creds.email}: ${body.slice(0, 200)}`);
  }
  // SPA redirect after login — poll the URL instead of waiting for a full
  // document "load" (staff/superadmin redirects can leave load pending).
  await expect
    .poll(() => page.url(), { timeout: 30_000 })
    .not.toContain('/login');
}

/**
 * Switch to another account in the SAME browser context (a person logging out
 * and back in). Clears the auth cookies first so the middleware does not bounce
 * /login back to the dashboard.
 */
export async function switchUser(page: Page, creds: Credentials): Promise<void> {
  await page.context().clearCookies();
  await login(page, creds);
}

/**
 * Open the floating "Chatea con AiGi" assistant. `fallbackPath` is navigated
 * to when the toggle does not appear on the current page (e.g. superadmin
 * surfaces live under /superadmin).
 */
export async function openChatbot(
  page: Page,
  options: { fallbackPath?: string } = {},
): Promise<void> {
  await dismissCookieBanner(page);
  const toggle = page.locator('#chatbot-toggle');
  const appeared = await toggle
    .waitFor({ state: 'visible', timeout: 12_000 })
    .then(() => true)
    .catch(() => false);

  if (!appeared && options.fallbackPath) {
    await page.goto(options.fallbackPath, { waitUntil: 'domcontentloaded' });
    await toggle.waitFor({ state: 'visible', timeout: 12_000 });
  }

  await humanMove(page, toggle);
  await toggle.click();
  await page.locator('#chatbot-input').waitFor({ state: 'visible', timeout: 10_000 });
}

/**
 * Type a message with human cadence and press Enter. Verifies the input holds
 * the full text before sending (no silent truncation).
 */
export async function sendChatMessage(page: Page, text: string): Promise<string> {
  const input = page.locator('#chatbot-input');
  // The input is disabled while a reply is loading — wait for our turn.
  await expect(input, 'el campo de chat debe estar disponible').toBeEnabled();
  const typed = await humanType(input, text);
  if ((await input.inputValue()) !== typed) {
    await input.fill(typed); // documented deviation: repair dropped keystrokes
    expect(await input.inputValue(), 'el campo debe contener el mensaje completo').toBe(typed);
  }
  // With text present the submit button must unlock (loading=false, text!=empty).
  await expect(page.locator('#chatbot-send'), 'el botón de envío debe habilitarse').toBeEnabled();
  await page.keyboard.press('Enter');
  return typed;
}

/**
 * Start from a clean conversation: click "Nueva conversación" whenever the
 * lifecycle bar shows a previous/restored session. After this the first turn
 * goes out with no `context_id`.
 */
export async function startFreshConversation(page: Page): Promise<void> {
  const bar = page.locator('#chatbot-session-actions');
  if (!(await bar.isVisible().catch(() => false))) return;

  const reset = page.locator('#chatbot-new-conversation');
  await humanMove(page, reset);
  await reset.click();
  await expect(bar, 'el reinicio debe dejar la conversación en estado limpio').toBeHidden({
    timeout: 20_000,
  });
  await expect(page.getByText(/No se pudo finalizar la conversación/i)).toBeHidden();
}

/**
 * Send one chat turn and return the `context_id` the assistant bound to it.
 *
 * The Agent Zero reply can intermittently exceed the backend proxy timeout
 * (~35 s) and answer 503 — the UI then shows the Spanish error bubble instead
 * of a reply. That is an infrastructure characteristic, not the behavior under
 * test, so the turn is retried once from a clean state.
 */
export async function sendTurnAndCaptureContext(
  page: Page,
  traffic: Traffic,
  message: string,
): Promise<string> {
  let lastError = '';
  for (let attempt = 1; attempt <= 2; attempt++) {
    const before = await botBubbles(page).count();
    await sendChatMessage(page, message);
    await waitForNetworkIdleAndBot(page, {
      botBubbles: botBubbles(page),
      previousBotCount: before,
    });
    const record = traffic.chatResponses.at(-1);
    const ctx = record?.responseBody?.context_id;
    if (ctx) return ctx as string;
    lastError = JSON.stringify(record?.responseBody ?? record?.status ?? 'sin respuesta');
    await startFreshConversation(page); // limpiar para el reintento
  }
  throw new Error(`El asistente no devolvió context_id tras 2 intentos: ${lastError}`);
}

/**
 * Make sure there is an active conversation and return its `context_id`.
 *   - restored session  → click "Continuar" and read the session payload;
 *   - already active    → read the last chat response;
 *   - otherwise         → send a message and wait for the reply.
 */
export async function ensureActiveContext(page: Page, traffic: Traffic): Promise<string> {
  const continueBtn = page.locator('#chatbot-continue');
  const endBtn = page.locator('#chatbot-end-conversation');

  if (await continueBtn.isVisible().catch(() => false)) {
    await humanMove(page, continueBtn);
    await continueBtn.click();
    await expect(page.getByText('Continuando tu conversación anterior.')).toBeVisible();
    const restored = traffic.sessionResponses.at(-1)?.responseBody?.context_id;
    expect(restored, 'la sesión restaurada debe exponer su context_id').toBeTruthy();
    return restored as string;
  }

  if (await endBtn.isVisible().catch(() => false)) {
    const ctx = traffic.chatResponses.at(-1)?.responseBody?.context_id;
    expect(ctx, 'la conversación activa debe tener context_id').toBeTruthy();
    return ctx as string;
  }

  return sendTurnAndCaptureContext(
    page,
    traffic,
    'Hola, ¿puedes darme un resumen rápido de hoy?',
  );
}

// ---------------------------------------------------------------------------
// DOM selectors (documented against src/components/chat/Chatbot.tsx)
// ---------------------------------------------------------------------------

/**
 * Assistant bubbles render as `rounded-2xl rounded-tl-md`; the transient
 * "Pensando…" indicator uses the same radius but is the only one carrying
 * `flex` — excluded here so counts only cover real messages.
 */
export function botBubbles(page: Page): Locator {
  return page.locator('[role="dialog"] div.rounded-2xl.rounded-tl-md:not(.flex)');
}

/** User bubbles render as `rounded-2xl rounded-tr-md`. */
export function userBubbles(page: Page): Locator {
  return page.locator('[role="dialog"] div.rounded-2xl.rounded-tr-md');
}

// ---------------------------------------------------------------------------
// Network capture (real browser request stream)
// ---------------------------------------------------------------------------

export interface TrafficRecord {
  path: string;
  method: string;
  body: Record<string, unknown> | null;
  status?: number;
  responseBody?: Record<string, unknown> | null;
}

export interface Traffic {
  chatRequests: TrafficRecord[];
  chatResponses: TrafficRecord[];
  endRequests: TrafficRecord[];
  endResponses: TrafficRecord[];
  sessionResponses: TrafficRecord[];
  stop(): void;
}

function safeJson(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Record the chatbot's real network traffic:
 *   POST /api/chat                                  → chat turn
 *   POST /api/v1/tenants/me/ai-chat/end/            → conversation teardown
 *   GET  /api/v1/tenants/me/ai-chat/session/        → session restore on mount
 */
export function captureTraffic(page: Page): Traffic {
  const traffic: Traffic = {
    chatRequests: [],
    chatResponses: [],
    endRequests: [],
    endResponses: [],
    sessionResponses: [],
    stop: () => undefined,
  };

  const onRequest = (req: {
    url(): string;
    method(): string;
    postData(): string | null;
    redirectedTo?: () => unknown | null;
  }) => {
    // Skip redirect hops (e.g. /api/chat → /api/chat/ 308 in Next dev) —
    // only the terminal request of the chain is processed by the route.
    if (req.redirectedTo?.()) return;
    let url: URL;
    try {
      url = new URL(req.url());
    } catch {
      return;
    }
    const path = url.pathname.replace(/\/+$/, '') || '/';
    const record: TrafficRecord = {
      path,
      method: req.method(),
      body: safeJson(req.postData()),
    };
    if (req.method() === 'POST' && path === '/api/chat') traffic.chatRequests.push(record);
    if (req.method() === 'POST' && path.includes('/api/v1/tenants/me/ai-chat/end')) {
      traffic.endRequests.push(record);
    }
  };

  const onResponse = async (res: {
    url(): string;
    status(): number;
    request(): { method(): string };
    text(): Promise<string>;
  }) => {
    let url: URL;
    try {
      url = new URL(res.url());
    } catch {
      return;
    }
    // Normalize trailing slashes: the Next dev server 308-redirects
    // /api/chat → /api/chat/, so responses may arrive on either path.
    const path = url.pathname.replace(/\/+$/, '') || '/';
    // Skip redirect hops — only the terminal response carries the JSON body.
    if (res.status() >= 300 && res.status() < 400) return;
    const isChat = res.request().method() === 'POST' && path === '/api/chat';
    const isEnd = path.includes('/api/v1/tenants/me/ai-chat/end');
    const isSession = path.includes('/api/v1/tenants/me/ai-chat/session');
    if (!isChat && !isEnd && !isSession) return;

    const record: TrafficRecord = {
      path,
      method: res.request().method(),
      body: null,
      status: res.status(),
      responseBody: res.status() === 204 ? null : safeJson(await res.text().catch(() => '')),
    };
    if (isChat) traffic.chatResponses.push(record);
    if (isEnd) traffic.endResponses.push(record);
    if (isSession) traffic.sessionResponses.push(record);
  };

  page.on('request', onRequest);
  page.on('response', onResponse);
  traffic.stop = () => {
    page.off('request', onRequest);
    page.off('response', onResponse);
  };
  return traffic;
}
