---
title: "Wallet Notification Engine Guide"
document_id: "LOYALLIA-GUIDE-NOTIFY-001"
version: "1.0"
status: "draft"
last_updated: "2026-09-30"
author: "Engineering Lead"
owner: "Engineering Lead"
approver: "Product Owner"
classification: "Internal Use"
confidentiality: "Internal — Restricted to Engineering and Product teams"
review_cycle: "Upon each major release, or annually (whichever comes first)"
standard: "ISO/IEC 27001:2022, ISO 9001:2015, ISO/IEC 42010:2011"
parent_document: "N/A"
---

# WALLET NOTIFICATION ENGINE GUIDE
## Loyallia — Dual-Platform Wallet Notifications

**Document ID:** LOYALLIA-GUIDE-NOTIFY-001
**Version:** 1.0
**Status:** draft
**Date:** 2026-09-30
**Last Updated:** 2026-09-30
**Author:** Engineering Lead
**Owner:** Engineering Lead
**Approver:** Product Owner
**Classification:** Internal Use
**Confidentiality:** Internal — Restricted to Engineering and Product teams
**Review Cycle:** Upon each major release, or annually (whichever comes first)
**Standard:** ISO/IEC 27001:2022, ISO 9001:2015, ISO/IEC 42010:2011
**Parent Document:** N/A

---

## DOCUMENT CONTROL

| Field | Details |
|-------|---------|
| **Document ID** | LOYALLIA-GUIDE-NOTIFY-001 |
| **Title** | Wallet Notification Engine Guide |
| **Version** | 1.0 |
| **Date** | 2026-09-30 |
| **Author** | Engineering Lead |
| **Approver** | Product Owner |
| **Owner** | Engineering Lead |
| **Classification** | Internal Use |
| **Confidentiality** | Internal — Restricted to Engineering and Product teams |
| **Review Cycle** | Upon each major release, or annually (whichever comes first) |
| **Status** | draft |
| **Standard** | ISO/IEC 27001:2022, ISO 9001:2015, ISO/IEC 42010:2011 |
| **Parent Document** | N/A |
| **Supersedes** | N/A |
| **Language** | English |
| **Format** | Markdown (.md) |
| **Location** | `docs/03-guides/NOTIFICATION-ENGINE.md` |

### Revision History

| Version | Date | Author | Description of Changes |
|---------|------|--------|------------------------|
| 1.0 | 2026-09-30 | Engineering Lead | First release. Documents notify.py, field_notifications.py, tasks_notify.py, the dual-emitter model, per-program config, Celery routing and verified call sites. |

### Distribution List

| Recipient | Role | Purpose |
|-----------|------|---------|
| Engineering Lead | Author / Owner | Maintains document |
| Product Owner | Approver | Business validation |
| Security Officer | Reviewer | Security requirements validation |
| QA Lead | Reviewer | Quality assurance validation |

### Related Documents

| Document ID | Title | Relationship |
|-------------|-------|-------------|
| LOYALLIA-RULES-001 | Loyallia Agent Rules And Coding Standards | Reference |
| LOYALLIA-AGENTS-001 | Loyallia Agent Instructions | Reference |
| LOYALLIA-GUIDE-APPLEWS-001 | Apple Wallet Web Service Guide | Sibling (Apple update endpoints) |
| LOYALLIA-GUIDE-REDEEMRBAC-001 | Redemption Permissions Guide | Sibling (scanner RBAC) |
| LOYALLIA-DOC-NOTIFICATIONS.MD | Notifications Subsystem Guide | Reference (campaign notifications) |
| LOYALLIA-DOC-ARCHITECTURE.MD | Loyallia Architecture, Sequence & Flowchart Diagrams | Reference |

### Change Control Process

