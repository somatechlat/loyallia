"""Fire-time plan gates for campaign Celery tasks.

Scheduled campaigns are enqueued with an ETA. HTTP create-time gates can be
bypassed after a plan change, so every campaign task MUST call
``enforce_fire_time_plan_gate`` before sending.
"""

from __future__ import annotations

import logging

from ninja.errors import HttpError

logger = logging.getLogger("loyallia.notifications")

# Channel → (feature flag, plan limit resource). Mirrors api/campaigns.py.
CHANNEL_PLAN_GATES: dict[str, tuple[str, str]] = {
    "email": ("email_campaigns", "emails_month"),
    "wallet": ("wallet_campaigns", "wallet_pushes_month"),
    "whatsapp": ("whatsapp_campaigns", "whatsapp_day"),
    "sms": ("sms_campaigns", "sms_day"),
}


def enforce_fire_time_plan_gate(tenant, channel: str) -> str | None:
    """Re-check feature + quota at Celery fire time.

    Returns None when the gate passes, or a Spanish error message string when
    the tenant is no longer allowed to send this channel. Never raises —
    scheduled tasks must fail closed without killing the worker.
    """
    from common.messages import get_message
    from common.plan_enforcement import check_feature_access, check_plan_limit

    gates = CHANNEL_PLAN_GATES.get(channel)
    if gates is None:
        return get_message("CAMPAIGN_INVALID_CHANNEL")

    feature, limit_resource = gates
    try:
        check_feature_access(tenant, feature)
        check_plan_limit(tenant, limit_resource, write=True)
    except HttpError as exc:
        logger.warning(
            "Fire-time plan gate blocked %s campaign for tenant %s: %s",
            channel,
            getattr(tenant, "id", None),
            exc.message,
        )
        return exc.message
    return None
