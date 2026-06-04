"""
AI Cost Tracking Service for Loyallia.

Records every AI API call with token usage and cost to persistent
PostgreSQL storage via the AIQueryLog model.

All billing and usage accounting flows through this service.
"""

from __future__ import annotations

import decimal
import logging
from typing import Any

logger = logging.getLogger(__name__)

COST_PER_1K_TOKENS = decimal.Decimal("0.003")


class CostTrackerError(Exception):
    """Raised when cost tracking cannot be recorded."""

    pass


class CostTracker:
    """Tracks AI API usage costs per tenant in PostgreSQL.

    Each call is logged via AIQueryLog for audit, billing, and
    per-tenant usage analytics.
    """

    def __init__(self):
        # Lazy import to avoid AppRegistryNotReady during startup
        from apps.ai.models import AIQueryLog

        self._model = AIQueryLog

    def record_cost(
        self,
        tenant_id: int,
        endpoint: str,
        tokens_used: dict[str, int],
        request_data: dict[str, Any] | None = None,
        response_data: dict[str, Any] | None = None,
        status: str = "success",
        error_message: str = "",
    ) -> dict[str, Any]:
        """Persist an AI API call with token usage and cost.

        Args:
            tenant_id: ID of the tenant initiating the call.
            endpoint: AI endpoint identifier (e.g. 'generate-template').
            tokens_used: Dict with prompt_tokens, completion_tokens, total_tokens.
            request_data: Snapshot of request parameters.
            response_data: Snapshot of response data.
            status: 'success' or 'error'.
            error_message: Error description if status is 'error'.

        Returns:
            Dict with log_id and cost_usd for the caller.
        """
        request_data = request_data or {}
        response_data = response_data or {}

        total_tokens = tokens_used.get("total_tokens", 0)
        cost_usd = decimal.Decimal(total_tokens) * COST_PER_1K_TOKENS / decimal.Decimal("1000")
        cost_usd = cost_usd.quantize(decimal.Decimal("0.000001"))

        try:
            log_entry = self._model.objects.create(
                tenant_id=tenant_id,
                endpoint=endpoint,
                prompt_tokens=tokens_used.get("prompt_tokens", 0),
                completion_tokens=tokens_used.get("completion_tokens", 0),
                total_tokens=total_tokens,
                cost_usd=cost_usd,
                status=status,
                error_message=error_message,
                request_data=request_data,
                response_data=response_data,
            )
        except Exception as exc:
            logger.warning("Failed to record AI cost for tenant %s: %s", tenant_id, exc)
            # Non-fatal: tracking failure should not break user flow
            return {
                "log_id": None,
                "cost_usd": float(cost_usd),
                "total_tokens": total_tokens,
            }

        logger.info(
            "AI cost recorded: tenant=%s endpoint=%s tokens=%s cost=$%s",
            tenant_id,
            endpoint,
            total_tokens,
            cost_usd,
        )

        return {
            "log_id": str(log_entry.id),
            "cost_usd": float(cost_usd),
            "total_tokens": total_tokens,
        }

    def get_daily_requests(self, tenant_id: int) -> int:
        """Return the number of AI requests for a tenant today.

        Used for daily usage dashboards and rate limit checks.
        """
        from django.db import models as django_models
        from django.utils import timezone

        now = timezone.now()
        start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)

        try:
            qs = self._model.objects.filter(
                tenant_id=tenant_id,
                created_at__gte=start_of_day,
            )
            count = qs.aggregate(count=django_models.Count("id"))["count"]
        except Exception as exc:
            logger.warning("Failed to compute daily requests for tenant %s: %s", tenant_id, exc)
            return 0

        return count or 0

    def get_monthly_cost(self, tenant_id: int) -> decimal.Decimal:
        """Return the total AI cost for a tenant in the current month.

        Used for billing dashboards and usage limits.
        """
        from django.db import models as django_models
        from django.utils import timezone

        now = timezone.now()
        start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        try:
            qs = self._model.objects.filter(
                tenant_id=tenant_id,
                created_at__gte=start_of_month,
            )
            total = qs.aggregate(total=django_models.Sum("cost_usd"))["total"]
        except Exception as exc:
            logger.warning("Failed to compute monthly cost for tenant %s: %s", tenant_id, exc)
            return decimal.Decimal("0")

        return total or decimal.Decimal("0")
