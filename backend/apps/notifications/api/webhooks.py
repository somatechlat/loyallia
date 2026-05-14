import logging
from typing import Any

from django.utils import timezone

from apps.notifications.models import CampaignDeliveryLog, CampaignRun, DeliveryStatus

logger = logging.getLogger(__name__)


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


def process_mailjet_event(event: dict[str, Any]) -> bool:
    """Process a single Mailjet event and update delivery log.

    Returns True if a matching log was found and updated.
    """
    event_type = event.get("event")
    # Mailjet uses MessageID or Message_GUID depending on event type
    message_id = event.get("Message_GUID") or str(event.get("MessageID", ""))

    if not message_id:
        return False

    try:
        log = CampaignDeliveryLog.objects.filter(
            external_message_id=message_id
        ).select_related("campaign_run").first()
        if not log:
            return False

        if event_type == "sent":
            log.status = DeliveryStatus.SENT
            log.sent_at = timezone.now()
        elif event_type in ("open", "opened"):
            log.status = DeliveryStatus.READ
            log.read_at = timezone.now()
        elif event_type == "click":
            # Click implies the message was read
            log.status = DeliveryStatus.READ
            if not log.read_at:
                log.read_at = timezone.now()
        elif event_type in ("bounce", "blocked", "spam", "unsub"):
            log.status = DeliveryStatus.BOUNCED
            log.failed_at = timezone.now()
            log.error_code = event_type
            log.error_message = (
                event.get("error", "") or event.get("error_related_to", "") or event_type
            )[:500]
        else:
            # Unknown event — log but don't fail
            logger.debug("Unknown Mailjet event type: %s", event_type)
            return False

        log.save(
            update_fields=[
                "status",
                "sent_at",
                "read_at",
                "failed_at",
                "error_code",
                "error_message",
            ]
        )

        # Update aggregate counters on the parent CampaignRun
        if log.campaign_run:
            _update_campaign_run_counters(log.campaign_run)

        return True

    except Exception as e:
        logger.error(
            "Error processing mailjet webhook for message %s: %s", message_id, e
        )
        return False
