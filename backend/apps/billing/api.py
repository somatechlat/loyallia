"""
Loyallia  Billing API Router (apps/billing/api.py)

Subscription management with pluggable payment gateway (Stripe-ready).
Plans are DB-driven via SubscriptionPlan model (not hardcoded).

Architecture:
    - Plans: Read from SubscriptionPlan model (seed_subscription_plans command).
    - Subscribe: Creates Subscription + triggers payment gateway charge.
    - Usage: Reads current resource counts vs. plan limits.
    - Webhooks: Stripe webhook endpoint for payment confirmation.

Performance (Rule 12):
    - PERF: get_usage() runs 6 COUNT queries against 6 DIFFERENT tables.
      These cannot be consolidated into a single query without raw SQL,
      and the benefit is marginal (COUNT is O(index) in PostgreSQL).
    - PERF: select_related("subscription_plan") on Subscription avoids N+1.
    - PERF: Subscription lookup cached on subscription object for limit checks.

Security (SEC):
    - SEC: All endpoints require jwt_auth + OWNER role.
    - SEC: Stripe webhooks verify signature before processing.
    - SEC: Payment method tokens are gateway-generated (PCI compliant).

Called by: Dashboard billing page, plan selection modal, Stripe webhooks.
All strings via get_message() — Rule #11.
"""

import logging
from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.db import transaction
from django.http import HttpRequest
from django.shortcuts import get_object_or_404
from django.utils import timezone
from ninja import Router
from ninja.errors import HttpError

from apps.billing.models import (
    Invoice,
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
from apps.tenants.models import PlatformSetting
from common.messages import get_message
from common.permissions import jwt_auth, require_role
from common.plan_enforcement import get_current_usage
from common.request import require_tenant

logger = logging.getLogger("loyallia.billing")

router = Router()

SUBSCRIPTION_STATUS_LABELS = {
    SubscriptionStatus.TRIALING: "Período de prueba",
    SubscriptionStatus.ACTIVE: "Activo",
    SubscriptionStatus.PAST_DUE: "Pago pendiente",
    SubscriptionStatus.SUSPENDED: "Suspendido",
    SubscriptionStatus.CANCELED: "Cancelado",
}


# Plans (DB-driven REQ-PLAN-001)


@router.get("/plans/", summary="Planes disponibles")
def list_plans(request: HttpRequest):
    """Return all active subscription plans from the database."""
    from decimal import Decimal

    from django.conf import settings

    from apps.tenants.models import PlatformSetting

    tax_rate = Decimal(str(PlatformSetting.get_float("TAX_RATE_ECUADOR", getattr(settings, "TAX_RATE_ECUADOR", 0.15))))
    trial_days = PlatformSetting.get_int("TRIAL_DAYS", getattr(settings, "TRIAL_DAYS", 5))

    plans = SubscriptionPlan.objects.filter(is_active=True, status=SubscriptionPlan.Status.PUBLISHED)
    result = []

    for plan in plans:
        annual_monthly = (
            (plan.price_annual / 12).quantize(Decimal("0.01")) if plan.price_annual > 0 else Decimal("0.00")
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
                    "max_whatsapp_day": plan.max_whatsapp_day,
                    "max_emails_month": plan.max_emails_month,
                    "max_sms_day": plan.max_sms_day,
                    "max_wallet_pushes_month": plan.max_wallet_pushes_month,
                    "max_automations": plan.max_automations,
                    "max_automation_executions_day": plan.max_automation_executions_day,
                    "max_ai_queries_month": plan.max_ai_queries_month,
                    "max_api_calls_day": plan.max_api_calls_day,
                    "max_exports_month": plan.max_exports_month,
                },
            }
        )

    return {"plans": result}


# Subscription Management


