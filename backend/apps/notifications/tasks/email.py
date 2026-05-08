"""
Loyallia — Email Notification Celery Tasks (apps/notifications/tasks/email.py)

Email campaign delivery task with rich HTML templates and per-customer tracking.
"""

import logging

from celery import shared_task

logger = logging.getLogger(__name__)


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
