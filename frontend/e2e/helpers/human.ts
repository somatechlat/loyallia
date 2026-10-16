/**
 * Loyallia — human-like Playwright primitives for the AI chatbot suite.
 *
 * These helpers exist so E2E tests read (and behave) like a real person using
 * "Chatea con AiGi": text is typed key by key with human cadence and thinking
 * pauses, the mouse travels to buttons instead of teleporting, and waiting for
 * the bot is done by POLLED DOM/network state — never by fixed sleeps.
 *
 * Fixed sleeps are banned except as a documented last resort (see
 * `waitForNetworkIdleAndBot`). All state checks use `expect.poll` /
 * `waitFor(...)` so they adapt to the real latency of the agent (30-60 s).
 */
import { expect, type Locator, type Page } from '@playwright/test';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export interface HumanTypeOptions {
  /** Minimum per-keystroke delay in ms (default 40). */
  minDelayMs?: number;
  /** Maximum per-keystroke delay in ms (default 120). */
  maxDelayMs?: number;
  /** Probability (0-1) of a longer "thinking" pause between keystrokes. */
  jitterChance?: number;
  jitterMinMs?: number;
  jitterMaxMs?: number;
  /**
   * Adaptive budget (ms) for very long texts. Humans PASTE long tabular data
   * rather than typing it keystroke by keystroke, so when the text is long the
   * per-keystroke delays scale down to stay within this budget. Short messages
   * always keep the full human cadence.
   */
  maxTypingMs?: number;
  /** Clear the field before typing (default true). */
  clearFirst?: boolean;
}

/** Texts longer than this are handled like a human PASTE, not keystrokes. */
const PASTE_THRESHOLD = 500;

/**
 * Type text character by character with randomized 40-120 ms delays and
 * occasional jitter ("thinking") pauses. Returns the normalized text that was
 * actually entered (see the newline note below) so callers can verify the
 * field received it in full.
 *
 * Long payloads (> 500 chars) are entered the way a human does it: the first
 * characters are typed, the rest is PASTED (single atomic input event). This
 * mirrors real behavior and keeps the adaptive `maxTypingMs` budget honest.
 */
export async function humanType(
  locator: Locator,
  text: string,
  options: HumanTypeOptions = {},
): Promise<string> {
  const {
    minDelayMs = 40,
    maxDelayMs = 120,
    jitterChance = 0.08,
    jitterMinMs = 250,
    jitterMaxMs = 600,
    maxTypingMs = 25_000,
    clearFirst = true,
  } = options;

  const page = locator.page();
  await locator.click();
  if (clearFirst) {
    await locator.fill('');
  }

  // The chat input is a single-line <input type="text"> — newlines cannot be
  // represented there (and pressing Enter would submit the form). Normalize
  // them to spaces so tabular data can still be typed realistically.
  const normalized = text.replace(/\s*\n\s*/g, ' ');

  if (normalized.length > PASTE_THRESHOLD) {
    // Type a few characters by hand, then paste the remainder.
    const head = normalized.slice(0, 12);
    for (const char of head) {
      await page.keyboard.type(char, { delay: 0 });
      await sleep(randInt(minDelayMs, maxDelayMs));
    }
    await sleep(randInt(250, 600));
    await locator.fill(normalized);
    return normalized;
  }

  // Adaptive cadence: keep the full human rhythm for normal messages and only
  // compress delays when the budget would be exceeded.
  const avgDelay = (minDelayMs + maxDelayMs) / 2;
  const scale = Math.min(1, maxTypingMs / Math.max(1, normalized.length * avgDelay));
  const minDelay = Math.max(2, Math.round(minDelayMs * scale));
  const maxDelay = Math.max(minDelay + 1, Math.round(maxDelayMs * scale));

  for (const char of normalized) {
    await page.keyboard.type(char, { delay: 0 });
    if (Math.random() < jitterChance) {
      await sleep(randInt(jitterMinMs, jitterMaxMs));
    } else {
      await sleep(randInt(minDelay, maxDelay));
    }
  }
  return normalized;
}

