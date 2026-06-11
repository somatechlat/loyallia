# Notifications Subsystem Guide

## 1. Overview

The Notifications subsystem delivers messages to customers and staff across multiple channels: **Push (APNs)**, **Email (Mailjet)**, **SMS (Twilio campaigns)**, **WhatsApp (Baileys bridge)**, **Wallet (Google/Apple push)**, and **In-App**.

It supports two modes:
- **Transactional**: reward earned, reward ready, birthday offer, visit reminder — sent immediately via `NotificationService`.
- **Campaigns**: bulk marketing messages scheduled or sent immediately to customer segments, processed asynchronously by Celery workers.

**Key design principles:**
- Every notification creates an audit row (`Notification` model) for analytics.
- Campaigns are tracked via `CampaignRun` with denormalized counters for fast dashboard queries.
- Delivery logs (`CampaignDeliveryLog`) provide per-recipient audit trails.
- Channel quotas are enforced by `common.plan_enforcement`.

---

## 2. Architecture

### 2.1 Component Diagram

```
┌────────────────────────────────────────────────────────────────────┐
│                           Frontend / Dashboard                      │
└─────────────────────┬───────────────────────────────────────────────┘
                      │
          ┌───────────┴────────────┐
          ▼                        ▼
┌────────────────────┐    ┌─────────────────────┐
│  Notification API  │    │   Campaign API      │
│  (api/inbox.py)    │    │   (api/campaigns.py)│
└─────────┬──────────┘    └──────────┬──────────┘
          │                          │
          ▼                          ▼
┌────────────────────┐    ┌─────────────────────┐
│ NotificationService│    │   Celery Workers    │
│   (service.py)     │    │  (tasks/*.py)       │
└─────────┬──────────┘    └──────────┬──────────┘
          │                          │
    ┌─────┴──────┐            ┌──────┴──────┐
    ▼            ▼            ▼             ▼
┌───────┐   ┌────────┐  ┌─────────┐   ┌──────────┐
│ Push  │   │ Email  │  │ WhatsApp│   │   SMS    │
│ APNs  │   │Mailjet │  │ Baileys │   │  Twilio  │
└───────┘   └────────┘  └─────────┘   └──────────┘
```

### 2.2 Data Flow

**Transactional Notification:**
1. Triggered by redemption engine, automation, or manual API call.
2. `NotificationService.send_reward_notification(customer_pass, ...)` creates a `Notification` row.
3. Channel determined by `NotificationChannel` enum (default `push`).
4. `_send_push_notification()` calls `dispatch_push()` → APNs client.
5. Row marked `is_sent=True` regardless of delivery success (prevents re-dispatch loops).

> **Note on transactional SMS:** The `_send_sms_notification` helper is currently a logged stub and is not wired to Twilio. Only campaign SMS (`send_sms_campaign`) dispatches through Twilio.

**Campaign Flow:**
1. Owner creates campaign via `POST /api/v1/notifications/campaigns/`.
2. `CampaignRun` row created with `status=QUEUED`.
3. Celery task dispatched by channel:
   - `send_email_campaign` (Mailjet SMTP)
   - `send_wallet_notification_campaign` (Google/Apple Wallet push)
   - `send_whatsapp_campaign` (Baileys bridge with Gaussian jitter)
   - `send_sms_campaign` (Twilio with per-message tracking)
4. Workers create `CampaignDeliveryLog` rows and update `CampaignRun` counters.

---

## 3. Key Models

### `apps.notifications.models.Notification`

Core notification record.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | Primary key |
| `tenant` | FK → `Tenant` | Scoped |
| `customer` | FK → `Customer` | Nullable (system notifications) |
| `customer_pass` | FK → `CustomerPass` | Contextual pass reference |
| `notification_type` | CharField | `reward_earned`, `reward_ready`, `birthday`, `reminder`, `special_offer`, `milestone`, `system`, `marketing` |
| `channel` | CharField | `push`, `sms`, `email`, `wallet`, `in_app`, `whatsapp` |
| `title` / `message` | CharField / TextField | |
| `image_url` / `action_url` | URLField | |
| `notification_data` | JSONField | Payload metadata |
| `is_sent` / `is_read` / `is_clicked` | BooleanField | Engagement tracking |
| `sent_at` / `read_at` / `clicked_at` | DateTimeField | Timestamps |

