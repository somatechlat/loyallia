"""
Loyallia Email Notification Celery Tasks (apps/notifications/tasks/email.py)

Email campaign delivery task with rich HTML templates and per-customer tracking.
"""

import logging

from celery import shared_task
from django.conf import settings

from common.messages import get_message

logger = logging.getLogger(__name__)

# CSS color used as the gradient end for the email header. Kept as a module
# constant so the HTML builder never embeds a bare "# noqa" comment.
_HEADER_GRADIENT_END = "#312e81"


def _is_safe_image_url(image_url: str) -> bool:
    """Return True when image_url is an absolute http(s) URL."""
    if not image_url:
        return False
    lowered = image_url.strip().lower()
    return lowered.startswith("http://") or lowered.startswith("https://")


def _safe_brand_anchor(brand_url: str) -> str:
    """Build the footer brand anchor, escaping the href and label."""
    import html as html_mod

    if not _is_safe_image_url(brand_url):
        return "Loyallia"
    href = html_mod.escape(brand_url, quote=True)
    return f'<a href="{href}">Loyallia</a>'


def _build_campaign_html(
    *,
    tenant_name: str,
    subject: str,
    html_body: str,
    image_url: str,
    primary_color: str,
    brand_url: str,
    year: int,
) -> str:
    """Render the campaign HTML with all dynamic values HTML-escaped.

    SEC: subject, tenant name and image_url are escaped. image_url must be
    an absolute http(s) URL before it is embedded. No ruff noqa markers may
    appear inside the returned markup.
    """
    import html as html_mod

    esc_tenant = html_mod.escape(tenant_name)
    esc_subject = html_mod.escape(subject)
    esc_color = html_mod.escape(primary_color, quote=True)
    esc_gradient_end = html_mod.escape(_HEADER_GRADIENT_END, quote=True)

    hero = ""
    if _is_safe_image_url(image_url):
        esc_src = html_mod.escape(image_url, quote=True)
        esc_alt = html_mod.escape(get_message("EMAIL_IMAGE_ALT"), quote=True)
        hero = (
            f"<img src='{esc_src}' alt='{esc_alt}' class='hero-img' />"
        )

    brand_anchor = _safe_brand_anchor(brand_url)
    footer_powered = get_message(
        "EMAIL_FOOTER_POWERED_BY", brand=brand_anchor
    )
    footer_rights = get_message(
        "EMAIL_FOOTER_RIGHTS", year=year, tenant=esc_tenant
    )
    footer_unsub = get_message("EMAIL_FOOTER_UNSUBSCRIBE")

    return f"""<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
body {{ margin:0; padding:0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background:#f4f4f8; color:#1e293b; }}
.container {{ max-width:560px; margin:40px auto; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08); }}
.header {{ background: linear-gradient(135deg, {esc_color} 0%, {esc_gradient_end} 100%); padding:32px 24px; text-align:center; color:#fff; }}
.header h1 {{ margin:0 0 4px; font-size:22px; font-weight:700; }}
.header p {{ margin:0; font-size:13px; opacity:0.8; }}
.hero-img {{ width:100%; max-height:200px; object-fit:cover; }}
.content {{ padding:28px 24px; }}
.content p {{ margin:0 0 16px; font-size:14px; line-height:1.65; color:#475569; }}
.footer {{ padding:20px 24px; text-align:center; background:#f8fafc; border-top:1px solid #f1f5f9; }}
.footer p {{ margin:0; font-size:11px; color:#94a3b8; }}
.footer a {{ color:{esc_color}; text-decoration:none; }}
</style></head>
<body>
<div class="container">
<div class="header">
  <h1>{esc_tenant}</h1>
  <p>{esc_subject}</p>
</div>
{hero}
<div class="content">
  {html_body}
</div>
<div class="footer">
  <p>{footer_powered}</p>
  <p style="margin-top:4px;">{footer_rights}</p>
  <p style="margin-top:8px; font-size:10px;">{footer_unsub}</p>
</div>
</div>
</body></html>"""


def _tenant_email_limit(tenant) -> int:
    """Tenant-wide monthly email pool (SubscriptionPlan.max_emails_month)."""
    from apps.billing.models import Subscription

    subscription = Subscription.objects.filter(tenant=tenant).first()
    if not subscription:
        return 0
    return subscription.get_limit("emails_month")


def _emails_used_this_month(tenant) -> int:
    """Count emails already sent this month (excludes quota-skipped rows)."""
    from common.plan_enforcement import get_current_usage

    return get_current_usage(tenant, "emails_month")


