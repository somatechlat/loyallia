"""
Loyallia — Campaign Delivery Celery Tasks (apps/notifications/tasks/campaigns.py)

Wallet push notification campaigns and WhatsApp campaign delivery.
"""

import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    max_retries=1,
    default_retry_delay=300,
    queue="default",
    name="apps.notifications.tasks.send_wallet_notification_campaign",
    soft_time_limit=600,
    time_limit=660,
)
def send_wallet_notification_campaign(
    self,
    tenant_id: str,
    title: str,
    message: str,
    segment_id: str = "all",
    wallet_platform: str = "both",
) -> dict:
    """Send wallet push notifications to customers with active passes.

    PERF: For 'all' segment, uses broadcast mode (send_push_notification_to_class)
    which sends one push per card class instead of N individual pushes.
    For targeted segments, sends individual pushes per pass.
    PERF: iterator(chunk_size=50) streams customers in batches.
    """
    import uuid

    from django.conf import settings

    from apps.customers.models import Customer, CustomerPass
    from apps.customers.pass_engine.google_pass import send_push_notification
    from apps.notifications.models import (
        Notification,
        NotificationChannel,
        NotificationType,
    )
    from apps.tenants.models import Tenant

    try:
        tenant = Tenant.objects.get(id=uuid.UUID(tenant_id))
    except Tenant.DoesNotExist:
        return {"success": False, "error": "Tenant not found"}

    from apps.customers.segment_api import _apply_segment_filter

    base_qs = Customer.objects.filter(tenant=tenant, is_active=True)
    audience = _apply_segment_filter(base_qs, segment_id)
    total = audience.count()

    logger.info(
        "Wallet campaign: tenant=%s segment=%s audience=%d",
        tenant_id,
        segment_id,
        total,
    )

    succeeded = 0
    failed = 0
    push_sent = 0

    # For "all" segment, we can use optimized broadcast for Google Wallet
    # and Apple Wallet (push to all registered devices per card)
    apple_push_sent = 0
    if segment_id == "all":
        from apps.cards.models import Card
        from apps.customers.pass_engine.google_pass import (
            send_push_notification_to_class,
        )

        active_cards = Card.objects.filter(tenant=tenant, is_active=True)
        for card in active_cards:
            broadcast_url = f"{settings.FRONTEND_URL}/enroll/{str(card.id)}"

            if wallet_platform in ("google", "both"):
                # Google Wallet broadcast
                send_push_notification_to_class(
                    card, header=title, body=message, action_url=broadcast_url
                )
                logger.info("Google broadcast push sent for card %s", card.name)

            if wallet_platform in ("apple", "both"):
                # Apple Wallet broadcast — send empty APNs push to all registered devices
                try:
                    from apps.customers.pass_engine.apple_push import notify_card_updated

                    apple_count = notify_card_updated(card)
                    apple_push_sent += apple_count
                    if apple_count > 0:
                        logger.info(
                            "Apple broadcast push sent to %d devices for card %s",
                            apple_count,
                            card.name,
                        )
                except Exception as exc:
                    logger.warning(
                        "Apple broadcast push failed for card %s: %s", card.name, exc
                    )

    for customer in audience.iterator(chunk_size=50):
        try:
            # Get customer's active passes
            passes = CustomerPass.objects.filter(
                customer=customer, is_active=True
            ).select_related("card", "card__tenant")

            if not passes.exists():
                continue

            notification = Notification.objects.create(
                tenant=tenant,
                customer=customer,
                notification_type=NotificationType.MARKETING,
                channel=NotificationChannel.IN_APP,
                title=title,
                message=message[:500],
            )
            notification.mark_as_sent()
            succeeded += 1

            # Send individual push only if NOT a broadcast segment (to avoid double notification)
            if segment_id != "all":
                for pass_obj in passes:
                    action_url = (
                        f"{settings.FRONTEND_URL}/enroll/{str(pass_obj.card.id)}"
                    )
                    if wallet_platform in ("google", "both"):
                        # Google Wallet individual push
                        result = send_push_notification(
                            pass_obj, header=title, body=message, action_url=action_url
                        )
                        if result.get("success"):
                            push_sent += 1
                            logger.info("Google push sent to pass %s", pass_obj.id)

                    if wallet_platform in ("apple", "both"):
                        # Apple Wallet individual push — trigger pass re-download
                        try:
                            from apps.customers.pass_engine.apple_push import (
                                notify_pass_updated,
                            )

                            apple_count = notify_pass_updated(pass_obj)
                            apple_push_sent += apple_count
                        except Exception as exc:
                            logger.warning(
                                "Apple push failed for pass %s: %s", pass_obj.id, exc
                            )
            else:
                # Mark as "push sent" in stats because we did a broadcast
                if wallet_platform in ("google", "both"):
                    push_sent += passes.count()
                if wallet_platform in ("apple", "both"):
                    apple_push_sent += passes.count()

        except Exception as exc:
            logger.error("Wallet campaign failed for %s: %s", customer.id, exc)
            failed += 1

    logger.info(
        "Wallet campaign complete: %d/%d (google_push: %d, apple_push: %d)",
        succeeded,
        total,
        push_sent,
        apple_push_sent,
    )
    return {
        "success": True,
        "attempted": total,
        "succeeded": succeeded,
        "failed": failed,
        "google_push_sent": push_sent,
        "apple_push_sent": apple_push_sent,
    }