**Table:** `loyallia_notifications`

### `apps.notifications.models.CampaignRun`

Campaign execution tracker.

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | Primary key |
| `tenant` | FK → `Tenant` | |
| `channel` | CharField | Campaign channel |
| `title` / `message_preview` | CharField / TextField | |
| `segment_id` | CharField | `all`, `vip`, `active`, `at_risk`, `inactive`, `new` |
| `status` | CharField | `queued`, `in_progress`, `completed`, `failed`, `paused` |
| `total_recipients` / `sent_count` / `delivered_count` / `failed_count` / `read_count` | IntegerField | Denormalized counters |
| `target_programs` | M2M → `Card` | Optional program filter |
| `target_customers` | M2M → `Customer` | Optional explicit targets |

**Table:** `loyallia_campaign_runs`

### `apps.notifications.models.CampaignDeliveryLog`

Per-recipient delivery audit.

| Field | Type | Notes |
|-------|------|-------|
| `campaign_run` | FK → `CampaignRun` | |
| `customer` | FK → `Customer` | Nullable (SET_NULL for audit) |
| `recipient_phone` / `recipient_email` / `recipient_name` | CharField | Denormalized |
| `status` | CharField | `queued`, `sent`, `delivered`, `read`, `failed`, `bounced` |
| `external_message_id` | CharField | Provider message ID |
| `error_code` / `error_message` | CharField / TextField | Failure details |
| `sent_at` / `delivered_at` / `read_at` / `failed_at` | DateTimeField | State transitions |

**Unique together:** `(campaign_run, customer)`

**Table:** `loyallia_campaign_delivery_logs`

### `apps.notifications.models.WhatsAppSession`

Per-tenant WhatsApp bridge state.

| Field | Type | Notes |
|-------|------|-------|
| `tenant` | OneToOne → `Tenant` | |
| `phone_number` | CharField | Business owner number |
| `is_connected` | BooleanField | Bridge online status |
| `messages_sent_today` | IntegerField | Daily counter |
| `warmup_day` | IntegerField | 0–7 anti-ban warm-up progression |
| `daily_limit_override` | PositiveIntegerField | SuperAdmin override |

**Table:** `loyallia_whatsapp_sessions`

---

## 4. API Overview

All notification endpoints are mounted under `/api/v1/notifications/`.

### Campaign Endpoints

| Endpoint | Method | Auth | Role | Summary |
|----------|--------|------|------|---------|
| `/campaigns/` | GET | jwt | OWNER | List campaigns (last 50) |
| `/campaigns/` | POST | jwt | OWNER | Create/send campaign (email, wallet, WhatsApp, SMS) |

### Inbox Endpoints

| Endpoint | Method | Auth | Summary |
|----------|--------|------|---------|
| `/inbox/` | GET | jwt | Customer notification inbox |
| `/notifications/notifications/{id}/read/` | POST | jwt | Mark as read (double prefix due to router mount) |
| `/notifications/notifications/{id}/click/` | POST | jwt | Mark as clicked (double prefix due to router mount) |
| `/notifications/notifications/{id}/` | DELETE | jwt | Delete notification (double prefix due to router mount) |

### Analytics / Misc

| Endpoint | Method | Auth | Summary |
|----------|--------|------|---------|
| `/stats/` | GET | jwt | Notification stats |
| `/notifications/devices/register/` | POST | jwt | Register push device token (double prefix due to router mount) |

### Pydantic Schemas

