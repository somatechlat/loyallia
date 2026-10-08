"""Mailjet webhook event processing for email campaign delivery tracking."""

import logging
from typing import Any

from django.utils import timezone

from apps.notifications.models import CampaignDeliveryLog, CampaignRun, DeliveryStatus

logger = logging.getLogger(__name__)

# Lifecycle ranking so late/out-of-order webhook events never downgrade a log.
_STATUS_RANK = {
    DeliveryStatus.QUEUED: 0,
    DeliveryStatus.SENT: 1,
    DeliveryStatus.DELIVERED: 2,
    DeliveryStatus.READ: 3,
    DeliveryStatus.FAILED: 4,
    DeliveryStatus.BOUNCED: 4,
}


def _update_campaign_run_counters(campaign_run: CampaignRun) -> None:
    """Recalculate aggregate counters from delivery logs.

    Called after webhook events update individual logs.
    """
    logs = CampaignDeliveryLog.objects.filter(campaign_run=campaign_run)
    campaign_run.delivered_count = logs.filter(
        status__in=(DeliveryStatus.DELIVERED, DeliveryStatus.READ)
    ).count()
    campaign_run.read_count = logs.filter(status=DeliveryStatus.READ).count()
    campaign_run.failed_count = logs.filter(
        status__in=(DeliveryStatus.FAILED, DeliveryStatus.BOUNCED)
    ).count()
    campaign_run.save(
        update_fields=["delivered_count", "read_count", "failed_count", "updated_at"]
    )


def _candidate_message_ids(event: dict[str, Any]) -> list[str]:
    """Extract every provider identifier that may map to external_message_id.

    Mailjet sends different identifiers depending on event type:
    - CustomID: value of the X-MJCUSTOMID header we set at send time.
    - Message_GUID: the Message-ID header (usually without angle brackets).
    - MessageID: Mailjet's internal numeric id (fallback only).
    """
    candidates: list[str] = []

    custom_id = event.get("CustomID") or event.get("custom_id") or ""
    if custom_id:
        candidates.append(str(custom_id).strip().strip("<>"))

    message_guid = event.get("Message_GUID") or event.get("MessageIDHeader") or ""
    if message_guid:
        stripped = str(message_guid).strip().strip("<>")
        candidates.append(stripped)
        if "@" in stripped:
            candidates.append(stripped.split("@", 1)[0])

    mailjet_id = event.get("MessageID") or ""
    if mailjet_id:
        candidates.append(str(mailjet_id).strip())

    # Preserve order while removing duplicates.
    seen: set[str] = set()
    ordered: list[str] = []
    for item in candidates:
        if item and item not in seen:
            seen.add(item)
            ordered.append(item)
    return ordered


def _resolve_delivery_log(event: dict[str, Any]) -> CampaignDeliveryLog | None:
    """Find the CampaignDeliveryLog for a Mailjet event via any known id."""
    for candidate in _candidate_message_ids(event):
        log = (
            CampaignDeliveryLog.objects.filter(external_message_id=candidate)
            .select_related("campaign_run")
            .first()
        )
        if log:
            return log
    return None


def _apply_event(log: CampaignDeliveryLog, event_type: str, event: dict[str, Any]) -> bool:
    """Apply a single Mailjet event to a delivery log. Returns True if changed.

    Event → DeliveryStatus mapping:
      sent      → SENT      (+ sent_at)
      delivered → DELIVERED (+ delivered_at)
      open      → READ      (+ read_at)
      click     → READ      (+ read_at, implies open)
      bounce/*  → BOUNCED   (+ failed_at)
    """
    now = timezone.now()
    updated_fields: list[str] = []

    if event_type == "sent":
        if _STATUS_RANK.get(log.status, 0) <= _STATUS_RANK[DeliveryStatus.SENT]:
            log.status = DeliveryStatus.SENT
            updated_fields.append("status")
        if not log.sent_at:
            log.sent_at = now
            updated_fields.append("sent_at")

    elif event_type == "delivered":
        if _STATUS_RANK.get(log.status, 0) <= _STATUS_RANK[DeliveryStatus.DELIVERED]:
            log.status = DeliveryStatus.DELIVERED
            updated_fields.append("status")
        if not log.sent_at:
            log.sent_at = now
            updated_fields.append("sent_at")
        if not log.delivered_at:
            log.delivered_at = now
            updated_fields.append("delivered_at")

    elif event_type in ("open", "opened", "click"):
        log.status = DeliveryStatus.READ
        updated_fields.append("status")
        if not log.sent_at:
            log.sent_at = now
            updated_fields.append("sent_at")
        if not log.delivered_at:
            log.delivered_at = now
            updated_fields.append("delivered_at")
        if not log.read_at:
            log.read_at = now
            updated_fields.append("read_at")

    elif event_type in ("bounce", "blocked", "spam", "unsub"):
        log.status = DeliveryStatus.BOUNCED
        updated_fields.append("status")
        if not log.failed_at:
            log.failed_at = now
            updated_fields.append("failed_at")
        log.error_code = event_type
        updated_fields.append("error_code")
        log.error_message = (
            event.get("error", "")
            or event.get("error_related_to", "")
            or event_type
        )[:500]
        updated_fields.append("error_message")

    else:
        logger.debug("Unknown Mailjet event type: %s", event_type)
        return False

    if not updated_fields:
        return False

    log.save(update_fields=updated_fields)
    return True


def process_mailjet_event(event: dict[str, Any]) -> bool:
    """Process a single Mailjet event and update delivery log.

    Returns True if a matching log was found and updated.
    """
    event_type = str(event.get("event", "")).lower()
    log = _resolve_delivery_log(event)
    if not log:
        return False

    try:
        changed = _apply_event(log, event_type, event)
        if changed and log.campaign_run:
            _update_campaign_run_counters(log.campaign_run)
        return changed
    except Exception as e:
        logger.error(
            "Error processing mailjet webhook for event %s: %s", event_type, e
        )
        return False
