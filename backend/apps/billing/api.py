"""
Loyallia — Billing API Router
Subscription management and payment processing via Claro Pay Ecuador.
"""
import json
import logging
from typing import Optional

from django.http import HttpRequest
from django.shortcuts import get_object_or_404
from django.utils import timezone
from ninja import Router
from ninja.errors import HttpError
from pydantic import BaseModel

from apps.billing.claro_pay_service import ClaroPayError, claro_pay_service
from apps.billing.models import (
    BillingPlan,
    Invoice,
    PaymentMethod,
    Subscription,
    SubscriptionStatus,
)
from common.messages import get_message
from common.permissions import jwt_auth, require_role

logger = logging.getLogger("loyallia.billing")

router = Router()


# ============================================================================
# Pydantic Schemas
# ============================================================================
class SubscribeSchema(BaseModel):
    """Input for subscribing a tenant to the FULL plan."""
    card_token: str
    card_brand: str = ""
    card_last_four: str = ""
    card_exp_month: Optional[int] = None
    card_exp_year: Optional[int] = None
    cardholder_name: str = ""
    billing_cycle: str = "monthly"


class UpdateSubscriptionSchema(BaseModel):
    billing_cycle: Optional[str] = None
    cancel_at_period_end: Optional[bool] = None


class AddPaymentMethodSchema(BaseModel):
    claro_pay_token: str
    card_brand: str = ""
    card_last_four: str = ""
    card_exp_month: Optional[int] = None
    card_exp_year: Optional[int] = None
    cardholder_name: str = ""
    is_default: bool = False


# ============================================================================
# Plans
# ============================================================================
@router.get("/plans/", auth=jwt_auth, summary="Planes disponibles")
def list_plans(request: HttpRequest):
    """Return available billing plans with pricing."""
    from django.conf import settings
    from decimal import Decimal

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
        tenant=request.tenant, is_default=True, is_active=True,
    ).first()

    return {
        "id": str(subscription.id),
        "plan": subscription.plan,
        "plan_display": subscription.get_plan_display(),
        "billing_cycle": subscription.billing_cycle,
        "status": subscription.status,
        "status_display": subscription.get_status_display(),
        "is_access_allowed": subscription.is_access_allowed,
        "trial_start": subscription.trial_start.isoformat() if subscription.trial_start else None,
        "trial_end": subscription.trial_end.isoformat() if subscription.trial_end else None,
        "days_until_trial_end": subscription.days_until_trial_end,
        "current_period_start": subscription.current_period_start.isoformat() if subscription.current_period_start else None,
        "current_period_end": subscription.current_period_end.isoformat() if subscription.current_period_end else None,
        "cancel_at_period_end": subscription.cancel_at_period_end,
        "monthly_price": float(subscription.monthly_price),
        "monthly_total_with_tax": float(subscription.monthly_total_with_tax),
        "payment_method": {
            "id": str(default_pm.id),
            "brand": default_pm.card_brand,
            "last_four": default_pm.card_last_four,
            "display": default_pm.display_name,
        } if default_pm else None,
    }


@router.get("/usage/", auth=jwt_auth, summary="Uso actual del plan")
def get_usage(request: HttpRequest):
    """Return current plan usage metrics for the tenant."""
    from apps.customers.models import Customer
    from apps.cards.models import Card
    from apps.transactions.models import Transaction
    from apps.notifications.models import Notification
    from datetime import timedelta

    tenant = request.tenant
    now = timezone.now()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    total_customers = Customer.objects.filter(tenant=tenant).count()
    total_programs = Card.objects.filter(tenant=tenant).count()
    monthly_txns = Transaction.objects.filter(tenant=tenant, created_at__gte=month_start).count()
    monthly_notifs = Notification.objects.filter(tenant=tenant, created_at__gte=month_start).count()

    # FULL plan = unlimited, but we show usage for visibility
    limits = {
        "clientes": {"used": total_customers, "limit": 999999, "percentage": min(total_customers / 1000 * 100, 100)},
        "programas": {"used": total_programs, "limit": 50, "percentage": min(total_programs / 50 * 100, 100)},
        "transacciones_mes": {"used": monthly_txns, "limit": 999999, "percentage": min(monthly_txns / 10000 * 100, 100)},
        "notificaciones_mes": {"used": monthly_notifs, "limit": 999999, "percentage": min(monthly_notifs / 5000 * 100, 100)},
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
                "current_period_end": subscription.current_period_end.isoformat()
                if subscription.current_period_end else None,
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
        "effective_date": subscription.current_period_end.isoformat()
        if subscription.current_period_end else None,
    }


@router.post("/subscription/reactivate/", auth=jwt_auth, summary="Reactivar suscripción")
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


# ============================================================================
# Payment Methods
# ============================================================================
@router.get("/payment-methods/", auth=jwt_auth, summary="Listar métodos de pago")
def list_payment_methods(request: HttpRequest):
    """List all active payment methods for the tenant."""
    methods = PaymentMethod.objects.filter(
        tenant=request.tenant, is_active=True,
    )

    return {
        "payment_methods": [
            {
                "id": str(pm.id),
                "brand": pm.card_brand,
                "last_four": pm.card_last_four,
                "exp_month": pm.card_exp_month,
                "exp_year": pm.card_exp_year,
                "cardholder_name": pm.cardholder_name,
                "is_default": pm.is_default,
                "display": pm.display_name,
                "created_at": pm.created_at.isoformat(),
            }
            for pm in methods
        ],
    }