1. All changes to this document MUST be recorded in the Revision History table above.
2. Status transitions: `draft` → `review` → `approved` → `active` → `deprecated` → `archived`.
3. Changes after `approved` status require a new version number and re-approval.
4. Minor corrections (typos, formatting) increment the minor version (e.g., 1.0 → 1.1).
5. Major changes (new requirements, scope changes) increment the major version (e.g., 1.0 → 2.0).
6. Deprecated documents MUST be moved to `docs/09-archive/` with a deprecation notice.
7. All dates in this document use ISO 8601 format (`YYYY-MM-DD`).

---

## 1. Scope

This document covers the wallet notification engine added for installed Apple Wallet and Google Wallet passes.

Source files:

| Path | Role |
|------|------|
| `backend/apps/customers/pass_engine/notify.py` | Event dispatch to both platforms |
| `backend/apps/customers/pass_engine/field_notifications.py` | Field-value diff and per-field Google messages |
| `backend/apps/customers/tasks_notify.py` | Celery tasks: design fan-out, Google fan-out, beat jobs |

This is not the campaign notification system in `backend/apps/notifications/`. Campaigns send WhatsApp and in-app messages. This engine wakes wallet apps and updates installed passes.

## 2. Dual-Emitter Model

Every notification event emits on both platforms. The two platforms have different APIs, so the same event produces two different payloads.

### 2.1 Apple Wallet

Apple PassKit has no free-text push API. `apple_push.py` `send_pass_update_push()` (line 103) sends an empty `{}` APNs background push. That push has one job: wake the Wallet app so it re-fetches the pass through `GET /wallet/apple/v1/passes/{passTypeId}/{serial}`.

The only user-visible iOS notification is PassKit's `changeMessage` on a field whose **value** changed between the old and the new `pass.json`. The `changeMessage` string is written into `pass.json` at build time by `_map_v2_field_to_apple()` in `backend/apps/customers/pass_engine/apple_v2_builders.py` from `field["notifications"]["appleChangeMessage"]`. The notification engine never writes it and never needs a second Apple call beyond the silent push.

### 2.2 Google Wallet

Google has a real notification API. `google_pass.py` `send_push_notification()` (line 261) calls

```
POST https://walletobjects.googleapis.com/walletobjects/v1/{api_endpoint}/{object_id}/addMessage
```

with `header`, `body`, and `messageType: "TEXT_AND_NOTIFY"`. `api_endpoint` is `loyaltyObject`, `offerObject`, or `giftCardObject` depending on the card's Google Wallet type.

### 2.3 Isolation rule

A Google outage must not block an Apple push. `notify_event()` wraps each platform in its own `try/except`. Failures land in the returned `skipped` list and never propagate to the caller.

## 3. Event Catalog

Canonical names in `notify.py`:

| Constant | Value | Default enabled | Program toggle key |
|----------|-------|-----------------|--------------------|
| `EVENT_DESIGN_UPDATED` | `design_updated` | true | none (always on) |
| `EVENT_VALUE_CHANGED` | `value_changed` | true | `onValueChange` |
| `EVENT_REDEEMED` | `redeemed` | true | `onRedeem` |
| `EVENT_ENROLLED` | `enrolled` | false | `onEnroll` |
| `EVENT_SCHEDULED` | `scheduled` | true | none (field-level trigger) |
| `EVENT_BEFORE_EXPIRY` | `before_expiry` | true | none (field-level trigger) |

`VALID_EVENTS` is the tuple of the six values above. Any other event name is rejected with `skipped: [{"platform": "all", "reason": "invalid_event"}]`.

## 4. Per-Program Configuration

Config lives at `card.metadata["wallet_settings"]["notifications"]`:

```json
{
  "onEnroll": {
    "enabled": false,
    "requireConsent": true,
    "apple": true,
    "google": true,
    "message": "<WALLET_NOTIF_ENROLL_BODY template>"
  },
  "onRedeem": {
    "enabled": true,
    "apple": true,
    "google": true,
    "header": "<WALLET_NOTIF_REDEEM_HEADER>",
    "body": "<WALLET_NOTIF_REDEEM_BODY>"
  },
  "onValueChange": {
    "enabled": true
  }
}
```

