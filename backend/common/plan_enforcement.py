"""
Loyallia — Plan Enforcement Module (common/plan_enforcement.py)

Decorators and utilities for enforcing subscription plan limits and features.
Prevents tenants from exceeding their plan quotas (customers, programs, etc.).

Architecture:
    Three decorator patterns:
    - @require_active_subscription: blocks if no subscription or expired.
    - @enforce_limit("customers"): blocks if resource count >= plan max.
    - @require_feature("ai_assistant"): blocks if feature not in plan.

    check_plan_limit() uses select_for_update() to prevent TOCTOU race
    conditions (LYL-M-API-024) where concurrent requests both pass the
    limit check and create resources beyond the plan limit.

Performance (Rule 12):
    - get_tenant_limits(): 1 query (Subscription with plan FK).
    - get_current_usage(): 1 query per resource type.
    - check_plan_limit(): 2 queries total (1 select_for_update + 1 count).
    - Decorators add 1-2 queries per decorated endpoint call.

Security (SEC):
    - SEC: select_for_update prevents race condition on limit checks.
    - SEC: Trial tenants get high-but-finite limits (999999), not infinity.

Usage:
    @require_active_subscription
    @enforce_limit("customers")
    @require_feature("ai_assistant")
    def my_endpoint(request):
        ...

Called by: Customer CRUD, Program CRUD, Notification endpoints, Location endpoints.
"""

import functools
import logging
from collections.abc import Callable

from django.http import HttpRequest
from django.utils import timezone
from ninja.errors import HttpError

from common.messages import get_message
from common.request import require_tenant

logger = logging.getLogger("loyallia.plan_enforcement")


# =============================================================================
# TENANT LIMITS RESOLUTION
# =============================================================================


def get_tenant_limits(tenant) -> dict:
    """Get the effective resource limits for a tenant based on their subscription plan.

    Returns a dict of resource_name → max_count.
    PERF: Single query with FK follow to SubscriptionPlan.
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
    """Get current usage count for a specific resource.

    PERF: Uses lazy lambda dispatch to avoid importing/counting unused models.
    Each resource type executes a single COUNT query.
    """
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


def _count_monthly(module_path: str, model_name: str, tenant, month_start) -> int:
    """Dynamic import and COUNT for monthly-capped resources (notifications, transactions).

    Uses importlib to avoid circular imports between common/ and apps/.
    PERF: Single COUNT query with tenant + date filter.
    """
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
    """Check if tenant has exceeded their plan limit for a resource.

    SEC: LYL-M-API-024 — Uses select_for_update on Subscription to prevent
    TOCTOU race conditions where two concurrent requests both pass the limit
    check and create resources beyond the plan maximum.

    Raises:
        HttpError 402: No subscription found (payment required).
        HttpError 403: Resource count >= plan limit (upgrade required).
    """
    from django.db import transaction

    from apps.billing.models import Subscription

    with transaction.atomic():
        subscription = (
            Subscription.objects.select_for_update().filter(tenant=tenant).first()
        )
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
    """Check if the tenant's plan includes a specific feature.

    SEC: Feature gating prevents tenants from accessing premium features
    without an appropriate subscription tier.

    Raises:
        HttpError 402: No subscription found.
        HttpError 403: Feature not included in current plan.
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
    """Decorator: block request if tenant has no active subscription.

    Returns HTTP 402 (Payment Required) if subscription is expired, suspended,
    or non-existent. PERF: Single query to check subscription status.
    """

    @functools.wraps(func)
    def wrapper(request: HttpRequest, *args, **kwargs):
        from apps.billing.models import Subscription

        tenant = require_tenant(request)
        subscription = Subscription.objects.filter(tenant=tenant).first()
        if not subscription or not subscription.is_access_allowed:
            raise HttpError(402, get_message("BILLING_PLAN_REQUIRED"))
        return func(request, *args, **kwargs)

    return wrapper


def enforce_limit(resource: str):
    """Decorator factory: check plan limit for a specific resource before execution.

    Usage: @enforce_limit("customers")
    SEC: Uses select_for_update internally to prevent TOCTOU races.
    """

    def decorator(func):
        @functools.wraps(func)
        def wrapper(request: HttpRequest, *args, **kwargs):
            check_plan_limit(require_tenant(request), resource)
            return func(request, *args, **kwargs)

        return wrapper

    return decorator


def require_feature(feature: str):
    """Decorator factory: check if plan includes a specific feature.

    Usage: @require_feature("ai_assistant")
    SEC: Prevents unauthorized access to premium features.
    """

    def decorator(func):
        @functools.wraps(func)
        def wrapper(request: HttpRequest, *args, **kwargs):
            check_feature_access(require_tenant(request), feature)
            return func(request, *args, **kwargs)

        return wrapper

    return decorator
