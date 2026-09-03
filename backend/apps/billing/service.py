"""
Loyallia Billing Service Layer
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
)
from apps.cards.models import Card
from apps.customers.models import Customer
from apps.notifications.models import Notification
from apps.transactions.models import Transaction
from common.plan_enforcement import resolve_limit, usage_pct

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
        from apps.tenants.models import PlatformSetting

        tax_rate = Decimal(
            str(PlatformSetting.get_float("TAX_RATE_ECUADOR", getattr(settings, "TAX_RATE_ECUADOR", 0.15)))
        )
        trial_days = PlatformSetting.get_int("TRIAL_DAYS", getattr(settings, "TRIAL_DAYS", 5))

        plans = SubscriptionPlan.objects.filter(is_active=True)
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

        plan = SubscriptionPlan.objects.filter(slug=plan_slug, is_active=True).first()
        if not plan:
            raise ValueError(f"Plan '{plan_slug}' not found")

        subscription, _ = Subscription.objects.get_or_create(
            tenant=tenant,
            defaults={"plan": plan.slug},
        )
        subscription.subscription_plan = plan
        subscription.billing_cycle = billing_cycle

        # Store payment method if provided
        if card_data and card_data.get("card_token"):
            PaymentMethod.objects.filter(tenant=tenant, is_default=True).update(is_default=False)
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
                subscription.current_period_end.isoformat() if subscription.current_period_end else None
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
        monthly_txns = Transaction.objects.filter(tenant=tenant, created_at__gte=month_start).count()
        monthly_notifs = Notification.objects.filter(tenant=tenant, created_at__gte=month_start).count()

        subscription = Subscription.objects.filter(tenant=tenant).first()

        return {
            "customers": {
                "used": total_customers,
                "limit": resolve_limit(subscription, "customers"),
                "percentage": usage_pct(total_customers, resolve_limit(subscription, "customers")),
                "is_over_limit": total_customers >= resolve_limit(subscription, "customers"),
            },
            "programs": {
                "used": total_programs,
                "limit": resolve_limit(subscription, "programs"),
                "percentage": usage_pct(total_programs, resolve_limit(subscription, "programs")),
                "is_over_limit": total_programs >= resolve_limit(subscription, "programs"),
            },
            "users": {
                "used": total_users,
                "limit": resolve_limit(subscription, "users"),
                "percentage": usage_pct(total_users, resolve_limit(subscription, "users")),
                "is_over_limit": total_users >= resolve_limit(subscription, "users"),
            },
            "locations": {
                "used": total_locations,
                "limit": resolve_limit(subscription, "locations"),
                "percentage": usage_pct(total_locations, resolve_limit(subscription, "locations")),
                "is_over_limit": total_locations >= resolve_limit(subscription, "locations"),
            },
            "transactions_month": {
                "used": monthly_txns,
                "limit": resolve_limit(subscription, "transactions_month"),
                "percentage": usage_pct(monthly_txns, resolve_limit(subscription, "transactions_month")),
                "is_over_limit": monthly_txns >= resolve_limit(subscription, "transactions_month"),
            },
            "notifications_month": {
                "used": monthly_notifs,
                "limit": resolve_limit(subscription, "notifications_month"),
                "percentage": usage_pct(monthly_notifs, resolve_limit(subscription, "notifications_month")),
                "is_over_limit": monthly_notifs >= resolve_limit(subscription, "notifications_month"),
            },
        }
