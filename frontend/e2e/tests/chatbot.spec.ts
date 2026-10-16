/**
 * Loyallia — AI chatbot ("Chatea con AiGi") E2E characterization suite.
 *
 * Scenario map (see e2e/README.md):
 *   T1a  continuidad — dos turnos comparten el mismo contexto de agente
 *   T1b  continuidad — la conversación sobrevive a un reload (reanudación)
 *   T2a  ciclo de vida — "Finalizar conversación" llama a /end/ y reinicia
 *   T2b  ciclo de vida — acciones sin conversación activa son un no-op seguro
 *   T3   robustez — un mensaje de ~3500 caracteres viaja completo
 *        (FALLO CONOCIDO: el payload pierde la pregunta del usuario por falta
 *         de marcadores {userMessage} en las plantillas i18n — ver test)
 *   T4   aislamiento — otra cuenta no ve ni continúa el contexto ajeno
 *   T5   roles — STAFF no debe ver el chatbot
 *
 * All user-facing assertions are in Spanish (the product's locale). Network
 * assertions inspect the REAL browser request stream — nothing is mocked.
 *
 * NOTE ON ORDERING: tests run sequentially (1 worker, fullyParallel: false)
 * but WITHOUT `mode: 'serial'` on purpose — a characterization run must report
 * every scenario even when an earlier one fails.
 */
import { test, expect } from '@playwright/test';
import {
  botBubbles,
  captureTraffic,
  credentialsFor,
  ensureActiveContext,
  login,
  openChatbot,
  sendChatMessage,
  sendTurnAndCaptureContext,
  startFreshConversation,
  switchUser,
  userBubbles,
} from '../helpers/chatbot';
import { humanMove, waitForNetworkIdleAndBot } from '../helpers/human';

/** Optional diagnostics: base URL of the Agent Zero instance behind the chat. */
const AGENT_BASE_URL = process.env.E2E_AGENT_BASE_URL;

