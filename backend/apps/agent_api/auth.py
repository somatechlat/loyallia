"""
Loyallia Agent API Authentication (REQ-AGENT-001)
Bearer token authentication for external AI agents (machine clients).

Security model (enterprise):
    - Keys are looked up by SHA-256 hash; raw key material is NEVER logged —
      only the stored ``key_prefix`` identifies a key in log/audit output.
    - Denials return explicit HTTP semantics instead of a blanket 401:
        401 unknown key, expired key
        403 plan lacks the ``agent_api`` feature, or the daily quota is
            disabled (``api_calls_day`` limit <= 0)
        429 daily quota exceeded, or repeated authentication failures
    - Failed key attempts are rate-limited per client IP via the platform
      rate limiter (``common.rate_limit.check_rate_limit``) to blunt
      brute-forcing of ``lyl_`` keys.
    - The daily quota check and the ``AgentAPICallLog`` insert run inside one
      transaction against the ``select_for_update`` subscription row, so
      concurrent requests cannot both pass a stale count (no TOCTOU) and the
      quota source of truth is the call log itself.
    - Accepted calls write an ``AgentAPICallLog`` row (``status_code=200``
      = admitted by authentication) and set ``last_used_at``; denials for
      known keys are audit-logged with ``AuditStatus.DENIED``.
"""

import logging

from django.db import transaction
from django.utils import timezone
from ninja.errors import HttpError
from ninja.security import HttpBearer

from apps.agent_api.models import AgentAPICallLog, AgentAPIKey
from common.messages import get_message
from common.rate_limit import check_rate_limit, get_client_ip
from common.request import as_tenant_request

logger = logging.getLogger("loyallia.agent_api")

# Brute-force protection: failed key attempts allowed per client IP
# within the tracking window. Valid-key traffic never touches this counter.
FAILED_ATTEMPTS_MAX = 10
FAILED_ATTEMPTS_WINDOW_SECONDS = 300


def count_failed_attempt(ip: str) -> None:
    """Count a failed key attempt for *ip*; raise 429 when the window is exceeded."""
    allowed, _ttl = check_rate_limit(
        f"agent_api:authfail:{ip}",
        FAILED_ATTEMPTS_MAX,
        FAILED_ATTEMPTS_WINDOW_SECONDS,
    )
    if not allowed:
        logger.warning(
            "Agent API authentication failures exceeded for ip=%s", ip
        )
        raise HttpError(429, get_message("RATE_LIMIT_EXCEEDED"))


def audit_denial(request, *, reason: str, tenant=None) -> None:
    """Audit a rejected agent call for a known key (SEC: no key material).

    Unknown keys are not audited here — there is no tenant to attribute them
    to; they are handled by the per-IP failure throttle and the warning log.
    """
    from apps.audit.models import AuditAction, AuditStatus
    from apps.audit.service import log_action

    log_action(
        request=request,
        action=AuditAction.API_ACCESS,
        resource_type="agent_api_auth",
        resource_id=reason,
        tenant_id=tenant.id if tenant is not None else None,
        details={
            "reason": reason,
            "endpoint": request.path,
            "method": request.method,
        },
        status=AuditStatus.DENIED,
    )


class AgentAPIKeyAuth(HttpBearer):
    """
    Agent API authentication via Bearer token.
    Token format: 'lyl_<base64_key>'
    Validates the key hash, expiry, plan entitlement and daily quota, then
    attaches the tenant to the request and records the call for audit/quota.
    """

    def authenticate(self, request, token: str):
        """Authenticate an agent request; raise HttpError with precise codes."""
        request = as_tenant_request(request)
        if not token:
            return None

        ip = get_client_ip(request)
        key_hash = AgentAPIKey.hash_key(token)

        try:
            api_key = AgentAPIKey.objects.select_related("tenant").get(
                key_hash=key_hash,
                is_active=True,
            )
        except AgentAPIKey.DoesNotExist:
            # SEC: no token bytes in any log line — only the outcome + IP.
            count_failed_attempt(ip)
            logger.warning("Agent API rejected an unknown key (ip=%s)", ip)
            raise HttpError(401, get_message("AGENT_API_KEY_INVALID"))

        tenant = api_key.tenant

        if api_key.expires_at and api_key.expires_at < timezone.now():
            audit_denial(request, reason="expired_key", tenant=tenant)
            logger.warning(
                "Agent API key expired: prefix=%s ip=%s", api_key.key_prefix, ip
            )
            raise HttpError(401, get_message("AGENT_API_KEY_EXPIRED"))

        today_start = timezone.now().replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        from apps.billing.models import Subscription

        denial: str | None = None
        call_log = None
        with transaction.atomic():
            # SEC: serialize concurrent auth calls per tenant so the quota
            # check and the log insert commit as one unit.
            subscription = (
                Subscription.objects.select_for_update().filter(tenant=tenant).first()
            )
            if not subscription or not subscription.has_feature("agent_api"):
                denial = "plan_feature"
            else:
                daily_limit = subscription.get_limit("api_calls_day")
                if daily_limit <= 0:
                    denial = "quota_disabled"
                else:
                    calls_today = AgentAPICallLog.objects.filter(
                        tenant=tenant,
                        created_at__gte=today_start,
                    ).count()
                    if calls_today >= daily_limit:
                        denial = "quota_exceeded"
                    else:
                        api_key.last_used_at = timezone.now()
                        api_key.save(update_fields=["last_used_at"])
                        call_log = AgentAPICallLog.objects.create(
                            tenant=tenant,
                            api_key=api_key,
                            endpoint=request.path,
                            method=request.method,
                            status_code=200,
                        )

        if denial is not None:
            audit_denial(request, reason=denial, tenant=tenant)
            logger.warning(
                "Agent API access denied (%s): tenant=%s key_prefix=%s ip=%s",
                denial,
                tenant.slug,
                api_key.key_prefix,
                ip,
            )
            if denial == "plan_feature":
                raise HttpError(403, get_message("PLAN_FEATURE_UNAVAILABLE"))
            if denial == "quota_disabled":
                raise HttpError(
                    403,
                    get_message(
                        "PLAN_LIMIT_EXCEEDED",
                        resource="api_calls_day",
                        limit=0,
                    ),
                )
            raise HttpError(429, get_message("RATE_LIMIT_EXCEEDED"))

        # Attach tenant + key + admitted call log to the request
        request.tenant = tenant
        request.agent_api_key = api_key
        request.agent_api_call_log = call_log

        return api_key


agent_api_auth = AgentAPIKeyAuth()
