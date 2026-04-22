"""
Loyallia — Billing API Router (REQ-PAY-001, REQ-PLAN-001)
Subscription management with pluggable payment gateway.
Plans are DB-driven via SubscriptionPlan model.
"""

import logging

from django.http import HttpRequest
from django.shortcuts import get_object_or_404
from django.utils import timezone
from ninja import Router
from ninja.errors import HttpError

from apps.billing.models import (
    PaymentMethod,
    Subscription,
    SubscriptionPlan,
    SubscriptionStatus,
)
from apps.billing.payment_gateway import PaymentGatewayError, get_payment_gateway
from apps.billing.schemas import (
    SubscribeSchema,
    UpdateSubscriptionSchema,
)
from common.messages import get_message
from common.permissions import jwt_auth, require_role

logger = logging.getLogger("loyallia.billing")

router = Router()


# ============================================================================
# Plans (DB-driven — REQ-PLAN-001)
# ============================================================================


@router.get("/plans/", auth=jwt_auth, summary="Planes disponibles")
def list_plans(request: HttpRequest):
    """Return all active subscription plans from the database."""
    from decimal import Decimal

    from django.conf import settings

    tax_rate = Decimal(str(getattr(settings, "TAX_RATE_ECUADOR", "0.15")))
    trial_days = getattr(settings, "TRIAL_DAYS", 5)

    plans = SubscriptionPlan.objects.filter(is_active=True)
    result = []

    for plan in plans:
        annual_monthly = (
            (plan.price_annual / 12).quantize(Decimal("0.01"))
            if plan.price_annual > 0
            else Decimal("0.00")
        )
        result.append(
            {
                "id": str(plan.id),
                "slug": plan.slug,
                "name": plan.name,
                "description": plan.description,
                "price_monthly": float(plan.price_monthly),
                "price_monthly_with_tax": float(plan.price_monthly_with_tax),
                "price_annual": float(plan.price_annual),
                "price_annual_with_tax": float(plan.price_annual_with_tax),
                "price_annual_per_month": float(annual_monthly),
                "tax_rate": float(tax_rate),
                "currency": "USD",
                "trial_days": plan.trial_days or trial_days,
                "is_featured": plan.is_featured,
                "features": plan.features or [],
                "limits": {
                    "max_locations": plan.max_locations,
                    "max_users": plan.max_users,
                    "max_customers": plan.max_customers,
                    "max_programs": plan.max_programs,
                    "max_notifications_month": plan.max_notifications_month,
                    "max_transactions_month": plan.max_transactions_month,
                },
            }
        )

    return {"plans": result}


# ============================================================================
# Subscription Management
# ============================================================================


@router.get("/subscription/", auth=jwt_auth, summary="Obtener suscripción actual")
def get_subscription(request: HttpRequest):
    """Get the current tenant's subscription details."""
    subscription, _ = Subscription.objects.get_or_create(
        tenant=request.tenant,
        defaults={"plan": "trial"},
    )

    plan = subscription.subscription_plan
    default_pm = PaymentMethod.objects.filter(
        tenant=request.tenant,
        is_default=True,
        is_active=True,
    ).first()

    return {
        "id": str(subscription.id),
        "plan": subscription.plan,
        "plan_name": plan.name if plan else subscription.plan,
        "plan_slug": plan.slug if plan else subscription.plan,
        "billing_cycle": subscription.billing_cycle,
        "status": subscription.status,
        "status_display": subscription.get_status_display(),
        "is_access_allowed": subscription.is_access_allowed,
        "trial_start": (
            subscription.trial_start.isoformat()
            if subscription.trial_start
            else None
        ),
        "trial_end": (
            subscription.trial_end.isoformat()
            if subscription.trial_end
            else None
        ),
        "days_until_trial_end": subscription.days_until_trial_end,
        "current_period_start": (
            subscription.current_period_start.isoformat()
            if subscription.current_period_start
            else None
        ),
        "current_period_end": (
            subscription.current_period_end.isoformat()
            if subscription.current_period_end
            else None
        ),
        "cancel_at_period_end": subscription.cancel_at_period_end,
        "features": plan.features if plan else [],
        "payment_method": (
            {
                "id": str(default_pm.id),
                "brand": default_pm.card_brand,
                "last_four": default_pm.card_last_four,
                "display": default_pm.display_name,
            }
            if default_pm
            else None
        ),
    }


