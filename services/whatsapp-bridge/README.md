# Loyallia WhatsApp Bridge

> **⚠️ Security Notice**  
> This service runs on an internal Docker network only. It must **never** be exposed to the public internet. All endpoints (except `/health`) require API key authentication.

---

## 1. Overview

The **WhatsApp Bridge** is a Node.js sidecar service that provides a REST API wrapper around WhatsApp Web using the [Baileys](https://github.com/WhiskeySockets/Baileys) library. It enables the Loyallia backend (`apps.notifications`) to send WhatsApp campaign messages on behalf of tenants.

### Why it exists

Loyallia is a multi-tenant platform where each business (tenant) can run marketing campaigns across multiple channels. WhatsApp does not offer a public programmatic API for non-official Business accounts that fits our multi-tenant, self-hosted model. The bridge solves this by:

- Letting each tenant link their own WhatsApp number via QR-code pairing.
- Queuing and rate-limiting outbound messages to avoid WhatsApp bans.
- Forwarding delivery receipts (sent, delivered, read) back to the Django backend.

### What it does

| Capability | Description |
|---|---|
| **Session management** | Per-tenant WebSocket sessions to WhatsApp Web, persisted in Redis. |
| **QR pairing** | Generates QR codes so a business owner can link their phone. |
| **Message queue** | BullMQ-based queue with anti-ban jitter, breathing pauses, and rate limits. |
| **Delivery tracking** | Sends webhooks to Django for `sent`, `delivered`, `read`, and `failed` events. |
| **Media support** | Can attach images (via URL) to outgoing messages. |

---

## 2. Architecture

```text
┌─────────────────┐     HTTP (internal)     ┌──────────────────────┐
│  Django Backend │  ─────────────────────► │  WhatsApp Bridge     │
│  (Celery tasks) │                         │  :3001               │
│                 │ ◄─────────────────────  │                      │
│  /webhook/*     │   webhooks (delivery)   │  • Express REST API  │
└─────────────────┘                         │  • BullMQ worker     │
       │                                    │  • Baileys socket    │
       │ Redis                              │                      │
       ▼                                    └──────────┬───────────┘
┌─────────────────┐                                    │  WebSocket
│  Redis          │                                    ▼
│  (auth state +  │                           ┌───────────────┐
│   queue)        │                           │ WhatsApp Web  │
└─────────────────┘                           │ (Multi-device)│
                                              └───────────────┘
```

### Message flow

1. **Enqueue** — Django calls `POST /send` with `tenant_id`, `phone`, `message`, and optional `media_url`/`metadata`.
2. **Rate limit** — The BullMQ worker checks per-tenant Redis counters (messages / minute, / hour).
3. **Jitter** — A Gaussian-distributed delay (default ~6 s) is applied to mimic human behavior.
4. **Breathing pause** — Every 25 messages the worker pauses 30–60 s to reduce ban risk.
5. **Send** — The worker simulates "typing…" presence, then sends the message via Baileys.
6. **Receipt** — Baileys emits `message-receipt.update` events; the bridge forwards them to Django.

### Multi-tenancy isolation

- Each `tenant_id` gets its own `makeWASocket` instance.
- Auth credentials are stored under a Redis prefix `wa:auth:{tenant_id}:*`.
- Sessions are isolated in memory; there is no cross-tenant data leakage.

---

## 3. Prerequisites

| Requirement | Version / Notes |
|---|---|
| **Node.js** | >= 20.0.0 (matches `package.json` engines) |
| **WhatsApp account** | Any phone number with WhatsApp installed (personal or Business). |
| **Redis** | >= 6.0 (used for BullMQ queues, rate-limit counters, and auth state). |
| **Django backend** | Required for webhooks (`DJANGO_WEBHOOK_URL`). |
| **Network** | The bridge must reach `web.whatsapp.com` outbound. |

> **Note:** WhatsApp multi-device must be enabled on the phone. The phone does **not** need to stay online after pairing, but it must be reachable periodically or the session may expire.

---

## 4. Installation

### Local (development)

```bash
cd services/whatsapp-bridge
npm install
npm run dev      # Node.js --watch mode
```

### Docker (production / staging)

```bash
docker build -t loyallia-whatsapp-bridge .
docker run \
  -e PORT=3001 \
  -e API_KEY_FILE=/run/secrets/api_key \
  -e REDIS_PASSWORD_FILE=/run/secrets/redis_password \
  -e DJANGO_WEBHOOK_URL=http://api:8000 \
  -p 127.0.0.1:3001:3001 \
  loyallia-whatsapp-bridge
```

The project root also provides a compose definition:

```bash
docker compose up whatsapp-bridge
```

---

## 5. Configuration

All configuration is via environment variables.

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `3001` | HTTP listen port. |
| `LOG_LEVEL` | No | `info` | Pino log level (`trace`, `debug`, `info`, `warn`, `error`). |
| `API_KEY_FILE` | Yes* | — | Path to a file containing the shared API key. |
| `REDIS_URL_FILE` | No | — | Path to a file with a full Redis URL. |
| `REDIS_PASSWORD_FILE` | No | — | Path to a file with the Redis password. Used to build `redis://:password@redis:6379/3`. |
| `DJANGO_WEBHOOK_URL` | No | — | Base URL of the Django API (e.g. `http://api:8000`). Used for delivery and session webhooks. |
| `MAX_MESSAGES_PER_MINUTE` | No | `8` | Per-tenant rate limit (messages per minute). |
| `MAX_MESSAGES_PER_HOUR` | No | `200` | Per-tenant rate limit (messages per hour). |
| `AVG_DELAY_MS` | No | `6000` | Average Gaussian jitter between sends (ms). |
| `NODE_ENV` | No | — | Set to `development` or `production`. |

*In production the API key must be configured. If missing, the bridge returns `503` on every authenticated endpoint.

### Docker Compose reference

From `docker-compose.yml`:

```yaml
  whatsapp-bridge:
    build:
      context: ./services/whatsapp-bridge
      dockerfile: Dockerfile
    container_name: loyallia-whatsapp-bridge
    environment:
      DJANGO_WEBHOOK_URL: http://api:8000
      REDIS_PASSWORD_FILE: /run/loyallia-vault/redis_password
      API_KEY_FILE: /run/loyallia-vault/whatsapp_bridge_api_key
      MAX_MESSAGES_PER_MINUTE: 8
      MAX_MESSAGES_PER_HOUR: 200
      AVG_DELAY_MS: 6000
      LOG_LEVEL: info
      NODE_ENV: development
    volumes:
      - vault_runtime:/run/loyallia-vault:ro
      - ./services/whatsapp-bridge/src:/app/src   # dev live-reload
    ports:
      - "127.0.0.1:33914:3001"
    depends_on:
      redis:
        condition: service_healthy
```

---

## 6. API Endpoints

Base URL: `http://whatsapp-bridge:3001`

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | None | Health check + queue stats. |
| `GET` | `/qr/:tenantId` | API key | Returns a base64 PNG QR code for pairing. |
| `GET` | `/status/:tenantId` | API key | Connection status (`connected`, `qr`, `phone`). |
| `POST` | `/disconnect/:tenantId` | API key | Logs out and cleans up the session + Redis auth state. |
| `POST` | `/send` | API key | Enqueues a message (recommended). |
| `POST` | `/send-direct` | API key | Sends immediately, bypassing the queue. **Testing only.** |
| `GET` | `/queue/stats` | API key | BullMQ queue statistics. |

### Authentication

```http
Authorization: Bearer <api-key>
# or
X-API-Key: <api-key>
```

### `POST /send`

Request body:

```json
{
  "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
  "phone": "+593991234567",
  "message": "Hello from Loyallia! 🎉",
  "media_url": "https://cdn.example.com/promo.png",
  "metadata": {
    "delivery_log_id": "...",
    "campaign_run_id": "..."
  }
}
```

Response:

```json
{
  "success": true,
  "job_id": "42",
  "queued": true
}
```

### `GET /health`

Response:

```json
{
  "status": "ok",
  "sessions": 3,
  "queue": {
    "waiting": 12,
    "active": 1,
    "completed": 450,
    "failed": 2
  },
  "uptime": 3600.42
}
```

### `GET /status/:tenantId`

Response:

```json
{
  "connected": true,
  "qr": null,
  "phone": "593991234567"
}
```

---

## 7. Usage

### Start the service

```bash
# Local
npm start

# Docker
docker compose up -d whatsapp-bridge
```

### Link a tenant (pairing)

1. Call `GET /qr/{tenant_id}` (or use the Django dashboard).
2. The response contains a base64-encoded PNG QR code (`data:image/png;base64,...`).
3. Open WhatsApp on the phone → **Linked Devices** → **Link a Device** → scan the QR.
4. Poll `GET /status/{tenant_id}` until `connected: true`.

### Send a message

```bash
curl -X POST http://localhost:3001/send \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
    "phone": "+593991234567",
    "message": "Your loyalty reward is ready!"
  }'
```

The message is enqueued; the worker will deliver it respecting rate limits and jitter.

### Disconnect a tenant

```bash
curl -X POST http://localhost:3001/disconnect/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer $API_KEY"
```

This logs the session out of WhatsApp Web **and** deletes the persisted auth state from Redis.

---

## 8. Authentication

### Bridge ↔ WhatsApp

The bridge does **not** use a username or password. Authentication with WhatsApp Web is performed via **QR-code pairing** (same as linking WhatsApp Web on a desktop browser). The resulting auth credentials are:

1. Stored in Redis (`wa:auth:{tenant_id}:*`) so they survive container restarts.
2. Refreshed automatically by Baileys when WhatsApp rotates keys.

### Backend ↔ Bridge

All bridge endpoints (except `/health`) require a shared secret passed in the `Authorization: Bearer <key>` or `X-API-Key` header. The key is read from the file pointed to by `API_KEY_FILE`.

The Django backend (`backend/apps/notifications/whatsapp/client.py`) creates an `httpx` client that injects this header on every request.

---

## 9. Monitoring

### Health checks

The Dockerfile declares a Docker health check:

```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1
```

### Logs

The service uses [Pino](https://github.com/pinojs/pino) structured logging. In Docker, logs are emitted as JSON lines to stdout/stderr.

Key log patterns to watch:

| Level | Message | Meaning |
|---|---|---|
| `info` | `WhatsApp connected` | Session established successfully. |
| `warn` | `Session closed permanently` | Logged out or hit max reconnects. |
| `warn` | `Hourly limit reached — pausing` | Rate limit hit for a tenant. |
| `error` | `QR code generation failed` | Cannot render QR; check dependencies. |
| `error` | `Django webhook error` | Backend unreachable or returned error. |

### Queue metrics

`GET /queue/stats` returns:

- `waiting` — messages waiting to be processed.
- `active` — currently being sent.
- `completed` — successfully sent (since last queue flush).
- `failed` — permanently failed after retries.

### Metrics endpoint

There is no Prometheus endpoint in the bridge itself. For Prometheus metrics, scrape the Django backend or monitor the Docker health check and BullMQ Redis keys (`bull:whatsapp-messages:*`).

---

## 10. Troubleshooting

### QR code does not appear

- Check that the bridge can reach `web.whatsapp.com` outbound (no firewall blocking).
- Ensure Redis is reachable; auth state initialization happens before the socket opens.
- Look for `QR code generation failed` in logs (missing `qrcode` npm package).

### Session keeps disconnecting

- The phone must remain online occasionally. If the phone is off for too long, WhatsApp invalidates the session.
- If `statusCode === DisconnectReason.loggedOut`, the bridge will **not** auto-reconnect. The tenant must scan a new QR code.
- Check for `reconnecting...` logs; after 5 attempts the bridge gives up.

### Messages are not sending

1. Verify the session is connected: `GET /status/{tenant_id}`.
2. Check queue stats: `GET /queue/stats`. A large `waiting` count means the worker is backlogged.
3. Check rate-limit logs: if the tenant hit `MAX_MESSAGES_PER_HOUR`, the worker sleeps for 1 hour.
4. Verify the phone number is in E.164 format (`+593991234567`).

### `401 Unauthorized`

- `API_KEY_FILE` is not set or the file is empty.
- The request header is missing or the key does not match.

### `502 Bad Gateway` from Django

- The bridge container may be down. Check `docker compose ps`.
- The bridge may be starting up; the Docker health check takes ~10 s.

### Redis connection errors

- Confirm `REDIS_PASSWORD_FILE` or `REDIS_URL_FILE` points to a valid secret.
- The default fallback is `redis://localhost:6379/3`, which only works outside Docker.

### Ban / spam warnings from WhatsApp

- Do not increase `MAX_MESSAGES_PER_MINUTE` above `8` or `MAX_MESSAGES_PER_HOUR` above `200`.
- Do not bypass the queue (`/send-direct`) for bulk sends.
- Ensure messages contain personalized content; bulk identical text triggers spam filters.

---

## 11. Related Documentation

| Document | Description |
|---|---|
| [`backend/apps/notifications/README.md`](../../backend/apps/notifications/README.md) | Backend notifications module overview (Campaigns, DeliveryLogs, channels). |
| [`backend/apps/notifications/whatsapp/client.py`](../../backend/apps/notifications/whatsapp/client.py) | Django HTTP client that talks to this bridge. |
| [`backend/apps/notifications/whatsapp/api.py`](../../backend/apps/notifications/whatsapp/api.py) | Django Ninja router for QR/status endpoints and bridge webhooks. |
| [`docker-compose.yml`](../../docker-compose.yml) | Compose service definition, env vars, and network placement. |
| [Baileys Documentation](https://github.com/WhiskeySockets/Baileys) | Official library docs for WhatsApp Web multi-device. |
| [BullMQ Documentation](https://docs.bullmq.io/) | Queue/worker semantics and monitoring. |

---

## Project Structure

```
services/whatsapp-bridge/
├── Dockerfile
├── package.json
├── package-lock.json
└── src/
    ├── index.js           # Express server, REST routes
    ├── queue.js           # BullMQ worker, rate limiting, anti-ban logic
    ├── socket-manager.js  # Baileys socket lifecycle, Redis auth state
    └── config.js          # Env var / secret file helpers
```

---

## License

Proprietary — Loyallia internal service.
