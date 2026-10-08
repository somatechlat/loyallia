"""
Loyallia Unified Wallet Notification Engine.

Apple Wallet has NO direct push-message API. `send_pass_update_push()` sends an
EMPTY `{}` APNs background push whose only job is to wake the device so it
re-fetches the pass via `GET /v1/passes/...`. The only user-visible notification
on iOS is PassKit's `changeMessage` on a field whose **value** changed between
the old and the new `pass.json` (written by `_map_v2_field_to_apple`).

Google Wallet HAS a real notification API: `send_push_notification()` calls
`walletobjects/v1/{object}/addMessage` with `header` + `body` and
`messageType: "TEXT_AND_NOTIFY"`.

Therefore every notification event emits BOTH:
  - Apple silent push (so the diff + changeMessage fires)
  - Google addMessage (real text) when header/body are given

A Google outage must never block an Apple push — each platform is isolated in
its own try/except and failures land in the returned `skipped` list.

Program-level config lives at `card.metadata["wallet_settings"]["notifications"]`:

    {
      "onEnroll":      { "enabled": false, "requireConsent": true,
                         "apple": true, "google": true,
                         "message": "<WALLET_NOTIF_ENROLL_BODY template>" },
      "onRedeem":      { "enabled": true, "apple": true, "google": true,
                         "header": "<WALLET_NOTIF_REDEEM_HEADER>",
                         "body": "<WALLET_NOTIF_REDEEM_BODY>" },
      "onValueChange": { "enabled": true }
    }

Consent policy (requireConsent): redeem is pure transactional — the holder
already earned the reward — so `onRedeem.requireConsent` defaults to **False**.
`onEnroll` / `onValueChange` default to True. When a program sets
`requireConsent: True`, the holder must have granted consent (see
`_has_notification_consent`); otherwise the event is skipped with
`skip_consent_required`. `force=True` bypasses flags AND consent (system jobs).

Apple single-wake policy: `trigger_pass_update` owns the APNs push after the
pass.json rebuild. Callers that already enqueue that task must call
`notify_event(..., include_apple=False)` so the device is not woken twice.

Called by: enrollment services, redemption side effects, field notification
emitter, and the Celery redistribute / scheduled / expiry beat jobs.
"""

import logging

from django.db import transaction

logger = logging.getLogger(__name__)

# Canonical event names accepted by notify_event / notify_card_event.
EVENT_DESIGN_UPDATED = "design_updated"
EVENT_VALUE_CHANGED = "value_changed"
EVENT_REDEEMED = "redeemed"
EVENT_ENROLLED = "enrolled"
EVENT_SCHEDULED = "scheduled"
EVENT_BEFORE_EXPIRY = "before_expiry"

VALID_EVENTS = (
    EVENT_DESIGN_UPDATED,
    EVENT_VALUE_CHANGED,
    EVENT_REDEEMED,
    EVENT_ENROLLED,
    EVENT_SCHEDULED,
    EVENT_BEFORE_EXPIRY,
)

# Program-level notification config keys per event (camelCase and snake_case).
# Canonical resolved key is the first entry (onEnroll / onRedeem / onValueChange).
_EVENT_SETTING_KEYS: dict[str, tuple[str, ...]] = {
    EVENT_ENROLLED: ("onEnroll", "on_enroll"),
    EVENT_REDEEMED: ("onRedeem", "on_redeem"),
    EVENT_VALUE_CHANGED: ("onValueChange", "on_value_change"),
}

# Canonical resolved config key per event, as returned by get_program_notifications.
_EVENT_CANONICAL_KEY: dict[str, str] = {
    event: keys[0] for event, keys in _EVENT_SETTING_KEYS.items()
}

# Per-event default for requireConsent. Redeem and value-change after a
# transaction are pure transactional (the holder just earned/redeemed), so they
# do NOT require marketing consent by default. Enroll is promotional and does.
_EVENT_REQUIRE_CONSENT_DEFAULT: dict[str, bool] = {
    EVENT_ENROLLED: True,
    EVENT_REDEEMED: False,
    EVENT_VALUE_CHANGED: False,
    EVENT_DESIGN_UPDATED: False,
    EVENT_SCHEDULED: False,
    EVENT_BEFORE_EXPIRY: False,
}