# ============================================================================
# Usage (reads from SubscriptionPlan — REQ-PLAN-002)
# ============================================================================


@router.get("/usage/", auth=jwt_auth, summary="Uso actual del plan")
def get_usage(request: HttpRequest):
    """Return current plan usage metrics with real limits from SubscriptionPlan."""
    from apps.cards.models import Card
    from apps.customers.models import Customer
    from apps.notifications.models import Notification
    from apps.transactions.models import Transaction

    tenant = request.tenant
    now = timezone.now()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    total_customers = Customer.objects.filter(tenant=tenant).count()
    total_programs = Card.objects.filter(tenant=tenant).count()
    total_users = tenant.users.filter(is_active=True).count()
    total_locations = tenant.locations.count()
    monthly_txns = Transaction.objects.filter(
        tenant=tenant, created_at__gte=month_start
    ).count()
    monthly_notifs = Notification.objects.filter(
        tenant=tenant, created_at__gte=month_start
    ).count()

    # Read limits from subscription plan (not hardcoded)
    subscription = Subscription.objects.filter(tenant=tenant).first()

    def _limit(resource: str) -> int:
        if subscription:
            return subscription.get_limit(resource)
        return 0

    def _pct(used: int, limit: int) -> float:
        if limit <= 0 or limit >= 999999:
            return 0.0
        return min(round(used / limit * 100, 1), 100.0)

    limits = {
        "customers": {
            "used": total_customers,
            "limit": _limit("customers"),
            "percentage": _pct(total_customers, _limit("customers")),
            "is_over_limit": total_customers >= _limit("customers"),
        },
        "programs": {
            "used": total_programs,
            "limit": _limit("programs"),
            "percentage": _pct(total_programs, _limit("programs")),
            "is_over_limit": total_programs >= _limit("programs"),
        },
        "users": {
            "used": total_users,
            "limit": _limit("users"),
            "percentage": _pct(total_users, _limit("users")),
            "is_over_limit": total_users >= _limit("users"),
        },
        "locations": {
            "used": total_locations,
            "limit": _limit("locations"),
            "percentage": _pct(total_locations, _limit("locations")),
            "is_over_limit": total_locations >= _limit("locations"),
        },
        "transactions_month": {
            "used": monthly_txns,
            "limit": _limit("transactions_month"),
            "percentage": _pct(monthly_txns, _limit("transactions_month")),
            "is_over_limit": monthly_txns >= _limit("transactions_month"),
        },
        "notifications_month": {
            "used": monthly_notifs,
            "limit": _limit("notifications_month"),
            "percentage": _pct(monthly_notifs, _limit("notifications_month")),
            "is_over_limit": monthly_notifs >= _limit("notifications_month"),
        },
    }

    plan = subscription.subscription_plan if subscription else None

    return {
        "status": "ok",
        "plan_name": plan.name if plan else "Trial",
        "plan_slug": plan.slug if plan else "trial",
        "is_access_allowed": subscription.is_access_allowed if subscription else False,
        "features": plan.features if plan else [],
        "limits": limits,
    }


# ============================================================================
# Subscribe (via payment gateway — REQ-PAY-002)
# ============================================================================