test.describe('Chatea con AiGi — caracterización del chatbot con IA', () => {
  test('T1a · continuidad — dos turnos comparten el mismo contexto', async ({ page, request }) => {
    // Preflight opcional: el agente detrás del chat debe estar vivo.
    if (AGENT_BASE_URL) {
      const res = await request
        .get(AGENT_BASE_URL.replace(/\/$/, '/'), { timeout: 15_000 })
        .catch(() => null);
      expect(res, `el agente en ${AGENT_BASE_URL} debe estar accesible`).not.toBeNull();
      expect(res!.status(), 'el agente debe responder sin error de servidor').toBeLessThan(500);
    }

    const traffic = captureTraffic(page);
    await login(page, credentialsFor('owner'));
    await openChatbot(page);
    await startFreshConversation(page);

    // Primer turno: conversación limpia → el payload NO debe llevar context_id.
    const requestsBefore1 = traffic.chatRequests.length;
    const first = 'Hola, ¿puedes ayudarme con la retención de clientes?';
    const ctx = await sendTurnAndCaptureContext(page, traffic, first);

    expect(
      traffic.chatRequests.length,
      'debe existir un primer envío',
    ).toBeGreaterThan(requestsBefore1);
    expect(
      traffic.chatRequests[requestsBefore1].body?.context_id ?? null,
      'el primer turno debe ir sin context_id',
    ).toBeNull();
    expect(ctx, 'el asistente debe devolver un context_id').toBeTruthy();

    // Segundo turno: mismo contexto (continuidad de la conversación).
    const requestsBefore2 = traffic.chatRequests.length;
    const before2 = await botBubbles(page).count();
    const second = await sendChatMessage(page, '¿Qué programa VIP tengo activo actualmente?');
    await waitForNetworkIdleAndBot(page, {
      botBubbles: botBubbles(page),
      previousBotCount: before2,
    });

    expect(
      traffic.chatRequests.length,
      'debe existir un segundo envío',
    ).toBeGreaterThan(requestsBefore2);
    expect(
      traffic.chatRequests[requestsBefore2].body?.context_id,
      'el segundo turno debe reutilizar el MISMO context_id',
    ).toBe(ctx);

    // Transcripción visible: 2 burbujas de usuario y respuestas del asistente.
    await expect(userBubbles(page), 'debe verse la transcripción con 2 mensajes del usuario').toHaveCount(2);
    await expect(userBubbles(page).nth(0)).toContainText(first.slice(0, 25));
    await expect(userBubbles(page).nth(1)).toContainText(second.slice(0, 25));
    await expect(botBubbles(page).last(), 'el asistente debe responder el segundo turno').toBeVisible();
    expect(
      (await botBubbles(page).last().innerText()).trim().length,
      'la respuesta no debe estar vacía',
    ).toBeGreaterThan(0);
  });

  test('T1b · continuidad — la conversación sobrevive a un reload', async ({ page }) => {
    const traffic = captureTraffic(page);
    await login(page, credentialsFor('owner'));
    await openChatbot(page);
    const ctx = await ensureActiveContext(page, traffic);

    // Una persona recarga la página a mitad de conversación.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await openChatbot(page);

    // La UI debe ofrecer reanudar (no empezar en silencio otra conversación).
    await expect(page.getByText('Continuar conversación'), 'debe ofrecer reanudar').toBeVisible();
    const resume = page.locator('#chatbot-continue');
    await humanMove(page, resume);
    await resume.click();
    await expect(
      page.getByText('Continuando tu conversación anterior.'),
      'debe confirmar la reanudación en español',
    ).toBeVisible();

    // El siguiente turno debe continuar el MISMO contexto.
    const requestsBefore = traffic.chatRequests.length;
    const before = await botBubbles(page).count();
    await sendChatMessage(page, 'Retomamos: ¿me das el resumen de nuevo?');
    await expect
      .poll(() => traffic.chatRequests.length, { timeout: 30_000 })
      .toBeGreaterThan(requestsBefore);
    expect(
      traffic.chatRequests.at(-1)!.body?.context_id,
      'tras el reload el mensaje debe continuar el MISMO contexto',
    ).toBe(ctx);
    await waitForNetworkIdleAndBot(page, {
      botBubbles: botBubbles(page),
      previousBotCount: before,
    });
  });

  test('T2a · ciclo de vida — "Finalizar conversación" llama a /end/ y reinicia', async ({ page }) => {
    const traffic = captureTraffic(page);
    await login(page, credentialsFor('owner'));
    await openChatbot(page);
    const ctx = await ensureActiveContext(page, traffic);

    // Finalizar la conversación (click humano sobre el botón real).
    const endBtn = page.locator('#chatbot-end-conversation');
    await expect(endBtn, 'debe ofrecerse "Finalizar conversación"').toBeVisible();
    await humanMove(page, endBtn);
    await endBtn.click();

    // Aserción de red: POST /api/v1/tenants/me/ai-chat/end/ con el contexto activo.
    await expect.poll(() => traffic.endRequests.length, { timeout: 20_000 }).toBeGreaterThan(0);
    expect(
      traffic.endRequests.at(-1)!.body?.context_id,
      'la petición /end/ debe llevar el context_id activo',
    ).toBe(ctx);
    await expect.poll(() => traffic.endResponses.length, { timeout: 20_000 }).toBeGreaterThan(0);
    expect(traffic.endResponses.at(-1)!.status, '/end/ debe responder 200').toBe(200);
    expect(traffic.endResponses.at(-1)!.responseBody?.success, '/end/ debe confirmar success').toBe(
      true,
    );

    // Confirmación visible en español y sin affordance de finalizar (ya no hay contexto).
    await expect(
      page.getByText('Conversación finalizada. ¡Gracias por usar el asistente!'),
      'debe confirmar el cierre en español',
    ).toBeVisible();
    await expect(endBtn, 'sin contexto activo el botón de finalizar desaparece').toBeHidden();

    // El siguiente mensaje empieza una conversación NUEVA (sin context_id).
    const requestsBefore = traffic.chatRequests.length;
    const before = await botBubbles(page).count();
    await sendChatMessage(page, 'Una consulta más, por favor.');
    await expect
      .poll(() => traffic.chatRequests.length, { timeout: 30_000 })
      .toBeGreaterThan(requestsBefore);
    expect(
      traffic.chatRequests.at(-1)!.body?.context_id ?? null,
      'después de finalizar no se debe reutilizar el contexto',
    ).toBeNull();
    await waitForNetworkIdleAndBot(page, {
      botBubbles: botBubbles(page),
      previousBotCount: before,
    });
  });

  test('T2b · ciclo de vida — sin conversación activa todo es un no-op seguro', async ({ page }) => {
    const traffic = captureTraffic(page);
    await login(page, credentialsFor('owner'));
    await openChatbot(page);
    await ensureActiveContext(page, traffic);

    // Dejar la UI en estado "conversación finalizada" (sin contexto activo).
    const endBtn = page.locator('#chatbot-end-conversation');
    await humanMove(page, endBtn);
    await endBtn.click();
    await expect(page.getByText('Conversación finalizada. ¡Gracias por usar el asistente!')).toBeVisible();

    // Sin conversación activa, "Finalizar conversación" no se ofrece.
    await expect(endBtn, 'sin contexto activo no debe ofrecerse finalizar').toBeHidden();

    // Y el teardown ("Nueva conversación") no debe llamar a /end/ ni fallar.
    const endCallsBefore = traffic.endRequests.length;
    const reset = page.locator('#chatbot-new-conversation');
    await expect(reset, 'debe seguir disponible "Nueva conversación"').toBeVisible();
    await humanMove(page, reset);
    await reset.click();
    await expect(
      page.locator('#chatbot-session-actions'),
      'tras reiniciar no queda barra de ciclo de vida',
    ).toBeHidden({ timeout: 20_000 });
    expect(
      traffic.endRequests.length,
      'sin contexto activo no debe emitirse ninguna petición /end/',
    ).toBe(endCallsBefore);
    await expect(page.getByText(/No se pudo finalizar la conversación/i)).toBeHidden();
    await expect(
      page.getByText('¡Bienvenido a Loyallia! ¿Cómo puedo ayudarte hoy?'),
      'debe volver a verse el mensaje de bienvenida',
    ).toBeVisible();
  });

  test('T3 · robustez — un mensaje de ~3500 caracteres viaja completo', async ({ page }) => {
    // FALLO CONOCIDO (caracterizado): el enriquecimiento de contexto arma el
    // payload con `t('chatbot.context.userQuestion', { userMessage })`, pero las
    // plantillas de i18n (es.json/en.json "chatbot.context.*") no contienen los
    // marcadores {userMessage}/{pageLabel}/{pathname}/…, así que la pregunta del
    // usuario NUNCA llega al backend (solo viaja el sobre de contexto). El campo
    // del formulario no trunca (cota del router: 8000) — el defecto está en la
    // interpolación de i18n. Si se corrigen las plantillas, este test debe pasar
    // (y su "fallo inesperado" señalará la corrección).
    test.fail();
    const traffic = captureTraffic(page);
    await login(page, credentialsFor('owner'));
    await openChatbot(page);

    // ~3500 caracteres de texto real (no lorem): un pedido analítico extenso.
    const marker = `T3-${Date.now()}`;
    const filler =
      'Necesito un análisis detallado de la campaña de fidelización de este mes, con números, tendencias y recomendaciones. ';
    const longMessage =
      filler.repeat(Math.ceil(3600 / filler.length)).slice(0, 3500 - marker.length - 1) +
      ' ' +
      marker;
    expect(longMessage.length, 'el mensaje de prueba debe medir 3500 caracteres').toBe(3500);

    const before = await botBubbles(page).count();
    await sendChatMessage(page, longMessage);

    await expect.poll(() => traffic.chatRequests.length, { timeout: 30_000 }).toBeGreaterThan(0);
    const sentMessage = String(traffic.chatRequests.at(-1)!.body?.message ?? '');
    expect(
      sentMessage,
      'el mensaje completo (3500 caracteres) debe viajar al backend sin truncarse',
    ).toContain(longMessage);
    await expect(
      userBubbles(page).last(),
      'la transcripción debe mostrar el mensaje completo',
    ).toContainText(marker);

    // El asistente debe alcanzar un estado terminal: respuesta o error explícito.
    await waitForNetworkIdleAndBot(page, {
      botBubbles: botBubbles(page),
      previousBotCount: before,
    });
    const lastBot = (await botBubbles(page).last().innerText()).trim();
    expect(lastBot.length, 'debe existir respuesta o error visible, nunca silencio').toBeGreaterThan(0);
  });

  test('T4 · aislamiento — otra cuenta no ve ni continúa el contexto ajeno', async ({ page }) => {
    const traffic = captureTraffic(page);

    // Cuenta A (dueña de la conversación) deja un dato identificable.
    await login(page, credentialsFor('owner'));
    await openChatbot(page);
    await startFreshConversation(page);
    const marker = `CONFIDENCIAL-T4-${Date.now()}`;
    const ownerCtx = await sendTurnAndCaptureContext(
      page,
      traffic,
      `Guarda este dato en la conversación: ${marker}`,
    );
    expect(ownerCtx, 'la conversación de la cuenta A debe tener contexto').toBeTruthy();

    // Cambio de cuenta en el mismo navegador (misma cookie jar, como una persona).
    await switchUser(page, credentialsFor('superadmin'));
    await openChatbot(page, { fallbackPath: '/superadmin' });

    // (a) Negativa en UI: la conversación de A no debe ser visible.
    await expect(
      page.getByText(marker),
      'la conversación de otra cuenta no debe ser visible',
    ).toHaveCount(0);

    // (b) Inspección de payload: el contexto ajeno no debe viajar en la petición.
    const requestsBefore = traffic.chatRequests.length;
    const beforeB = await botBubbles(page).count();
    await sendChatMessage(page, 'Hola, ¿qué puedes ver de mi cuenta?');
    await expect
      .poll(() => traffic.chatRequests.length, { timeout: 30_000 })
      .toBeGreaterThan(requestsBefore);
    const payload = traffic.chatRequests.at(-1)!.body;
    expect(
      payload?.context_id ?? null,
      'la petición de otra cuenta no debe llevar el context_id ajeno',
    ).not.toBe(ownerCtx);
    await waitForNetworkIdleAndBot(page, {
      botBubbles: botBubbles(page),
      previousBotCount: beforeB,
    });
  });

  test('T5 · roles — STAFF no debe ver el chatbot', async ({ page }) => {
    await login(page, credentialsFor('staff'));
    await page.waitForLoadState('networkidle').catch(() => undefined);

    // El layout de dashboard no renderiza el asistente para STAFF (hay redirect).
    await expect(
      page.locator('#chatbot-toggle'),
      'el rol STAFF no debe tener acceso al chatbot',
    ).toBeHidden({ timeout: 8_000 });
    // Doble comprobación tras el eventual redirect.
    await expect
      .poll(async () => page.url(), { timeout: 15_000 })
      .not.toContain('/login');
    await expect(page.locator('#chatbot-toggle'), 'tras el redirect sigue sin chatbot').toBeHidden();
    await expect(
      page.getByText('Asistente de IA'),
      'el diálogo del asistente no debe montarse para STAFF',
    ).toBeHidden();
  });
});