# Safe defaults when the program has no wallet_settings.notifications block.
_DEFAULT_EVENT_SETTINGS: dict[str, dict] = {
    EVENT_ENROLLED: {"enabled": False, "apple": True, "google": True},
    EVENT_REDEEMED: {"enabled": True, "apple": True, "google": True},
    EVENT_VALUE_CHANGED: {"enabled": True, "apple": True, "google": True},
    # Design refreshes and field-scheduled triggers have no program toggle.
    EVENT_DESIGN_UPDATED: {"enabled": True, "apple": True, "google": True},
    EVENT_SCHEDULED: {"enabled": True, "apple": True, "google": True},
    EVENT_BEFORE_EXPIRY: {"enabled": True, "apple": True, "google": True},
}

# Machine-readable skip codes (not user-facing copy).
SKIP_INVALID_EVENT = "invalid_event"
SKIP_EVENT_DISABLED = "event_disabled"
SKIP_CONSENT_REQUIRED = "skip_consent_required"

# Card type → per-type redeem catalog suffix (WALLET_NOTIF_REDEEM_<SUFFIX>_*).
_REDEEM_CATALOG_SUFFIX: dict[str, str] = {
    "stamp": "STAMP",
    "cashback": "CASHBACK",
    "coupon": "COUPON",
    "gift_certificate": "GIFT",
    "multipass": "MULTIPASS",
    "referral_pass": "REFERRAL",
    "discount": "DISCOUNT",
    "vip_membership": "MEMBERSHIP",
    "corporate_discount": "CORPORATE",
    "affiliate": "AFFILIATE",
}


def get_program_notifications(card) -> dict:
    """Return the program-level wallet notification config with safe defaults.

    Reads `card.metadata["wallet_settings"]["notifications"]`. Both camelCase
    (`onEnroll`) and snake_case (`on_enroll`) keys are accepted. Unknown events
    fall back to enabled-on-both-platforms so callers never crash on config.

    Args:
        card: Card instance whose metadata holds the wallet settings.

    Returns:
        Dict keyed by canonical config name (`onEnroll`, `onRedeem`,
        `onValueChange`) with `{enabled, apple, google, requireConsent,
        header, body, message}` values.
    """
    metadata = card.metadata or {}
    wallet_settings = metadata.get("wallet_settings") or {}
    raw = wallet_settings.get("notifications") or {}

    resolved: dict[str, dict] = {}
    for event, keys in _EVENT_SETTING_KEYS.items():
        cfg: dict = {}
        for key in keys:
            candidate = raw.get(key)
            if isinstance(candidate, dict):
                cfg = candidate
                break
        defaults = _DEFAULT_EVENT_SETTINGS[event]
        resolved[_EVENT_CANONICAL_KEY[event]] = {
            "enabled": bool(cfg.get("enabled", defaults["enabled"])),
            "apple": bool(cfg.get("apple", defaults["apple"])),
            "google": bool(cfg.get("google", defaults["google"])),
            "requireConsent": bool(
                cfg.get("requireConsent", _EVENT_REQUIRE_CONSENT_DEFAULT[event])
            ),
            "header": cfg.get("header", ""),
            "body": cfg.get("body", ""),
            "message": cfg.get("message", ""),
        }
    return resolved


def _resolve_event_settings(program_settings: dict, event: str) -> dict:
    """Map an event name onto its per-platform enable flags."""
    canonical = _EVENT_CANONICAL_KEY.get(event)
    if canonical and canonical in program_settings:
        return program_settings[canonical]
    return dict(
        _DEFAULT_EVENT_SETTINGS.get(
            event, {"enabled": True, "apple": True, "google": True}
        )
    )


def apply_message_template(template: str, pass_obj, extra: dict | None = None) -> str:
    """Substitute `{program}`, `{customer}`, `{value}`, `{amount}` and `%@`.

    Placeholders live in the message catalog strings; this only resolves them
    against the pass context at send time. `extra` may carry redemption values
    such as `value`, `amount`, `balance`, `remaining_uses` and `reward`.
    """
    if not template:
        return ""
    card = pass_obj.card
    customer = pass_obj.customer
    values = {
        "program": card.name or "",
        "customer": f"{customer.first_name} {customer.last_name}".strip(),
        "value": "",
        "amount": "",
    }
    if extra:
        values.update(extra)
    result = template
    for key, val in values.items():
        result = result.replace("{" + key + "}", str(val))
    if values.get("value"):
        result = result.replace("%@", str(values["value"]))
    return result