`get_program_notifications(card)` accepts both camelCase (`onEnroll`) and snake_case (`on_enroll`) keys. The canonical resolved key is always the camelCase form. Safe defaults when the block is absent:

- `onEnroll`: `enabled=false`, `apple=true`, `google=true`
- `onRedeem`: `enabled=true`, `apple=true`, `google=true`
- `onValueChange`: `enabled=true`, `apple=true`, `google=true`

`requireConsent` defaults to `true` on every event. `header`, `body`, and `message` default to empty strings.

## 5. Public API — `pass_engine/notify.py`

### 5.1 `get_program_notifications(card) -> dict`

Returns the resolved config keyed by `onEnroll`, `onRedeem`, `onValueChange`. Each value is `{enabled, apple, google, requireConsent, header, body, message}`.

### 5.2 `apply_message_template(template, pass_obj, extra=None) -> str`

Substitutes `{program}`, `{customer}`, `{value}` and Apple-style `%@` in catalog strings at send time.

- `{program}` → `pass_obj.card.name`
- `{customer}` → `first_name + " " + last_name`
- `{value}` and `%@` → the `value` entry from `extra` (replaced only when non-empty)

### 5.3 `notify_event(pass_obj, *, event, header="", body="", field_keys=(), force=False) -> dict`

Emits one notification for one installed pass on both platforms.

- Apple: calls `apple_push.notify_pass_updated(pass_obj)` (empty APNs push to every registered device).
- Google: calls `google_pass.send_push_notification(pass_obj, header, body)` only when `header` or `body` is non-empty.
- `force=True` bypasses the per-program `enabled` / `apple` / `google` flags.

Return shape: `{"apple_devices": int, "google": dict, "skipped": list[dict], "event": str, "field_keys": list[str]}`.

Skip codes: `invalid_event`, `event_disabled`. Platform failures append `{"platform": "apple"|"google", "error": ..., "event": ...}`.

### 5.4 `notify_card_event(card, *, event, header="", body="", force=False) -> dict`

Fans out to every active pass of a program.

- Apple: `apple_push.notify_card_updated(card)` walks every `ApplePassRegistration` for the card's active passes.
- Google: enqueued on `transaction.on_commit` as `notify_card_google_fanout.delay(card_id, header, body)` so a large installed base cannot block the request thread. Return value reports `{"enqueued": true, "card_id": ...}`.

### 5.5 `resolve_field_notification_settings(card, field_id) -> dict`

Reads `card.metadata["wallet_studio"]["fields"]` and returns the notification config of one WalletStudio V2 field:

```python
{
  "appleChangeMessage": {"enabled": bool, "message": str},
  "googleMessage": {
      "enabled": bool,
      "header": str,
      "body": str,
      "trigger": str,           # "onChange" | "scheduled" | "beforeExpiry"
      "daysBeforeExpiry": int | None,
      "scheduledAt": str | None,
      "durationDays": int | None,
  },
}
```

Both platforms accept a plain string as shorthand. A string becomes `{"enabled": true, ...}` with the string as message or body.

## 6. Field-Level Notifications — `pass_engine/field_notifications.py`

Trigger protocol values: `TRIGGER_ON_CHANGE = "onChange"`, `TRIGGER_SCHEDULED = "scheduled"`, `TRIGGER_BEFORE_EXPIRY = "beforeExpiry"`.

### 6.1 `snapshot_field_values(card, customer_pass) -> dict[str, str]`

Resolves every studio field to its current display value. Used as the "before" half of a change diff. Dynamic fields resolve `dynamicTemplate` (falling back to `value`) through `_resolve_v2_dynamic_value` against `_build_v2_template_context`.

### 6.2 `compute_changed_field_ids(card, customer_pass, previous_values=None) -> dict[str, tuple[str, str]]`

