"""
Loyallia Typed Request Helpers (common/request.py)

Provides type-safe access to the tenant and agent API key that middleware
and JWTAuth attach to every Django request during authentication.

Architecture:
    TenantRequest extends HttpRequest with `tenant` and `agent_api_key` attributes.
    as_tenant_request() is a zero-cost cast (no runtime overhead, only type-checker hint).
    require_tenant() is a guard that raises 403 when tenant context is missing.

Performance (Rule 12):
    These are pure type-system helpers. as_tenant_request() compiles to a no-op
    the cast() call is erased at runtime. Zero overhead on the hot path.

Called by: Every API endpoint and middleware that needs tenant-scoped data access.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, cast

from django.http import HttpRequest
from ninja.errors import HttpError

from common.messages import get_message

if TYPE_CHECKING:
    from typing import Any

    from apps.agent_api.models import AgentAPIKey
    from apps.tenants.models import Tenant


class TenantRequest(HttpRequest):
    """Extended HttpRequest with tenant context attributes.

    These attributes are set by JWTAuth (for user requests) or AgentAPIKeyAuth
    (for agent API requests) during the authentication phase.
    """

    tenant: "Tenant | None"
    agent_api_key: "AgentAPIKey"
    portal_customer: "Any | None"


def as_tenant_request(request: HttpRequest) -> TenantRequest:
    """Cast middleware-enriched request to the typed TenantRequest interface.

    PERF: This is a zero-cost type assertion  cast() is erased at runtime.
    No object creation, no dict copy, no attribute check.
    """
    return cast(TenantRequest, request)


def require_tenant(request: HttpRequest) -> "Tenant":
    """Return the request's tenant or raise 403 if tenant context is missing.

    SEC: This is the canonical guard for tenant-scoped endpoints. Any endpoint
    that reads/writes tenant data MUST call this before accessing models.
    Prevents data leakage when tenant context is not established.
    """
    tenant_request = as_tenant_request(request)
    if tenant_request.tenant is None:
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    return tenant_request.tenant
