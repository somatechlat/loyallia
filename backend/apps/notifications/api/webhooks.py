import logging
from typing import Any

from django.utils import timezone
from ninja import Router

from apps.notifications.models import CampaignDeliveryLog, DeliveryStatus
from .base import router

logger = logging.getLogger(__name__)

@router.post("/webhooks/mailjet/", auth=None, tags=["Webhooks"])
def mailjet_webhook(request, payload: list[dict[str, Any]]):
    """Receive Mailjet event webhooks to track email analytics."""
    for event in payload:
        event_type = event.get("event")
        # Anymail usually uses MessageID or Message_GUID. 
        message_id = event.get("Message_GUID") or str(event.get("MessageID", ""))
        
        if not message_id:
            continue
            
        try:
            # Match by external_message_id
            log = CampaignDeliveryLog.objects.filter(external_message_id=message_id).first()
            if not log:
                continue
                
            if event_type == "sent":
                log.status = DeliveryStatus.SENT
                log.sent_at = timezone.now()
            elif event_type == "opened":
                log.status = DeliveryStatus.OPENED
                log.opened_at = timezone.now()
            elif event_type == "clicked":
                log.status = DeliveryStatus.CLICKED
                log.clicked_at = timezone.now()
            elif event_type in ["bounce", "blocked", "spam", "unsub"]:
                log.status = DeliveryStatus.FAILED
                log.failed_at = timezone.now()
                log.error_code = event_type
                log.error_message = event.get("error", "") or event.get("error_related_to", "")
            
            log.save(update_fields=[
                "status", "sent_at", "opened_at", "clicked_at", "failed_at", 
                "error_code", "error_message"
            ])
            
        except Exception as e:
            logger.error("Error processing mailjet webhook for message %s: %s", message_id, e)
            
    return {"success": True}
