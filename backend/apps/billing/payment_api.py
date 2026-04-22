"""
Loyallia — Billing Payment Methods, Invoices & Webhook API (REQ-PAY-001)
Split from billing/api.py per the 500-line architectural limit.
"""

import json
import logging

from django.http import HttpRequest
from django.shortcuts import get_object_or_404
from ninja import Router
from ninja.errors import HttpError

from apps.billing.models import (
    Invoice,
    PaymentMethod,
    Subscription,
    SubscriptionStatus,
)
from apps.billing.payment_gateway import get_payment_gateway
from apps.billing.schemas import AddPaymentMethodSchema
from common.messages import get_message
from common.permissions import jwt_auth, require_role

logger = logging.getLogger("loyallia.billing")

router = Router()


# ============================================================================
# Payment Methods
# ============================================================================


@router.get("/payment-methods/", auth=jwt_auth, summary="Listar metodos de pago")
def list_payment_methods(request: HttpRequest):
    """List all active payment methods for the tenant."""
    methods = PaymentMethod.objects.filter(
        tenant=request.tenant,
        is_active=True,
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


@router.post("/payment-methods/", auth=jwt_auth, summary="Agregar metodo de pago")
@require_role("OWNER")
def add_payment_method(request: HttpRequest, data: AddPaymentMethodSchema):
    """Add a new tokenized payment method."""
    if data.is_default:
        PaymentMethod.objects.filter(
            tenant=request.tenant,
            is_default=True,
        ).update(is_default=False)

    pm = PaymentMethod.objects.create(
        tenant=request.tenant,
        gateway_token=data.gateway_token,
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
    summary="Eliminar metodo de pago",
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

    subscription = Subscription.objects.filter(tenant=request.tenant).first()
    if (
        subscription
        and subscription.status == SubscriptionStatus.ACTIVE
        and PaymentMethod.objects.filter(
            tenant=request.tenant,
            is_active=True,
        ).count()
        == 1
    ):
        raise HttpError(400, get_message("BILLING_CANNOT_REMOVE_LAST_PM"))

    pm.is_active = False
    pm.save(update_fields=["is_active", "updated_at"])

    return {"success": True, "message": get_message("BILLING_PAYMENT_METHOD_REMOVED")}


@router.post(
    "/payment-methods/{payment_method_id}/default/",
    auth=jwt_auth,
    summary="Establecer metodo predeterminado",
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
        tenant=request.tenant,
        is_default=True,
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
        "gateway_charge_id": invoice.gateway_charge_id,
        "sri_authorization": invoice.sri_authorization_number,
        "sri_access_key": invoice.sri_access_key,
        "pdf_url": invoice.pdf_url,
        "invoice_data": invoice.invoice_data,
        "created_at": invoice.created_at.isoformat(),
    }


# ============================================================================
# Payment Gateway Webhook
# ============================================================================


@router.post("/webhook/", summary="Payment Gateway Webhook")
def payment_webhook(request: HttpRequest):
    """
    Receive and process payment gateway webhook events.
    Verifies HMAC signature before processing.
    """
    signature = request.headers.get("X-Payment-Signature", "")
    gateway = get_payment_gateway()

    if not gateway.verify_webhook(request.body, signature):
        logger.warning("Invalid webhook signature received")
        raise HttpError(401, get_message("BILLING_INVALID_SIGNATURE"))

    try:
        payload = json.loads(request.body)
    except json.JSONDecodeError:
        raise HttpError(400, get_message("BILLING_INVALID_PAYLOAD"))

    event_type = payload.get("event", "")
    event_data = payload.get("data", {})

    logger.info("Payment webhook: event=%s", event_type)

    gateway.process_webhook(event_type, event_data)

    return {"received": True}
