"""
Loyallia — Billing API Router
Subscription management and payment processing via Claro Pay Ecuador.
"""

import logging

from django.http import HttpRequest
from django.shortcuts import get_object_or_404
from django.utils import timezone
from ninja import Router
from ninja.errors import HttpError

from apps.billing.claro_pay_service import ClaroPayError, claro_pay_service
from apps.billing.models import (
    BillingPlan,
    PaymentMethod,
    Subscription,
    SubscriptionStatus,
)
from apps.billing.schemas import (
    SubscribeSchema,
    UpdateSubscriptionSchema,
)
from common.messages import get_message
from common.permissions import jwt_auth, require_role

logger = logging.getLogger("loyallia.billing")

router = Router()


# ============================================================================
# Plans
# ============================================================================


@router.get("/plans/", auth=jwt_auth, summary="Planes disponibles")
def list_plans(request: HttpRequest):
    """Return available billing plans with pricing."""
    from decimal import Decimal

    from django.conf import settings

    price = Decimal(settings.PLAN_FULL_PRICE_USD)
    tax_rate = Decimal(str(settings.TAX_RATE_ECUADOR))
    tax = (price * tax_rate).quantize(Decimal("0.01"))
    annual_monthly = (price * 10 / 12).quantize(Decimal("0.01"))

    return {
        "plans": [
            {
                "plan": "trial",
                "display_name": "Trial Gratuito",
                "price_monthly": 0.0,
                "price_annual": 0.0,
                "tax_rate": float(tax_rate),
                "duration_days": settings.TRIAL_DAYS,
                "features": [
                    "Todas las funcionalidades FULL",
                    "Sin tarjeta de crédito",
                    f"{settings.TRIAL_DAYS} días gratis",
                    "10 tipos de tarjetas de fidelización",
                    "Clientes ilimitados",
                    "Transacciones ilimitadas",
                    "Notificaciones push ilimitadas",
                ],
            },
            {
                "plan": "full",
                "display_name": "FULL",
                "price_monthly": float(price),
                "price_monthly_with_tax": float(price + tax),
                "price_annual": float(price * 10),
                "price_annual_with_tax": float((price * 10) + (price * 10 * tax_rate)),
                "price_annual_per_month": float(annual_monthly),
                "tax_rate": float(tax_rate),
                "currency": "USD",
                "features": [
                    "10 tipos de tarjetas de fidelización",
                    "Clientes ilimitados",
                    "Transacciones ilimitadas",
                    "Notificaciones push ilimitadas",
                    "Geo-fencing",
                    "Automatización inteligente",
                    "Analítica avanzada",
                    "Soporte prioritario",
                    "Cuentas de gerente",
                ],
            },
        ],
    }


# ============================================================================
# Subscription Management
# ============================================================================
@router.get("/subscription/", auth=jwt_auth, summary="Obtener suscripción actual")
def get_subscription(request: HttpRequest):
    """Get the current tenant's subscription details."""
    subscription, created = Subscription.objects.get_or_create(
        tenant=request.tenant,
        defaults={"plan": BillingPlan.TRIAL},
    )

    # Get default payment method
    default_pm = PaymentMethod.objects.filter(
        tenant=request.tenant,
        is_default=True,
        is_active=True,
    ).first()

    return {
        "id": str(subscription.id),
        "plan": subscription.plan,
        "plan_display": subscription.get_plan_display(),
        "billing_cycle": subscription.billing_cycle,
        "status": subscription.status,
        "status_display": subscription.get_status_display(),
        "is_access_allowed": subscription.is_access_allowed,
        "trial_start": (
            subscription.trial_start.isoformat() if subscription.trial_start else None
        ),
        "trial_end": (
            subscription.trial_end.isoformat() if subscription.trial_end else None
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
        "monthly_price": float(subscription.monthly_price),
        "monthly_total_with_tax": float(subscription.monthly_total_with_tax),
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


@router.get("/usage/", auth=jwt_auth, summary="Uso actual del plan")
def get_usage(request: HttpRequest):
    """Return current plan usage metrics for the tenant."""

    from apps.cards.models import Card
    from apps.customers.models import Customer
    from apps.notifications.models import Notification
    from apps.transactions.models import Transaction

    tenant = request.tenant
    now = timezone.now()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    total_customers = Customer.objects.filter(tenant=tenant).count()
    total_programs = Card.objects.filter(tenant=tenant).count()
    monthly_txns = Transaction.objects.filter(
        tenant=tenant, created_at__gte=month_start
    ).count()
    monthly_notifs = Notification.objects.filter(
        tenant=tenant, created_at__gte=month_start
    ).count()

    # FULL plan = unlimited, but we show usage for visibility
    limits = {
        "clientes": {
            "used": total_customers,
            "limit": 999999,
            "percentage": min(total_customers / 1000 * 100, 100),
        },
        "programas": {
            "used": total_programs,
            "limit": 50,
            "percentage": min(total_programs / 50 * 100, 100),
        },
        "transacciones_mes": {
            "used": monthly_txns,
            "limit": 999999,
            "percentage": min(monthly_txns / 10000 * 100, 100),
        },
        "notificaciones_mes": {
            "used": monthly_notifs,
            "limit": 999999,
            "percentage": min(monthly_notifs / 5000 * 100, 100),
        },
    }

    return {
        "status": "ok",
        "limits": limits,
    }


@router.post("/subscribe/", auth=jwt_auth, summary="Suscribirse al plan FULL")
@require_role("OWNER")
def subscribe(request: HttpRequest, data: SubscribeSchema):
    """
    Subscribe tenant to the FULL plan via Claro Pay.
    Requires OWNER role. Frontend tokenizes the card via Claro Pay JS SDK
    and sends the token here.
    """
    if data.billing_cycle not in ("monthly", "annual"):
        raise HttpError(400, get_message("BILLING_INVALID_CYCLE"))

    try:
        subscription = claro_pay_service.subscribe_tenant(
            tenant=request.tenant,
            card_token=data.card_token,
            card_brand=data.card_brand,
            card_last_four=data.card_last_four,
            card_exp_month=data.card_exp_month,
            card_exp_year=data.card_exp_year,
            cardholder_name=data.cardholder_name,
            billing_cycle=data.billing_cycle,
        )

        return {
            "success": True,
            "message": get_message("BILLING_SUBSCRIPTION_CREATED"),
            "subscription": {
                "plan": subscription.plan,
                "status": subscription.status,
                "current_period_end": (
                    subscription.current_period_end.isoformat()
                    if subscription.current_period_end
                    else None
                ),
            },
        }

    except ClaroPayError as exc:
        logger.error("Subscribe failed for %s: %s", request.tenant.slug, exc.message)
        raise HttpError(402, exc.message)


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


@router.post("/subscription/cancel/", auth=jwt_auth, summary="Cancelar suscripción")
@require_role("OWNER")
def cancel_subscription(request: HttpRequest):
    """Cancel subscription at end of current period."""
    subscription = get_object_or_404(Subscription, tenant=request.tenant)

    if subscription.status == SubscriptionStatus.CANCELED:
        raise HttpError(400, get_message("BILLING_ALREADY_CANCELED"))

    # Cancel in Claro Pay if there is an active subscription
    if subscription.claro_pay_subscription_id:
        try:
            claro_pay_service.cancel_subscription(
                subscription.claro_pay_subscription_id,
            )
        except ClaroPayError as exc:
            logger.error("Cancel failed in Claro Pay: %s", exc.message)
            # Still mark locally — Claro Pay may retry later
            pass

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
    "/subscription/reactivate/", auth=jwt_auth, summary="Reactivar suscripción"
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
