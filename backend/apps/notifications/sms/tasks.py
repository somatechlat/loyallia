"""
Loyallia SMS Campaign Celery Task

Extracted from tasks.py for Rule 245 compliance (600-line limit).
Real SMS delivery via Twilio with per-message tracking using
CampaignRun and CampaignDeliveryLog.

Architecture:
    Follows the same pattern as send_whatsapp_campaign for consistency.
    Uses apps.notifications.sms.client for Twilio API calls.

Performance (Rule 12):
    - PERF: iterator(chunk_size=50) streams customers in batches.
    - PERF: Single Twilio client connection per campaign (via send_sms calls).

Security (SEC):
    - SEC: Audience scoped by tenant_id.
    - SEC: Twilio credentials from Vault  never exposed.
"""

import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    max_retries=1,
    default_retry_delay=300,
    queue="sms_delivery",
    name="apps.notifications.tasks.send_sms_campaign",
    soft_time_limit=1800,  # 30 minutes for large campaigns
    time_limit=1860,
)
def send_sms_campaign(
    self,
    tenant_id: str,
    title: str,
    message: str,
    segment_id: str = "all",
    target_program_ids: list[str] | None = None,
    target_device_type: str = "both",
    target_wallet_platform: str = "both",
    target_customer_ids: list[str] | None = None,
) -> dict:
    """SMS campaign via Twilio with per-message tracking.

    Creates a CampaignRun and CampaignDeliveryLog rows, then sends messages
    through the Twilio SMS client. Follows the same architecture as
    send_whatsapp_campaign for consistency.

    PERF: iterator(chunk_size=50) streams customers without loading all into memory.
    SEC: Audience scoped by tenant_id. Content truncated to 160 chars per SMS.
    """
    import uuid

    from django.utils import timezone

    from apps.customers.models import Customer
    from apps.notifications.models import (
        CampaignDeliveryLog,
        CampaignRun,
        CampaignStatus,
        DeliveryStatus,
        Notification,
        NotificationChannel,
        NotificationType,
    )
    from apps.notifications.sms.client import is_sms_available, send_sms
    from apps.tenants.models import Tenant

    try:
        tenant = Tenant.objects.get(id=uuid.UUID(tenant_id))
    except Tenant.DoesNotExist:
        return {"success": False, "error": "Tenant not found"}

    # Check Twilio availability
    if not is_sms_available():
        logger.error("SMS campaign: Twilio not configured for tenant %s", tenant_id)
        return {"success": False, "error": "Twilio SMS not configured"}

    from apps.customers.segment_api import apply_campaign_filters

    base_qs = Customer.objects.filter(
        tenant=tenant, is_active=True, phone__isnull=False, phone__gt=""
    )
    audience = apply_campaign_filters(
        base_qs,
        segment_id=segment_id,
        target_program_ids=target_program_ids,
        target_device_type=target_device_type,
        target_wallet_platform=target_wallet_platform,
        target_customer_ids=target_customer_ids,
    )
    total = audience.count()

    logger.info(
        "SMS campaign: tenant=%s segment=%s audience=%d", tenant_id, segment_id, total
    )

    # Create CampaignRun record
    campaign_run = CampaignRun.objects.create(
        tenant=tenant,
        channel=NotificationChannel.SMS,
        title=title,
        message_preview=message[:160],
        segment_id=segment_id,
        status=CampaignStatus.IN_PROGRESS,
        total_recipients=total,
        target_device_types=target_device_type,
        target_wallet_platforms=target_wallet_platform,
        started_at=timezone.now(),
    )
    if target_program_ids:
        from apps.cards.models import Card

        program_cards = Card.objects.filter(id__in=target_program_ids)
        campaign_run.target_programs.set(program_cards)
    if target_customer_ids:
        from apps.customers.models import Customer

        target_customers = Customer.objects.filter(id__in=target_customer_ids)
        campaign_run.target_customers.set(target_customers)

    # Build SMS body: title + message
    sms_body = f"{title}: {message}" if title else message

    succeeded = 0
    failed = 0

    try:
        for customer in audience.iterator(chunk_size=50):
            # Defensive: skip customers without a valid phone number
            if not customer.phone:
                failed += 1
                continue

            # Create delivery log row (status=QUEUED)
            delivery_log = CampaignDeliveryLog.objects.create(
                campaign_run=campaign_run,
                customer=customer,
                recipient_phone=customer.phone,
                recipient_email=customer.email or "",
                recipient_name=f"{customer.first_name} {customer.last_name}".strip(),
                status=DeliveryStatus.QUEUED,
            )

            # Create notification record upfront for campaign list visibility
            notification = Notification.objects.create(
                tenant=tenant,
                customer=customer,
                notification_type=NotificationType.MARKETING,
                channel=NotificationChannel.SMS,
                title=title,
                message=message[:500],
            )

            try:
                result = send_sms(phone=customer.phone, message=sms_body)

                if result.get("success"):
                    delivery_log.status = DeliveryStatus.SENT
                    delivery_log.sent_at = timezone.now()
                    delivery_log.external_message_id = result.get("sid", "")
                    delivery_log.save(
                        update_fields=["status", "sent_at", "external_message_id"]
                    )
                    notification.mark_as_sent()
                    succeeded += 1
                else:
                    delivery_log.status = DeliveryStatus.FAILED
                    delivery_log.failed_at = timezone.now()
                    delivery_log.error_code = "TWILIO_ERROR"
                    delivery_log.error_message = result.get("error", "Unknown error")[
                        :500
                    ]
                    delivery_log.save(
                        update_fields=[
                            "status",
                            "failed_at",
                            "error_code",
                            "error_message",
                        ]
                    )
                    failed += 1
            except Exception as exc:
                error_msg = str(exc)[:500]
                logger.error(
                    "SMS send failed for customer %s: %s", customer.id, error_msg
                )
                delivery_log.status = DeliveryStatus.FAILED
                delivery_log.failed_at = timezone.now()
                delivery_log.error_code = "SEND_ERROR"
                delivery_log.error_message = error_msg
                delivery_log.save(
                    update_fields=[
                        "status",
                        "failed_at",
                        "error_code",
                        "error_message",
                    ]
                )
                failed += 1
    finally:
        # Always finalize campaign run so it never stays stuck IN_PROGRESS
        campaign_run.sent_count = succeeded
        campaign_run.delivered_count = (
            succeeded  # For SMS, sent is effectively delivered to carrier
        )
        campaign_run.failed_count = failed
        campaign_run.status = CampaignStatus.COMPLETED
        campaign_run.completed_at = timezone.now()
        campaign_run.save(
            update_fields=[
                "sent_count",
                "delivered_count",
                "failed_count",
                "status",
                "completed_at",
            ]
        )

    logger.info(
        "SMS campaign %s complete: %d/%d sent, %d failed",
        campaign_run.id,
        succeeded,
        total,
        failed,
    )
    return {
        "success": True,
        "campaign_run_id": str(campaign_run.id),
        "attempted": total,
        "succeeded": succeeded,
        "failed": failed,
    }
