/**
 * Loyallia WhatsApp Bridge — Message Queue
 *
 * BullMQ-based message queue with Gaussian jitter delays for anti-ban.
 * Enforces per-tenant rate limits: 8 msg/min, 200 msg/hour.
 *
 * Anti-ban strategy:
 * - Gaussian delay between messages (4-8s average)
 * - Periodic breathing pauses every 25 messages (30-60s)
 * - Composing presence simulation (handled by socket-manager)
 */

const { Queue, Worker } = require("bullmq");
const Redis = require("ioredis");
const pino = require("pino");
const { sendMessage } = require("./socket-manager");
const { getApiKey, getRedisUrl } = require("./config");

const logger = pino({ level: process.env.LOG_LEVEL || "info" });

const MAX_MESSAGES_PER_MINUTE = parseInt(
  process.env.MAX_MESSAGES_PER_MINUTE || "8",
  10
);
const MAX_MESSAGES_PER_HOUR = parseInt(
  process.env.MAX_MESSAGES_PER_HOUR || "200",
  10
);
const AVG_DELAY_MS = parseInt(process.env.AVG_DELAY_MS || "6000", 10);
const PAUSE_EVERY_N = 25;
const PAUSE_MIN_MS = 30000;
const PAUSE_MAX_MS = 60000;

// Redis connection for BullMQ
const redisConnection = new Redis(
  getRedisUrl(),
  { maxRetriesPerRequest: null }
);

// Queue instance
const messageQueue = new Queue("whatsapp-messages", {
  connection: redisConnection,
});

// Per-tenant counters (in-memory, reset hourly)
const tenantCounters = new Map();

function getCounter(tenantId) {
  if (!tenantCounters.has(tenantId)) {
    tenantCounters.set(tenantId, {
      minuteCount: 0,
      hourCount: 0,
      totalProcessed: 0,
      lastMinuteReset: Date.now(),
      lastHourReset: Date.now(),
    });
  }
  const counter = tenantCounters.get(tenantId);

  // Reset minute counter every 60s
  if (Date.now() - counter.lastMinuteReset > 60000) {
    counter.minuteCount = 0;
    counter.lastMinuteReset = Date.now();
  }

  // Reset hour counter every 3600s
  if (Date.now() - counter.lastHourReset > 3600000) {
    counter.hourCount = 0;
    counter.lastHourReset = Date.now();
  }

  return counter;
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
 * Enqueue a message for delivery.
 * The queue worker handles rate limiting and jitter internally.
 */
async function enqueueMessage(tenantId, phone, message, mediaUrl, metadata) {
  const job = await messageQueue.add(
    "send",
    {
      tenantId,
      phone,
      message,
      mediaUrl: mediaUrl || null,
      metadata: metadata || {},
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
    { tenantId, phone, jobId: job.id },
    "Message enqueued"
  );

  return job.id;
}

/**
 * Process messages from the queue with rate limiting.
 */
function startWorker() {
  const worker = new Worker(
    "whatsapp-messages",
    async (job) => {
      const { tenantId, phone, message, mediaUrl, metadata } = job.data;
      const counter = getCounter(tenantId);

      // Check rate limits
      if (counter.minuteCount >= MAX_MESSAGES_PER_MINUTE) {
        const waitMs = 60000 - (Date.now() - counter.lastMinuteReset);
        logger.info(
          { tenantId, waitMs },
          "Rate limit (per-minute) — waiting"
        );
        await sleep(Math.max(waitMs, 5000));
        counter.minuteCount = 0;
        counter.lastMinuteReset = Date.now();
      }

      if (counter.hourCount >= MAX_MESSAGES_PER_HOUR) {
        logger.warn(
          { tenantId, hourCount: counter.hourCount },
          "Hourly limit reached — pausing until next hour"
        );
        const waitMs = 3600000 - (Date.now() - counter.lastHourReset);
        await sleep(Math.max(waitMs, 60000));
        counter.hourCount = 0;
        counter.lastHourReset = Date.now();
      }

      // Apply Gaussian jitter delay
      const delay = gaussianDelay();
      logger.debug({ tenantId, phone, delay }, "Applying jitter delay");
      await sleep(delay);

      // Periodic breathing pause every N messages
      if (
        counter.totalProcessed > 0 &&
        counter.totalProcessed % PAUSE_EVERY_N === 0
      ) {
        const pauseMs =
          PAUSE_MIN_MS +
          Math.random() * (PAUSE_MAX_MS - PAUSE_MIN_MS);
        logger.info(
          { tenantId, totalProcessed: counter.totalProcessed, pauseMs },
          "Breathing pause"
        );
        await sleep(pauseMs);
      }

      // Send the message
      try {
        const messageId = await sendMessage(tenantId, phone, message, mediaUrl);

        counter.minuteCount++;
        counter.hourCount++;
        counter.totalProcessed++;

        logger.info(
          { tenantId, phone, messageId, jobId: job.id },
          "Message sent"
        );

        // Notify Django of successful send
        await notifySendResult(tenantId, metadata, messageId, "sent", null);

        return { success: true, messageId };
      } catch (err) {
        logger.error(
          { tenantId, phone, error: err.message, jobId: job.id },
          "Message send failed"
        );

        // Categorize the error
        const errorCode = categorizeError(err);
        await notifySendResult(
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
      concurrency: 1, // Process one message at a time per worker
      limiter: {
        max: MAX_MESSAGES_PER_MINUTE,
        duration: 60000,
      },
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
 */
async function notifySendResult(tenantId, metadata, messageId, status, error) {
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
      { tenantId, error: fetchErr.message },
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
};