@shared_task(
    bind=True,
    max_retries=1,
    default_retry_delay=300,
    queue="whatsapp_delivery",
    name="apps.notifications.tasks.send_whatsapp_campaign",
    soft_time_limit=3600,  # 1 hour for large campaigns
    time_limit=3660,
)
def send_whatsapp_campaign(
    self,
    tenant_id: str,
    title: str,
    message: str,
    segment_id: str = "all",
    image_url: str = "",
) -> dict:
    """LYL-SRS-006: WhatsApp campaign via Baileys bridge with per-message tracking.

    Creates a CampaignRun and CampaignDeliveryLog rows, then sends messages
    through the WhatsApp bridge. The bridge handles rate limiting and jitter
    internally, so this task simply enqueues messages and tracks results.

    If the bridge is unavailable, falls back to creating in-app notifications.
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
    from apps.notifications.whatsapp import client as wa_client
    from apps.tenants.models import Tenant

    try:
        tenant = Tenant.objects.get(id=uuid.UUID(tenant_id))
    except Tenant.DoesNotExist:
        return {"success": False, "error": "Tenant not found"}

    from apps.customers.segment_api import _apply_segment_filter

    base_qs = Customer.objects.filter(tenant=tenant, is_active=True)
    audience = _apply_segment_filter(base_qs, segment_id)
    total = audience.count()

    # Create CampaignRun record
    campaign_run = CampaignRun.objects.create(
        tenant=tenant,
        channel=NotificationChannel.WHATSAPP,
        title=title,
        message_preview=message[:500],
        segment_id=segment_id,
        status=CampaignStatus.IN_PROGRESS,
        total_recipients=total,
        started_at=timezone.now(),
    )

    # Check bridge availability
    bridge_available = wa_client.is_bridge_available()
    if not bridge_available:
        logger.warning(
            "WhatsApp bridge unavailable for tenant %s — falling back to in-app",
            tenant_id,
        )

    succeeded = 0
    failed = 0

    for customer in audience.iterator(chunk_size=50):
        # Create delivery log row (status=QUEUED)
        delivery_log = CampaignDeliveryLog.objects.create(
            campaign_run=campaign_run,
            customer=customer,
            recipient_phone=customer.phone or "",
            recipient_email=customer.email or "",
            recipient_name=f"{customer.first_name} {customer.last_name}".strip(),
            status=DeliveryStatus.QUEUED,
        )

        if bridge_available and customer.phone:
            try:
                result = wa_client.send_message(
                    tenant_id=tenant_id,
                    phone=customer.phone,
                    message=message[:500],
                    media_url=image_url or None,
                    metadata={
                        "delivery_log_id": str(delivery_log.id),
                        "campaign_run_id": str(campaign_run.id),
                    },
                )
                # Bridge accepted the message into its queue
                delivery_log.status = DeliveryStatus.SENT
                delivery_log.sent_at = timezone.now()
                delivery_log.external_message_id = result.get("job_id", "")
                delivery_log.save(
                    update_fields=[
                        "status",
                        "sent_at",
                        "external_message_id",
                    ]
                )
                succeeded += 1
            except Exception as exc:
                error_msg = str(exc)[:500]
                logger.error(
                    "WhatsApp send failed for customer %s: %s",
                    customer.id,
                    error_msg,
                )
                delivery_log.status = DeliveryStatus.FAILED
                delivery_log.failed_at = timezone.now()
                delivery_log.error_code = "BRIDGE_ERROR"
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
        else:
            # No phone or bridge down — create in-app fallback
            if not customer.phone:
                delivery_log.status = DeliveryStatus.FAILED
                delivery_log.failed_at = timezone.now()
                delivery_log.error_code = "NO_PHONE"
                delivery_log.error_message = "Cliente sin número de teléfono"
                delivery_log.save(
                    update_fields=[
                        "status",
                        "failed_at",
                        "error_code",
                        "error_message",
                    ]
                )
                failed += 1
            else:
                # Bridge unavailable — queue as in-app notification
                Notification.objects.create(
                    tenant=tenant,
                    customer=customer,
                    notification_type=NotificationType.MARKETING,
                    channel=NotificationChannel.IN_APP,
                    title=f"[WhatsApp] {title}",
                    message=message[:500],
                    action_url=image_url,
                )
                delivery_log.status = DeliveryStatus.FAILED
                delivery_log.failed_at = timezone.now()
                delivery_log.error_code = "BRIDGE_UNAVAILABLE"
                delivery_log.error_message = (
                    "Puente WhatsApp no disponible — creada notificación in-app"
                )
                delivery_log.save(
                    update_fields=[
                        "status",
                        "failed_at",
                        "error_code",
                        "error_message",
                    ]
                )
                failed += 1

    # Finalize campaign run
    campaign_run.sent_count = succeeded
    campaign_run.failed_count = failed
    campaign_run.status = CampaignStatus.COMPLETED
    campaign_run.completed_at = timezone.now()
    if not bridge_available:
        campaign_run.error_summary = (
            "Bridge unavailable — messages created as in-app notifications"
        )
    campaign_run.save(
        update_fields=[
            "sent_count",
            "failed_count",
            "status",
            "completed_at",
            "error_summary",
        ]
    )

    logger.info(
        "WhatsApp campaign %s complete: %d/%d sent, %d failed",
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
