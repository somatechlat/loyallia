# Notifications

Multi-channel campaign delivery: email (SMTP/SendGrid), SMS (Twilio), WhatsApp (WhatsApp Business API), and push (APNs/FCM).

## Models

- `Campaign` — marketing campaign definition
- `CampaignRun` — execution instance of a campaign
- `CampaignDeliveryLog` — per-recipient delivery status
- `Notification` — individual notification record
- `WhatsAppSession` — WhatsApp Business connection state

## Channels

- `email_engine/` — SMTP/SendGrid email delivery
- `sms/` — Twilio SMS
- `whatsapp/` — WhatsApp Business API (yowsup bridge)
- `push/` — APNs (Apple) + FCM (Google) push notifications

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/notifications/` | List notifications |
| GET | `/api/v1/notifications/campaigns/` | List campaigns |
| POST | `/api/v1/notifications/campaigns/` | Create campaign |
| GET | `/api/v1/notifications/stats/` | Channel stats |
| GET | `/api/v1/notifications/campaigns/runs/` | Campaign run history |
| GET | `/api/v1/notifications/campaigns/{id}/results/` | Run results |

## Tasks

- `tasks/campaigns.py` — Celery campaign orchestration
- `tasks/email.py` — Bulk email dispatch
- `tasks/push.py` — Push notification batching

## Dependencies

- `apps.tenants` (Tenant, plan limits)
- `apps.customers` (Customer segments)
- Twilio, SendGrid, APNs, FCM, WhatsApp Bridge

## Called By

- Dashboard campaign manager
- Automation engine
