/**
 * Loyallia WhatsApp Bridge — Express REST API Server
 *
 * Exposes endpoints for:
 * - QR code generation and session management
 * - Message sending (queued via BullMQ)
 * - Health and status monitoring
 *
 * SEC: All endpoints require API key authentication via header.
 * Internal network only — never exposed to the public internet.
 */

const express = require("express");
const pino = require("pino");
const {
  startSession,
  getSessionStatus,
  disconnectSession,
  getActiveSessionCount,
} = require("./socket-manager");
const { enqueueMessage, startWorker, getQueueStats } = require("./queue");
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
 * GET /qr/:tenantId
 * Returns the current QR code for WhatsApp pairing.
 * If already connected, returns { qr: null, connected: true }.
 * If no session exists, starts one and returns the QR.
 */
app.get("/qr/:tenantId", async (req, res) => {
  const { tenantId } = req.params;

  try {
    // Start session if not already running
    await startSession(tenantId);

    // Wait briefly for QR to generate (up to 5s)
    let attempts = 0;
    let status = getSessionStatus(tenantId);
    while (!status.qr && !status.connected && attempts < 10) {
      await sleep(500);
      status = getSessionStatus(tenantId);
      attempts++;
    }

    res.json({
      qr: status.qr,
      connected: status.connected,
      phone: status.phone,
    });
  } catch (err) {
    logger.error({ tenantId, error: err.message }, "QR generation failed");
    res.status(500).json({ error: "Failed to generate QR code" });
  }
});

/**
 * GET /status/:tenantId
 * Returns the current connection status for a tenant.
 */
app.get("/status/:tenantId", (req, res) => {
  const { tenantId } = req.params;
  const status = getSessionStatus(tenantId);
  res.json(status);
});

/**
 * POST /disconnect/:tenantId
 * Disconnects and cleans up a tenant's WhatsApp session.
 */
app.post("/disconnect/:tenantId", async (req, res) => {
  const { tenantId } = req.params;

  try {
    await disconnectSession(tenantId);
    res.json({ success: true });
  } catch (err) {
    logger.error({ tenantId, error: err.message }, "Disconnect failed");
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
 *   tenant_id: string (required)
 *   phone: string (required) — E.164 format, e.g. "+593991234567"
 *   message: string (required)
 *   media_url: string (optional) — URL of image to attach
 *   metadata: object (optional) — forwarded to Django webhook
 *     - delivery_log_id: UUID of CampaignDeliveryLog row
 *     - campaign_run_id: UUID of CampaignRun row
 */
app.post("/send", async (req, res) => {
  const { tenant_id, phone, message, media_url, metadata } = req.body;

  if (!tenant_id || !phone || !message) {
    return res
      .status(400)
      .json({ error: "tenant_id, phone, and message are required" });
  }

  // Validate phone format
  const cleanPhone = phone.replace(/[^0-9+]/g, "");
  if (cleanPhone.length < 10) {
    return res.status(400).json({ error: "Invalid phone number format" });
  }

  // Check if session is connected
  const status = getSessionStatus(tenant_id);
  if (!status.connected) {
    return res.status(409).json({
      error: "WhatsApp session not connected. Scan QR code first.",
      connected: false,
    });
  }

  try {
    const jobId = await enqueueMessage(
      tenant_id,
      cleanPhone,
      message,
      media_url,
      metadata
    );
    res.json({ success: true, job_id: jobId, queued: true });
  } catch (err) {
    logger.error(
      { tenant_id, phone, error: err.message },
      "Failed to enqueue message"
    );
    res.status(500).json({ error: "Failed to queue message" });
  }
});

/**
 * POST /send-direct
 * Sends a message immediately (bypasses queue). Use for testing only.
 */
app.post("/send-direct", async (req, res) => {
  const { tenant_id, phone, message, media_url } = req.body;

  if (!tenant_id || !phone || !message) {
    return res
      .status(400)
      .json({ error: "tenant_id, phone, and message are required" });
  }

  const { sendMessage } = require("./socket-manager");

  try {
    const messageId = await sendMessage(tenant_id, phone, message, media_url);
    res.json({ success: true, message_id: messageId });
  } catch (err) {
    logger.error(
      { tenant_id, phone, error: err.message },
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
