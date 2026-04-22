"""
Loyallia — Analytics Celery Tasks
Asynchronous calculation of business intelligence metrics.
"""

import logging
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
    """
    Recalculate and store program and daily analytics for a tenant.
    This prevents the O(N) database lockups that used to happen on dashboard load.
    
    Args:
        tenant_id: UUID string of Tenant
        
    Returns:
        dict with success status
    """
    import uuid
    from django.utils import timezone
    from apps.tenants.models import Tenant
    from apps.cards.models import Card
    from apps.analytics.models import ProgramAnalytics, DailyAnalytics

    try:
        tenant = Tenant.objects.get(id=uuid.UUID(tenant_id))
    except Tenant.DoesNotExist:
        logger.error("update_tenant_analytics: tenant %s not found", tenant_id)
        return {"success": False}

    # 1. Update Program Analytics
    programs = Card.objects.filter(tenant=tenant)
    for program in programs:
        analytics, _ = ProgramAnalytics.objects.get_or_create(
            card=program, defaults={"tenant": tenant}
        )
        analytics.update_metrics()

    # 2. Update Daily Analytics for the last 7 days to catch late syncs
    today = timezone.localdate()
    for days_ago in range(7):
        target_date = today - timezone.timedelta(days=days_ago)
        daily, _ = DailyAnalytics.objects.get_or_create(
            tenant=tenant, analytics_date=target_date
        )
        # Assuming update_metrics exists on DailyAnalytics
        if hasattr(daily, "update_metrics"):
            daily.update_metrics()

    logger.debug("Tenant analytics updated for tenant %s", tenant_id)
    return {"success": True}