Re-resolves the field values against the current pass state and diffs against `previous_values`. When `previous_values` is `None`, the function reads `customer_pass._notification_field_snapshot` if the caller stashed one there.

Returns `{field_id: (old_value, new_value)}` for fields whose resolved value actually changed. Fields missing from the snapshot are omitted.

### 6.3 `emit_field_change_notifications(pass_obj, changed_field_ids, previous_values) -> dict`

For each changed field id:

1. Re-resolves the new value from current state.
2. Skips when the value did not change (`value_unchanged`).
3. Skips when `googleMessage.enabled` is false (`google_disabled`).
4. Skips when `trigger != "onChange"` (`trigger_mismatch`).
5. Substitutes `%@` and `{value}` in `header` and `body` with the new value.
6. Falls back to `WALLET_NOTIF_VALUE_CHANGED_HEADER` / `WALLET_NOTIF_VALUE_CHANGED_BODY` when both header and body are empty.
7. Calls `notify_event(pass_obj, event="value_changed", header, body, field_keys=(field_id,))`.

Apple needs no extra call here. The silent push already sent by the caller makes PassKit diff old versus new `pass.json` and fire each field's `changeMessage`.

Return shape: `{"emitted": int, "skipped": list[dict], "results": list[dict]}`.

Skip codes: `field_not_found`, `value_unchanged`, `google_disabled`, `trigger_mismatch`.

## 7. Celery Tasks — `tasks_notify.py`

All four tasks route to the `pass_generation` queue (`settings.CELERY_QUEUE_PASS_GENERATION`, default `"pass_generation"`).

| Task name | Bind / retries | Purpose |
|-----------|----------------|---------|
| `apps.customers.tasks_notify.redistribute_card_design` | `max_retries=CELERY_MAX_RETRIES_DEFAULT` (3), delay 30 s | Rebuild and re-push every active pass after a design edit |
| `apps.customers.tasks_notify.notify_card_google_fanout` | `max_retries=CELERY_MAX_RETRIES_DEFAULT` (3), delay 30 s | Google `addMessage` to every active pass of a card |
| `apps.customers.tasks_notify.dispatch_scheduled_field_notifications` | `max_retries=CELERY_MAX_RETRIES_MINIMAL` (1), delay 30 s | Beat job for `trigger == "scheduled"` |
| `apps.customers.tasks_notify.dispatch_expiry_warning_notifications` | `max_retries=CELERY_MAX_RETRIES_MINIMAL` (1), delay 30 s | Beat job for `trigger == "beforeExpiry"` |

`apps/customers/tasks.py` re-exports these four symbols so existing imports keep working.

### 7.1 `redistribute_card_design(card_id)`

1. Loads the `Card` by UUID. Missing card returns `{"success": False, "error": get_message("PROGRAM_NOT_FOUND")}`.
2. Collects every `CustomerPass` with `is_active=True`.
3. Enqueues `trigger_pass_update.delay(pass_id)` in chunks of `settings.WALLET_NOTIFY_CHUNK_SIZE` (default 200) via `transaction.on_commit`.
4. Sends one card-level Apple silent push (`notify_card_updated`).

Returns `{"success": True, "total_passes": int, "enqueued": int, "apple_devices": int}`.

### 7.2 `notify_card_google_fanout(card_id, header, body, chunk_size=None)`

Walks every active pass of the card in chunks (default `WALLET_NOTIFY_CHUNK_SIZE` = 200) and calls `google_pass.send_push_notification`. Each per-pass call is isolated; one failure does not abort the fan-out. Returns `{"success": True, "sent": int, "failed": int, "total": int}`.

### 7.3 `dispatch_scheduled_field_notifications`

Beat job. Scans every active card with non-empty `metadata` for studio fields whose `googleMessage.trigger == "scheduled"`. A field is due when `scheduledAt` is set, is in the past, and has not been sent yet.

