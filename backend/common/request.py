"""
Typed request helpers for middleware-enriched Django requests.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, cast

from django.http import HttpRequest
from ninja.errors import HttpError

from common.messages import get_message

if TYPE_CHECKING:
    from apps.agent_api.models import AgentAPIKey
    from apps.tenants.models import Tenant


class TenantRequest(HttpRequest):
    tenant: Tenant | None
    agent_api_key: AgentAPIKey


def as_tenant_request(request: HttpRequest) -> TenantRequest:
    """Cast middleware-enriched request to the typed request interface."""
    return cast(TenantRequest, request)


def require_tenant(request: HttpRequest) -> Tenant:
    """Return request tenant or raise 403 when tenant context is missing."""
    tenant_request = as_tenant_request(request)
    if tenant_request.tenant is None:
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    return tenant_request.tenant
