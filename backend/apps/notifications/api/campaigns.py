"""Campaign listing and creation endpoints."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from django.http import HttpRequest
from ninja.errors import HttpError
from pydantic import BaseModel

from apps.audit.service import log_action
from apps.notifications.models import CampaignRun, Notification, NotificationType
from common.messages import get_message
from common.permissions import is_owner, jwt_auth
from common.plan_enforcement import (
    check_feature_access,
    check_plan_limit,
)

from .base import router

# ---------------------------------------------------------------------------
# Scheduled campaign support
# ---------------------------------------------------------------------------

def _get_campaign_task(data: CampaignCreateIn):
    """Return the Celery task function and kwargs for a campaign channel."""
    if data.channel == "email":
        from apps.notifications.tasks import send_email_campaign
        return send_email_campaign, {
            "tenant_id": None,  # filled at dispatch time
            "subject": data.title,
            "html_body": data.message,
            "segment_id": data.segment_id,
            "image_url": data.image_url or "",
        }
    elif data.channel == "wallet":
        from apps.notifications.tasks import send_wallet_notification_campaign
        return send_wallet_notification_campaign, {
            "tenant_id": None,
            "title": data.title,
            "message": data.message,
            "segment_id": data.segment_id,
            "wallet_platform": data.wallet_platform,
            "action_url": data.action_url or "",
        }
    elif data.channel == "whatsapp":
        from apps.notifications.tasks import send_whatsapp_campaign
        return send_whatsapp_campaign, {
            "tenant_id": None,
            "title": data.title,
            "message": data.message,
            "segment_id": data.segment_id,
            "image_url": data.image_url or "",
        }
    elif data.channel == "sms":
        from apps.notifications.sms.tasks import send_sms_campaign
        return send_sms_campaign, {
            "tenant_id": None,
            "title": data.title,
            "message": data.message,
            "segment_id": data.segment_id,
        }
    return None, {}


class CampaignOut(BaseModel):
    id: str
    title: str
    message: str
    segment: str
    status: str
    sent_count: int
    created_at: str
    channel: str | None = None


class CampaignCreateIn(BaseModel):
    title: str
    message: str
    segment_id: str
    image_url: str | None = ""
    channel: str | None = "email"  # 'email', 'wallet', 'whatsapp', or 'sms'
    sender_domain: str | None = "loyallia"  # 'loyallia' or 'custom'
    wallet_platform: str = "both"  # 'apple', 'google', or 'both'
    action_url: str | None = ""  # Custom link for wallet push notifications (optional)
    schedule_type: str = "immediate"  # 'immediate' or 'scheduled'
    scheduled_at: str | None = None  # ISO datetime string for scheduled campaigns


SEGMENT_NAMES = {
    "all": "Todos los clientes",
    "vip": "VIP",
    "active": "Activos",
    "at_risk": "En riesgo",
    "inactive": "Inactivos",
    "new": "Nuevos",
}

@router.get("/campaigns/", auth=jwt_auth, response=dict, summary="Listar campañas")
def list_campaigns(request: HttpRequest) -> dict:
    """List all push campaigns."""
    if not is_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))

    runs = CampaignRun.objects.filter(tenant=request.tenant).order_by("-created_at")[:50]
    if runs:
        return {
            "campaigns": [
                {
                    "id": str(run.id),
                    "title": run.title or "Sin título",
                    "message": run.message_preview or "",
                    "segment": SEGMENT_NAMES.get(run.segment_id, run.segment_id or "all"),
                    "status": run.status,
                    "sent_count": run.sent_count,
                    "failed_count": run.failed_count,
                    "total_recipients": run.total_recipients,
                    "created_at": run.created_at.isoformat() if run.created_at else "",
                    "channel": run.channel,
                    "error_summary": run.error_summary or "",
                }
                for run in runs
            ],
            "total": CampaignRun.objects.filter(tenant=request.tenant).count(),
        }

    notifications = Notification.objects.filter(
        tenant=request.tenant, notification_type=NotificationType.MARKETING
    ).order_by("-created_at")[:50]

 # Group notifications by campaign (using created_at date as grouping key)
    campaigns_dict = {}
    for n in notifications:
 # Use title + date as unique campaign key
        campaign_key = f"{n.title}_{n.created_at.date() if n.created_at else 'unknown'}"
        if campaign_key not in campaigns_dict:
 # Determine status based on is_sent and is_read (sent = delivered to at least one)
            if n.is_sent and n.is_read:
                status = "delivered"
            elif n.is_sent:
                status = "sent"
            else:
                status = "pending"

 # Determine campaign type from channel
            channel = n.channel if n.channel else "email"

            campaigns_dict[campaign_key] = {
                "id": str(n.id),
                "title": n.title or "Sin título",
                "message": n.message or "",
                "segment": "All",
                "status": status,
                "sent_count": 0,
                "created_at": n.created_at.isoformat() if n.created_at else "",
                "channel": channel,  # 'email', 'push', or 'in_app' (wallet)
            }
        if n.is_sent:
            campaigns_dict[campaign_key]["sent_count"] += 1

    campaign_list = list(campaigns_dict.values())
    return {"campaigns": campaign_list, "total": len(campaign_list)}


@router.post("/campaigns/", auth=jwt_auth, response=dict, summary="Crear campaña")
def create_campaign(request: HttpRequest, data: CampaignCreateIn) -> dict:
    """Send an email, wallet, or WhatsApp notification campaign to customers in a segment.

    OWNER only. Supports four channels:
    - 'email': Rich HTML email with images
    - 'wallet': Creates notifications that appear when customers check their wallet cards
    - 'whatsapp': WhatsApp campaign via Baileys bridge  messages queued with Gaussian jitter anti-ban
    - 'sms': SMS campaign via Twilio with per-message delivery tracking

    Scheduling: pass schedule_type="scheduled" and scheduled_at="<ISO datetime>"
    to defer dispatch instead of sending immediately.
    """
    if not is_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    check_plan_limit(request.tenant, "notifications_month", write=True)

    # -- Scheduled campaign support -------------------------------------------
    if data.schedule_type == "scheduled" and data.scheduled_at:
        from celery import current_app as celery_app
        from django.utils import timezone

        try:
            scheduled_time = datetime.fromisoformat(data.scheduled_at.replace("Z", "+00:00"))
        except ValueError:
            raise HttpError(400, get_message("VALIDATION_ERROR", detail="Invalid scheduled_at format. Use ISO 8601."))

        if scheduled_time < timezone.now():
            raise HttpError(400, get_message("VALIDATION_ERROR", detail="scheduled_at must be in the future."))

        # Resolve task for the channel
        task_fn, task_kwargs = _get_campaign_task(data)
        if task_fn is None:
            raise HttpError(400, get_message("VALIDATION_ERROR", detail="Canal no válido para programación."))

        # Fill tenant_id
        task_kwargs["tenant_id"] = str(request.tenant.id)

        # Schedule via Celery
        celery_app.send_task(
            task_fn.name,
            kwargs=task_kwargs,
            eta=scheduled_time,
        )

        log_action(
            request=request,
            action="CREATE",
            resource_type="campaign",
            details={
                "channel": data.channel,
                "segment_id": data.segment_id,
                "title": data.title,
                "schedule_type": "scheduled",
                "scheduled_at": data.scheduled_at,
            },
        )
        return {
            "success": True,
            "message": "Campaign scheduled successfully",
            "scheduled_at": data.scheduled_at,
        }

    # -- Immediate dispatch (existing flow) -----------------------------------
    if data.channel == "email":
 # LYL-SRS-008: Gate email campaigns by plan feature + monthly quota
        check_feature_access(request.tenant, "email_campaigns")
        check_plan_limit(request.tenant, "emails_month", write=True)

        from apps.notifications.tasks import send_email_campaign

        task_fn: Any = send_email_campaign
        task_fn.delay(
            tenant_id=str(request.tenant.id),
            subject=data.title,
            html_body=data.message,
            segment_id=data.segment_id,
            image_url=data.image_url or "",
        )
        log_action(
            request=request,
            action="CREATE",
            resource_type="campaign",
            details={"channel": data.channel, "segment_id": data.segment_id, "title": data.title},
        )
        return {
            "success": True,
            "message": get_message("CAMPAIGN_EMAIL_STARTED", segment=data.segment_id),
        }
    elif data.channel == "wallet":
 # LYL-SRS-008: Gate wallet campaigns by plan feature + monthly quota
        check_feature_access(request.tenant, "wallet_campaigns")
        check_plan_limit(request.tenant, "wallet_pushes_month", write=True)

        from apps.notifications.tasks import send_wallet_notification_campaign

        task_fn: Any = send_wallet_notification_campaign
        task_fn.delay(
            tenant_id=str(request.tenant.id),
            title=data.title,
            message=data.message,
            segment_id=data.segment_id,
            wallet_platform=data.wallet_platform,
            action_url=data.action_url or "",
        )
        log_action(
            request=request,
            action="CREATE",
            resource_type="campaign",
            details={"channel": data.channel, "segment_id": data.segment_id, "title": data.title},
        )
        return {
            "success": True,
            "message": get_message("CAMPAIGN_WALLET_STARTED", segment=data.segment_id),
        }
    elif data.channel == "whatsapp":
 # LYL-SRS-008: Gate WhatsApp campaigns by plan feature + daily quota
        check_feature_access(request.tenant, "whatsapp_campaigns")
        check_plan_limit(request.tenant, "whatsapp_day", write=True)

        from apps.notifications.tasks import send_whatsapp_campaign

        task_fn: Any = send_whatsapp_campaign
        task_fn.delay(
            tenant_id=str(request.tenant.id),
            title=data.title,
            message=data.message,
            segment_id=data.segment_id,
            image_url=data.image_url or "",
        )
        log_action(
            request=request,
            action="CREATE",
            resource_type="campaign",
            details={"channel": data.channel, "segment_id": data.segment_id, "title": data.title},
        )
        return {
            "success": True,
            "message": get_message("CAMPAIGN_WHATSAPP_STARTED", segment=data.segment_id),
        }
    elif data.channel == "sms":
 # LYL-SRS-009: Gate SMS campaigns by plan feature + daily quota
        check_feature_access(request.tenant, "sms_campaigns")
        check_plan_limit(request.tenant, "sms_day", write=True)

        from apps.notifications.sms.tasks import send_sms_campaign

        task_fn: Any = send_sms_campaign
        task_fn.delay(
            tenant_id=str(request.tenant.id),
            title=data.title,
            message=data.message,
            segment_id=data.segment_id,
        )
        log_action(
            request=request,
            action="CREATE",
            resource_type="campaign",
            details={"channel": data.channel, "segment_id": data.segment_id, "title": data.title},
        )
        return {
            "success": True,
            "message": get_message("SMS_CAMPAIGN_STARTED", segment=data.segment_id),
        }
    else:
        raise HttpError(
            400,
            get_message(
                "VALIDATION_ERROR",
                detail="Canal no válido. Usa 'email', 'wallet', 'whatsapp' o 'sms'.",
            ),
        )