def _has_notification_consent(pass_obj) -> bool:
    """Whether the holder consented to wallet notifications.

    Consent sources (first match wins):
      1. `CustomerPass.notification_consent` model field, if present.
      2. `pass_data["notification_consent"]` set at enrollment opt-in.

    Absent consent is treated as NOT granted. Pure-transactional events
    (onRedeem) default `requireConsent=False`, so redeem copy still goes out
    without an explicit opt-in.
    """
    explicit = getattr(pass_obj, "notification_consent", None)
    if explicit is not None:
        return bool(explicit)
    return bool((pass_obj.pass_data or {}).get("notification_consent", False))


def resolve_redeem_copy(pass_obj, extra: dict | None = None) -> tuple[str, str]:
    """Resolve Google header/body for a redeem event.

    Resolution order:
      1. Program `onRedeem.header` / `onRedeem.message` | `onRedeem.body`.
      2. Per-card-type catalog keys (`WALLET_NOTIF_REDEEM_<TYPE>_HEADER/BODY`).
      3. Generic catalog keys (`WALLET_NOTIF_REDEEM_HEADER/BODY`).

    Templates are then run through `apply_message_template` with
    `{program}/{customer}/{value}/{amount}` from the redemption result.
    """
    from common.messages import get_message

    settings_cfg = get_program_notifications(pass_obj.card).get("onRedeem", {})
    suffix = _REDEEM_CATALOG_SUFFIX.get(pass_obj.card.card_type, "")

    header_tpl = settings_cfg.get("header") or ""
    if not header_tpl and suffix:
        header_tpl = get_message(f"WALLET_NOTIF_REDEEM_{suffix}_HEADER")
    if not header_tpl:
        header_tpl = get_message("WALLET_NOTIF_REDEEM_HEADER")

    body_tpl = (
        settings_cfg.get("message")
        or settings_cfg.get("body")
        or ""
    )
    if not body_tpl and suffix:
        body_tpl = get_message(f"WALLET_NOTIF_REDEEM_{suffix}_BODY")
    if not body_tpl:
        body_tpl = get_message("WALLET_NOTIF_REDEEM_BODY")

    header = apply_message_template(header_tpl, pass_obj, extra)
    body = apply_message_template(body_tpl, pass_obj, extra)
    return header, body


