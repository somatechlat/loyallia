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
    # How the user chose the audience: manual | preset | recommended
    target_mode: str = "preset"
    # WhatsApp multi-session routing (channel='whatsapp' only)
    whatsapp_session_id: str | None = None
    whatsapp_fanout: bool = False


SEGMENT_MESSAGE_KEYS = {
    "all": "SEGMENT_ALL",
    "vip": "SEGMENT_VIP",
    "active": "SEGMENT_ACTIVE",
    "at_risk": "SEGMENT_AT_RISK",
    "inactive": "SEGMENT_INACTIVE",
    "new": "SEGMENT_NEW",
}

# Channel → (feature flag, plan limit resource).
_CHANNEL_PLAN_GATES: dict[str, tuple[str, str]] = {
    "email": ("email_campaigns", "emails_month"),
    "wallet": ("wallet_campaigns", "wallet_pushes_month"),
    "whatsapp": ("whatsapp_campaigns", "whatsapp_day"),
    "sms": ("sms_campaigns", "sms_day"),
}


def _enforce_channel_plan_gates(tenant, channel: str) -> None:
    """Apply feature + quota gates for a campaign channel.

    Both the immediate and the scheduled dispatch path MUST call this.
    A scheduled campaign that skipped these checks could fire later for a
    tenant whose plan no longer includes the channel or whose quota is zero.
    """
    gates = _CHANNEL_PLAN_GATES.get(channel)
    if gates is None:
        raise HttpError(
            400,
            get_message("CAMPAIGN_INVALID_CHANNEL"),
        )
    feature, limit_resource = gates
    check_feature_access(tenant, feature)
    check_plan_limit(tenant, limit_resource, write=True)


def _validate_whatsapp_session(tenant, session_id: str | None) -> None:
    """Ensure a WhatsApp campaign's session belongs to this tenant.

    SEC: cross-tenant session ids must not be usable as a send channel.
    """
    if not session_id:
        return
    import uuid

    from apps.notifications.models import WhatsAppSession

    try:
        sid = uuid.UUID(session_id)
    except (ValueError, TypeError):
        raise HttpError(404, get_message("WHATSAPP_SESSION_NOT_FOUND"))
    if not WhatsAppSession.objects.filter(id=sid, tenant=tenant).exists():
        raise HttpError(404, get_message("WHATSAPP_SESSION_NOT_FOUND"))


@router.get(
    "/campaigns/recommendations/",
    auth=jwt_auth,
    response=dict,
    summary="Recomendar audiencia para campaña",
)
def campaign_recommendations(
    request: TenantRequest,
    channel: str = "email",
    program_id: str | None = None,
    rules: str = "",
) -> dict:
    """Rank customers for a campaign. User must still confirm the audience.

    SEC: tenant-scoped read-only. Never sends.
    """
    if not is_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    if channel not in ("email", "wallet", "whatsapp"):
        raise HttpError(400, get_message("CAMPAIGN_INVALID_CHANNEL"))

    from apps.notifications.services.recommendations import recommend_audience

    enabled = [r.strip() for r in (rules or "").split(",") if r.strip()] or None
    return recommend_audience(
        request.tenant,
        channel=channel,
        program_id=program_id or None,
        enabled_rules=enabled,
    )


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
                    "title": run.title or get_message("CAMPAIGN_UNTITLED"),
                    "message": run.message_preview or "",
                    "segment": (
                        get_message(SEGMENT_MESSAGE_KEYS[run.segment_id])
                        if run.segment_id in SEGMENT_MESSAGE_KEYS
                        else (run.segment_id or get_message("SEGMENT_ALL"))
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
                "title": n.title or get_message("CAMPAIGN_UNTITLED"),
                "message": n.message or "",
                "segment": get_message("SEGMENT_ALL"),
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
                get_message_for_request("VALIDATION_INVALID_DATETIME", request),
            )

        if scheduled_time < timezone.now():
            raise HttpError(
                400,
                get_message_for_request("VALIDATION_FUTURE_DATETIME", request),
            )

        channel = data.channel or "email"
        _enforce_channel_plan_gates(tenant, channel)
        if channel == "whatsapp":
            _validate_whatsapp_session(tenant, data.whatsapp_session_id)
        task_kwargs = build_campaign_task_kwargs(
            channel=channel,
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
            whatsapp_session_id=data.whatsapp_session_id,
            whatsapp_fanout=data.whatsapp_fanout,
        )

        schedule_campaign_dispatch(
            channel=channel,
            tenant_id=str(tenant.id),
            kwargs=task_kwargs,
            scheduled_at=scheduled_time,
        )

        log_action(
            request=request,
            action="CREATE",
            resource_type="campaign",
            details={
                "channel": channel,
                "segment_id": data.segment_id,
                "title": data.title,
                "schedule_type": "scheduled",
                "scheduled_at": data.scheduled_at,
                "target_mode": data.target_mode,
                "target_customer_count": len(data.target_customer_ids or []),
            },
        )
        return {
            "success": True,
            "message": get_message("CAMPAIGN_SCHEDULED_SUCCESS"),
            "scheduled_at": data.scheduled_at,
        }

    # -- Immediate dispatch (existing flow) -----------------------------------
    channel = data.channel or "email"
    _enforce_channel_plan_gates(tenant, channel)
    if channel == "whatsapp":
        _validate_whatsapp_session(tenant, data.whatsapp_session_id)
    task_kwargs = build_campaign_task_kwargs(
        channel=channel,
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
        whatsapp_session_id=data.whatsapp_session_id,
        whatsapp_fanout=data.whatsapp_fanout,
    )

    result = dispatch_campaign_immediately(
        channel=channel,
        tenant_id=str(tenant.id),
        kwargs=task_kwargs,
    )

    log_action(
        request=request,
        action="CREATE",
        resource_type="campaign",
        details={
            "channel": channel,
            "segment_id": data.segment_id,
            "title": data.title,
        },
    )
    return result