@shared_task(
    bind=True,
    max_retries=settings.CELERY_MAX_RETRIES_MINIMAL,
    default_retry_delay=settings.CELERY_DEFAULT_RETRY_DELAY_EXTRA_LONG,
    queue="email",
    name="apps.notifications.tasks.send_email_campaign",
    soft_time_limit=settings.CELERY_SOFT_TIME_LIMIT_NOTIFICATIONS_EMAIL,
    time_limit=settings.CELERY_TIME_LIMIT_NOTIFICATIONS_EMAIL,
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
    Quota: recipients beyond the tenant's monthly email pool are recorded
    with error_code=SKIPPED_QUOTA and are not sent.
    """
    import html as html_mod
    import uuid
    from datetime import datetime

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
    from common.email_config import get_default_from_email

    try:
        tenant = Tenant.objects.get(id=uuid.UUID(tenant_id))
    except (Tenant.DoesNotExist, ValueError):
        return {"success": False, "error": get_message("TENANT_NOT_FOUND")}

    from apps.notifications.tasks.plan_gates import enforce_fire_time_plan_gate

    gate_error = enforce_fire_time_plan_gate(tenant, "email")
    if gate_error:
        return {"success": False, "error": gate_error, "blocked_by_plan": True}

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
        title=html_mod.escape(subject)[:200],
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

        program_cards = Card.objects.filter(
            tenant=tenant, id__in=target_program_ids
        )
        campaign_run.target_programs.set(program_cards)
    if target_customer_ids:
        target_customers = Customer.objects.filter(
            tenant=tenant, id__in=target_customer_ids
        )
        campaign_run.target_customers.set(target_customers)

    succeeded = 0
    failed = 0
    quota_skipped = 0
    error_summary = ""
    catastrophic = False

    from_email = get_default_from_email()
    primary_color = getattr(tenant, "primary_color", "#6366f1") or "#6366f1"
    brand_url = PlatformSetting.get(
        "BRAND_HOME_URL", default=getattr(settings, "PUBLIC_BASE_URL", "") or ""
    )
    year = datetime.now().year
    message_id_domain = PlatformSetting.get(
        "EMAIL_MESSAGE_ID_DOMAIN", default="loyallia.com"
    )

    # Per-message quota against the tenant's monthly email pool.
    email_limit = _tenant_email_limit(tenant)
    emails_used = _emails_used_this_month(tenant)
    enqueued = 0

    try:
        from django.core.mail import EmailMultiAlternatives

        for customer in audience.iterator(
            chunk_size=settings.ITERATOR_CHUNK_SIZE_SMALL
        ):
            delivery_log = CampaignDeliveryLog.objects.create(
                campaign_run=campaign_run,
                customer=customer,
                recipient_phone=customer.phone or "",
                recipient_email=customer.email or "",
                recipient_name=f"{customer.first_name} {customer.last_name}".strip(),
                status=DeliveryStatus.QUEUED,
            )
            try:
                if not customer.email:
                    delivery_log.status = DeliveryStatus.FAILED
                    delivery_log.failed_at = timezone.now()
                    delivery_log.error_code = "NO_EMAIL"
                    delivery_log.error_message = get_message("EMAIL_NO_CUSTOMER_EMAIL")
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

                # Per-message quota: skip recipients beyond the monthly pool.
                if email_limit <= 0 or emails_used + enqueued >= email_limit:
                    delivery_log.status = DeliveryStatus.FAILED
                    delivery_log.failed_at = timezone.now()
                    delivery_log.error_code = "SKIPPED_QUOTA"
                    delivery_log.error_message = get_message("EMAIL_QUOTA_REACHED")
                    delivery_log.save(
                        update_fields=[
                            "status",
                            "failed_at",
                            "error_code",
                            "error_message",
                        ]
                    )
                    failed += 1
                    quota_skipped += 1
                    continue

                notification = Notification.objects.create(
                    tenant=tenant,
                    customer=customer,
                    notification_type=NotificationType.MARKETING,
                    channel=NotificationChannel.EMAIL,
                    title=subject,
                    message=html_body[:500],
                    action_url=image_url if _is_safe_image_url(image_url) else "",
                )

                html_content = _build_campaign_html(
                    tenant_name=tenant.name or "",
                    subject=subject,
                    html_body=html_body,
                    image_url=image_url,
                    primary_color=primary_color,
                    brand_url=brand_url,
                    year=year,
                )

                # Stable correlation id shared by Message-ID and Custom ID so
                # Mailjet webhooks can be matched to CampaignDeliveryLog rows.
                correlation_id = f"{uuid.uuid4().hex}@{message_id_domain}"
                msg = EmailMultiAlternatives(
                    subject=subject, from_email=from_email, to=[customer.email]
                )
                msg.attach_alternative(html_content, "text/html")
                msg.extra_headers["Message-ID"] = f"<{correlation_id}>"
                msg.extra_headers["X-MJCUSTOMID"] = correlation_id
                msg.send(fail_silently=False)

                enqueued += 1
                delivery_log.status = DeliveryStatus.SENT
                delivery_log.external_message_id = correlation_id
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
        catastrophic = True
        logger.exception("Email campaign failed before completion")
        raise
    finally:
        campaign_run.sent_count = succeeded
        campaign_run.failed_count = failed
        campaign_run.status = (
            CampaignStatus.FAILED if catastrophic else CampaignStatus.COMPLETED
        )
        campaign_run.completed_at = timezone.now()
        if catastrophic and not error_summary:
            error_summary = get_message("EMAIL_CAMPAIGN_FAILED")
        elif quota_skipped and not error_summary:
            error_summary = get_message("EMAIL_QUOTA_REACHED")
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

    logger.info(
        "Email campaign complete: %d/%d sent, %d failed (%d quota-skipped)",
        succeeded,
        total,
        failed,
        quota_skipped,
    )
    return {
        "success": True,
        "campaign_run_id": str(campaign_run.id),
        "attempted": total,
        "succeeded": succeeded,
        "failed": failed,
        "quota_skipped": quota_skipped,
    }