def notify_event(
    pass_obj,
    *,
    event: str,
    header: str = "",
    body: str = "",
    field_keys: tuple[str, ...] = (),
    force: bool = False,
    include_apple: bool = True,
    extra: dict | None = None,
) -> dict:
    """Emit a wallet notification for one installed pass on BOTH platforms.

    Apple: empty APNs background push via `notify_pass_updated` so the device
    re-fetches the pass and PassKit fires each changed field's `changeMessage`.
    Skipped when `include_apple=False` (caller already owns the single wake,
    e.g. `trigger_pass_update` after a pass.json rebuild).
    Google: `send_push_notification` addMessage with header/body. When event is
    `redeemed` and both texts are empty, copy is resolved from the program
    `onRedeem` config + per-card-type catalog via `resolve_redeem_copy` and
    templated with `extra` (`{program}/{customer}/{value}/{amount}`).

    Consent: if the event config sets `requireConsent` and the holder has not
    granted consent, the event is skipped with `skip_consent_required`.
    `force=True` bypasses enabled flags AND consent (system beat jobs).

    Per-platform exceptions are captured in `skipped` and never propagate.

    Args:
        pass_obj: CustomerPass instance whose wallet contents should refresh.
        event: One of VALID_EVENTS.
        header: Google addMessage header (auto-resolved for redeem when empty).
        body: Google addMessage body (auto-resolved for redeem when empty).
        field_keys: Studio / mutation field ids involved (observability).
        force: Bypass per-program enabled/apple/google flags and consent.
        include_apple: Send the Apple wake. Set False when `trigger_pass_update`
            already owns APNs for this pass.
        extra: Template variables from RedemptionResult (value/amount/...).

    Returns:
        {"apple_devices": int, "google": dict, "skipped": list[dict]}
    """
    if event not in VALID_EVENTS:
        return {
            "apple_devices": 0,
            "google": {},
            "skipped": [{"platform": "all", "reason": SKIP_INVALID_EVENT, "event": event}],
        }

    program_settings = get_program_notifications(pass_obj.card)
    event_settings = _resolve_event_settings(program_settings, event)

    if not force and not event_settings.get("enabled", True):
        return {
            "apple_devices": 0,
            "google": {},
            "skipped": [
                {
                    "platform": "all",
                    "reason": SKIP_EVENT_DISABLED,
                    "event": event,
                    "field_keys": list(field_keys),
                }
            ],
        }

    if (
        not force
        and event_settings.get("requireConsent", False)
        and not _has_notification_consent(pass_obj)
    ):
        return {
            "apple_devices": 0,
            "google": {},
            "skipped": [
                {
                    "platform": "all",
                    "reason": SKIP_CONSENT_REQUIRED,
                    "event": event,
                    "field_keys": list(field_keys),
                }
            ],
        }

    # Redeem with no explicit copy: resolve program config + catalog fallback.
    if event == EVENT_REDEEMED and not header and not body:
        header, body = resolve_redeem_copy(pass_obj, extra)
    elif event == EVENT_VALUE_CHANGED and not header and not body:
        from common.messages import get_message

        value = (extra or {}).get("value", "")
        header = apply_message_template(
            get_message("WALLET_NOTIF_VALUE_CHANGED_HEADER"), pass_obj, extra
        )
        body = apply_message_template(
            get_message("WALLET_NOTIF_VALUE_CHANGED_BODY"), pass_obj, extra
        )
        if not value and body:
            body = body.rstrip(": ").strip() or body

    apple_enabled = force or event_settings.get("apple", True)
    google_enabled = force or event_settings.get("google", True)
    if not include_apple:
        apple_enabled = False

    apple_devices = 0
    google_result: dict = {}
    skipped: list[dict] = []

    # --- Apple: silent APNs background push (device re-fetches pass.json) ---
    if apple_enabled:
        try:
            from apps.customers.pass_engine.apple_push import notify_pass_updated

            apple_devices = notify_pass_updated(pass_obj)
        except Exception as exc:
            logger.warning(
                "notify_event apple failed for pass %s event %s: %s",
                pass_obj.id,
                event,
                exc,
            )
            skipped.append({"platform": "apple", "error": str(exc), "event": event})

    # --- Google: real addMessage push (requires header/body) ---
    if google_enabled and (header or body):
        try:
            from apps.customers.pass_engine.google_pass import send_push_notification

            google_result = send_push_notification(
                pass_obj, header=header, body=body
            )
            if not google_result.get("success"):
                skipped.append(
                    {
                        "platform": "google",
                        "error": google_result.get("error", "unknown"),
                        "event": event,
                    }
                )
        except Exception as exc:
            logger.warning(
                "notify_event google failed for pass %s event %s: %s",
                pass_obj.id,
                event,
                exc,
            )
            skipped.append({"platform": "google", "error": str(exc), "event": event})

    return {
        "apple_devices": apple_devices,
        "google": google_result,
        "skipped": skipped,
        "event": event,
        "field_keys": list(field_keys),
    }