@router.post("/subscribe/", auth=jwt_auth, summary="Suscribirse a un plan")
@require_role("OWNER")
def subscribe(request: HttpRequest, data: SubscribeSchema):
    """
    Subscribe tenant to a plan via the configured payment gateway.
    Frontend tokenizes the card via gateway JS SDK and sends the token.
    """
    if data.billing_cycle not in ("monthly", "annual"):
        raise HttpError(400, get_message("BILLING_INVALID_CYCLE"))

    # Resolve the target plan
    plan = SubscriptionPlan.objects.filter(
        slug=data.plan_slug, is_active=True
    ).first()
    if not plan:
        raise HttpError(404, get_message("NOT_FOUND"))

    gateway = get_payment_gateway()

    try:
        subscription, _ = Subscription.objects.get_or_create(
            tenant=request.tenant,
            defaults={"plan": plan.slug},
        )
        subscription.subscription_plan = plan
        subscription.billing_cycle = data.billing_cycle

        # Store payment method
        if data.card_token:
            PaymentMethod.objects.filter(
                tenant=request.tenant, is_default=True
            ).update(is_default=False)
            PaymentMethod.objects.create(
                tenant=request.tenant,
                gateway_token=data.card_token,
                card_brand=data.card_brand,
                card_last_four=data.card_last_four,
                card_exp_month=data.card_exp_month,
                card_exp_year=data.card_exp_year,
                cardholder_name=data.cardholder_name,
                is_default=True,
            )

        # Activate subscription
        subscription.activate_paid()
        logger.info(
            "Tenant %s subscribed to plan %s (%s)",
            request.tenant.slug,
            plan.name,
            data.billing_cycle,
        )

        return {
            "success": True,
            "message": get_message("BILLING_SUBSCRIPTION_CREATED"),
            "subscription": {
                "plan": plan.slug,
                "plan_name": plan.name,
                "status": subscription.status,
                "billing_cycle": subscription.billing_cycle,
                "current_period_end": (
                    subscription.current_period_end.isoformat()
                    if subscription.current_period_end
                    else None
                ),
            },
        }

    except PaymentGatewayError as exc:
        logger.error(
            "Subscribe failed for %s: %s", request.tenant.slug, exc.message
        )
        raise HttpError(402, exc.message)


# ============================================================================
# Update & Cancel
# ============================================================================


@router.put("/subscription/", auth=jwt_auth, summary="Actualizar suscripción")
@require_role("OWNER")
def update_subscription(request: HttpRequest, data: UpdateSubscriptionSchema):
    """Update billing cycle or schedule cancellation."""
    subscription = get_object_or_404(Subscription, tenant=request.tenant)

    if data.billing_cycle is not None:
        if data.billing_cycle not in ("monthly", "annual"):
            raise HttpError(400, get_message("BILLING_INVALID_CYCLE"))
        subscription.billing_cycle = data.billing_cycle

    if data.cancel_at_period_end is not None:
        subscription.cancel_at_period_end = data.cancel_at_period_end

    subscription.save()

    return {
        "success": True,
        "message": get_message("BILLING_SUBSCRIPTION_UPDATED"),
    }


@router.post(
    "/subscription/cancel/", auth=jwt_auth, summary="Cancelar suscripción"
)
@require_role("OWNER")
def cancel_subscription(request: HttpRequest):
    """Cancel subscription at end of current period."""
    subscription = get_object_or_404(Subscription, tenant=request.tenant)

    if subscription.status == SubscriptionStatus.CANCELED:
        raise HttpError(400, get_message("BILLING_ALREADY_CANCELED"))

    # Cancel in payment gateway if active
    if subscription.gateway_subscription_id:
        try:
            gateway = get_payment_gateway()
            gateway.cancel_subscription(subscription.gateway_subscription_id)
        except PaymentGatewayError as exc:
            logger.error("Cancel failed in gateway: %s", exc.message)

    subscription.cancel()

    return {
        "success": True,
        "message": get_message("BILLING_CANCEL_SCHEDULED"),
        "effective_date": (
            subscription.current_period_end.isoformat()
            if subscription.current_period_end
            else None
        ),
    }


@router.post(
    "/subscription/reactivate/",
    auth=jwt_auth,
    summary="Reactivar suscripción",
)
@require_role("OWNER")
def reactivate_subscription(request: HttpRequest):
    """Reactivate a canceled-but-not-yet-expired subscription."""
    subscription = get_object_or_404(Subscription, tenant=request.tenant)

    if not subscription.cancel_at_period_end:
        raise HttpError(400, get_message("BILLING_NOT_PENDING_CANCEL"))

    subscription.cancel_at_period_end = False
    subscription.save(update_fields=["cancel_at_period_end", "updated_at"])

    return {
        "success": True,
        "message": get_message("BILLING_REACTIVATED"),
    }
