"""
Loyallia Super Admin API: Subscription Plan CRUD
"""

import logging
import uuid
from decimal import Decimal

from django.http import HttpRequest
from ninja import Router
from ninja.errors import HttpError

from apps.billing.models import Subscription, SubscriptionPlan, SubscriptionStatus
from apps.tenants.super_admin_api.plan_validation import (
    plan_to_config,
    validate_plan_config,
)
from apps.tenants.super_admin_api.schemas import (
    MessageOut,
    PlanCreateIn,
    PlanOut,
    PlanUpdateIn,
)
from common.messages import get_message
from common.permissions import jwt_auth

logger = logging.getLogger(__name__)
router = Router()


def _require_super_admin(request) -> None:
    from common.permissions import is_super_admin

    if not is_super_admin(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))


@router.get("/plans/", auth=jwt_auth, response=list[PlanOut])
def list_plans(request: HttpRequest) -> list[PlanOut]:
    """List all subscription plans."""
    _require_super_admin(request)
    return [PlanOut.from_plan(p) for p in SubscriptionPlan.objects.all()]


@router.post("/plans/", auth=jwt_auth, response=PlanOut)
def create_plan(request: HttpRequest, payload: PlanCreateIn) -> PlanOut:
    """Create a new subscription plan."""
    _require_super_admin(request)
    validate_plan_config(payload.model_dump())
    plan = SubscriptionPlan.objects.create(
        name=payload.name,
        slug=payload.slug,
        description=payload.description,
        price_monthly=Decimal(str(payload.price_monthly)),
        price_annual=Decimal(str(payload.price_annual)),
        max_locations=payload.max_locations,
        max_users=payload.max_users,
        max_customers=payload.max_customers,
        max_programs=payload.max_programs,
        max_notifications_month=payload.max_notifications_month,
        max_transactions_month=payload.max_transactions_month,
        max_whatsapp_day=payload.max_whatsapp_day,
        max_emails_month=payload.max_emails_month,
        max_sms_day=payload.max_sms_day,
        max_wallet_pushes_month=payload.max_wallet_pushes_month,
        max_automations=payload.max_automations,
        max_automation_executions_day=payload.max_automation_executions_day,
        max_ai_queries_month=payload.max_ai_queries_month,
        max_api_calls_day=payload.max_api_calls_day,
        max_exports_month=payload.max_exports_month,
        features=payload.features,
        status=payload.status,
        is_featured=payload.is_featured,
        trial_days=payload.trial_days,
        sort_order=payload.sort_order,
    )
    logger.info("SUPER_ADMIN %s created plan %s", request.user.email, plan.name)
    return PlanOut.from_plan(plan)


@router.delete("/plans/{plan_id}/", auth=jwt_auth, response=MessageOut)
def delete_plan(request: HttpRequest, plan_id: str) -> MessageOut:
    """Soft-delete a subscription plan if it has no active subscriptions."""
    _require_super_admin(request)
    try:
        plan = SubscriptionPlan.objects.get(id=uuid.UUID(plan_id))
    except (SubscriptionPlan.DoesNotExist, ValueError):
        raise HttpError(404, get_message("NOT_FOUND"))

    active_subs = Subscription.objects.filter(
        subscription_plan=plan,
        status__in=[SubscriptionStatus.TRIALING, SubscriptionStatus.ACTIVE],
    ).count()
    if active_subs > 0:
        raise HttpError(
            409,
            get_message(
                "ADMIN_PLAN_HAS_SUBSCRIPTIONS",
                name=plan.name,
                count=active_subs,
            ),
        )

    plan.is_active = False
    plan.status = SubscriptionPlan.Status.ARCHIVED
    plan.save(update_fields=["is_active", "status", "updated_at"])
    return MessageOut(success=True, message=get_message("ADMIN_PLAN_DEACTIVATED"))


@router.patch("/plans/{plan_id}/", auth=jwt_auth, response=PlanOut)
def update_plan(request: HttpRequest, plan_id: str, payload: PlanUpdateIn) -> PlanOut:
    """Updates an existing subscription plan."""
    _require_super_admin(request)
    try:
        plan = SubscriptionPlan.objects.get(id=uuid.UUID(plan_id))
    except (SubscriptionPlan.DoesNotExist, ValueError):
        raise HttpError(404, get_message("NOT_FOUND"))

    updates = payload.model_dump(exclude_none=True)
    candidate = plan_to_config(plan)
    candidate.update(updates)
    validate_plan_config(candidate, changed_fields=set(updates))

    update_fields = ["updated_at"]
    for field in [
        "name",
        "description",
        "max_locations",
        "max_users",
        "max_customers",
        "max_programs",
        "max_notifications_month",
        "max_transactions_month",
        "max_whatsapp_day",
        "max_emails_month",
        "max_sms_day",
        "max_wallet_pushes_month",
        "max_automations",
        "max_automation_executions_day",
        "max_ai_queries_month",
        "max_api_calls_day",
        "max_exports_month",
        "features",
        "is_featured",
        "status",
        "is_active",
        "trial_days",
        "sort_order",
    ]:
        value = getattr(payload, field, None)
        if value is not None:
            setattr(plan, field, value)
            update_fields.append(field)

    if payload.price_monthly is not None:
        plan.price_monthly = Decimal(str(payload.price_monthly))
        update_fields.append("price_monthly")
    if payload.price_annual is not None:
        plan.price_annual = Decimal(str(payload.price_annual))
        update_fields.append("price_annual")

    plan.save(update_fields=update_fields)
    logger.info("SUPER_ADMIN %s updated plan %s", request.user.email, plan.name)
    return PlanOut.from_plan(plan)
