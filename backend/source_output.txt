from __future__ import annotations
"""Campaign listing and creation endpoints."""

from typing import Any

from ninja.errors import HttpError
from pydantic import BaseModel

from apps.notifications.models import Notification, NotificationType
from common.messages import get_message
from common.permissions import is_owner, jwt_auth
from common.plan_enforcement import (
    check_feature_access,
    check_plan_limit,
)

from .base import router


class CampaignOut(BaseModel):
    id: str
    title: str
    message: str
    segment: str
    status: str
    sent_count: int
    created_at: str


class CampaignCreateIn(BaseModel):
    title: str
    message: str
    segment_id: str
    image_url: str | None = ""
    channel: str | None = "email"  # 'email', 'wallet', or 'whatsapp'
    sender_domain: str | None = "loyallia"  # 'loyallia' or 'custom'


@router.get("/campaigns/", auth=jwt_auth, response=dict, summary="Listar campañas")
def list_campaigns(request):
    """List all push campaigns."""
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
def create_campaign(request, data: CampaignCreateIn):
    """Send an email, wallet, or WhatsApp notification campaign to customers in a segment.

    OWNER only. Supports three channels:
    - 'email': Rich HTML email with images
    - 'wallet': Creates notifications that appear when customers check their wallet cards
    - 'whatsapp': WhatsApp campaign via Baileys bridge — messages queued with Gaussian jitter anti-ban
    """
    if not is_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    check_plan_limit(request.tenant, "notifications_month")

    if data.channel == "email":
        # LYL-SRS-008: Gate email campaigns by plan feature + monthly quota
        check_feature_access(request.tenant, "email_campaigns")
        check_plan_limit(request.tenant, "emails_month")

        from apps.notifications.tasks import send_email_campaign

        task_fn: Any = send_email_campaign
        task_fn.delay(
            tenant_id=str(request.tenant.id),
            subject=data.title,
            html_body=data.message,
            segment_id=data.segment_id,
            image_url=data.image_url or "",
        )
        return {
            "success": True,
            "message": get_message("CAMPAIGN_EMAIL_STARTED", segment=data.segment_id),
        }
    elif data.channel == "wallet":
        # LYL-SRS-008: Gate wallet campaigns by plan feature + monthly quota
        check_feature_access(request.tenant, "wallet_campaigns")
        check_plan_limit(request.tenant, "wallet_pushes_month")

        from apps.notifications.tasks import send_wallet_notification_campaign

        task_fn: Any = send_wallet_notification_campaign
        task_fn.delay(
            tenant_id=str(request.tenant.id),
            title=data.title,
            message=data.message,
            segment_id=data.segment_id,
        )
        return {
            "success": True,
            "message": get_message("CAMPAIGN_WALLET_STARTED", segment=data.segment_id),
        }
    elif data.channel == "whatsapp":
        # LYL-SRS-008: Gate WhatsApp campaigns by plan feature + daily quota
        check_feature_access(request.tenant, "whatsapp_campaigns")
        check_plan_limit(request.tenant, "whatsapp_day")

        from apps.notifications.tasks import send_whatsapp_campaign

        task_fn: Any = send_whatsapp_campaign
        task_fn.delay(
            tenant_id=str(request.tenant.id),
            title=data.title,
            message=data.message,
            segment_id=data.segment_id,
            image_url=data.image_url or "",
        )
        return {
            "success": True,
            "message": get_message(
                "CAMPAIGN_WHATSAPP_STARTED", segment=data.segment_id
            ),
        }
    else:
        raise HttpError(
            400,
            get_message(
                "VALIDATION_ERROR",
                detail="Canal no válido. Usa 'email', 'wallet' o 'whatsapp'.",
            ),
        )