@router.post("/payment-methods/", auth=jwt_auth, summary="Agregar método de pago")
@require_role("OWNER")
def add_payment_method(request: HttpRequest, data: AddPaymentMethodSchema):
    """Add a new tokenized payment method."""
    if data.is_default:
        PaymentMethod.objects.filter(
            tenant=request.tenant, is_default=True,
        ).update(is_default=False)

    pm = PaymentMethod.objects.create(
        tenant=request.tenant,
        claro_pay_token=data.claro_pay_token,
        card_brand=data.card_brand,
        card_last_four=data.card_last_four,
        card_exp_month=data.card_exp_month,
        card_exp_year=data.card_exp_year,
        cardholder_name=data.cardholder_name,
        is_default=data.is_default,
    )

    return {
        "success": True,
        "id": str(pm.id),
        "message": get_message("BILLING_PAYMENT_METHOD_ADDED"),
    }


@router.delete(
    "/payment-methods/{payment_method_id}/",
    auth=jwt_auth,
    summary="Eliminar método de pago",
)
@require_role("OWNER")
def remove_payment_method(request: HttpRequest, payment_method_id: str):
    """Soft-delete a payment method."""
    pm = get_object_or_404(
        PaymentMethod,
        id=payment_method_id,
        tenant=request.tenant,
        is_active=True,
    )

    # Don't allow removing last payment method on active subscription
    subscription = Subscription.objects.filter(tenant=request.tenant).first()
    if (
        subscription
        and subscription.status == SubscriptionStatus.ACTIVE
        and PaymentMethod.objects.filter(
            tenant=request.tenant, is_active=True,
        ).count() == 1
    ):
        raise HttpError(400, get_message("BILLING_CANNOT_REMOVE_LAST_PM"))

    pm.is_active = False
    pm.save(update_fields=["is_active", "updated_at"])

    return {"success": True, "message": get_message("BILLING_PAYMENT_METHOD_REMOVED")}


@router.post(
    "/payment-methods/{payment_method_id}/default/",
    auth=jwt_auth,
    summary="Establecer método predeterminado",
)
@require_role("OWNER")
def set_default_payment_method(request: HttpRequest, payment_method_id: str):
    """Set a payment method as the default."""
    pm = get_object_or_404(
        PaymentMethod,
        id=payment_method_id,
        tenant=request.tenant,
        is_active=True,
    )

    PaymentMethod.objects.filter(
        tenant=request.tenant, is_default=True,
    ).update(is_default=False)

    pm.is_default = True
    pm.save(update_fields=["is_default", "updated_at"])

    return {"success": True, "message": get_message("BILLING_DEFAULT_PM_SET")}


# ============================================================================
# Invoices
# ============================================================================
@router.get("/invoices/", auth=jwt_auth, summary="Listar facturas")
def list_invoices(request: HttpRequest, limit: int = 20, offset: int = 0):
    """List invoices for the tenant."""
    qs = Invoice.objects.filter(tenant=request.tenant)
    total = qs.count()
    invoices = qs[offset : offset + limit]

    return {
        "total": total,
        "count": len(invoices),
        "invoices": [
            {
                "id": str(inv.id),
                "invoice_number": inv.invoice_number,
                "subtotal": float(inv.subtotal),
                "tax_amount": float(inv.tax_amount),
                "total": float(inv.total),
                "currency": inv.currency,
                "status": inv.status,
                "status_display": inv.get_status_display(),
                "period_start": inv.period_start.isoformat(),
                "period_end": inv.period_end.isoformat(),
                "paid_at": inv.paid_at.isoformat() if inv.paid_at else None,
                "sri_authorization": inv.sri_authorization_number,
                "pdf_url": inv.pdf_url,
                "created_at": inv.created_at.isoformat(),
            }
            for inv in invoices
        ],
    }


@router.get("/invoices/{invoice_id}/", auth=jwt_auth, summary="Detalle de factura")
def get_invoice(request: HttpRequest, invoice_id: str):
    """Get detailed invoice information."""
    invoice = get_object_or_404(Invoice, id=invoice_id, tenant=request.tenant)

    return {
        "id": str(invoice.id),
        "invoice_number": invoice.invoice_number,
        "subtotal": float(invoice.subtotal),
        "tax_rate": float(invoice.tax_rate),
        "tax_amount": float(invoice.tax_amount),
        "total": float(invoice.total),
        "currency": invoice.currency,
        "status": invoice.status,
        "status_display": invoice.get_status_display(),
        "period_start": invoice.period_start.isoformat(),
        "period_end": invoice.period_end.isoformat(),
        "paid_at": invoice.paid_at.isoformat() if invoice.paid_at else None,
        "claro_pay_charge_id": invoice.claro_pay_charge_id,
        "sri_authorization": invoice.sri_authorization_number,
        "sri_access_key": invoice.sri_access_key,
        "pdf_url": invoice.pdf_url,
        "invoice_data": invoice.invoice_data,
        "created_at": invoice.created_at.isoformat(),
    }


# ============================================================================
# Claro Pay Webhook
# ============================================================================
@router.post("/webhook/", summary="Claro Pay Webhook")
def claro_pay_webhook(request: HttpRequest):
    """
    Receive and process Claro Pay webhook events.
    Verifies HMAC signature before processing.
    Events handled: payment.success, payment.failed, subscription.canceled
    """
    signature = request.headers.get("X-ClaroPay-Signature", "")

    if not claro_pay_service.verify_webhook_signature(request.body, signature):
        logger.warning("Invalid webhook signature received")
        raise HttpError(401, get_message("BILLING_INVALID_SIGNATURE"))

    try:
        payload = json.loads(request.body)
    except json.JSONDecodeError:
        raise HttpError(400, get_message("BILLING_INVALID_PAYLOAD"))

    event_type = payload.get("event", "")
    event_data = payload.get("data", {})

    logger.info("Claro Pay webhook: event=%s", event_type)

    claro_pay_service.process_webhook_event(event_type, event_data)

    return {"received": True}