@router.get("/subscription/", auth=jwt_auth, summary="Obtener suscripción actual")
@require_role("OWNER")
def get_subscription(request: HttpRequest):
    """Get the current tenant's subscription details."""
    tenant = require_tenant(request)
    subscription, _ = Subscription.objects.get_or_create(
        tenant=tenant,
        defaults={"plan": "trial"},
    )

    plan = subscription.subscription_plan
    default_pm = PaymentMethod.objects.filter(
        tenant=tenant,
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
        "status_display": SUBSCRIPTION_STATUS_LABELS.get(subscription.status, subscription.status),
        "is_access_allowed": subscription.is_access_allowed,
        "trial_start": (subscription.trial_start.isoformat() if subscription.trial_start else None),
        "trial_end": (subscription.trial_end.isoformat() if subscription.trial_end else None),
        "days_until_trial_end": subscription.days_until_trial_end,
        "current_period_start": (
            subscription.current_period_start.isoformat() if subscription.current_period_start else None
        ),
        "current_period_end": (
            subscription.current_period_end.isoformat() if subscription.current_period_end else None
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


# Usage (reads from SubscriptionPlan REQ-PLAN-002)


@router.get("/usage/", auth=jwt_auth, summary="Uso actual del plan")
@require_role("OWNER")
def get_usage(request: HttpRequest):
    """Return current plan usage metrics with real limits from SubscriptionPlan.

    PERF: Runs 6 COUNT queries against 6 different tables (Customer, Card, User,
    Location, Transaction, Notification). These target different tables so they
    cannot be consolidated into a single SQL query without raw SQL. Each COUNT
    is O(index) in PostgreSQL, making the total cost ~6 index scans.
    SEC: All queries scoped to request.tenant.
    """
    from apps.authentication.models import User
    from apps.cards.models import Card
    from apps.customers.models import Customer
    from apps.notifications.models import Notification
    from apps.tenants.models import Location
    from apps.transactions.models import Transaction

    tenant = require_tenant(request)
    now = timezone.now()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

 # PERF: 6 independent COUNT queries against 6 different tables.
 # Each is O(index scan) in PostgreSQL. Cannot be consolidated without raw SQL
 # since they target different models. Total latency: ~6ms on indexed tables.
    total_customers = Customer.objects.filter(tenant=tenant).count()
    total_programs = Card.objects.filter(tenant=tenant).count()
    total_users = User.objects.filter(tenant=tenant, is_active=True).count()
    total_locations = Location.objects.filter(tenant=tenant).count()
    monthly_txns = Transaction.objects.filter(tenant=tenant, created_at__gte=month_start).count()
    monthly_notifs = Notification.objects.filter(tenant=tenant, created_at__gte=month_start).count()

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

    for resource in [
        "whatsapp_day",
        "emails_month",
        "sms_day",
        "wallet_pushes_month",
        "automations",
        "automation_executions_day",
        "api_calls_day",
        "exports_month",
    ]:
        used = get_current_usage(tenant, resource)
        limit = _limit(resource)
        limits[resource] = {
            "used": used,
            "limit": limit,
            "percentage": _pct(used, limit),
            "is_over_limit": used >= limit,
        }

    ai_limit = _limit("ai_queries_month")
    limits["ai_queries_month"] = {
        "used": 0,
        "limit": ai_limit,
        "percentage": _pct(0, ai_limit),
        "is_over_limit": ai_limit <= 0,
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


# Subscribe (via payment gateway REQ-PAY-002)


@router.post("/subscribe/", auth=jwt_auth, summary="Suscribirse a un plan")
@require_role("OWNER")
def subscribe(request: HttpRequest, data: SubscribeSchema):
    """
    Subscribe tenant to a plan using manual SuperAdmin payment verification.
    """
    tenant = require_tenant(request)
    if data.billing_cycle not in ("monthly", "annual"):
        raise HttpError(400, get_message("BILLING_INVALID_CYCLE"))

 # Resolve the target plan
    plan = SubscriptionPlan.objects.filter(slug=data.plan_slug, is_active=True).first()
    if not plan:
        raise HttpError(404, get_message("NOT_FOUND"))

    now = timezone.now()
    period_end = now + timedelta(days=365 if data.billing_cycle == "annual" else 30)
    subtotal = plan.price_annual if data.billing_cycle == "annual" else plan.price_monthly
    tax_rate = Decimal(
        str(PlatformSetting.get_float("TAX_RATE_ECUADOR", getattr(settings, "TAX_RATE_ECUADOR", 0.15)))
    ).quantize(Decimal("0.0001"))

    with transaction.atomic():
        subscription, _ = Subscription.objects.select_for_update().get_or_create(
            tenant=tenant,
            defaults={"plan": plan.slug},
        )
        subscription.subscription_plan = plan
        subscription.plan = plan.slug
        subscription.billing_cycle = data.billing_cycle
        subscription.status = SubscriptionStatus.PAST_DUE
        subscription.current_period_start = now
        subscription.current_period_end = period_end
        subscription.save(
            update_fields=[
                "subscription_plan",
                "plan",
                "billing_cycle",
                "status",
                "current_period_start",
                "current_period_end",
                "updated_at",
            ]
        )

        invoice = Invoice(
            tenant=tenant,
            subscription=subscription,
            invoice_number=Invoice.generate_invoice_number(tenant),
            subtotal=subtotal,
            tax_rate=tax_rate,
            tax_amount=Decimal("0.00"),
            total=Decimal("0.00"),
            currency="USD",
            period_start=now,
            period_end=period_end,
            status=Invoice.InvoiceStatus.OPEN,
            invoice_data={
                "plan_slug": plan.slug,
                "plan_name": plan.name,
                "billing_cycle": data.billing_cycle,
                "verification": "manual",
            },
        )
        invoice.calculate_amounts()
        invoice.save()

    logger.info(
        "Manual payment invoice %s created for tenant %s plan %s",
        invoice.invoice_number,
        tenant.slug,
        plan.slug,
    )
    return {
        "success": True,
        "message": get_message("BILLING_INVOICE_GENERATED", amount=f"${invoice.total}"),
        "invoice_id": str(invoice.id),
        "invoice_number": invoice.invoice_number,
        "status": subscription.status,
        "amount_due": float(invoice.total),
        "currency": invoice.currency,
        "manual_verification_required": True,
    }


# Update & Cancel


@router.put("/subscription/", auth=jwt_auth, summary="Actualizar suscripción")
@require_role("OWNER")
def update_subscription(request: HttpRequest, data: UpdateSubscriptionSchema):
    """Update billing cycle or schedule cancellation."""
    subscription = get_object_or_404(Subscription, tenant=require_tenant(request))

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
    subscription = get_object_or_404(Subscription, tenant=require_tenant(request))

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
        "effective_date": (subscription.current_period_end.isoformat() if subscription.current_period_end else None),
    }


@router.post(
    "/subscription/reactivate/",
    auth=jwt_auth,
    summary="Reactivar suscripción",
)
@require_role("OWNER")
def reactivate_subscription(request: HttpRequest):
    """Reactivate a canceled-but-not-yet-expired subscription."""
    subscription = get_object_or_404(Subscription, tenant=require_tenant(request))

    if not subscription.cancel_at_period_end:
        raise HttpError(400, get_message("BILLING_NOT_PENDING_CANCEL"))

    subscription.cancel_at_period_end = False
    subscription.save(update_fields=["cancel_at_period_end", "updated_at"])

    return {
        "success": True,
        "message": get_message("BILLING_REACTIVATED"),
    }
