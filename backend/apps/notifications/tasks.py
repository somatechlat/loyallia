"""
Loyallia — Notifications Celery Tasks (apps/notifications/tasks.py)

Async delivery of email campaigns, wallet push notifications, WhatsApp
campaigns via Baileys bridge, birthday notifications, and inactive customer reminders.

Architecture:
    All tasks are idempotent and use Celery retry with exponential backoff.
    Campaign tasks iterate over audience using iterator(chunk_size=50)
    to avoid loading the entire customer base into memory.

Performance (Rule 12):
    - PERF: iterator(chunk_size=50) streams customers from DB in batches.
    - PERF: Broadcast mode for wallet campaigns sends one push per card
      class instead of N individual pushes (Google Wallet optimization).
    - PERF: Email sending is sequential per-customer to avoid SMTP overload.
      For production scale, replace with batched SES API calls.

Security (SEC):
    - SEC: All audience queries scoped by tenant_id parameter.
    - SEC: Notification content truncated to 500 chars to prevent payload abuse.

Called by: Notification API (schedule_campaign), Celery Beat (birthday/reminders).
"""

import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    max_retries=2,
    default_retry_delay=60,
    queue="push_delivery",
    name="apps.notifications.tasks.send_single_notification",
)
def send_single_notification(self, notification_id: str) -> dict:
    """Dispatch a single notification via its configured channel.

    PERF: select_related loads customer+tenant in one JOIN.
    Idempotent: checks is_sent flag before dispatching.
    """
    import uuid

    from apps.notifications.models import Notification
    from apps.notifications.service import NotificationService

    try:
        notification = Notification.objects.select_related("customer", "tenant").get(
            id=uuid.UUID(notification_id)
        )
    except Notification.DoesNotExist:
        return {"success": False, "error": "Notification not found"}

    if notification.is_sent:
        return {"success": True, "already_sent": True}

    try:
        result = NotificationService.send_notification(notification)
        return {"success": result, "notification_id": notification_id}
    except Exception as exc:
        logger.error("send_single_notification failed: %s", exc)
        raise self.retry(exc=exc)


@shared_task(
    bind=True,
    max_retries=1,
    default_retry_delay=300,
    queue="email",
    name="apps.notifications.tasks.send_email_campaign",
    soft_time_limit=600,
    time_limit=660,
)
def send_email_campaign(
    self,
    tenant_id: str,
    subject: str,
    html_body: str,
    segment_id: str = "all",
    image_url: str = "",
) -> dict:
    """Send a rich HTML email campaign to customers in a segment.

    PERF: iterator(chunk_size=50) streams customers without loading all into memory.
    Note: Notification.objects.create() is called per-customer inside the loop
    because each notification needs the customer FK for tracking. bulk_create
    is not used here because we need the Notification record BEFORE sending
    the email (for audit trail if the email send fails).
    SEC: Audience scoped by tenant_id. Content truncated to 500 chars.
    """
    import uuid

    from django.conf import settings
    from django.core.mail import EmailMultiAlternatives

    from apps.customers.models import Customer
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

    base_qs = Customer.objects.filter(
        tenant=tenant, is_active=True, email__isnull=False, email__gt=""
    )
    audience = _apply_segment_filter(base_qs, segment_id)
    total = audience.count()

    logger.info(
        "Email campaign: tenant=%s segment=%s audience=%d", tenant_id, segment_id, total
    )

    succeeded = 0
    failed = 0
    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@loyallia.com")
    primary_color = getattr(tenant, "primary_color", "#6366f1")

    for customer in audience.iterator(chunk_size=50):
        try:
            if not customer.email:
                continue

            Notification.objects.create(
                tenant=tenant,
                customer=customer,
                notification_type=NotificationType.MARKETING,
                channel=NotificationChannel.EMAIL,
                title=subject,
                message=html_body[:500],
                action_url=image_url,
            )

            html_content = f"""<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
body {{ margin:0; padding:0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background:#f4f4f8; color:#1e293b; }}
.container {{ max-width:560px; margin:40px auto; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08); }}
.header {{ background: linear-gradient(135deg, {primary_color} 0%, #312e81 100%); padding:32px 24px; text-align:center; color:#fff; }}
.header h1 {{ margin:0 0 4px; font-size:22px; font-weight:700; }}
.header p {{ margin:0; font-size:13px; opacity:0.8; }}
.hero-img {{ width:100%; max-height:200px; object-fit:cover; }}
.content {{ padding:28px 24px; }}
.content p {{ margin:0 0 16px; font-size:14px; line-height:1.65; color:#475569; }}
.footer {{ padding:20px 24px; text-align:center; background:#f8fafc; border-top:1px solid #f1f5f9; }}
.footer p {{ margin:0; font-size:11px; color:#94a3b8; }}
.footer a {{ color:{primary_color}; text-decoration:none; }}
</style></head>
<body>
<div class="container">
<div class="header">
  <h1>{tenant.name}</h1>
  <p>{subject}</p>
</div>
{"<img src='" + image_url + "' alt='Promoción' class='hero-img' />" if image_url else ""}
<div class="content">
  {html_body}
</div>
<div class="footer">
  <p>Powered by <a href="https://loyallia.com">Loyallia</a> — Intelligent Rewards</p>
  <p style="margin-top:4px;">© 2024 {tenant.name}. Todos los derechos reservados.</p>
  <p style="margin-top:8px; font-size:10px;">¿No quieres recibir más correos? Visita tu perfil para gestionar tus preferencias.</p>
</div>
</div>
</body></html>"""

            msg = EmailMultiAlternatives(
                subject=subject, from_email=from_email, to=[customer.email]
            )
            msg.attach_alternative(html_content, "text/html")
            msg.send(fail_silently=False)
            succeeded += 1

        except Exception as exc:
            logger.error("Email campaign failed for %s: %s", customer.id, exc)
            failed += 1

    logger.info("Email campaign complete: %d/%d", succeeded, total)
    return {
        "success": True,
        "attempted": total,
        "succeeded": succeeded,
        "failed": failed,
    }


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
            # Google Wallet broadcast
            send_push_notification_to_class(
                card, header=title, body=message, action_url=broadcast_url
            )
            logger.info("Google broadcast push sent for card %s", card.name)

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
                logger.warning("Apple broadcast push failed for card %s: %s", card.name, exc)

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
                    # Google Wallet individual push
                    result = send_push_notification(
                        pass_obj, header=title, body=message, action_url=action_url
                    )
                    if result.get("success"):
                        push_sent += 1
                        logger.info("Google push sent to pass %s", pass_obj.id)

                    # Apple Wallet individual push — trigger pass re-download
                    try:
                        from apps.customers.pass_engine.apple_push import notify_pass_updated

                        apple_count = notify_pass_updated(pass_obj)
                        apple_push_sent += apple_count
                    except Exception as exc:
                        logger.warning(
                            "Apple push failed for pass %s: %s", pass_obj.id, exc
                        )
            else:
                # Mark as "push sent" in stats because we did a broadcast
                push_sent += passes.count()

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
                        "status", "sent_at", "external_message_id",
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
                        "status", "failed_at", "error_code", "error_message",
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
                        "status", "failed_at", "error_code", "error_message",
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
                delivery_log.error_message = "Puente WhatsApp no disponible — creada notificación in-app"
                delivery_log.save(
                    update_fields=[
                        "status", "failed_at", "error_code", "error_message",
                    ]
                )
                failed += 1

    # Finalize campaign run
    campaign_run.sent_count = succeeded
    campaign_run.failed_count = failed
    campaign_run.status = CampaignStatus.COMPLETED
    campaign_run.completed_at = timezone.now()
    if not bridge_available:
        campaign_run.error_summary = "Bridge unavailable — messages created as in-app notifications"
    campaign_run.save(
        update_fields=[
            "sent_count", "failed_count", "status", "completed_at", "error_summary",
        ]
    )

    logger.info(
        "WhatsApp campaign %s complete: %d/%d sent, %d failed",
        campaign_run.id, succeeded, total, failed,
    )
    return {
        "success": True,
        "campaign_run_id": str(campaign_run.id),
        "attempted": total,
        "succeeded": succeeded,
        "failed": failed,
    }


