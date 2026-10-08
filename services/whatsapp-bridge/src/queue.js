/**
 * Loyallia WhatsApp Bridge — Message Queue
 *
 * BullMQ-based message queue with Gaussian jitter delays for anti-ban.
 * Enforces PER-SESSION rate limits: 8 msg/min, 200 msg/hour.
 *
 * Anti-ban strategy:
 * - Gaussian delay between messages (4-8s average)
 * - Periodic breathing pauses every 25 messages (30-60s), per session
 * - Composing presence simulation (handled by socket-manager)
 *
 * Multi-session isolation:
 * - Rate counters are keyed by sessionId so one session can never
 *   exhaust another session's (or tenant's) quota.
 * - When a session is rate-limited the job is re-queued with a delay
 *   instead of sleeping, so the shared worker stays free for other
 *   sessions.
 */

const { Queue, Worker } = require("bullmq");
const Redis = require("ioredis");
const pino = require("pino");
const { sendMessage } = require("./socket-manager");
const { getApiKey, getRedisUrl } = require("./config");

const logger = pino({ level: process.env.LOG_LEVEL || "info" });

const MAX_MESSAGES_PER_MINUTE = parseInt(
  process.env.MAX_MESSAGES_PER_MINUTE ||
    process.env.WHATSAPP_MAX_PER_MINUTE ||
    "8",
  10
);
const MAX_MESSAGES_PER_HOUR = parseInt(
  process.env.MAX_MESSAGES_PER_HOUR || process.env.WHATSAPP_MAX_PER_HOUR || "200",
  10
);
const AVG_DELAY_MS = parseInt(process.env.AVG_DELAY_MS || "6000", 10);
const PAUSE_EVERY_N = 25;
const PAUSE_MIN_MS = 30000;
const PAUSE_MAX_MS = 60000;
// Cap rate-limit re-queues so a session cannot loop forever when quota
// is never available (e.g. misconfigured limits).
const MAX_RATE_REQUEUES = 60;

// Redis connection for BullMQ
const redisConnection = new Redis(getRedisUrl(), {
  maxRetriesPerRequest: null,
});

// Queue instance
const messageQueue = new Queue("whatsapp-messages", {
  connection: redisConnection,
});

// Per-session breathing-pause counters (in-memory per worker instance)
const sessionBreathCounters = new Map();

function getBreathCounter(sessionId) {
  if (!sessionBreathCounters.has(sessionId)) {
    sessionBreathCounters.set(sessionId, {
      messagesSincePause: 0,
    });
  }
  return sessionBreathCounters.get(sessionId);
}

/**
 * Rate-limit Redis keys. Includes sessionId so counters are strictly
 * per WhatsApp session (multi-session per tenant).
 */
function rateKeys(sessionId) {
  return {
    minuteKey: `whatsapp:rate:${sessionId}:minute`,
    hourKey: `whatsapp:rate:${sessionId}:hour`,
  };
}

/**
 * Get rate-limit counters from Redis (distributed across all worker replicas).
 * Returns counts plus remaining TTLs (seconds) so callers can compute
 * an accurate re-queue delay instead of blocking.
 */
async function getRateCounters(sessionId) {
  const { minuteKey, hourKey } = rateKeys(sessionId);

  const pipeline = redisConnection.pipeline();
  pipeline.get(minuteKey);
  pipeline.ttl(minuteKey);
  pipeline.get(hourKey);
  pipeline.ttl(hourKey);
  const results = await pipeline.exec();

  const minuteCount = parseInt(results?.[0]?.[1] || "0", 10);
  const minuteTtl = Number(results?.[1]?.[1] ?? -1);
  const hourCount = parseInt(results?.[2]?.[1] || "0", 10);
  const hourTtl = Number(results?.[3]?.[1] ?? -1);

  return {
    minuteCount,
    hourCount,
    minuteTtlSeconds: minuteTtl > 0 ? minuteTtl : 60,
    hourTtlSeconds: hourTtl > 0 ? hourTtl : 3600,
  };
}

/**
 * Atomically increment rate counters in Redis with TTL.
 */
async function incrementRateCounters(sessionId) {
  const { minuteKey, hourKey } = rateKeys(sessionId);

  const pipeline = redisConnection.pipeline();
  pipeline.incr(minuteKey);
  pipeline.expire(minuteKey, 60);
  pipeline.incr(hourKey);
  pipeline.expire(hourKey, 3600);
  await pipeline.exec();
}

