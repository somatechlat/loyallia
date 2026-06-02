"""
Loyallia Email Notification Celery Tasks (apps/notifications/tasks/email.py)

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
    target_program_ids: list[str] | None = None,
    target_device_type: str = "both",
    target_wallet_platform: str = "both",
    target_customer_ids: list[str] | None = None,
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
    from apps.tenants.models import PlatformSetting, Tenant

    try:
        tenant = Tenant.objects.get(id=uuid.UUID(tenant_id))
    except Tenant.DoesNotExist:
        return {"success": False, "error": "Tenant not found"}

    from apps.customers.segment_api import apply_campaign_filters

    base_qs = Customer.objects.filter(
        tenant=tenant, is_active=True, email__isnull=False, email__gt=""
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
        "Email campaign: tenant=%s segment=%s audience=%d", tenant_id, segment_id, total
    )

    campaign_run = CampaignRun.objects.create(
        tenant=tenant,
        channel=NotificationChannel.EMAIL,
        title=subject,
        message_preview=html_body[:500],
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
        target_customers = Customer.objects.filter(id__in=target_customer_ids)
        campaign_run.target_customers.set(target_customers)

    succeeded = 0
    failed = 0
    from common.email_config import get_default_from_email

    from_email = get_default_from_email()
    primary_color = getattr(tenant, "primary_color", "#6366f1")
    error_summary = ""

    try:
        for customer in audience.iterator(chunk_size=50):
            delivery_log = CampaignDeliveryLog.objects.create(
                campaign_run=campaign_run,
                customer=customer,
                recipient_phone=customer.phone or "",
                recipient_email=customer.email or "",
                recipient_name=f"{customer.first_name} {customer.last_name}".strip(),
                status=DeliveryStatus.QUEUED,
            )
            notification = Notification.objects.create(
                tenant=tenant,
                customer=customer,
                notification_type=NotificationType.MARKETING,
                channel=NotificationChannel.EMAIL,
                title=subject,
                message=html_body[:500],
                action_url=image_url,
            )
            try:
                if not customer.email:
                    delivery_log.status = DeliveryStatus.FAILED
                    delivery_log.failed_at = timezone.now()
                    delivery_log.error_code = "NO_EMAIL"
                    delivery_log.error_message = "Cliente sin email"
                    delivery_log.save(
                        update_fields=[
                            "status",
                            "failed_at",
                            "error_code",
                            "error_message",
                        ]
                    )
                    failed += 1
                    continue

                html_content = f"""<!DOCTYPE html>  # noqa: E501
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
body {{ margin:0; padding:0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background:#f4f4f8; color:#1e293b; }}  # noqa: E501
.container {{ max-width:560px; margin:40px auto; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08); }}  # noqa: E501
.header {{ background: linear-gradient(135deg, {primary_color} 0%, #312e81 100%); padding:32px 24px; text-align:center; color:#fff; }}  # noqa: E501
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
  <p>Powered by <a href="{PlatformSetting.get('BRAND_HOME_URL', default=getattr(settings, 'PUBLIC_BASE_URL', '') or '')}">Loyallia</a>  Intelligent Rewards</p>  # noqa: E501
  <p style="margin-top:4px;">© 2024 {tenant.name}. Todos los derechos reservados.</p>
  <p style="margin-top:8px; font-size:10px;">¿No quieres recibir más correos? Visita tu perfil para gestionar tus preferencias</p>  # noqa: E501
</div>
</div>
</body></html>"""

                # Generate a stable Message-ID for webhook correlation
                import uuid as _uuid

                message_id = f"{_uuid.uuid4().hex}@{PlatformSetting.get('EMAIL_MESSAGE_ID_DOMAIN', default='loyallia.com')}"# noqa: E501
                msg = EmailMultiAlternatives(
                    subject=subject, from_email=from_email, to=[customer.email]
                )
                msg.attach_alternative(html_content, "text/html")
                msg.extra_headers["Message-ID"] = f"<{message_id}>"
                msg.send(fail_silently=False)

                delivery_log.status = DeliveryStatus.SENT
                delivery_log.external_message_id = message_id
                delivery_log.sent_at = timezone.now()
                delivery_log.save(
                    update_fields=["status", "sent_at", "external_message_id"]
                )
                notification.mark_as_sent()
                succeeded += 1

            except Exception as exc:
                error_msg = str(exc)[:500]
                logger.error("Email campaign failed for %s: %s", customer.id, exc)
                delivery_log.status = DeliveryStatus.FAILED
                delivery_log.failed_at = timezone.now()
                delivery_log.error_code = "EMAIL_SEND_ERROR"
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
    except Exception as exc:
        error_summary = str(exc)[:500]
        logger.exception("Email campaign failed before completion")
        raise
    finally:
        campaign_run.sent_count = succeeded
        campaign_run.failed_count = failed
        campaign_run.status = CampaignStatus.COMPLETED
        campaign_run.completed_at = timezone.now()
        campaign_run.error_summary = error_summary
        campaign_run.save(
            update_fields=[
                "sent_count",
                "failed_count",
                "status",
                "completed_at",
                "error_summary",
            ]
        )

    logger.info("Email campaign complete: %d/%d", succeeded, total)
    return {
        "success": True,
        "campaign_run_id": str(campaign_run.id),
        "attempted": total,
        "succeeded": succeeded,
        "failed": failed,
    }