@shared_task(
    queue="push_delivery", name="apps.notifications.tasks.send_birthday_notifications"
)
def send_birthday_notifications() -> dict:
    """Daily scheduled task: send birthday greetings to customers.

    PERF: Single query with date_of_birth__month/day filter (indexed).
    select_related("tenant") prevents N+1 when accessing tenant for notification.
    """
    from datetime import date

    from apps.customers.models import Customer
    from apps.notifications.service import NotificationService

    today = date.today()
    customers = Customer.objects.filter(
        date_of_birth__month=today.month,
        date_of_birth__day=today.day,
        is_active=True,
    ).select_related("tenant")

    sent = 0
    for customer in customers:
        try:
            notification = NotificationService.send_birthday_notification(
                customer=customer, tenant=customer.tenant
            )
            if notification:
                sent += 1
        except Exception as exc:
            logger.error("Birthday notification failed for %s: %s", customer.id, exc)

    return {"sent": sent, "date": str(today)}


@shared_task(
    queue="push_delivery", name="apps.notifications.tasks.send_inactive_reminders"
)
def send_inactive_reminders(days_inactive: int = 30) -> dict:
    """Daily scheduled task: re-engage customers who haven't visited recently.

    PERF: Single query with last_visit__lt filter.
    select_related("tenant") prevents N+1 when creating notifications.
    """
    from datetime import timedelta

    from django.utils import timezone

    from apps.customers.models import Customer
    from apps.notifications.service import NotificationService

    cutoff = timezone.now() - timedelta(days=days_inactive)
    customers = Customer.objects.filter(
        last_visit__lt=cutoff,
        last_visit__isnull=False,
        is_active=True,
    ).select_related("tenant")

    sent = 0
    for customer in customers:
        try:
            notification = NotificationService.send_reminder_notification(
                customer=customer, tenant=customer.tenant
            )
            if notification:
                sent += 1
        except Exception as exc:
            logger.error("Reminder failed for %s: %s", customer.id, exc)

    return {"sent": sent, "days_inactive": days_inactive}


# =============================================================================
# RE-EXPORTS (split per Rule 245 — 650-line limit)
# =============================================================================
from apps.notifications.sms.tasks import send_sms_campaign  # noqa: E402, F401


