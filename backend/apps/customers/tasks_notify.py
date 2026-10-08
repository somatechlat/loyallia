"""
Loyallia Wallet Notification Celery Tasks.

Design redistribution, Google fan-out across installed passes, and the beat
jobs that drive scheduled / before-expiry field notifications.

Kept separate from `apps.customers.tasks` so every module stays under the
architectural line limit. `apps.customers.tasks` re-exports these symbols.

Architecture:
    - redistribute_card_design re-issues trigger_pass_update for every active
      pass of a card after a design edit, and sends one Apple card-level push.
    - notify_card_google_fanout sends Google addMessage to every active pass
      in chunks so a large installed base never blocks a request thread.
    - dispatch_scheduled_field_notifications / dispatch_expiry_warning_notifications
      are Celery beat jobs that read WalletStudio V2 field notification config.

Called by: cards.services (design updates), notify.notify_card_event, Celery beat.
"""

import logging
from datetime import timedelta

from celery import shared_task
from django.conf import settings
from django.db import transaction
from django.utils import timezone

from common.messages import get_message

logger = logging.getLogger(__name__)

# Machine-readable skip codes (not user-facing copy).
SKIP_CARD_NOT_FOUND = "card_not_found"
SKIP_PASS_NO_EXPIRY = "no_expiry"
SKIP_WINDOW = "outside_window"
SKIP_ALREADY_SENT = "already_sent"
SKIP_NOT_DUE = "not_due"


@shared_task(
    bind=True,
    max_retries=settings.CELERY_MAX_RETRIES_DEFAULT,
    default_retry_delay=settings.CELERY_DEFAULT_RETRY_DELAY_SHORT,
    queue=settings.CELERY_QUEUE_PASS_GENERATION,
    name="apps.customers.tasks_notify.redistribute_card_design",
)
def redistribute_card_design(self, card_id: str) -> dict:
    """Rebuild and re-push the pass for every active device of a card.

    Called after a program design edit so installed Apple/Google passes pick up
    the new pass.json / object payload. Enqueues `trigger_pass_update` in
    chunks via `transaction.on_commit` and sends one card-level Apple silent
    push so every registered device re-fetches immediately.

    Args:
        card_id: UUID string of the Card whose design changed.

    Returns:
        {"success": bool, "total_passes": int, "enqueued": int, "apple_devices": int}
    """
    import uuid

    from apps.cards.models import Card
    from apps.customers.models import CustomerPass
    from apps.customers.pass_engine.apple_push import notify_card_updated

    try:
        card = Card.objects.get(id=uuid.UUID(card_id))
    except (Card.DoesNotExist, ValueError):
        logger.error("redistribute_card_design: card %s not found", card_id)
        return {"success": False, "error": get_message("PROGRAM_NOT_FOUND")}

    pass_ids = list(
        CustomerPass.objects.filter(card_id=card.id, is_active=True).values_list(
            "id", flat=True
        )
    )
    total = len(pass_ids)
    enqueued = 0
    chunk_size = settings.WALLET_NOTIFY_CHUNK_SIZE

    try:
        from apps.customers.tasks import trigger_pass_update

        for start in range(0, total, chunk_size):
            chunk = pass_ids[start : start + chunk_size]
            chunk_ids = [str(pid) for pid in chunk]

            def _enqueue_chunk(ids=chunk_ids):
                for pass_id in ids:
                    trigger_pass_update.delay(pass_id)  # type: ignore[reportCallIssue]

            transaction.on_commit(_enqueue_chunk)
            enqueued += len(chunk_ids)
    except Exception as exc:
        logger.error(
            "redistribute_card_design: enqueue failed for card %s: %s", card_id, exc
        )
        return {"success": False, "error": str(exc), "total_passes": total}

    apple_devices = 0
    try:
        apple_devices = notify_card_updated(card)
    except Exception as exc:
        logger.warning(
            "redistribute_card_design: Apple card push failed for %s: %s", card_id, exc
        )

    logger.info(
        "Notified %d/%d devices for card %s",
        apple_devices,
        total,
        card_id,
    )
    return {
        "success": True,
        "total_passes": total,
        "enqueued": enqueued,
        "apple_devices": apple_devices,
    }


