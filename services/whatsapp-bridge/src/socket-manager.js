/**
 * Loyallia WhatsApp Bridge — Socket Manager
 *
 * Manages Baileys WebSocket connections per WhatsApp session.
 * A tenant may link multiple WhatsApp numbers; each link is a
 * WhatsAppSession identified by its own UUID (sessionId).
 *
 * Auth state persisted to Redis for container restart resilience.
 *
 * SEC: Each session gets an isolated socket keyed by sessionId and an
 * isolated Redis auth prefix. No cross-session or cross-tenant leakage.
 */

const {
  default: makeWASocket,
  DisconnectReason,
  fetchLatestBaileysVersion,
  initAuthCreds,
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const { Boom } = require("@hapi/boom");
const Redis = require("ioredis");
const QRCode = require("qrcode");
const { getApiKey, getRedisUrl } = require("./config");

const logger = pino({ level: process.env.LOG_LEVEL || "info" });

/**
 * UUID v4 (any RFC 4122 variant) used for sessionId / tenantId path params.
 */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(value) {
  return typeof value === "string" && UUID_RE.test(value);
}

// Active sockets keyed by sessionId (WhatsAppSession.id)
const sessions = new Map();

// Redis client for auth state persistence
let redis;

function getRedis() {
  if (!redis) {
    redis = new Redis(getRedisUrl());
  }
  return redis;
}

/**
 * Redis-backed auth state store.
 * Replaces file-based useMultiFileAuthState for container-safe persistence.
 *
 * Key prefix: wa:auth:{tenantId}:{sessionId}:*
 */
async function useRedisAuthState(tenantId, sessionId) {
  const r = getRedis();
  const prefix = `wa:auth:${tenantId}:${sessionId}:`;

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

  const creds = (await readData("creds")) || initAuthCreds();

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
 * Delete all Redis auth keys for a session.
 * Uses SCAN (not KEYS) to avoid blocking Redis.
 */
async function clearRedisAuth(tenantId, sessionId) {
  const r = getRedis();
  const pattern = `wa:auth:${tenantId}:${sessionId}:*`;
  let cursor = "0";
  do {
    const [next, keys] = await r.scan(cursor, "MATCH", pattern, "COUNT", 100);
    cursor = next;
    if (keys.length > 0) {
      await r.del(...keys);
    }
  } while (cursor !== "0");
}

/**
 * Session state container returned by getSessionStatus.
 * @typedef {Object} SessionInfo
 * @property {boolean} connected
 * @property {string|null} qr - Base64 PNG of current QR code
 * @property {string} phone - Connected phone number
 * @property {string} sessionId
 * @property {string} tenantId
 */

/**
 * Start or retrieve a WhatsApp session.
 * Idempotent — calling multiple times returns the same socket.
 *
 * @param {Object} params
 * @param {string} params.sessionId - WhatsAppSession UUID (primary key)
 * @param {string} params.tenantId - Owning tenant UUID
 */
async function startSession({ sessionId, tenantId }) {
  if (!isValidUuid(sessionId)) {
    throw new Error("Invalid sessionId: must be a UUID");
  }
  if (!isValidUuid(tenantId)) {
    throw new Error("Invalid tenantId: must be a UUID");
  }

  if (sessions.has(sessionId)) {
    return sessions.get(sessionId);
  }

  const { state, saveCreds } = await useRedisAuthState(tenantId, sessionId);
  const { version } = await fetchLatestBaileysVersion();

  const sessionData = {
    sessionId,
    tenantId,
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
        logger.info({ sessionId, tenantId }, "New QR code generated");
      } catch (err) {
        logger.error({ sessionId, tenantId, err }, "QR code generation failed");
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
          {
            sessionId,
            tenantId,
            attempt: sessionData.reconnectAttempts,
            delay,
          },
          "Reconnecting..."
        );
        setTimeout(() => {
          sessions.delete(sessionId);
          startSession({ sessionId, tenantId }).catch((err) => {
            logger.error(
              { sessionId, tenantId, err: err.message },
              "Reconnect failed"
            );
          });
        }, delay);
      } else {
        logger.warn({ sessionId, tenantId, statusCode }, "Session closed permanently");
        sessions.delete(sessionId);

        // Notify Django via webhook if configured
        notifyDjango(sessionId, tenantId, "disconnected");
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
        { sessionId, tenantId, phone: sessionData.phone },
        "WhatsApp connected"
      );

      // Notify Django via webhook
      notifyDjango(sessionId, tenantId, "connected", {
        phone: sessionData.phone,
      });
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
      notifyDeliveryStatus(sessionId, tenantId, messageId, status);
    }
  });

  sessionData.socket = sock;
  sessions.set(sessionId, sessionData);

  return sessionData;
}