- `CampaignCreateIn`: `title`, `message`, `segment_id`, `channel`, `schedule_type`, `scheduled_at`, `wallet_platform`, etc.
- `CampaignOut`: `id`, `title`, `message`, `segment`, `status`, `sent_count`, `created_at`, `channel`
- `PushDeviceSchema`: `device_type`, `device_token`, `fcm_token`, `apns_token`
- `NotificationSchema`: Inbox item shape

---

## 5. Integration Points

| App | Integration | Details |
|-----|-------------|---------|
| `customers` | `Customer` FK on `Notification`; `CustomerPass` for contextual notifications | Birthday pushes require active pass |
| `cards` | `Card` M2M on `CampaignRun` for program-targeted campaigns | `target_program_ids` filtering |
| `tenants` | All notifications scoped by `tenant`; `WhatsAppSession` tracks bridge state | `TenantMiddleware` provides `request.tenant` |
| `billing` | Plan limits enforce channel quotas | `check_plan_limit(tenant, "emails_month", write=True)` before campaign dispatch |
| `redemption` | `NotificationService.send_reward_notification()` exists but is not currently called by redemption strategies | Reward push notifications are not yet wired end-to-end |
| `automation` | Celery tasks scheduled by automation rules | `send_birthday_notifications`, `send_inactive_reminders` |
| `audit` | Campaign creation logged via `log_action()` | `resource_type="campaign"` |

---

## 6. Configuration

### Environment Variables / Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `EMAIL_BACKEND` | `common.email_backend.PlatformSettingEmailBackend` | DB-aware SMTP backend |
| `EMAIL_HOST` | `in-v3.mailjet.com` | SMTP host |
| `EMAIL_PORT` | `587` | SMTP port |
| `EMAIL_USE_TLS` | `True` | TLS enforcement |
| `EMAIL_HOST_USER` | Vault (`mailjet_api_key`) | |
| `EMAIL_HOST_PASSWORD` | Vault (`mailjet_secret_key`) | |
| `DEFAULT_FROM_EMAIL` | `noreply@loyallia.com` | Fallback sender |
| `WHATSAPP_BRIDGE_URL` | `http://whatsapp-bridge:3001` | Baileys service URL |
| `WHATSAPP_BRIDGE_API_KEY` | Vault | Bridge API key |
| `WHATSAPP_MAX_PER_MINUTE` | `8` | Anti-ban rate limit |
| `WHATSAPP_MAX_PER_HOUR` | `200` | Anti-ban rate limit |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_FROM_NUMBER` | Vault | SMS provider |
| `TWILIO_MAX_PER_DAY` | `200` | SMS daily cap |
| `APPLE_APNS_KEY_ID` | `""` | APNs JWT auth |
| `APPLE_APNS_AUTH_KEY_PATH` | `/app/certs/apns_auth_key.p8` | APNs private key |

### Redis / Cache

- Campaign scheduling uses Celery `send_task(..., eta=scheduled_time)`.
- WhatsApp bridge state is not cached in Redis; auth state lives on the bridge container.

---

## 7. Testing

### Test Location

- `backend/tests/test_api.py` — Inbox and campaign endpoint tests
- `backend/tests/test_campaign_accounting.py` — Campaign billing/limit tests
- `backend/tests/test_services.py` — Notification service tests
- `backend/tests/test_plan_enforcement.py` — Channel quota enforcement

### Running Notification Tests

```bash
cd backend
pytest tests/test_api.py -k "notification or campaign" -v
pytest tests/test_campaign_accounting.py -v
pytest tests/test_services.py -v
```

### Key Test Patterns

```python
from apps.notifications.models import Notification, NotificationChannel, NotificationType

class NotificationServiceTest(TestCase):
    def test_send_reward_notification(self):
        notification = NotificationService.send_reward_notification(
            customer_pass=self.customer_pass,
            reward_type="stamp",
            reward_description="Free coffee",
            tenant=self.tenant,
        )
        self.assertEqual(notification.notification_type, NotificationType.REWARD_EARNED)
        self.assertEqual(notification.channel, NotificationChannel.PUSH)
        self.assertTrue(notification.is_sent)