@shared_task(
    bind=True,
    max_retries=settings.CELERY_MAX_RETRIES_DEFAULT,
    default_retry_delay=settings.CELERY_DEFAULT_RETRY_DELAY_SHORT,
    queue=settings.CELERY_QUEUE_PASS_GENERATION,
    name="apps.customers.tasks_notify.notify_card_google_fanout",
)
def notify_card_google_fanout(
    self, card_id: str, header: str, body: str, chunk_size: int | None = None
) -> dict:
    """Send a Google addMessage to every active pass of a card.

    Chunks the installed base so one request thread never walks thousands of
    HTTP calls. Each per-pass call is isolated — one failure does not abort
    the rest of the fan-out.
    """
    import uuid

    from apps.customers.models import CustomerPass
    from apps.customers.pass_engine.google_pass import send_push_notification

    try:
        card_uuid = uuid.UUID(card_id)
    except ValueError:
        logger.error("notify_card_google_fanout: invalid card id %s", card_id)
        return {"success": False, "error": get_message("PROGRAM_NOT_FOUND")}

    if not chunk_size:
        chunk_size = settings.WALLET_NOTIFY_CHUNK_SIZE

    pass_ids = list(
        CustomerPass.objects.filter(card_id=card_uuid, is_active=True).values_list(
            "id", flat=True
        )
    )
    sent = 0
    failed = 0

    for start in range(0, len(pass_ids), chunk_size):
        chunk = pass_ids[start : start + chunk_size]
        passes = CustomerPass.objects.filter(id__in=chunk).select_related(
            "customer", "card", "card__tenant"
        )
        for pass_obj in passes:
            try:
                result = send_push_notification(
                    pass_obj, header=header, body=body
                )
                if result.get("success"):
                    sent += 1
                else:
                    failed += 1
            except Exception as exc:
                failed += 1
                logger.warning(
                    "notify_card_google_fanout: pass %s failed: %s", pass_obj.id, exc
                )

    logger.info(
        "Google fan-out for card %s: sent=%d failed=%d total=%d",
        card_id,
        sent,
        failed,
        len(pass_ids),
    )
    return {"success": True, "sent": sent, "failed": failed, "total": len(pass_ids)}


@shared_task(
    bind=True,
    max_retries=settings.CELERY_MAX_RETRIES_MINIMAL,
    default_retry_delay=settings.CELERY_DEFAULT_RETRY_DELAY_SHORT,
    queue=settings.CELERY_QUEUE_PASS_GENERATION,
    name="apps.customers.tasks_notify.dispatch_scheduled_field_notifications",
)
def dispatch_scheduled_field_notifications(self) -> dict:
    """Beat job: emit scheduled field notifications whose `scheduledAt` is due.

    Scans every card's `wallet_studio.fields[].notifications.googleMessage`
    for `trigger == "scheduled"`. A field is due when `scheduledAt` is set, is
    in the past, and has not been sent yet (tracked per pass in
    `pass_data["wallet_notification_log"]`).
    """
    from apps.cards.models import Card
    from apps.customers.models import CustomerPass
    from apps.customers.pass_engine.field_notifications import TRIGGER_SCHEDULED
    from apps.customers.pass_engine.notify import (
        EVENT_SCHEDULED,
        notify_event,
        resolve_field_notification_settings,
    )

    now = timezone.now()
    sent = 0
    skipped = 0

    cards = Card.objects.filter(is_active=True).exclude(metadata={})
    for card in cards.iterator(chunk_size=settings.ITERATOR_CHUNK_SIZE_DEFAULT):
        field_ids = _field_ids_with_trigger(card, TRIGGER_SCHEDULED)
        if not field_ids:
            continue

        for field_id in field_ids:
            cfg = resolve_field_notification_settings(card, field_id)["googleMessage"]
            scheduled_at = _parse_dt(cfg.get("scheduledAt"))
            if scheduled_at is None or scheduled_at > now:
                continue

            header = cfg.get("header", "")
            body = cfg.get("body", "")
            if not header and not body:
                continue

            for pass_obj in CustomerPass.objects.filter(
                card_id=card.id, is_active=True
            ).iterator(chunk_size=settings.ITERATOR_CHUNK_SIZE_DEFAULT):
                if _already_sent(pass_obj, EVENT_SCHEDULED, field_id, scheduled_at):
                    skipped += 1
                    continue
                notify_event(
                    pass_obj,
                    event=EVENT_SCHEDULED,
                    header=header,
                    body=body,
                    field_keys=(field_id,),
                    force=False,
                )
                _mark_sent(pass_obj, EVENT_SCHEDULED, field_id, scheduled_at)
                sent += 1

    logger.info(
        "dispatch_scheduled_field_notifications: sent=%d skipped=%d", sent, skipped
    )
    return {"success": True, "sent": sent, "skipped": skipped}