export interface HumanMoveOptions {
  /** Number of intermediate waypoints (2-4 by default). */
  segments?: number;
}

/**
 * Move the mouse to a target in 2-4 intermediate steps — a human hand path,
 * not a teleport. Ends hovering the target center with a few px of jitter.
 */
export async function humanMove(
  page: Page,
  target: Locator | string,
  options: HumanMoveOptions = {},
): Promise<void> {
  const locator = typeof target === 'string' ? page.locator(target) : target;
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  if (!box) {
    throw new Error('humanMove: target has no bounding box (not visible?)');
  }

  const viewport = page.viewportSize() ?? { width: 1280, height: 800 };
  const clampX = (x: number) => Math.min(viewport.width - 2, Math.max(2, x));
  const clampY = (y: number) => Math.min(viewport.height - 2, Math.max(2, y));

  const endX = clampX(box.x + box.width / 2 + randInt(-3, 3));
  const endY = clampY(box.y + box.height / 2 + randInt(-2, 2));

  // Start from a plausible "previous" cursor spot away from the target.
  const startX = clampX(endX + (Math.random() < 0.5 ? -1 : 1) * randInt(90, 220));
  const startY = clampY(endY + randInt(-160, 160));
  await page.mouse.move(startX, startY, { steps: randInt(3, 6) });

  const segments = options.segments ?? randInt(2, 4);
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const wobble = (1 - t) * 22;
    const x = clampX(lerp(startX, endX, t) + randInt(-wobble, wobble));
    const y = clampY(lerp(startY, endY, t) + randInt(-wobble, wobble));
    await page.mouse.move(x, y, { steps: randInt(4, 9) });
  }
  await page.mouse.move(endX, endY, { steps: randInt(2, 5) });
}

export interface BotWaitOptions {
  /** Locator matching every assistant bubble in the chat window. */
  botBubbles: Locator;
  /** How many assistant bubbles were visible BEFORE the send. */
  previousBotCount: number;
  /** Overall budget for one bot reply (default 90 s — typical latency 15-60 s). */
  timeoutMs?: number;
}

/**
 * Wait until the bot reply has settled:
 *   1. the "Pensando…" indicator appeared (best effort — replies can be fast),
 *   2. …and disappeared again (reply or error is rendered),
 *   3. the network is idle (no in-flight chat calls),
 *   4. a NEW assistant bubble exists,
 *   5. its text is stable across two consecutive polls (no late re-renders).
 *
 * Every step polls real state. No fixed sleeps longer than the poll intervals.
 */
export async function waitForNetworkIdleAndBot(
  page: Page,
  { botBubbles, previousBotCount, timeoutMs = 90_000 }: BotWaitOptions,
): Promise<void> {
  // Spanish UI string from i18n es.json — "chatbot.thinking".
  const thinking = page.getByText('Pensando…', { exact: true });

  // 1. Best effort: catch the indicator unless the reply arrived instantly.
  await thinking
    .first()
    .waitFor({ state: 'visible', timeout: 10_000 })
    .catch(() => undefined);

  // 2. The indicator must clear — this is the real "the bot finished" signal.
  await expect(thinking).toBeHidden({ timeout: timeoutMs });

  // 3. Network quiescence (built-in 500 ms idle window, no blind sleep).
  await page
    .waitForLoadState('networkidle', { timeout: 30_000 })
    .catch(() => undefined);

  // 4. A new assistant bubble (reply OR the error placeholder) must exist.
  await expect
    .poll(async () => botBubbles.count(), {
      timeout: timeoutMs,
      intervals: [250, 500, 1_000, 2_000],
    })
    .toBeGreaterThan(previousBotCount);

  // 5. Its rendered text must be stable across two consecutive samples.
  const last = botBubbles.last();
  let previous = '';
  await expect
    .poll(
      async () => {
        const text = (await last.innerText()).trim();
        const stable = text.length > 0 && text === previous;
        previous = text;
        return stable;
      },
      { timeout: 20_000, intervals: [300, 500, 1_000] },
    )
    .toBe(true);
}
