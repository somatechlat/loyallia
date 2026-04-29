"""
Loyallia — Billing Service Layer
Extracted business logic from billing API views.
"""

import logging
from decimal import Decimal

from django.conf import settings
from django.utils import timezone

from apps.billing.models import (
    PaymentMethod,
    Subscription,
    SubscriptionPlan,
    SubscriptionStatus,
)
from apps.billing.payment_gateway import PaymentGatewayError, get_payment_gateway
from apps.cards.models import Card
from apps.customers.models import Customer
from apps.notifications.models import Notification
from apps.transactions.models import Transaction

logger = logging.getLogger("loyallia.billing")


class BillingService:
    """Service class encapsulating billing and subscription business logic."""

    @staticmethod
    def get_plans():
        """
        Get all available subscription plans with pricing and limits.

        Returns:
            list of plan dicts with pricing, limits, and features
        """
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

        return result

    @staticmethod
    def subscribe(tenant, plan_slug, billing_cycle="monthly", card_data=None):
        """
        Subscribe tenant to a plan via the payment gateway.

        Args:
            tenant: Tenant instance
            plan_slug: Slug of the SubscriptionPlan
            billing_cycle: "monthly" or "annual"
            card_data: Optional dict with card_token, card_brand, etc.

        Returns:
            dict with subscription details

        Raises:
            ValueError: If plan not found or invalid billing cycle
            PaymentGatewayError: If payment fails
        """
        if billing_cycle not in ("monthly", "annual"):
            raise ValueError("Billing cycle must be 'monthly' or 'annual'")

        plan = SubscriptionPlan.objects.filter(
            slug=plan_slug, is_active=True
        ).first()
        if not plan:
            raise ValueError(f"Plan '{plan_slug}' not found")

        gateway = get_payment_gateway()

        subscription, _ = Subscription.objects.get_or_create(
            tenant=tenant,
            defaults={"plan": plan.slug},
        )
        subscription.subscription_plan = plan
        subscription.billing_cycle = billing_cycle

        # Store payment method if provided
        if card_data and card_data.get("card_token"):
            PaymentMethod.objects.filter(
                tenant=tenant, is_default=True
            ).update(is_default=False)
            PaymentMethod.objects.create(
                tenant=tenant,
                gateway_token=card_data.get("card_token", ""),
                card_brand=card_data.get("card_brand", ""),
                card_last_four=card_data.get("card_last_four", ""),
                card_exp_month=card_data.get("card_exp_month"),
                card_exp_year=card_data.get("card_exp_year"),
                cardholder_name=card_data.get("cardholder_name", ""),
                is_default=True,
            )

        # Activate subscription
        subscription.activate_paid()
        logger.info(
            "Tenant %s subscribed to plan %s (%s)",
            tenant.slug,
            plan.name,
            billing_cycle,
        )

        return {
            "plan": plan.slug,
            "plan_name": plan.name,
            "status": subscription.status,
            "billing_cycle": subscription.billing_cycle,
            "current_period_end": (
                subscription.current_period_end.isoformat()
                if subscription.current_period_end
                else None
            ),
        }

    @staticmethod
    def check_usage(tenant):
        """
        Get current usage vs plan limits for a tenant.

        Args:
            tenant: Tenant instance

        Returns:
            dict with usage metrics for each resource type
        """
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

        subscription = Subscription.objects.filter(tenant=tenant).first()

        def _limit(resource):
            if subscription:
                return subscription.get_limit(resource)
            return 0

        def _pct(used, limit):
            if limit <= 0 or limit >= 999999:
                return 0.0
            return min(round(used / limit * 100, 1), 100.0)

        return {
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