Delivery tracking lives per pass in `pass_data["wallet_notification_log"]` under the key `"{event}:{field_id}"`. `_already_sent()` compares the stored ISO timestamp against the window anchor; `_mark_sent()` writes `timezone.now().isoformat()` through `pass_obj.update_pass_data()`.

`notify_event(..., force=True)` is used so the beat job overrides any per-program disable flag.

### 7.4 `dispatch_expiry_warning_notifications`

Beat job. Same field scan for `trigger == "beforeExpiry"`. The window is `[expiry - daysBeforeExpiry, expiry]` where `daysBeforeExpiry` comes from the field config, falling back to `settings.WALLET_NOTIFY_EXPIRY_WARNING_DAYS` (default 3).

Pass expiry is resolved by `_resolve_pass_expiry()` in this order:

1. `pass_obj.membership_expiry`
2. `pass_data["expiry_date"]` / `pass_data["expiration_date"]` / `pass_data["coupon_end_date"]`
3. `card.metadata["coupon_end_date"]` / `["expiry_date"]` / `["expiration_date"]`

One notification per pass per window, keyed by the window start.

## 8. Queue Routing and Beat Schedule

Defined in `backend/loyallia/settings/celery_config.py`.

`CELERY_TASK_ROUTES` entries:

```python
"apps.customers.tasks_notify.redistribute_card_design": {"queue": CELERY_QUEUE_PASS_GENERATION},
"apps.customers.tasks_notify.notify_card_google_fanout": {"queue": CELERY_QUEUE_PASS_GENERATION},
"apps.customers.tasks_notify.dispatch_scheduled_field_notifications": {"queue": CELERY_QUEUE_PASS_GENERATION},
"apps.customers.tasks_notify.dispatch_expiry_warning_notifications": {"queue": CELERY_QUEUE_PASS_GENERATION},
```

`CELERY_BEAT_SCHEDULE` entries:

| Name | Task | Schedule | Queue |
|------|------|----------|-------|
| `wallet-scheduled-field-notifications` | `dispatch_scheduled_field_notifications` | `crontab(minute="*/15")` | `pass_generation` |
| `wallet-expiry-warning-notifications` | `dispatch_expiry_warning_notifications` | `crontab(hour="9", minute="0")` | `pass_generation` |

Relevant settings (`backend/loyallia/settings/constants.py`):

| Setting | Env var | Default |
|---------|---------|---------|
| `WALLET_NOTIFY_CHUNK_SIZE` | `LOYALLIA_WALLET_NOTIFY_CHUNK_SIZE` | 200 |
| `WALLET_NOTIFY_EXPIRY_WARNING_DAYS` | `LOYALLIA_WALLET_NOTIFY_EXPIRY_WARNING_DAYS` | 3 |
| `WALLET_NOTIFY_SCHEDULED_LOOKBACK_DAYS` | `LOYALLIA_WALLET_NOTIFY_SCHEDULED_LOOKBACK_DAYS` | 30 |
| `CELERY_QUEUE_PASS_GENERATION` | `LOYALLIA_CELERY_QUEUE_PASS_GENERATION` | `pass_generation` |

## 9. Call Sites

Verified against the repository on 2026-09-30.

| Call site | Function | Event | Notes |
|-----------|----------|-------|-------|
| `backend/apps/customers/services/__init__.py` `_schedule_enroll_notification` | `notify_event` | `enrolled` | Opt-in. Requires both `onEnroll.enabled` and the submission's `notify_on_enroll` flag. Queued on `transaction.on_commit`. |
| `backend/apps/customers/pass_engine/field_notifications.py` `emit_field_change_notifications` | `notify_event` | `value_changed` | Per-field Google message for `trigger == "onChange"`. |
| `backend/apps/customers/tasks_notify.py` `dispatch_scheduled_field_notifications` | `notify_event` | `scheduled` | Beat job, `force=True`. |
| `backend/apps/customers/tasks_notify.py` `dispatch_expiry_warning_notifications` | `notify_event` | `before_expiry` | Beat job, `force=True`. |
| `backend/apps/cards/services.py` `update_program` | `redistribute_card_design.delay` | `design_updated` | Fan-out fix. `transaction.on_commit` after `card.save()`. |
| `backend/apps/cards/services.py` `publish_program` / `suspend_program` | `redistribute_card_design.delay` | `design_updated` | Via `_enqueue_design_redistribution`. |

