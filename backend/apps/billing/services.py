"""
Loyallia Billing Services
Business logic extracted from billing API endpoints.
"""

import logging
from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.utils import timezone

from apps.billing.models import (
    Invoice,
    PaymentMethod,
    Subscription,
    SubscriptionPlan,
    SubscriptionStatus,
)
from apps.billing.payment_gateway import PaymentGatewayError, get_payment_gateway
from apps.tenants.models import PlatformSetting
from common.messages import get_message

logger = logging.getLogger("loyallia.billing")


def create_invoice(
    subscription,
    subtotal,
    tax_rate,
    period_start,
    period_end,
    plan=None,
    billing_cycle=None,
):
    """Create an invoice with tax calculation for a subscription.

    Args:
        subscription: The subscription being invoiced.
        subtotal: Amount before tax.
        tax_rate: Tax rate as a Decimal (e.g., 0.15).
        period_start: Start of the billing period.
        period_end: End of the billing period.
        plan: Optional plan for invoice metadata.
        billing_cycle: Optional billing cycle for invoice metadata.

    Returns:
        The created and saved Invoice instance.
    """
    invoice = Invoice(
        tenant=subscription.tenant,
        subscription=subscription,
        invoice_number=Invoice.generate_invoice_number(subscription.tenant),
        subtotal=subtotal,
        tax_rate=tax_rate,
        tax_amount=Decimal("0.00"),
        total=Decimal("0.00"),
        currency="USD",
        period_start=period_start,
        period_end=period_end,
        status=Invoice.InvoiceStatus.OPEN,
        invoice_data={
            "plan_slug": plan.slug if plan else subscription.plan,
            "plan_name": plan.name if plan else subscription.plan,
            "billing_cycle": billing_cycle or subscription.billing_cycle,
            "verification": "manual",
        },
    )
    invoice.calculate_amounts()
    invoice.save()
    return invoice


def process_subscription(tenant, plan, billing_cycle, payment_method=None):
    """Create or update a subscription for a tenant.

    Must be called inside a database transaction because this function
    uses select_for_update() on the Subscription row.

    Args:
        tenant: The tenant to subscribe.
        plan: The subscription plan.
        billing_cycle: 'monthly' or 'annual'.
        payment_method: Optional dict with card_token, card_brand, etc.

    Returns:
        The created or updated Subscription instance.

    Raises:
        ValueError: If billing_cycle is invalid.
    """
    if billing_cycle not in ("monthly", "annual"):
        raise ValueError(get_message("BILLING_INVALID_CYCLE"))

    now = timezone.now()
    period_end = now + timedelta(days=365 if billing_cycle == "annual" else 30)

    subscription, _ = Subscription.objects.select_for_update().get_or_create(
        tenant=tenant,
        defaults={"plan": plan.slug},
    )
    subscription.subscription_plan = plan
    subscription.plan = plan.slug
    subscription.billing_cycle = billing_cycle
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

    if payment_method and payment_method.get("card_token"):
        PaymentMethod.objects.filter(tenant=tenant, is_default=True).update(
            is_default=False
        )
        PaymentMethod.objects.create(
            tenant=tenant,
            gateway_token=payment_method.get("card_token", ""),
            card_brand=payment_method.get("card_brand", ""),
            card_last_four=payment_method.get("card_last_four", ""),
            card_exp_month=payment_method.get("card_exp_month"),
            card_exp_year=payment_method.get("card_exp_year"),
            cardholder_name=payment_method.get("cardholder_name", ""),
            is_default=True,
        )

    return subscription


def cancel_subscription(subscription):
    """Cancel a subscription in the payment gateway and mark it for cancellation.

    Args:
        subscription: The subscription to cancel.
    """
    if subscription.gateway_subscription_id:
        try:
            gateway = get_payment_gateway()
            gateway.cancel_subscription(subscription.gateway_subscription_id)
        except PaymentGatewayError as exc:
            logger.error("Cancel failed in gateway: %s", exc.message)

    subscription.cancel()


def reactivate_subscription(subscription):
    """Reactivate a canceled-but-not-yet-expired subscription.

    Args:
        subscription: The subscription to reactivate.
    """
    subscription.cancel_at_period_end = False
    subscription.save(update_fields=["cancel_at_period_end", "updated_at"])