/**
 * Get the current status of a session.
 */
function getSessionStatus(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) {
    return {
      connected: false,
      qr: null,
      phone: "",
      sessionId: sessionId || null,
      tenantId: null,
    };
  }
  return {
    connected: session.connected,
    qr: session.qr,
    phone: session.phone,
    sessionId: session.sessionId,
    tenantId: session.tenantId,
  };
}

/**
 * Send a message through an active session.
 * Includes composing presence simulation for anti-ban.
 */
async function sendMessage(sessionId, phone, message, mediaUrl) {
  const session = sessions.get(sessionId);
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
 * Disconnect a session and clean up its socket + Redis auth state.
 */
async function disconnectSession(sessionId) {
  const session = sessions.get(sessionId);
  if (session?.socket) {
    try {
      await session.socket.logout();
    } catch (err) {
      logger.warn(
        { sessionId, err: err.message },
        "Logout failed; continuing cleanup"
      );
    }
  }

  sessions.delete(sessionId);

  if (session?.tenantId) {
    await clearRedisAuth(session.tenantId, sessionId);
  } else {
    // Session not in memory — clear any orphaned auth keys for this sessionId.
    const r = getRedis();
    let cursor = "0";
    do {
      const [next, keys] = await r.scan(
        cursor,
        "MATCH",
        `wa:auth:*:${sessionId}:*`,
        "COUNT",
        100
      );
      cursor = next;
      if (keys.length > 0) {
        await r.del(...keys);
      }
    } while (cursor !== "0");
  }
}

/**
 * Get count of active sessions.
 */
function getActiveSessionCount() {
  return sessions.size;
}

/**
 * List metadata of all in-memory sessions (for monitoring).
 */
function listSessions() {
  return Array.from(sessions.values()).map((s) => ({
    sessionId: s.sessionId,
    tenantId: s.tenantId,
    connected: s.connected,
    phone: s.phone,
  }));
}

// --- Internal helpers ---

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Notify Django API about session state changes.
 * Fire-and-forget — does not block the bridge.
 */
async function notifyDjango(sessionId, tenantId, event, data = {}) {
  const djangoUrl = process.env.DJANGO_WEBHOOK_URL;
  if (!djangoUrl) return;

  try {
    const resp = await fetch(`${djangoUrl}/api/v1/whatsapp/webhook/session/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getApiKey()}`,
      },
      body: JSON.stringify({
        tenant_id: tenantId,
        session_id: sessionId,
        event,
        ...data,
      }),
    });
    if (!resp.ok) {
      logger.error(
        { sessionId, tenantId, event, status: resp.status },
        "Django webhook failed"
      );
    }
  } catch (err) {
    logger.error(
      { sessionId, tenantId, event, err: err.message },
      "Django webhook error"
    );
  }
}

/**
 * Forward delivery status to Django for CampaignDeliveryLog updates.
 */
async function notifyDeliveryStatus(sessionId, tenantId, messageId, status) {
  const djangoUrl = process.env.DJANGO_WEBHOOK_URL;
  if (!djangoUrl) return;

  try {
    await fetch(`${djangoUrl}/api/v1/whatsapp/webhook/delivery/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getApiKey()}`,
      },
      body: JSON.stringify({
        tenant_id: tenantId,
        session_id: sessionId,
        message_id: messageId,
        status,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (err) {
    logger.error(
      { sessionId, tenantId, messageId, err: err.message },
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
  listSessions,
  isValidUuid,
};
