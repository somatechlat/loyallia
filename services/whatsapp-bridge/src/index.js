/**
 * Loyallia WhatsApp Bridge — Express REST API Server
 *
 * Exposes endpoints for:
 * - QR code generation and session management (keyed by sessionId)
 * - Message sending (queued via BullMQ, rate-limited per session)
 * - Health and status monitoring
 *
 * A tenant may have multiple WhatsApp sessions (WhatsAppSession rows).
 * Every session-scoped route takes the session UUID — never the tenant
 * UUID — so messages and QR pairing always target one linked number.
 *
 * SEC: All endpoints require API key authentication via header.
 * Internal network only — never exposed to the public internet.
 */

const dns = require("dns");
// Docker DNS can resolve `api` to IPv6 first; Node then hangs on
// connect. Prefer IPv4 so bridge→Django webhooks actually deliver.
dns.setDefaultResultOrder("ipv4first");

const express = require("express");
const pino = require("pino");
const {
  startSession,
  getSessionStatus,
  sendMessage,
  disconnectSession,
  getActiveSessionCount,
  listSessions,
  isValidUuid,
} = require("./socket-manager");
const {
  enqueueMessage,
  startWorker,
  getQueueStats,
  checkRateLimit,
  incrementRateCounters,
} = require("./queue");
const { getApiKey } = require("./config");

const app = express();
const logger = pino({ level: process.env.LOG_LEVEL || "info" });
const PORT = parseInt(process.env.PORT || "3001", 10);
const API_KEY = getApiKey();

// Middleware
app.use(express.json({ limit: "1mb" }));

/**
 * API key authentication middleware.
 * Skips auth for /health endpoint.
 */
