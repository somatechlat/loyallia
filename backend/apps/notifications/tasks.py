"""
Loyallia — Notifications Celery Tasks
Email and Wallet campaign delivery.
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
    """Dispatch a single notification record."""
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
    """Send a rich HTML email campaign to customers in a segment."""
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

    from apps.customers.api import _apply_segment_filter

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
    """Send wallet notification campaign to customers with active passes using Google Wallet Push API."""
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

    from apps.customers.api import _apply_segment_filter

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
    if segment_id == "all":
        from apps.cards.models import Card
        from apps.customers.pass_engine.google_pass import (
            send_push_notification_to_class,
        )

        active_cards = Card.objects.filter(tenant=tenant, is_active=True)
        for card in active_cards:
            broadcast_url = f"{settings.FRONTEND_URL}/enroll/{str(card.id)}"
            send_push_notification_to_class(
                card, header=title, body=message, action_url=broadcast_url
            )
            logger.info("Broadcast push sent for card %s", card.name)

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
                    result = send_push_notification(
                        pass_obj, header=title, body=message, action_url=action_url
                    )
                    if result.get("success"):
                        push_sent += 1
                        logger.info("Push sent to pass %s", pass_obj.id)
            else:
                # Mark as "push sent" in stats because we did a broadcast
                push_sent += passes.count()

        except Exception as exc:
            logger.error("Wallet campaign failed for %s: %s", customer.id, exc)
            failed += 1

    logger.info(
        "Wallet campaign complete: %d/%d (push: %d)", succeeded, total, push_sent
    )
    return {
        "success": True,
        "attempted": total,
        "succeeded": succeeded,
        "failed": failed,
        "push_sent": push_sent,
    }


@shared_task(
    bind=True,
    max_retries=1,
    default_retry_delay=300,
    queue="push_delivery",
    name="apps.notifications.tasks.send_whatsapp_campaign",
    soft_time_limit=600,
    time_limit=660,
)
def send_whatsapp_campaign(
    self,
    tenant_id: str,
    title: str,
    message: str,
    segment_id: str = "all",
    image_url: str = "",
) -> dict:
    """LYL-M-API-019: Async WhatsApp mock campaign — creates in-app notifications.

    Moved from synchronous loop in API endpoint to Celery task.
    Ready for future integration with WhatsApp Business API.
    """
    import uuid

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

    from apps.customers.api import _apply_segment_filter

    base_qs = Customer.objects.filter(tenant=tenant, is_active=True)
    audience = _apply_segment_filter(base_qs, segment_id)
    total = audience.count()

    succeeded = 0
    for customer in audience.iterator(chunk_size=50):
        try:
            Notification.objects.create(
                tenant=tenant,
                customer=customer,
                notification_type=NotificationType.MARKETING,
                channel=NotificationChannel.IN_APP,
                title=f"[WhatsApp] {title}",
                message=message[:500],
                action_url=image_url,
            )
            succeeded += 1
        except Exception as exc:
            logger.error("WhatsApp campaign failed for %s: %s", customer.id, exc)

    logger.info("WhatsApp campaign complete: %d/%d", succeeded, total)
    return {"success": True, "attempted": total, "succeeded": succeeded}


@shared_task(
    queue="push_delivery", name="apps.notifications.tasks.send_birthday_notifications"
)
def send_birthday_notifications() -> dict:
    """Daily task: send birthday notifications."""
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
    """Daily task: send reminders to inactive customers."""
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