/**
 * Check whether a session may send right now.
 * Used by both the queue worker and the /send-direct endpoint.
 *
 * @returns {Promise<{allowed: boolean, reason: string|null, retryAfterMs: number}>}
 */
async function checkRateLimit(sessionId) {
  const { minuteCount, hourCount, minuteTtlSeconds, hourTtlSeconds } =
    await getRateCounters(sessionId);

  if (minuteCount >= MAX_MESSAGES_PER_MINUTE) {
    return {
      allowed: false,
      reason: "minute",
      retryAfterMs: minuteTtlSeconds * 1000 + 500,
    };
  }
  if (hourCount >= MAX_MESSAGES_PER_HOUR) {
    return {
      allowed: false,
      reason: "hour",
      retryAfterMs: hourTtlSeconds * 1000 + 500,
    };
  }
  return { allowed: true, reason: null, retryAfterMs: 0 };
}

/**
 * Generate a Gaussian-distributed random delay.
 * Uses the Box-Muller transform.
 *
 * @param {number} mean - Average delay in ms
 * @param {number} stddev - Standard deviation in ms
 * @returns {number} - Delay in ms, clamped to [2000, 15000]
 */
function gaussianDelay(mean = AVG_DELAY_MS, stddev = 2000) {
  let u = 0,
    v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();

  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  const delay = mean + z * stddev;

  // Clamp to reasonable range
  return Math.max(2000, Math.min(15000, Math.round(delay)));
}

/**
 * Re-queue a job with a delay so the shared worker is not blocked.
 *
 * Pattern: enqueue a replacement job with `delay`, then return a
 * `requeued` result so the current job completes normally (avoids
 * fighting the active-job lock that `job.remove()` would hit).
 * The original payload (including metadata and requeue accounting)
 * is preserved; BullMQ attempts are not consumed for rate-limit waits.
 */
async function requeueWithDelay(job, delayMs, reason) {
  const payload = {
    ...job.data,
    rateLimitRequeues: (job.data.rateLimitRequeues || 0) + 1,
    lastRequeueReason: reason,
  };

  await messageQueue.add("send", payload, {
    delay: delayMs,
    removeOnComplete: 100,
    removeOnFail: 200,
    attempts: 2,
    backoff: {
      type: "exponential",
      delay: 10000,
    },
  });
}

/**
 * Enqueue a message for delivery.
 * The queue worker handles rate limiting and jitter internally.
 *
 * @param {Object} params
 * @param {string} params.sessionId
 * @param {string} params.tenantId
 * @param {string} params.phone
 * @param {string} params.message
 * @param {string|null} [params.mediaUrl]
 * @param {Object} [params.metadata]
 */
async function enqueueMessage({
  sessionId,
  tenantId,
  phone,
  message,
  mediaUrl,
  metadata,
}) {
  const job = await messageQueue.add(
    "send",
    {
      sessionId,
      tenantId,
      phone,
      message,
      mediaUrl: mediaUrl || null,
      metadata: metadata || {},
      rateLimitRequeues: 0,
    },
    {
      removeOnComplete: 100,
      removeOnFail: 200,
      attempts: 2,
      backoff: {
        type: "exponential",
        delay: 10000,
      },
    }
  );

  logger.info(
    { sessionId, tenantId, phone, jobId: job.id },
    "Message enqueued"
  );

  return job.id;
}

/**
 * Process messages from the queue with per-session rate limiting.
 *
 * NOTE: no BullMQ global `limiter` is configured. A global limiter would
 * throttle across all tenants/sessions from one shared counter. Rate
 * limits are enforced per sessionId in Redis instead.
 */