function authMiddleware(req, res, next) {
  if (req.path === "/health") return next();

  const key =
    req.headers.authorization?.replace("Bearer ", "") ||
    req.headers["x-api-key"];

  if (!API_KEY) {
    return res.status(503).json({ error: "Bridge API key is not configured" });
  }

  if (key !== API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

app.use(authMiddleware);

/**
 * Validate a sessionId path/body param.
 * Returns true when the value is a well-formed UUID.
 */
function rejectInvalidSessionId(res, sessionId) {
  if (!sessionId || !isValidUuid(sessionId)) {
    res.status(400).json({ error: "session_id must be a valid UUID" });
    return true;
  }
  return false;
}

// =============================================================================
// HEALTH
// =============================================================================

app.get("/health", async (_req, res) => {
  const queueStats = await getQueueStats();
  res.json({
    status: "ok",
    sessions: getActiveSessionCount(),
    queue: queueStats,
    uptime: process.uptime(),
  });
});

// =============================================================================
// QR CODE & SESSION
// =============================================================================

/**
 * GET /qr/:sessionId
 * Returns the current QR code for WhatsApp pairing of one session.
 * If already connected, returns { qr: null, connected: true }.
 * If no session exists, starts one and returns the QR.
 */
app.get("/qr/:sessionId", async (req, res) => {
  const { sessionId } = req.params;

  if (rejectInvalidSessionId(res, sessionId)) return;

  // tenant_id is required to start a session; once running it is known
  // from the in-memory session (so pollers can omit it).
  const existing = getSessionStatus(sessionId);
  const tenantId = existing.tenantId || req.query.tenant_id;

  if (!tenantId || !isValidUuid(tenantId)) {
    return res
      .status(400)
      .json({ error: "tenant_id must be a valid UUID (query parameter)" });
  }

  try {
    const existingStatus = getSessionStatus(sessionId);
    // Only start a socket if none is running. Polling /qr must never
    // spawn a second Baileys connection.
    if (!existingStatus.connected && !existingStatus.qr) {
      await startSession({ sessionId, tenantId });
    }

    // Wait briefly for QR to generate (up to 4s) only when we just started
    let attempts = 0;
    let status = getSessionStatus(sessionId);
    while (!status.qr && !status.connected && attempts < 8) {
      await sleep(500);
      status = getSessionStatus(sessionId);
      attempts++;
    }

    res.json({
      qr: status.qr,
      connected: status.connected,
      phone: status.phone,
      session_id: sessionId,
      tenant_id: tenantId,
    });
  } catch (err) {
    logger.error({ sessionId, tenantId, error: err.message }, "QR generation failed");
    res.status(500).json({ error: "Failed to generate QR code" });
  }
});

/**
 * GET /status/:sessionId
 * Returns the current connection status for a session.
 */
app.get("/status/:sessionId", (req, res) => {
  const { sessionId } = req.params;
  if (rejectInvalidSessionId(res, sessionId)) return;

  const status = getSessionStatus(sessionId);
  res.json({
    connected: status.connected,
    qr: status.qr,
    phone: status.phone,
    session_id: sessionId,
    tenant_id: status.tenantId,
  });
});

/**
 * POST /disconnect/:sessionId
 * Disconnects and cleans up a WhatsApp session (socket + Redis auth).
 */
app.post("/disconnect/:sessionId", async (req, res) => {
  const { sessionId } = req.params;
  if (rejectInvalidSessionId(res, sessionId)) return;

  try {
    await disconnectSession(sessionId);
    res.json({ success: true, session_id: sessionId });
  } catch (err) {
    logger.error({ sessionId, error: err.message }, "Disconnect failed");
    res.status(500).json({ error: "Failed to disconnect" });
  }
});

// =============================================================================
// SEND MESSAGE
// =============================================================================

/**
 * POST /send
 * Enqueues a message for delivery through the rate-limited queue.
 *
 * Body:
 *   session_id: string (required) — WhatsAppSession UUID
 *   phone: string (required) — E.164 format, e.g. "+593991234567"
 *   message: string (required)
 *   media_url: string (optional) — URL of image to attach
 *   metadata: object (optional) — forwarded to Django webhook
 *     - delivery_log_id: UUID of CampaignDeliveryLog row
 *     - campaign_run_id: UUID of CampaignRun row
 *   tenant_id: string (optional) — owning tenant UUID; resolved from the
 *     live session when omitted. If provided it must match the session.
 */
app.post("/send", async (req, res) => {
  const { session_id, tenant_id, phone, message, media_url, metadata } =
    req.body;

  if (rejectInvalidSessionId(res, session_id)) return;
  if (!phone || !message) {
    return res.status(400).json({ error: "phone and message are required" });
  }

  // Validate phone format
  const cleanPhone = phone.replace(/[^0-9+]/g, "");
  if (cleanPhone.length < 10) {
    return res.status(400).json({ error: "Invalid phone number format" });
  }

  // Check if session is connected
  const status = getSessionStatus(session_id);
  if (!status.connected) {
    return res.status(409).json({
      error: "WhatsApp session not connected. Scan QR code first.",
      connected: false,
      session_id,
    });
  }

  const effectiveTenantId = status.tenantId;
  if (!effectiveTenantId) {
    return res.status(409).json({
      error: "WhatsApp session has no tenant binding",
      session_id,
    });
  }
  if (tenant_id && tenant_id !== effectiveTenantId) {
    return res.status(403).json({
      error: "session_id does not belong to tenant_id",
      session_id,
      tenant_id,
    });
  }

  try {
    const jobId = await enqueueMessage({
      sessionId: session_id,
      tenantId: effectiveTenantId,
      phone: cleanPhone,
      message,
      mediaUrl: media_url,
      metadata,
    });
    res.json({ success: true, job_id: jobId, queued: true, session_id });
  } catch (err) {
    logger.error(
      { session_id, tenant_id: effectiveTenantId, phone, error: err.message },
      "Failed to enqueue message"
    );
    res.status(500).json({ error: "Failed to queue message" });
  }
});

/**
 * POST /send-direct
 * Sends a message immediately (bypasses the BullMQ queue) but still
 * enforces the same per-session rate limits as /send (anti-ban).
 * Returns 429 when the session is over its minute/hour quota.
 */
app.post("/send-direct", async (req, res) => {
  const { session_id, tenant_id, phone, message, media_url } = req.body;

  if (rejectInvalidSessionId(res, session_id)) return;
  if (!phone || !message) {
    return res.status(400).json({ error: "phone and message are required" });
  }

  const cleanPhone = phone.replace(/[^0-9+]/g, "");
  if (cleanPhone.length < 10) {
    return res.status(400).json({ error: "Invalid phone number format" });
  }

  const status = getSessionStatus(session_id);
  if (!status.connected) {
    return res.status(409).json({
      error: "WhatsApp session not connected. Scan QR code first.",
      connected: false,
      session_id,
    });
  }

  const effectiveTenantId = status.tenantId;
  if (!effectiveTenantId) {
    return res.status(409).json({
      error: "WhatsApp session has no tenant binding",
      session_id,
    });
  }
  if (tenant_id && tenant_id !== effectiveTenantId) {
    return res.status(403).json({
      error: "session_id does not belong to tenant_id",
      session_id,
      tenant_id,
    });
  }

  // Same per-session rate limits as the queued path (anti-ban).
  const rate = await checkRateLimit(session_id);
  if (!rate.allowed) {
    res.set("Retry-After", String(Math.ceil(rate.retryAfterMs / 1000)));
    return res.status(429).json({
      error: "Rate limit exceeded for this session",
      reason: rate.reason,
      retry_after_ms: rate.retryAfterMs,
      session_id,
    });
  }

  try {
    const messageId = await sendMessage(session_id, cleanPhone, message, media_url);
    await incrementRateCounters(session_id);
    res.json({ success: true, message_id: messageId, session_id });
  } catch (err) {
    logger.error(
      { session_id, tenant_id: effectiveTenantId, phone, error: err.message },
      "Direct send failed"
    );
    res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// QUEUE STATS
// =============================================================================

/**
 * GET /queue/stats
 * Returns current queue statistics for monitoring.
 */
app.get("/queue/stats", async (_req, res) => {
  const stats = await getQueueStats();
  res.json(stats);
});

/**
 * GET /sessions
 * Lists in-memory sessions (monitoring / ops).
 */
app.get("/sessions", (_req, res) => {
  res.json({ sessions: listSessions(), count: getActiveSessionCount() });
});

// =============================================================================
// STARTUP
// =============================================================================

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Start the BullMQ worker
startWorker();

app.listen(PORT, "0.0.0.0", () => {
  logger.info({ port: PORT }, "WhatsApp Bridge API started");
});
