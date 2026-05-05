/**
 * Loyallia WhatsApp Bridge — Socket Manager
 *
 * Manages Baileys WebSocket connections per tenant.
 * Auth state persisted to Redis for container restart resilience.
 *
 * SEC: Each tenant gets an isolated socket keyed by tenant_id.
 * No cross-tenant data leakage possible.
 */

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const { Boom } = require("@hapi/boom");
const Redis = require("ioredis");
const QRCode = require("qrcode");

const logger = pino({ level: process.env.LOG_LEVEL || "info" });

// Active sockets keyed by tenant_id
const sessions = new Map();

// Redis client for auth state persistence
let redis;

function getRedis() {
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379/3");
  }
  return redis;
}

/**
 * Redis-backed auth state store.
 * Replaces file-based useMultiFileAuthState for container-safe persistence.
 */
async function useRedisAuthState(tenantId) {
  const r = getRedis();
  const prefix = `wa:auth:${tenantId}:`;

  const writeData = async (key, data) => {
    await r.set(`${prefix}${key}`, JSON.stringify(data));
  };

  const readData = async (key) => {
    const raw = await r.get(`${prefix}${key}`);
    return raw ? JSON.parse(raw) : null;
  };

  const removeData = async (key) => {
    await r.del(`${prefix}${key}`);
  };

  const creds = (await readData("creds")) || undefined;

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const result = {};
          for (const id of ids) {
            const val = await readData(`${type}-${id}`);
            if (val) result[id] = val;
          }
          return result;
        },
        set: async (data) => {
          for (const [type, entries] of Object.entries(data)) {
            for (const [id, value] of Object.entries(entries)) {
              if (value) {
                await writeData(`${type}-${id}`, value);
              } else {
                await removeData(`${type}-${id}`);
              }
            }
          }
        },
      },
    },
    saveCreds: async (updatedCreds) => {
      await writeData("creds", updatedCreds);
    },
  };
}

/**
 * Session state container returned by getSessionStatus.
 * @typedef {Object} SessionInfo
 * @property {boolean} connected
 * @property {string|null} qr - Base64 PNG of current QR code
 * @property {string} phone - Connected phone number
 */

/**
 * Start or retrieve a WhatsApp session for a tenant.
 * Idempotent — calling multiple times returns the same socket.
 */
async function startSession(tenantId) {
  if (sessions.has(tenantId)) {
    return sessions.get(tenantId);
  }

  const { state, saveCreds } = await useRedisAuthState(tenantId);
  const { version } = await fetchLatestBaileysVersion();

  const sessionData = {
    socket: null,
    qr: null,
    connected: false,
    phone: "",
    reconnectAttempts: 0,
  };

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: "silent" }),
    browser: ["Loyallia", "Chrome", "20.0.0"],
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: undefined,
    keepAliveIntervalMs: 30000,
    markOnlineOnConnect: false,
  });

  // Handle connection updates (QR code, connected, disconnected)
  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      // Generate QR code as base64 PNG
      try {
        sessionData.qr = await QRCode.toDataURL(qr, {
          width: 300,
          margin: 2,
        });
        logger.info({ tenantId }, "New QR code generated");
      } catch (err) {
        logger.error({ tenantId, err }, "QR code generation failed");
      }
    }

    if (connection === "close") {
      sessionData.connected = false;
      sessionData.qr = null;

      const statusCode =
        lastDisconnect?.error instanceof Boom
          ? lastDisconnect.error.output.statusCode
          : 500;

      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      if (shouldReconnect && sessionData.reconnectAttempts < 5) {
        sessionData.reconnectAttempts++;
        const delay = Math.min(
          1000 * Math.pow(2, sessionData.reconnectAttempts),
          30000
        );
        logger.info(
          { tenantId, attempt: sessionData.reconnectAttempts, delay },
          "Reconnecting..."
        );
        setTimeout(() => {
          sessions.delete(tenantId);
          startSession(tenantId);
        }, delay);
      } else {
        logger.warn({ tenantId, statusCode }, "Session closed permanently");
        sessions.delete(tenantId);

        // Notify Django via webhook if configured
        notifyDjango(tenantId, "disconnected");
      }
    }

    if (connection === "open") {
      sessionData.connected = true;
      sessionData.qr = null;
      sessionData.reconnectAttempts = 0;

      // Extract phone number from socket
      const user = sock.user;
      sessionData.phone = user?.id?.split(":")[0] || "";
      logger.info(
        { tenantId, phone: sessionData.phone },
        "WhatsApp connected"
      );

      // Notify Django via webhook
      notifyDjango(tenantId, "connected", { phone: sessionData.phone });
    }
  });

  // Persist credentials on update
  sock.ev.on("creds.update", saveCreds);

  // Handle incoming message receipts (delivered, read)
  sock.ev.on("message-receipt.update", (updates) => {
    for (const update of updates) {
      const { key, receipt } = update;
      const messageId = key.id;
      let status = "unknown";

      if (receipt.receiptTimestamp) {
        status = "delivered";
      }
      if (receipt.readTimestamp) {
        status = "read";
      }

      // Forward delivery receipt to Django webhook
      notifyDeliveryStatus(tenantId, messageId, status);
    }
  });

  sessionData.socket = sock;
  sessions.set(tenantId, sessionData);

  return sessionData;
}

