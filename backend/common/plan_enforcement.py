"""
Loyallia — Plan Enforcement Module (REQ-PLAN-002)
Decorators and utilities for enforcing subscription plan limits and features.

Usage:
    @require_active_subscription
    @enforce_limit("customers")
    @require_feature("ai_assistant")
    def my_endpoint(request):
        ...
"""

import functools
import logging
from typing import Callable

from django.http import HttpRequest
from django.utils import timezone
from ninja.errors import HttpError

from common.messages import get_message

logger = logging.getLogger("loyallia.plan_enforcement")


# =============================================================================
# TENANT LIMITS RESOLUTION
# =============================================================================


def get_tenant_limits(tenant) -> dict:
    """
    Get the effective limits for a tenant based on their subscription plan.
    Returns a dict of resource_name → max_count.
    """
    from apps.billing.models import Subscription

    subscription = Subscription.objects.filter(tenant=tenant).first()
    if not subscription:
        return {}

    plan = subscription.subscription_plan
    if not plan and subscription.is_trial_active:
        # Trial with no plan = unlimited
        return {
            "customers": 999999,
            "programs": 999999,
            "locations": 999999,
            "users": 999999,
            "notifications_month": 999999,
            "transactions_month": 999999,
        }

    if not plan:
        return {}

    return {
        "customers": plan.max_customers,
        "programs": plan.max_programs,
        "locations": plan.max_locations,
        "users": plan.max_users,
        "notifications_month": plan.max_notifications_month,
        "transactions_month": plan.max_transactions_month,
    }


def get_current_usage(tenant, resource: str) -> int:
    """Get the current usage count for a specific resource."""
    from apps.billing.models import Subscription
    from apps.cards.models import Card
    from apps.customers.models import Customer

    now = timezone.now()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    usage_map: dict[str, Callable] = {
        "customers": lambda: Customer.objects.filter(tenant=tenant).count(),
        "programs": lambda: Card.objects.filter(tenant=tenant).count(),
        "locations": lambda: tenant.locations.count(),
        "users": lambda: tenant.users.filter(is_active=True).count(),
        "notifications_month": lambda: _count_monthly(
            "apps.notifications.models", "Notification", tenant, month_start
        ),
        "transactions_month": lambda: _count_monthly(
            "apps.transactions.models", "Transaction", tenant, month_start
        ),
    }

    counter = usage_map.get(resource)
    if counter is None:
        logger.warning("Unknown resource for usage check: %s", resource)
        return 0
    return counter()


def _count_monthly(
    module_path: str, model_name: str, tenant, month_start
) -> int:
    """Dynamic import and count for monthly resources."""
    import importlib

    module = importlib.import_module(module_path)
    model_class = getattr(module, model_name)
    return model_class.objects.filter(
        tenant=tenant, created_at__gte=month_start
    ).count()


# =============================================================================
# CHECK FUNCTIONS
# =============================================================================


def check_plan_limit(tenant, resource: str) -> None:
    """
    Check if the tenant has exceeded their plan limit for a resource.
    Raises HttpError 403 if over limit.
    """
    from apps.billing.models import Subscription

    subscription = Subscription.objects.filter(tenant=tenant).first()
    if not subscription:
        raise HttpError(402, get_message("BILLING_PLAN_REQUIRED"))

    limit = subscription.get_limit(resource)
    if limit <= 0:
        raise HttpError(403, get_message("PLAN_FEATURE_UNAVAILABLE"))

    current = get_current_usage(tenant, resource)
    if current >= limit:
        raise HttpError(
            403,
            get_message("PLAN_LIMIT_EXCEEDED", resource=resource, limit=limit),
        )


def check_feature_access(tenant, feature: str) -> None:
    """
    Check if the tenant's plan includes a specific feature.
    Raises HttpError 403 if feature is not included.
    """
    from apps.billing.models import Subscription

    subscription = Subscription.objects.filter(tenant=tenant).first()
    if not subscription:
        raise HttpError(402, get_message("BILLING_PLAN_REQUIRED"))

    if not subscription.has_feature(feature):
        raise HttpError(
            403,
            get_message("PLAN_FEATURE_UNAVAILABLE"),
        )


# =============================================================================
# DECORATORS
# =============================================================================


def require_active_subscription(func):
    """
    Decorator: blocks request if tenant has no active subscription.
    Returns HTTP 402 (Payment Required) if expired/suspended.
    """

    @functools.wraps(func)
    def wrapper(request: HttpRequest, *args, **kwargs):
        from apps.billing.models import Subscription

        subscription = Subscription.objects.filter(
            tenant=request.tenant
        ).first()
        if not subscription or not subscription.is_access_allowed:
            raise HttpError(402, get_message("BILLING_PLAN_REQUIRED"))
        return func(request, *args, **kwargs)

    return wrapper


def enforce_limit(resource: str):
    """
    Decorator factory: checks plan limit for a specific resource.
    Usage: @enforce_limit("customers")
    """

    def decorator(func):
        @functools.wraps(func)
        def wrapper(request: HttpRequest, *args, **kwargs):
            check_plan_limit(request.tenant, resource)
            return func(request, *args, **kwargs)

        return wrapper

    return decorator


def require_feature(feature: str):
    """
    Decorator factory: checks if plan includes a specific feature.
    Usage: @require_feature("ai_assistant")
    """

    def decorator(func):
        @functools.wraps(func)
        def wrapper(request: HttpRequest, *args, **kwargs):
            check_feature_access(request.tenant, feature)
            return func(request, *args, **kwargs)

        return wrapper

    return decorator