```

### What to Test

| Area | Suggestion |
|------|------------|
| Push dispatch | `dispatch_push()` deactivates device after 5 consecutive failures |
| Campaign limits | `check_plan_limit()` blocks email campaign when `emails_month` exceeded |
| Scheduled campaigns | Celery `send_task(..., eta=...)` dispatched with correct kwargs |
| WhatsApp warm-up | `effective_daily_limit` scales from 20 to plan ceiling over 7 days |
| Delivery logs | `CampaignDeliveryLog` created with correct denormalized fields |
| Inbox ownership | Customer cannot read another customer's notifications (403) |

---

## 8. Troubleshooting

### Issue: Push notifications not delivered
- Check `customer.devices.filter(is_active=True)` — devices deactivated after 5 push failures.
- Verify `APPLE_APNS_AUTH_KEY_PATH` exists and `APPLE_APNS_KEY_ID` is correct.
- APNs tokens may be stale; device re-registration required.
- Android FCM is **not enabled** in this project — only iOS APNs pushes are implemented.

### Issue: Email campaigns not sending
- Verify Mailjet credentials in Vault (`mailjet_api_key`, `mailjet_secret_key`).
- Check `EMAIL_BACKEND` is `PlatformSettingEmailBackend` (reads host/port from DB `PlatformSetting`).
- Check plan limit: `emails_month` may be `0` for the tenant's plan.
- Review Celery worker logs for `send_email_campaign` task failures.

### Issue: WhatsApp campaigns stuck in queued
- Ensure WhatsApp bridge container is running and reachable at `WHATSAPP_BRIDGE_URL`.
- Verify `WhatsAppSession.is_connected` is `True` for the tenant.
- Check `effective_daily_limit` — warm-up progression may cap sends at 20/day.
- Review bridge logs for QR-code re-pairing requirements.

### Issue: SMS not delivered
- Verify Twilio credentials (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`).
- Check `TWILIO_MAX_PER_DAY` cap and plan `sms_day` limit.
- Ensure customer phone numbers are in E.164 format.

### Issue: Campaign returns 403
- Only `OWNER` can create campaigns.
- Plan feature flag may be missing (e.g., `email_campaigns`, `whatsapp_campaigns`).
- Plan limit exceeded — check `/api/v1/billing/usage/`.

### Issue: Wallet push notifications not arriving
- Verify `GOOGLE_WALLET_ENABLED` is `true` in Vault.
- Ensure `google_wallet_issuer_id` is configured.
- Wallet pushes require the pass to be saved in Google Wallet by the customer.
- Apple Wallet push uses APNs — verify same push infrastructure as above.

---

## Reference Files

| File | Purpose |
|------|---------|
| `apps/notifications/service.py` | `NotificationService` — transactional notifications |
| `apps/notifications/api/campaigns.py` | Campaign creation and listing |
| `apps/notifications/api/inbox.py` | Customer notification inbox |
| `apps/notifications/api/base.py` | Shared router and schemas |
| `apps/notifications/models/misc.py` | `Notification`, `WhatsAppSession` |
| `apps/notifications/models/campaigns.py` | `CampaignRun`, `CampaignDeliveryLog` |
| `apps/notifications/models/base.py` | `NotificationChannel`, `NotificationType`, `CampaignStatus`, `DeliveryStatus` |
| `apps/notifications/tasks/campaigns.py` | Celery tasks for email, wallet, WhatsApp campaigns |
| `apps/notifications/tasks/email.py` | `send_email_campaign` |
| `apps/notifications/sms/tasks.py` | `send_sms_campaign` |
| `apps/notifications/push/dispatcher.py` | `dispatch_push()` — APNs routing |
| `apps/notifications/push/apns_client.py` | APNs HTTP/2 client |
| `apps/notifications/email_engine/client.py` | Mailjet SMTP wrapper |
| `common/email_backend.py` | `PlatformSettingEmailBackend` |
| `common/email_config.py` | `get_default_from_email()` |