@shared_task(
    bind=True,
    max_retries=settings.CELERY_MAX_RETRIES_MINIMAL,
    default_retry_delay=settings.CELERY_DEFAULT_RETRY_DELAY_SHORT,
    queue=settings.CELERY_QUEUE_PASS_GENERATION,
    name="apps.customers.tasks_notify.dispatch_expiry_warning_notifications",
)
def dispatch_expiry_warning_notifications(self) -> dict:
    """Beat job: warn holders whose pass expires in `daysBeforeExpiry` days.

    Uses `googleMessage.trigger == "beforeExpiry"` with `daysBeforeExpiry`
    against the pass/card expiry (`membership_expiry`, `pass_data.expiry_date`
    or `metadata.coupon_end_date`). One notification per pass per expiry
    window, tracked in `pass_data["wallet_notification_log"]`.
    """
    from apps.cards.models import Card
    from apps.customers.models import CustomerPass
    from apps.customers.pass_engine.field_notifications import TRIGGER_BEFORE_EXPIRY
    from apps.customers.pass_engine.notify import (
        EVENT_BEFORE_EXPIRY,
        notify_event,
        resolve_field_notification_settings,
    )

    now = timezone.now()
    sent = 0
    skipped = 0

    cards = Card.objects.filter(is_active=True).exclude(metadata={})
    for card in cards.iterator(chunk_size=settings.ITERATOR_CHUNK_SIZE_DEFAULT):
        field_ids = _field_ids_with_trigger(card, TRIGGER_BEFORE_EXPIRY)
        if not field_ids:
            continue

        for field_id in field_ids:
            cfg = resolve_field_notification_settings(card, field_id)["googleMessage"]
            days_before = cfg.get("daysBeforeExpiry") or (
                settings.WALLET_NOTIFY_EXPIRY_WARNING_DAYS
            )
            try:
                days_before = int(days_before)
            except (TypeError, ValueError):
                days_before = settings.WALLET_NOTIFY_EXPIRY_WARNING_DAYS

            header = cfg.get("header", "")
            body = cfg.get("body", "")
            if not header and not body:
                continue

            for pass_obj in CustomerPass.objects.filter(
                card_id=card.id, is_active=True
            ).iterator(chunk_size=settings.ITERATOR_CHUNK_SIZE_DEFAULT):
                expiry = _resolve_pass_expiry(pass_obj, card)
                if expiry is None:
                    skipped += 1
                    continue
                window_start = expiry - timedelta(days=days_before)
                if now < window_start or now > expiry:
                    skipped += 1
                    continue
                if _already_sent(pass_obj, EVENT_BEFORE_EXPIRY, field_id, window_start):
                    skipped += 1
                    continue
                notify_event(
                    pass_obj,
                    event=EVENT_BEFORE_EXPIRY,
                    header=header,
                    body=body,
                    field_keys=(field_id,),
                    force=False,
                )
                _mark_sent(pass_obj, EVENT_BEFORE_EXPIRY, field_id, window_start)
                sent += 1

    logger.info(
        "dispatch_expiry_warning_notifications: sent=%d skipped=%d", sent, skipped
    )
    return {"success": True, "sent": sent, "skipped": skipped}


