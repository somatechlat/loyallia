"""
Loyallia — Agent API Authentication (REQ-AGENT-001)
Bearer token authentication for external AI agents.
Verifies API key, checks enterprise plan, and attaches tenant to request.
"""

import logging

from django.utils import timezone
from ninja.security import HttpBearer

from apps.agent_api.models import AgentAPIKey
from common.request import as_tenant_request

logger = logging.getLogger("loyallia.agent_api")


class AgentAPIKeyAuth(HttpBearer):
    """
    Agent API authentication via Bearer token.
    Token format: 'lyl_<base64_key>'
    Validates key hash, checks expiry, and verifies Enterprise plan.
    """

    def authenticate(self, request, token: str):
        """Authenticate an agent request via API key."""
        request = as_tenant_request(request)
        if not token:
            return None

        key_hash = AgentAPIKey.hash_key(token)

        try:
            api_key = AgentAPIKey.objects.select_related("tenant").get(
                key_hash=key_hash,
                is_active=True,
            )
        except AgentAPIKey.DoesNotExist:
            logger.warning("Invalid agent API key attempt: %s...", token[:12])
            return None

        # Check expiry
        if api_key.expires_at and api_key.expires_at < timezone.now():
            logger.warning("Expired agent API key: %s", api_key.key_prefix)
            return None

        # Check Enterprise plan (agent_api feature required)
        from apps.billing.models import Subscription

        subscription = Subscription.objects.filter(tenant=api_key.tenant).first()
        if not subscription or not subscription.has_feature("agent_api"):
            logger.warning(
                "Agent API access denied — plan does not include agent_api: %s",
                api_key.tenant.slug,
            )
            return None
        if subscription.get_limit("api_calls_day") <= 0:
            logger.warning("Agent API access denied — daily API quota disabled")
            return None

        # Attach tenant to request
        request.tenant = api_key.tenant
        request.agent_api_key = api_key

        # Update last_used timestamp
        api_key.last_used_at = timezone.now()
        api_key.save(update_fields=["last_used_at"])

        # Log the API call for rate-limiting and audit
        from apps.agent_api.models import AgentAPICallLog

        today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        calls_today = AgentAPICallLog.objects.filter(
            tenant=api_key.tenant,
            created_at__gte=today_start,
        ).count()
        if calls_today >= subscription.get_limit("api_calls_day"):
            logger.warning(
                "Agent API quota exceeded for tenant %s",
                api_key.tenant.slug,
            )
            return None

        AgentAPICallLog.objects.create(
            tenant=api_key.tenant,
            api_key=api_key,
            endpoint=request.path,
            method=request.method,
        )

        return api_key


agent_api_auth = AgentAPIKeyAuth()