### 9.1 Redeem call site — current state

`EVENT_REDEEMED = "redeemed"` exists in `notify.py`, `onRedeem` is a supported program config key, default `enabled=True`, and `backend/tests/test_notification_dispatch.py` covers `notify_event(cp, event="redeemed", header=..., body=...)`.

As of 2026-09-30 there is **no** production call to `notify_event` or `notify_card_event` with `event="redeemed"`. Exhaustive search of `backend/` shows the only importers of `pass_engine.notify` outside the engine itself are `customers/services/__init__.py` (enroll) and `tasks_notify.py` (beat jobs). `backend/apps/transactions/api.py`, `backend/apps/redemption/gateway.py`, and `backend/apps/transactions/service.py` contain no notification call.

Wiring the redeem event into the redemption gateway is outstanding work. Until then `onRedeem` config is read and honoured by the engine when called, but nothing calls it on redeem.

## 10. Message Catalog Keys

Spanish is the default locale. Values from `backend/common/messages/wallet.py`:

| Key | es | en |
|-----|----|----|
| `WALLET_NOTIF_ENROLL_HEADER` | `Bienvenido` | `Welcome` |
| `WALLET_NOTIF_ENROLL_BODY` | `Bienvenido a {program}` | `Welcome to {program}` |
| `WALLET_NOTIF_REDEEM_HEADER` | `Premio canjeado` | `Reward redeemed` |
| `WALLET_NOTIF_REDEEM_BODY` | `¡Disfruta tu premio!` | `Enjoy your reward!` |
| `WALLET_NOTIF_VALUE_CHANGED_HEADER` | `Tarjeta actualizada` | `Card updated` |
| `WALLET_NOTIF_VALUE_CHANGED_BODY` | `Tu tarjeta ha sido actualizada: {value}` | `Your card has been updated: {value}` |
| `WALLET_NOTIF_DESIGN_UPDATED_HEADER` | `Tarjeta actualizada` | `Card updated` |
| `WALLET_NOTIF_DESIGN_UPDATED_BODY` | `El diseño de tu tarjeta fue actualizado.` | `Your card design has been updated.` |

User-facing strings must go through `get_message()`.

## 11. Security Notes

- Per-program notification config is stored on `card.metadata`, which is tenant-scoped. No cross-tenant read path exists in this engine.
- `pass_data["wallet_notification_log"]` stores timestamps only. No PII, tokens, or credentials.
- Google and Apple credentials are loaded by `google_pass.py` and `apple_push.py` through `common.vault.get_secret()`. Nothing in `notify.py`, `field_notifications.py`, or `tasks_notify.py` touches secrets.
- `notify_event` and `notify_card_event` never log tokens, push tokens, or auth headers.

---

## DOCUMENT APPROVAL

| Role | Name | Signature | Date | Decision |
|------|------|-----------|------|----------|
| Engineering Lead | — | — | 2026-09-30 | Approved |
| Product Owner | — | — | — | Pending Review |
| Security Officer | — | — | — | Pending Review |
| QA Lead | — | — | — | Pending Review |

### Document Lifecycle

| State | Date | Actor | Notes |
|-------|------|-------|-------|
| Draft | 2026-09-30 | Engineering Lead | First release covering the wallet notification engine |

### Next Review Date

| Trigger | Date | Notes |
|---------|------|-------|
| Annual review | 2026-12-31 | End of year review cycle |
| Major release | — | Triggered by major platform release |
| Redeem wiring | — | When `notify_event(event="redeemed")` is called from the redemption gateway |
