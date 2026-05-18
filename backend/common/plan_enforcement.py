"""
Loyallia  Plan Enforcement Module (common/plan_enforcement.py)

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
    - SEC: Trial tenants get generous but finite limits, not infinity.

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


# TENANT LIMITS RESOLUTION


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
        # SEC: Trial tenants get generous but finite limits — not infinity.
        # Prevents trial tenants from exhausting database storage (C4/H4).
        return {
            "customers": 500,
            "programs": 50,
            "locations": 10,
            "users": 10,
            "notifications_month": 1000,
            "transactions_month": 5000,
            "whatsapp_day": 100,
            "emails_month": 500,
            "sms_day": 50,
            "wallet_pushes_month": 200,
            "automations": 10,
            "automation_executions_day": 100,
            "ai_queries_month": 500,
            "api_calls_day": 1000,
            "exports_month": 10,
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
        "whatsapp_day": plan.max_whatsapp_day,
        "emails_month": plan.max_emails_month,
        "sms_day": plan.max_sms_day,
        "wallet_pushes_month": plan.max_wallet_pushes_month,
        "automations": plan.max_automations,
        "automation_executions_day": plan.max_automation_executions_day,
        "ai_queries_month": plan.max_ai_queries_month,
        "api_calls_day": plan.max_api_calls_day,
        "exports_month": plan.max_exports_month,
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
        "notifications_month": lambda: _count_monthly("apps.notifications.models", "Notification", tenant, month_start),
        "transactions_month": lambda: _count_monthly("apps.transactions.models", "Transaction", tenant, month_start),
        "whatsapp_day": lambda: _get_whatsapp_today(tenant),
        "emails_month": lambda: _count_emails_month(tenant, month_start),
        "sms_day": lambda: _count_sms_today(tenant),
        "wallet_pushes_month": lambda: _count_wallet_pushes_month(tenant, month_start),
        "automations": lambda: _count_automations(tenant),
        "automation_executions_day": lambda: _count_automation_executions_today(tenant),
        "ai_queries_month": lambda: _count_monthly("apps.tenants.models", "AIQueryLog", tenant, month_start),
        "api_calls_day": lambda: _count_api_calls_today(tenant),
        "exports_month": lambda: _count_exports_month(tenant, month_start),
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
    return model_class.objects.filter(tenant=tenant, created_at__gte=month_start).count()


def _get_whatsapp_today(tenant) -> int:
    """Get today's WhatsApp message count from WhatsAppSession.

    PERF: Single query on WhatsAppSession (OneToOne with Tenant).
    Returns 0 if no session exists.
    """
    from apps.notifications.models import WhatsAppSession

    session = WhatsAppSession.objects.filter(tenant=tenant).first()
    if session:
        return session.messages_sent_today
    return 0


def _count_emails_month(tenant, month_start) -> int:
    """Count email campaign deliveries this month.

    PERF: Single COUNT query on CampaignDeliveryLog filtered by channel + date.
    """
    from apps.notifications.models import CampaignDeliveryLog

    return CampaignDeliveryLog.objects.filter(
        campaign_run__tenant=tenant,
        campaign_run__channel="email",
        created_at__gte=month_start,
    ).count()


def _count_sms_today(tenant) -> int:
    """Count today's SMS deliveries for a tenant.

    PERF: Single COUNT query on CampaignDeliveryLog filtered by sms channel + today.
    """
    from apps.notifications.models import CampaignDeliveryLog

    today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
    return CampaignDeliveryLog.objects.filter(
        campaign_run__tenant=tenant,
        campaign_run__channel="sms",
        created_at__gte=today_start,
    ).count()


def _count_wallet_pushes_month(tenant, month_start) -> int:
    """Count wallet push notifications this month.

    PERF: Single COUNT query on CampaignDeliveryLog filtered by wallet channel + date.
    """
    from apps.notifications.models import CampaignDeliveryLog

    return CampaignDeliveryLog.objects.filter(
        campaign_run__tenant=tenant,
        campaign_run__channel="wallet",
        created_at__gte=month_start,
    ).count()


def _count_automations(tenant) -> int:
    """Count total automation rules for a tenant.

    PERF: Single COUNT query on Automation model.
    """
    from apps.automation.models import Automation

    return Automation.objects.filter(tenant=tenant).count()


def _count_automation_executions_today(tenant) -> int:
    """Count today's automation executions across all rules for a tenant.

    PERF: Single COUNT query on AutomationExecution filtered by tenant + today.
    """
    from apps.automation.models import AutomationExecution

    today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
    return AutomationExecution.objects.filter(
        automation__tenant=tenant,
        executed_at__gte=today_start,
    ).count()


def _count_api_calls_today(tenant) -> int:
    """Count today's Agent API calls for a tenant.

    Uses AgentAPICallLog for accurate per-call counting.
    PERF: Single COUNT query on AgentAPICallLog filtered by tenant + today.
    """
    from django.db import ProgrammingError

    from apps.agent_api.models import AgentAPICallLog

    today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
    try:
        return AgentAPICallLog.objects.filter(
            tenant=tenant,
            created_at__gte=today_start,
        ).count()
    except ProgrammingError:
        logger.warning("Agent API call log table is unavailable; returning usage=0.")
        return 0


def _count_exports_month(tenant, month_start) -> int:
    """Count data exports this month.

    PERF: Single COUNT query on AuditLog filtered by action + date.
    """
    from apps.audit.models import AuditLog

    return AuditLog.objects.filter(
        tenant_id=str(tenant.id),
        action="EXPORT",
        created_at__gte=month_start,
    ).count()


# CHECK FUNCTIONS


def check_plan_limit(tenant, resource: str, write: bool = False) -> None:
    """Check if tenant has exceeded their plan limit for a resource.

    SEC: LYL-M-API-024  Uses select_for_update on Subscription to prevent
    TOCTOU race conditions where two concurrent requests both pass the limit
    check and create resources beyond the plan maximum.

    Args:
        write: When True, acquires a row lock (select_for_update) to prevent
               TOCTOU races on resource creation. Pass True for all write ops.

    Raises:
        HttpError 402: No subscription found (payment required).
        HttpError 403: Resource count >= plan limit (upgrade required).
    """
    from django.db import transaction

    from apps.billing.models import Subscription

    with transaction.atomic():
        qs = Subscription.objects.select_for_update() if write else Subscription.objects
        subscription = qs.filter(tenant=tenant).first()
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


# DECORATORS


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
            check_plan_limit(require_tenant(request), resource, write=True)
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
