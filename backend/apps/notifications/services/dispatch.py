"""
Loyallia Campaign Dispatch Service
Business logic extracted from campaign API endpoints.
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any, cast

from celery import current_app as celery_app
from ninja.errors import HttpError

from common.messages import get_message

logger = logging.getLogger("loyallia.notifications")


def get_campaign_task(channel: str):
    """Return the Celery task function for a campaign channel.

    Args:
        channel: The campaign channel ('email', 'wallet', 'whatsapp', 'sms').

    Returns:
        The Celery task function or None if the channel is invalid.
    """
    if channel == "email":
        from apps.notifications.tasks import send_email_campaign

        return send_email_campaign
    elif channel == "wallet":
        from apps.notifications.tasks import send_wallet_notification_campaign

        return send_wallet_notification_campaign
    elif channel == "whatsapp":
        from apps.notifications.tasks import send_whatsapp_campaign

        return send_whatsapp_campaign
    elif channel == "sms":
        from apps.notifications.sms.tasks import send_sms_campaign

        return send_sms_campaign
    return None


def build_campaign_task_kwargs(
    channel: str,
    title: str,
    message: str,
    segment_id: str,
    image_url: str = "",
    wallet_platform: str = "both",
    action_url: str = "",
    target_program_ids: list[str] | None = None,
    target_device_type: str = "both",
    target_wallet_platform: str = "both",
    target_customer_ids: list[str] | None = None,
) -> dict:
    """Build the complete kwargs for a campaign Celery task.

    Args:
        channel: The campaign channel.
        title: Campaign title.
        message: Campaign message.
        segment_id: Target segment ID.
        image_url: Optional image URL.
        wallet_platform: Wallet platform for wallet campaigns.
        action_url: Action URL for wallet campaigns.
        target_program_ids: Optional list of target program IDs.
        target_device_type: Target device type.
        target_wallet_platform: Target wallet platform.
        target_customer_ids: Optional list of target customer IDs.

    Returns:
        Dict of kwargs to pass to the campaign task.
    """
    kwargs: dict[str, Any] = {
        "tenant_id": None,  # filled at dispatch time
        "segment_id": segment_id,
        "target_program_ids": target_program_ids or [],
        "target_device_type": target_device_type,
        "target_wallet_platform": target_wallet_platform,
        "target_customer_ids": target_customer_ids or [],
    }

    if channel == "email":
        kwargs["subject"] = title
        kwargs["html_body"] = message
        kwargs["image_url"] = image_url or ""
    elif channel == "wallet":
        kwargs["title"] = title
        kwargs["message"] = message
        kwargs["wallet_platform"] = wallet_platform
        kwargs["action_url"] = action_url or ""
    elif channel in ("whatsapp", "sms"):
        kwargs["title"] = title
        kwargs["message"] = message
        if channel == "whatsapp":
            kwargs["image_url"] = image_url or ""

    return kwargs


def schedule_campaign_dispatch(channel: str, tenant_id: str, kwargs: dict, scheduled_at: datetime) -> None:
    """Schedule a campaign dispatch via Celery send_task.

    Args:
        channel: The campaign channel.
        tenant_id: The tenant ID string.
        kwargs: Task kwargs.
        scheduled_at: When to execute the task.

    Raises:
        HttpError: If the channel is invalid.
    """
    task_fn = get_campaign_task(channel)
    if task_fn is None:
        raise HttpError(
            400,
            get_message("VALIDATION_ERROR", detail="Canal no válido para programación."),
        )

    kwargs = dict(kwargs)
    kwargs["tenant_id"] = tenant_id

    cast(Any, celery_app).send_task(
        cast(Any, task_fn).name,
        kwargs=kwargs,
        eta=scheduled_at,
    )


def dispatch_campaign_immediately(channel: str, tenant_id: str, kwargs: dict) -> dict:
    """Dispatch a campaign immediately via Celery.

    Args:
        channel: The campaign channel.
        tenant_id: The tenant ID string.
        kwargs: Task kwargs.

    Returns:
        A dict with success and message for the API response.

    Raises:
        HttpError: If the channel is invalid.
    """
    task_fn = get_campaign_task(channel)
    if task_fn is None:
        raise HttpError(
            400,
            get_message(
                "VALIDATION_ERROR",
                detail="Canal no válido. Usa 'email', 'wallet', 'whatsapp' o 'sms'.",
            ),
        )

    kwargs = dict(kwargs)
    kwargs["tenant_id"] = tenant_id
    task_fn.delay(**kwargs)  # type: ignore[reportCallIssue]

    if channel == "email":
        return {
            "success": True,
            "message": get_message("CAMPAIGN_EMAIL_STARTED", segment=kwargs.get("segment_id", "")),
        }
    elif channel == "wallet":
        return {
            "success": True,
            "message": get_message("CAMPAIGN_WALLET_STARTED", segment=kwargs.get("segment_id", "")),
        }
    elif channel == "whatsapp":
        return {
            "success": True,
            "message": get_message("CAMPAIGN_WHATSAPP_STARTED", segment=kwargs.get("segment_id", "")),
        }
    elif channel == "sms":
        return {
            "success": True,
            "message": get_message("SMS_CAMPAIGN_STARTED", segment=kwargs.get("segment_id", "")),
        }

    raise HttpError(
        400,
        get_message(
            "VALIDATION_ERROR",
            detail="Canal no válido. Usa 'email', 'wallet', 'whatsapp' o 'sms'.",
        ),
    )
