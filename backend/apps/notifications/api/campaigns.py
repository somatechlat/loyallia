"""Campaign listing and creation endpoints."""

from __future__ import annotations

from datetime import datetime

from ninja.errors import HttpError
from pydantic import BaseModel

from apps.audit.service import log_action
from apps.notifications.models import CampaignRun, Notification, NotificationType
from apps.notifications.services.dispatch import (
    build_campaign_task_kwargs,
    dispatch_campaign_immediately,
    schedule_campaign_dispatch,
)
from common.messages import get_message, get_message_for_request
from common.permissions import is_owner, jwt_auth
from common.plan_enforcement import (
    check_feature_access,
    check_plan_limit,
    require_active_subscription,
)
from common.request import TenantRequest, require_tenant

from .base import router


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class CampaignOut(BaseModel):
    """Schema for campaign list responses."""

    id: str
    title: str
    message: str
    segment: str
    status: str
    sent_count: int
    created_at: str
    channel: str | None = None


class CampaignCreateIn(BaseModel):
    """Schema for creating a new marketing campaign."""

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
    target_program_ids: list[str] = []
    target_device_type: str = "both"
    target_wallet_platform: str = "both"
    target_customer_ids: list[str] = []


SEGMENT_NAMES = {
    "all": "Todos los clientes",
    "vip": "VIP",
    "active": "Activos",
    "at_risk": "En riesgo",
    "inactive": "Inactivos",
    "new": "Nuevos",
}


@router.get("/campaigns/", auth=jwt_auth, response=dict, summary="Listar campañas")
def list_campaigns(request: TenantRequest) -> dict:
    """List all push campaigns."""
    if not is_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))

    runs = CampaignRun.objects.filter(tenant=request.tenant).order_by("-created_at")[
        :50
    ]
    if runs:
        return {
            "campaigns": [
                {
                    "id": str(run.id),
                    "title": run.title or "Sin título",
                    "message": run.message_preview or "",
                    "segment": SEGMENT_NAMES.get(
                        run.segment_id, run.segment_id or "all"
                    ),
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
@require_active_subscription
def create_campaign(request: TenantRequest, data: CampaignCreateIn) -> dict:
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
    tenant = require_tenant(request)
    check_plan_limit(tenant, "notifications_month", write=True)

    # -- Scheduled campaign support -------------------------------------------
    if data.schedule_type == "scheduled" and data.scheduled_at:
        from django.utils import timezone

        try:
            scheduled_time = datetime.fromisoformat(
                data.scheduled_at.replace("Z", "+00:00")
            )
        except ValueError:
            raise HttpError(
                400,
                get_message_for_request(
                    "VALIDATION_INVALID_DATETIME", request
                ),
            )

        if scheduled_time < timezone.now():
            raise HttpError(
                400,
                get_message_for_request(
                    "VALIDATION_FUTURE_DATETIME", request
                ),
            )

        task_kwargs = build_campaign_task_kwargs(
            channel=data.channel,
            title=data.title,
            message=data.message,
            segment_id=data.segment_id,
            image_url=data.image_url or "",
            wallet_platform=data.wallet_platform,
            action_url=data.action_url or "",
            target_program_ids=data.target_program_ids,
            target_device_type=data.target_device_type,
            target_wallet_platform=data.target_wallet_platform,
            target_customer_ids=data.target_customer_ids,
        )

        schedule_campaign_dispatch(
            channel=data.channel,
            tenant_id=str(tenant.id),
            kwargs=task_kwargs,
            scheduled_at=scheduled_time,
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
            "message": get_message("CAMPAIGN_SCHEDULED_SUCCESS"),
            "scheduled_at": data.scheduled_at,
        }

    # -- Immediate dispatch (existing flow) -----------------------------------
    task_kwargs = build_campaign_task_kwargs(
        channel=data.channel,
        title=data.title,
        message=data.message,
        segment_id=data.segment_id,
        image_url=data.image_url or "",
        wallet_platform=data.wallet_platform,
        action_url=data.action_url or "",
        target_program_ids=data.target_program_ids,
        target_device_type=data.target_device_type,
        target_wallet_platform=data.target_wallet_platform,
        target_customer_ids=data.target_customer_ids,
    )

    if data.channel == "email":
        check_feature_access(tenant, "email_campaigns")
        check_plan_limit(tenant, "emails_month", write=True)
    elif data.channel == "wallet":
        check_feature_access(tenant, "wallet_campaigns")
        check_plan_limit(tenant, "wallet_pushes_month", write=True)
    elif data.channel == "whatsapp":
        check_feature_access(tenant, "whatsapp_campaigns")
        check_plan_limit(tenant, "whatsapp_day", write=True)
    elif data.channel == "sms":
        check_feature_access(tenant, "sms_campaigns")
        check_plan_limit(tenant, "sms_day", write=True)
    else:
        raise HttpError(
            400,
            get_message_for_request(
                "CAMPAIGN_INVALID_CHANNEL", request
            ),
        )

    result = dispatch_campaign_immediately(
        channel=data.channel,
        tenant_id=str(tenant.id),
        kwargs=task_kwargs,
    )

    log_action(
        request=request,
        action="CREATE",
        resource_type="campaign",
        details={
            "channel": data.channel,
            "segment_id": data.segment_id,
            "title": data.title,
        },
    )
    return result