@shared_task(
    bind=True,
    max_retries=settings.CELERY_MAX_RETRIES_DEFAULT,
    default_retry_delay=settings.CELERY_DEFAULT_RETRY_DELAY_SHORT,
    queue=settings.CELERY_QUEUE_PASS_GENERATION,
    name="apps.customers.tasks_notify.dispatch_redeem_wallet_message",
)
def dispatch_redeem_wallet_message(
    self,
    customer_pass_id: str,
    event: str = "redeemed",
    field_keys: list[str] | None = None,
    extra: dict | None = None,
) -> dict:
    """Send the post-redemption Google addMessage for one pass.

    Runs off the request thread. `include_apple=False` because
    `trigger_pass_update` already owns the single APNs wake for this pass.
    Empty header/body resolves from program `onRedeem` + per-card-type
    catalog via `notify_event` / `resolve_redeem_copy`.
    """
    import uuid

    from apps.customers.models import CustomerPass
    from apps.customers.pass_engine.notify import notify_event

    try:
        pass_obj = CustomerPass.objects.select_related(
            "customer", "card", "card__tenant"
        ).get(id=uuid.UUID(customer_pass_id))
    except (CustomerPass.DoesNotExist, ValueError):
        logger.error(
            "dispatch_redeem_wallet_message: pass %s not found", customer_pass_id
        )
        return {"success": False, "error": get_message("PASS_NOT_FOUND")}

    try:
        outcome = notify_event(
            pass_obj,
            event=event,
            field_keys=tuple(field_keys or ()),
            include_apple=False,
            extra=extra or {},
        )
        return {"success": True, **outcome}
    except Exception as exc:
        logger.error(
            "dispatch_redeem_wallet_message failed for %s: %s",
            customer_pass_id,
            exc,
            exc_info=True,
        )
        return {"success": False, "error": str(exc), "skipped": [{"platform": "google", "error": str(exc)}]}


# ---------------------------------------------------------------------------
# Internal helpers (shared by the beat jobs)
# ---------------------------------------------------------------------------


def _field_ids_with_trigger(card, trigger: str) -> list[str]:
    """Return studio field ids whose googleMessage.trigger matches."""
    from apps.customers.pass_engine.notify import resolve_field_notification_settings

    metadata = card.metadata or {}
    wallet_studio = metadata.get("wallet_studio") or {}
    fields = wallet_studio.get("fields") or []
    matched: list[str] = []
    for field in fields:
        if not isinstance(field, dict):
            continue
        field_id = field.get("id")
        if not field_id:
            continue
        cfg = resolve_field_notification_settings(card, str(field_id))["googleMessage"]
        if cfg.get("enabled") and cfg.get("trigger") == trigger:
            matched.append(str(field_id))
    return matched


def _parse_dt(value):
    """Parse an ISO datetime string; return None when missing/invalid."""
    if not value:
        return None
    if hasattr(value, "isoformat"):
        return value
    from django.utils.dateparse import parse_datetime

    return parse_datetime(str(value))


def _resolve_pass_expiry(pass_obj, card):
    """Best-effort expiry datetime for a pass, or None."""
    from django.utils.dateparse import parse_datetime

    expiry = pass_obj.membership_expiry
    if expiry:
        return expiry

    pass_data = pass_obj.pass_data or {}
    for key in ("expiry_date", "expiration_date", "coupon_end_date"):
        raw = pass_data.get(key)
        if raw:
            parsed = parse_datetime(str(raw))
            if parsed:
                return parsed

    metadata = card.metadata or {}
    for key in ("coupon_end_date", "expiry_date", "expiration_date"):
        raw = metadata.get(key)
        if raw:
            parsed = parse_datetime(str(raw))
            if parsed:
                return parsed
    return None


def _notification_log(pass_obj) -> dict:
    pass_data = pass_obj.pass_data or {}
    log = pass_data.get("wallet_notification_log")
    return dict(log) if isinstance(log, dict) else {}


def _already_sent(pass_obj, event: str, field_id: str, anchor) -> bool:
    """Whether this pass already received this event for this field/window."""
    log = _notification_log(pass_obj)
    key = f"{event}:{field_id}"
    recorded = log.get(key)
    if not recorded:
        return False
    from django.utils.dateparse import parse_datetime

    recorded_dt = parse_datetime(str(recorded))
    if recorded_dt is None:
        return False
    anchor_dt = _parse_dt(anchor)
    if anchor_dt is None:
        return True
    return recorded_dt >= anchor_dt


def _mark_sent(pass_obj, event: str, field_id: str, anchor) -> None:
    """Record that this pass received the event for the given window."""
    log = _notification_log(pass_obj)
    log[f"{event}:{field_id}"] = timezone.now().isoformat()
    try:
        pass_obj.update_pass_data({"wallet_notification_log": log})
    except Exception as exc:
        logger.warning(
            "Failed to record notification log for pass %s: %s", pass_obj.id, exc
        )