def notify_card_event(
    card, *, event: str, header: str = "", body: str = "", force: bool = False
) -> dict:
    """Fan out a notification to every active pass of a card.

    Apple: `notify_card_updated` walks every ApplePassRegistration for the
    card's active passes and sends the empty APNs push.
    Google: enqueued in chunks via `notify_card_google_fanout` on commit so a
    large installed base cannot block the request thread. Per-pass consent is
    enforced inside that fan-out when the event config sets `requireConsent`.

    Consent: a card-level fan-out has no single holder to check. When the event
    config sets `requireConsent` and `force` is False, the whole event is
    skipped with `skip_consent_required` — bulk promotional sends must opt in
    explicitly via `force` or per-pass consent in the fan-out task.

    Args:
        card: Card / program instance.
        event: One of VALID_EVENTS.
        header: Google addMessage header for each pass.
        body: Google addMessage body for each pass.
        force: Bypass per-program enabled/apple/google flags and consent.

    Returns:
        {"apple_devices": int, "google": dict, "skipped": list[dict]}
    """
    if event not in VALID_EVENTS:
        return {
            "apple_devices": 0,
            "google": {},
            "skipped": [{"platform": "all", "reason": SKIP_INVALID_EVENT, "event": event}],
        }

    program_settings = get_program_notifications(card)
    event_settings = _resolve_event_settings(program_settings, event)

    if not force and not event_settings.get("enabled", True):
        return {
            "apple_devices": 0,
            "google": {},
            "skipped": [{"platform": "all", "reason": SKIP_EVENT_DISABLED, "event": event}],
        }

    if not force and event_settings.get("requireConsent", False):
        return {
            "apple_devices": 0,
            "google": {},
            "skipped": [
                {
                    "platform": "all",
                    "reason": SKIP_CONSENT_REQUIRED,
                    "event": event,
                }
            ],
        }

    apple_enabled = force or event_settings.get("apple", True)
    google_enabled = force or event_settings.get("google", True)

    apple_devices = 0
    google_result: dict = {}
    skipped: list[dict] = []

    if apple_enabled:
        try:
            from apps.customers.pass_engine.apple_push import notify_card_updated

            apple_devices = notify_card_updated(card)
        except Exception as exc:
            logger.warning(
                "notify_card_event apple failed for card %s event %s: %s",
                card.id,
                event,
                exc,
            )
            skipped.append({"platform": "apple", "error": str(exc), "event": event})

    if google_enabled and (header or body):
        try:
            from apps.customers.tasks_notify import notify_card_google_fanout

            card_id = str(card.id)
            transaction.on_commit(
                lambda: notify_card_google_fanout.delay(  # type: ignore[reportCallIssue]
                    card_id, header, body
                )
            )
            google_result = {"enqueued": True, "card_id": card_id}
        except Exception as exc:
            logger.warning(
                "notify_card_event google enqueue failed for card %s: %s", card.id, exc
            )
            skipped.append({"platform": "google", "error": str(exc), "event": event})

    return {
        "apple_devices": apple_devices,
        "google": google_result,
        "skipped": skipped,
        "event": event,
    }


def resolve_field_notification_settings(card, field_id: str) -> dict:
    """Return the notification config of one WalletStudio V2 field.

    Reads `card.metadata["wallet_studio"]["fields"]` entries. The Apple
    `changeMessage` is already written into pass.json by
    `_map_v2_field_to_apple` from `notifications.appleChangeMessage`; this
    helper exposes both platform configs to the field notification emitter.

    Args:
        card: Card whose wallet_studio metadata holds the field list.
        field_id: UnifiedField id.

    Returns:
        {"appleChangeMessage": dict|str|None, "googleMessage": dict|str|None}
        with normalized dicts: `{enabled, message}` for Apple and
        `{enabled, header, body, trigger, daysBeforeExpiry, scheduledAt}`
        for Google.
    """
    metadata = card.metadata or {}
    wallet_studio = metadata.get("wallet_studio") or {}
    fields = wallet_studio.get("fields") or []

    raw_notifications: dict = {}
    for field in fields:
        if isinstance(field, dict) and field.get("id") == field_id:
            raw_notifications = field.get("notifications") or {}
            break

    apple_raw = raw_notifications.get("appleChangeMessage")
    if isinstance(apple_raw, str):
        apple_cfg = {"enabled": bool(apple_raw), "message": apple_raw}
    elif isinstance(apple_raw, dict):
        apple_cfg = {
            "enabled": bool(apple_raw.get("enabled", False)),
            "message": apple_raw.get("message", ""),
        }
    else:
        apple_cfg = {"enabled": False, "message": ""}

    google_raw = raw_notifications.get("googleMessage")
    if isinstance(google_raw, str):
        google_cfg = {
            "enabled": bool(google_raw),
            "header": "",
            "body": google_raw,
            "trigger": "onChange",
        }
    elif isinstance(google_raw, dict):
        google_cfg = {
            "enabled": bool(google_raw.get("enabled", False)),
            "header": google_raw.get("header", ""),
            "body": google_raw.get("body", ""),
            "trigger": google_raw.get("trigger", "onChange") or "onChange",
            "daysBeforeExpiry": google_raw.get("daysBeforeExpiry"),
            "scheduledAt": google_raw.get("scheduledAt") or google_raw.get("scheduled_at"),
            "durationDays": google_raw.get("durationDays"),
        }
    else:
        google_cfg = {
            "enabled": False,
            "header": "",
            "body": "",
            "trigger": "onChange",
        }

    return {"appleChangeMessage": apple_cfg, "googleMessage": google_cfg}