function startWorker() {
  const worker = new Worker(
    "whatsapp-messages",
    async (job) => {
      const {
        sessionId,
        tenantId,
        phone,
        message,
        mediaUrl,
        metadata,
        rateLimitRequeues = 0,
      } = job.data;

      // --- Per-session rate limits: re-queue with delay, never sleep ---
      const rate = await checkRateLimit(sessionId);
      if (!rate.allowed) {
        if (rateLimitRequeues >= MAX_RATE_REQUEUES) {
          logger.error(
            { sessionId, tenantId, reason: rate.reason, jobId: job.id },
            "Rate-limit requeue cap reached — failing job"
          );
          await notifySendResult(
            sessionId,
            tenantId,
            metadata,
            null,
            "failed",
            { code: "RATE_LIMITED", message: "Rate limit requeue cap reached" }
          );
          throw new Error("RATE_LIMIT_REQUEUE_CAP");
        }

        logger.info(
          {
            sessionId,
            tenantId,
            reason: rate.reason,
            retryAfterMs: rate.retryAfterMs,
            jobId: job.id,
          },
          "Rate limit — re-queueing with delay"
        );
        await requeueWithDelay(job, rate.retryAfterMs, `rate_${rate.reason}`);
        return { success: false, requeued: true, reason: `rate_${rate.reason}` };
      }

      // --- Per-session breathing pause: re-queue with delay ---
      const breathCounter = getBreathCounter(sessionId);
      if (breathCounter.messagesSincePause >= PAUSE_EVERY_N) {
        breathCounter.messagesSincePause = 0;
        const pauseMs =
          PAUSE_MIN_MS + Math.random() * (PAUSE_MAX_MS - PAUSE_MIN_MS);
        logger.info(
          { sessionId, tenantId, pauseMs, jobId: job.id },
          "Breathing pause — re-queueing with delay"
        );
        await requeueWithDelay(job, pauseMs, "breathing_pause");
        return { success: false, requeued: true, reason: "breathing_pause" };
      }

      // Apply Gaussian jitter delay (short; keeps human-like pacing)
      const delay = gaussianDelay();
      logger.debug({ sessionId, tenantId, phone, delay }, "Applying jitter delay");
      await sleep(delay);

      // Send the message
      try {
        const messageId = await sendMessage(sessionId, phone, message, mediaUrl);

        // Atomically increment distributed counters
        await incrementRateCounters(sessionId);
        breathCounter.messagesSincePause++;

        logger.info(
          { sessionId, tenantId, phone, messageId, jobId: job.id },
          "Message sent"
        );

        // Notify Django of successful send
        await notifySendResult(
          sessionId,
          tenantId,
          metadata,
          messageId,
          "sent",
          null
        );

        return { success: true, messageId };
      } catch (err) {
        logger.error(
          { sessionId, tenantId, phone, error: err.message, jobId: job.id },
          "Message send failed"
        );

        // Categorize the error
        const errorCode = categorizeError(err);
        await notifySendResult(
          sessionId,
          tenantId,
          metadata,
          null,
          "failed",
          { code: errorCode, message: err.message }
        );

        throw err;
      }
    },
    {
      connection: redisConnection,
      // Higher concurrency so one session's jitter does not starve others.
      concurrency: parseInt(process.env.WORKER_CONCURRENCY || "4", 10),
    }
  );

  worker.on("completed", (job) => {
    logger.debug({ jobId: job.id }, "Job completed");
  });

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, error: err.message }, "Job failed");
  });

  logger.info("Message queue worker started");
  return worker;
}

/**
 * Categorize errors into known error codes for analytics.
 */
function categorizeError(err) {
  const msg = (err.message || "").toLowerCase();

  if (msg.includes("not on whatsapp") || msg.includes("not a valid")) {
    return "NUMBER_NOT_FOUND";
  }
  if (msg.includes("blocked") || msg.includes("spam")) {
    return "BLOCKED";
  }
  if (msg.includes("rate") || msg.includes("too many")) {
    return "RATE_LIMITED";
  }
  if (msg.includes("not connected") || msg.includes("connection")) {
    return "DISCONNECTED";
  }
  return "UNKNOWN";
}

/**
 * Notify Django API about message delivery result.
 * Includes both session_id and tenant_id for multi-session correlation.
 */
async function notifySendResult(
  sessionId,
  tenantId,
  metadata,
  messageId,
  status,
  error
) {
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
        delivery_log_id: metadata?.delivery_log_id || null,
        campaign_run_id: metadata?.campaign_run_id || null,
        status,
        error: error ? error.code : null,
        error_message: error ? error.message : null,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (fetchErr) {
    logger.error(
      { sessionId, tenantId, error: fetchErr.message },
      "Failed to notify Django of send result"
    );
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Get queue statistics for monitoring.
 */
async function getQueueStats() {
  const waiting = await messageQueue.getWaitingCount();
  const active = await messageQueue.getActiveCount();
  const completed = await messageQueue.getCompletedCount();
  const failed = await messageQueue.getFailedCount();

  return { waiting, active, completed, failed };
}

module.exports = {
  enqueueMessage,
  startWorker,
  getQueueStats,
  checkRateLimit,
  incrementRateCounters,
};
