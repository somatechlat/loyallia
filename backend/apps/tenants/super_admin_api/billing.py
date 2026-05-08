"""
Loyallia — Super Admin Billing API
Manual payment confirmation for subscription invoices.
"""

from __future__ import annotations

import logging
import uuid

from django.db import transaction
from ninja import Router
from ninja.errors import HttpError

from apps.billing.models import Invoice
from apps.tenants.super_admin_api.schemas import MessageOut
from common.messages import get_message
from common.permissions import is_super_admin, jwt_auth

logger = logging.getLogger(__name__)

router = Router()


def _require_super_admin(request) -> None:
    if not is_super_admin(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))


@router.post(
    "/billing/confirm-payment/{invoice_id}/",
    auth=jwt_auth,
    response=MessageOut,
)
def confirm_manual_payment(request, invoice_id: str):
    """Confirm an open manual-payment invoice and activate its subscription."""
    _require_super_admin(request)
    try:
        invoice_uuid = uuid.UUID(invoice_id)
    except ValueError:
        raise HttpError(404, get_message("NOT_FOUND"))

    with transaction.atomic():
        try:
            invoice = (
                Invoice.objects.select_for_update()
                .select_related("subscription", "tenant")
                .get(id=invoice_uuid)
            )
        except Invoice.DoesNotExist:
            raise HttpError(404, get_message("NOT_FOUND"))

        if invoice.status != Invoice.InvoiceStatus.PAID:
            invoice.mark_paid(gateway_charge_id=f"manual:{invoice.invoice_number}")
            invoice.subscription.activate_paid(
                gateway_subscription_id=f"manual:{invoice.invoice_number}"
            )

    try:
        from apps.audit.models import AuditAction, AuditStatus
        from apps.audit.service import log_action

        log_action(
            request=request,
            action=AuditAction.UPDATE,
            resource_type="invoice",
            resource_id=str(invoice.id),
            tenant_id=invoice.tenant.id,
            details={
                "event": "MANUAL_PAYMENT_CONFIRMED",
                "invoice_number": invoice.invoice_number,
                "total": str(invoice.total),
            },
            status=AuditStatus.SUCCESS,
        )
    except Exception:
        logger.warning("Failed to audit manual payment confirmation", exc_info=True)

    logger.info(
        "SUPER_ADMIN %s confirmed invoice %s for tenant %s",
        request.user.email,
        invoice.invoice_number,
        invoice.tenant.slug,
    )
    return MessageOut(success=True, message=get_message("BILLING_SUBSCRIBED"))
