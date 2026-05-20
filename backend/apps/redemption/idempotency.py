"""
Loyallia Redemption Engine — Idempotency Layer

Redis-backed idempotency cache for exactly-once redemption semantics.
Keys are scoped to tenant + idempotency_key and expire after 24 hours.
"""

from __future__ import annotations

import json
import logging
from typing import TYPE_CHECKING

from django.core.cache import cache

if TYPE_CHECKING:
    from .result import RedemptionResult

logger = logging.getLogger(__name__)

IDEMPOTENCY_TTL_SECONDS = 86_400  # 24 hours
KEY_PREFIX = "redemption:idempotency"


def _make_key(tenant_id: str, idempotency_key: str) -> str:
    return f"{KEY_PREFIX}:{tenant_id}:{idempotency_key}"


def check(tenant_id: str, idempotency_key: str) -> dict | None:
    """Check if a redemption with this key was already processed.

    Returns the cached result dict if found, None otherwise.
    """
    if not idempotency_key:
        return None
    key = _make_key(tenant_id, idempotency_key)
    cached = cache.get(key)
    if cached is None:
        return None
    if isinstance(cached, str):
        try:
            return json.loads(cached)
        except json.JSONDecodeError:
            logger.warning("Idempotency cache corruption for key %s", key)
            return None
    return cached


def store(tenant_id: str, idempotency_key: str, result: RedemptionResult) -> None:
    """Cache a redemption result for idempotency.

    Only stores successful results; denied results are NOT cached
    so that staff can retry after fixing the issue.
    """
    if not idempotency_key:
        return
    if not result.success:
        return

    key = _make_key(tenant_id, idempotency_key)
    payload = {
        "success": result.success,
        "transaction_id": result.transaction_id,
        "transaction_type": result.transaction_type,
        "pass_updated": result.pass_updated,
        "reward_earned": result.reward_earned,
        "reward_description": result.reward_description,
        "intent_resolved": result.intent_resolved,
        "new_balance": result.new_balance,
        "remaining_uses": result.remaining_uses,
        "new_state": result.new_state,
    }
    cache.set(key, payload, timeout=IDEMPOTENCY_TTL_SECONDS)


def clear(tenant_id: str, idempotency_key: str) -> None:
    """Manually clear an idempotency key (useful in tests and admin ops)."""
    if not idempotency_key:
        return
    key = _make_key(tenant_id, idempotency_key)
    cache.delete(key)