/**
 * Get the current status of a tenant's WhatsApp session.
 */
function getSessionStatus(tenantId) {
  const session = sessions.get(tenantId);
  if (!session) {
    return { connected: false, qr: null, phone: "" };
  }
  return {
    connected: session.connected,
    qr: session.qr,
    phone: session.phone,
  };
}

/**
 * Send a message through an active session.
 * Includes composing presence simulation for anti-ban.
 */
async function sendMessage(tenantId, phone, message, mediaUrl) {
  const session = sessions.get(tenantId);
  if (!session || !session.connected) {
    throw new Error("WhatsApp session not connected");
  }

  const jid = `${phone.replace(/[^0-9]/g, "")}@s.whatsapp.net`;

  // Simulate composing presence (anti-ban)
  await session.socket.presenceSubscribe(jid);
  await session.socket.sendPresenceUpdate("composing", jid);

  // Calculate composing duration: message.length * 30ms, capped at 3s
  const composingMs = Math.min(message.length * 30, 3000);
  await sleep(composingMs);

  await session.socket.sendPresenceUpdate("paused", jid);

  // Build message content
  let content;
  if (mediaUrl) {
    content = {
      image: { url: mediaUrl },
      caption: message,
    };
  } else {
    content = { text: message };
  }

  const result = await session.socket.sendMessage(jid, content);
  return result.key.id;
}

/**
 * Disconnect a tenant's WhatsApp session and clean up.
 */
async function disconnectSession(tenantId) {
  const session = sessions.get(tenantId);
  if (session?.socket) {
    await session.socket.logout();
    sessions.delete(tenantId);

    // Clean Redis auth state
    const r = getRedis();
    const keys = await r.keys(`wa:auth:${tenantId}:*`);
    if (keys.length > 0) {
      await r.del(...keys);
    }
  }
}

/**
 * Get count of active sessions.
 */
function getActiveSessionCount() {
  return sessions.size;
}

// --- Internal helpers ---

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Notify Django API about session state changes.
 * Fire-and-forget — does not block the bridge.
 */
async function notifyDjango(tenantId, event, data = {}) {
  const djangoUrl = process.env.DJANGO_WEBHOOK_URL;
  if (!djangoUrl) return;

  try {
    const resp = await fetch(`${djangoUrl}/api/v1/whatsapp/webhook/session/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.API_KEY}`,
      },
      body: JSON.stringify({ tenant_id: tenantId, event, ...data }),
    });
    if (!resp.ok) {
      logger.error(
        { tenantId, event, status: resp.status },
        "Django webhook failed"
      );
    }
  } catch (err) {
    logger.error({ tenantId, event, err: err.message }, "Django webhook error");
  }
}

/**
 * Forward delivery status to Django for CampaignDeliveryLog updates.
 */
async function notifyDeliveryStatus(tenantId, messageId, status) {
  const djangoUrl = process.env.DJANGO_WEBHOOK_URL;
  if (!djangoUrl) return;

  try {
    await fetch(`${djangoUrl}/api/v1/whatsapp/webhook/delivery/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.API_KEY}`,
      },
      body: JSON.stringify({
        tenant_id: tenantId,
        message_id: messageId,
        status,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (err) {
    logger.error(
      { tenantId, messageId, err: err.message },
      "Delivery webhook error"
    );
  }
}

module.exports = {
  startSession,
  getSessionStatus,
  sendMessage,
  disconnectSession,
  getActiveSessionCount,
};
