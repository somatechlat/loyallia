"""SuperAdmin subscription plan validation.

SEC: Rejects unknown plan feature flags and inconsistent feature/limit pairs
before data reaches SubscriptionPlan persistence.
"""
from __future__ import annotations

from ninja.errors import HttpError

from apps.billing.models import PlanFeature, SubscriptionPlan
from common.messages import get_message

_FEATURE_LIMIT_RULES = {
    PlanFeature.WHATSAPP_CAMPAIGNS: ("max_whatsapp_day",),
    PlanFeature.EMAIL_CAMPAIGNS: ("max_emails_month",),
    PlanFeature.SMS_CAMPAIGNS: ("max_sms_day",),
    PlanFeature.WALLET_CAMPAIGNS: ("max_wallet_pushes_month",),
    PlanFeature.AUTOMATION: ("max_automations", "max_automation_executions_day"),
    PlanFeature.AI_ASSISTANT: ("max_ai_queries_month",),
    PlanFeature.AGENT_API: ("max_api_calls_day",),
    PlanFeature.DATA_EXPORT: ("max_exports_month",),
}


def validate_plan_config(data: dict, changed_fields: set[str] | None = None) -> None:
    """Reject inconsistent plan feature/limit combinations before persisting."""
    features = set(data.get("features") or [])
    allowed_features = set(PlanFeature.ALL_FEATURES)
    unknown = sorted(features - allowed_features)
    if unknown:
        raise HttpError(
            400,
            get_message(
                "VALIDATION_ERROR",
                detail=f"Unknown plan feature(s): {', '.join(unknown)}",
            ),
        )

    validate_all = changed_fields is None
    changed = changed_fields or set()
    for feature, limit_fields in _FEATURE_LIMIT_RULES.items():
        has_feature = feature in features
        for field in limit_fields:
            if not validate_all and "features" not in changed and field not in changed:
                continue
            value = int(data.get(field) or 0)
            if has_feature and value <= 0:
                raise HttpError(
                    400,
                    get_message(
                        "VALIDATION_ERROR",
                        detail=f"{field} must be greater than 0 when {feature} is enabled",
                    ),
                )
            if not has_feature and value > 0:
                raise HttpError(
                    400,
                    get_message(
                        "VALIDATION_ERROR",
                        detail=f"{field} must be 0 when {feature} is disabled",
                    ),
                )

    whatsapp_limit = int(data.get("max_whatsapp_day") or 0)
    if (validate_all or "max_whatsapp_day" in changed) and whatsapp_limit > 200:
        raise HttpError(
            400,
            get_message(
                "VALIDATION_ERROR",
                detail="max_whatsapp_day cannot exceed 200",
            ),
        )


def plan_to_config(plan: SubscriptionPlan) -> dict:
    """Build a validation dict from a persisted plan."""
    return {
        "features": plan.features or [],
        "max_whatsapp_day": plan.max_whatsapp_day,
        "max_emails_month": plan.max_emails_month,
        "max_sms_day": plan.max_sms_day,
        "max_wallet_pushes_month": plan.max_wallet_pushes_month,
        "max_automations": plan.max_automations,
        "max_automation_executions_day": plan.max_automation_executions_day,
        "max_ai_queries_month": plan.max_ai_queries_month,
        "max_api_calls_day": plan.max_api_calls_day,
        "max_exports_month": plan.max_exports_month,
    }
