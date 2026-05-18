"""
Loyallia  Analytics Celery Tasks (apps/analytics/tasks.py)

Asynchronous calculation of business intelligence metrics.
Triggered after every transaction to keep materialized analytics tables fresh.

Architecture:
    update_tenant_analytics is the main entry point. It recalculates:
    1. ProgramAnalytics for every card/program in the tenant.
    2. DailyAnalytics for the last 7 days (backfills gaps from missed runs).

Performance (Rule 12):
    - PERF: Runs on 'default' queue, not the 'pass_generation' queue.
    - PERF: update_metrics() on ProgramAnalytics uses SQL aggregates.
    - PERF: 7-day DailyAnalytics backfill uses get_or_create (no updates if exists).
    - PERF: Called with countdown=2 from transact() to batch rapid scans.

Called by: apps/transactions/api.py (transact endpoint, via apply_async).
"""

import logging
from datetime import timedelta

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    max_retries=2,
    default_retry_delay=120,
    queue="default",
    name="apps.analytics.tasks.update_tenant_analytics",
)
def update_tenant_analytics(self, tenant_id: str) -> dict:
    """Recalculate program and daily analytics for a tenant.

    Prevents the O(N) database lockups that would occur if analytics
    were computed synchronously on dashboard page load.

    PERF: Iterates over programs (typically <20 per tenant) and runs
    SQL aggregate queries inside update_metrics(). 7-day DailyAnalytics
    backfill uses get_or_create to skip already-computed days.
    """
    import uuid

    from django.utils import timezone

    from apps.analytics.models import DailyAnalytics, ProgramAnalytics
    from apps.cards.models import Card
    from apps.tenants.models import Tenant

    try:
        tenant = Tenant.objects.get(id=uuid.UUID(tenant_id))
    except (Tenant.DoesNotExist, ValueError):
        logger.error("update_tenant_analytics: tenant %s not found", tenant_id)
        return {"success": False}

    # SEC: Cross-tenant guard -- only compute analytics for active tenants
    if not tenant.is_active:
        logger.warning(
            "SECURITY: Analytics blocked for inactive tenant %s",
            tenant_id,
        )
        return {"success": False}

    # 1. Update Program Analytics
    programs = Card.objects.filter(tenant=tenant)
    for program in programs:
        analytics, _ = ProgramAnalytics.objects.get_or_create(card=program, defaults={"tenant": tenant})
        analytics.update_metrics()

 # 2. Update Daily Analytics for the last 7 days to catch late syncs
    today = timezone.localdate()
    for days_ago in range(7):
        target_date = today - timedelta(days=days_ago)
        DailyAnalytics.objects.get_or_create(tenant=tenant, analytics_date=target_date)

    logger.debug("Tenant analytics updated for tenant %s", tenant_id)
    return {"success": True}
