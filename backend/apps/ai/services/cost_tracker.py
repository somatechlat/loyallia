"""
AI API Cost Tracker for Loyallia.

Tracks token usage and estimated API costs per tenant.

For Phase 8b, uses Django cache for lightweight in-memory tracking.
TODO: Replace with persistent storage (PostgreSQL or Redis time-series)
for accurate billing and historical analysis.
"""

import logging
from datetime import date, datetime
from typing import Dict, Optional

from django.core.cache import cache

logger = logging.getLogger(__name__)

# Cost per 1K tokens (USD) — Kimi K2-6 approximate pricing
COST_PER_1K_TOKENS = 0.003

# Cache TTL: keep daily/monthly counters for 48 hours to cover end-of-window overlap
_COUNTER_TTL = 48 * 3600


def _cache_key(tenant_id: str, endpoint: str, granularity: str, day_or_month: str) -> str:
    """Build a namespaced cache key for cost counters."""
    return f"ai:cost:{tenant_id}:{endpoint}:{granularity}:{day_or_month}"


class CostTracker:
    """Track AI API costs per tenant using Django cache.

    TODO: Migrate to persistent storage (e.g., PostgreSQL AIQueryLog table
    or Redis time-series) for durability and billing-grade accuracy.
    """

    def track_request(
        self,
        tenant_id: str,
        endpoint: str,
        tokens_used: int,
        cost_usd: Optional[float] = None,
    ) -> None:
        """Record a single AI request's cost.

        Args:
            tenant_id: UUID or string identifier of the tenant.
            endpoint: AI endpoint name (e.g., "generate-template").
            tokens_used: Total tokens consumed (prompt + completion).
            cost_usd: Optional explicit cost. If omitted, computed from tokens.
        """
        if cost_usd is None:
            cost_usd = (tokens_used / 1000.0) * COST_PER_1K_TOKENS

        today_str = date.today().isoformat()
        month_str = date.today().strftime("%Y-%m")

        # Daily counters
        daily_key_req = _cache_key(tenant_id, endpoint, "daily", f"{today_str}:requests")
        daily_key_cost = _cache_key(tenant_id, endpoint, "daily", f"{today_str}:cost")
        daily_key_tokens = _cache_key(tenant_id, endpoint, "daily", f"{today_str}:tokens")

        # Monthly counters
        monthly_key_req = _cache_key(tenant_id, endpoint, "monthly", f"{month_str}:requests")
        monthly_key_cost = _cache_key(tenant_id, endpoint, "monthly", f"{month_str}:cost")
        monthly_key_tokens = _cache_key(tenant_id, endpoint, "monthly", f"{month_str}:tokens")

        try:
            for key in (daily_key_req, monthly_key_req):
                try:
                    cache.incr(key)
                except ValueError:
                    cache.set(key, 1, _COUNTER_TTL)

            for key in (daily_key_cost, monthly_key_cost):
                current = cache.get(key) or 0.0
                cache.set(key, float(current) + cost_usd, _COUNTER_TTL)

            for key in (daily_key_tokens, monthly_key_tokens):
                try:
                    cache.incr(key, tokens_used)
                except ValueError:
                    cache.set(key, tokens_used, _COUNTER_TTL)

            logger.info(
                "AI cost tracked: tenant=%s endpoint=%s tokens=%d cost_usd=%.6f",
                tenant_id,
                endpoint,
                tokens_used,
                cost_usd,
            )
        except Exception as exc:
            logger.warning("AI cost tracking failed (non-critical): %s", exc)

    def get_daily_cost(self, tenant_id: str, endpoint: str = "*") -> float:
        """Return the estimated AI cost for today (USD).

        Args:
            tenant_id: Tenant identifier.
            endpoint: Specific endpoint or "*" for all endpoints.
        """
        today_str = date.today().isoformat()
        if endpoint != "*":
            key = _cache_key(tenant_id, endpoint, "daily", f"{today_str}:cost")
            return float(cache.get(key) or 0.0)

        # Sum all endpoints for today
        total = 0.0
        prefix = f"ai:cost:{tenant_id}:"
        # Django cache doesn't support key scanning; iterate known endpoints
        known_endpoints = [
            "generate-template",
            "suggest-colors",
            "critique-design",
            "suggest-stamp-icons",
        ]
        for ep in known_endpoints:
            key = _cache_key(tenant_id, ep, "daily", f"{today_str}:cost")
            total += float(cache.get(key) or 0.0)
        return total

    def get_monthly_cost(self, tenant_id: str, endpoint: str = "*") -> float:
        """Return the estimated AI cost for the current month (USD).

        Args:
            tenant_id: Tenant identifier.
            endpoint: Specific endpoint or "*" for all endpoints.
        """
        month_str = date.today().strftime("%Y-%m")
        if endpoint != "*":
            key = _cache_key(tenant_id, endpoint, "monthly", f"{month_str}:cost")
            return float(cache.get(key) or 0.0)

        total = 0.0
        known_endpoints = [
            "generate-template",
            "suggest-colors",
            "critique-design",
            "suggest-stamp-icons",
        ]
        for ep in known_endpoints:
            key = _cache_key(tenant_id, ep, "monthly", f"{month_str}:cost")
            total += float(cache.get(key) or 0.0)
        return total

    def get_daily_requests(self, tenant_id: str, endpoint: str = "*") -> int:
        """Return the number of AI requests made today."""
        today_str = date.today().isoformat()
        if endpoint != "*":
            key = _cache_key(tenant_id, endpoint, "daily", f"{today_str}:requests")
            return int(cache.get(key) or 0)

        total = 0
        known_endpoints = [
            "generate-template",
            "suggest-colors",
            "critique-design",
            "suggest-stamp-icons",
        ]
        for ep in known_endpoints:
            key = _cache_key(tenant_id, ep, "daily", f"{today_str}:requests")
            total += int(cache.get(key) or 0)
        return total

    def get_monthly_requests(self, tenant_id: str, endpoint: str = "*") -> int:
        """Return the number of AI requests made this month."""
        month_str = date.today().strftime("%Y-%m")
        if endpoint != "*":
            key = _cache_key(tenant_id, endpoint, "monthly", f"{month_str}:requests")
            return int(cache.get(key) or 0)

        total = 0
        known_endpoints = [
            "generate-template",
            "suggest-colors",
            "critique-design",
            "suggest-stamp-icons",
        ]
        for ep in known_endpoints:
            key = _cache_key(tenant_id, ep, "monthly", f"{month_str}:requests")
            total += int(cache.get(key) or 0)
        return total
