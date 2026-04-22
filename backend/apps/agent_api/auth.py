"""
Loyallia — Agent API Authentication (REQ-AGENT-001)
Bearer token authentication for external AI agents.
Verifies API key, checks enterprise plan, and attaches tenant to request.
"""

import logging

from django.utils import timezone
from ninja.security import HttpBearer

from apps.agent_api.models import AgentAPIKey

logger = logging.getLogger("loyallia.agent_api")


class AgentAPIKeyAuth(HttpBearer):
    """
    Agent API authentication via Bearer token.
    Token format: 'lyl_<base64_key>'
    Validates key hash, checks expiry, and verifies Enterprise plan.
    """

    def authenticate(self, request, token: str):
        """Authenticate an agent request via API key."""
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

        subscription = Subscription.objects.filter(
            tenant=api_key.tenant
        ).first()
        if not subscription or not subscription.has_feature("agent_api"):
            logger.warning(
                "Agent API access denied — plan does not include agent_api: %s",
                api_key.tenant.slug,
            )
            return None

        # Attach tenant to request
        request.tenant = api_key.tenant
        request.agent_api_key = api_key

        # Update last_used timestamp
        api_key.last_used_at = timezone.now()
        api_key.save(update_fields=["last_used_at"])

        return api_key


agent_api_auth = AgentAPIKeyAuth()
