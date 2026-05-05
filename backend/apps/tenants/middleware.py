"""
Loyallia — Tenant Resolution Middleware (apps/tenants/middleware.py)

Resolves the active tenant from the authenticated user on every request.
Attaches `request.tenant` for downstream API code. LYL-M-ARCH-020.

Architecture:
    Runs AFTER Django's AuthenticationMiddleware and AFTER JWTAuth.authenticate().
    By the time this middleware executes, request.user is already populated
    (either by Django session auth or by JWTAuth's select_related("tenant") JOIN).

    For JWTAuth users: user.tenant is already loaded (no additional query).
    For SUPER_ADMIN users: tenant is None (they operate at platform level).
    For unauthenticated requests: tenant is None (public endpoints like enrollment).

Performance (Rule 12):
    ZERO database queries. The tenant FK is already loaded by JWTAuth's
    select_related("tenant") call. This middleware only copies the reference.
    This is critical because this code runs on EVERY request.

Security (SEC):
    SEC: Tenant is derived from the DB-loaded User FK, not from request headers
    or URL parameters. This prevents tenant spoofing attacks where an attacker
    might try to set a tenant header to access another tenant's data.

Called by: Django middleware chain (MIDDLEWARE setting in settings/base.py).
Position: After AuthenticationMiddleware.
"""

import logging

from django.http import HttpRequest, HttpResponse

from common.request import as_tenant_request

logger = logging.getLogger(__name__)


class TenantMiddleware:
    """Resolve request.tenant from the authenticated user's FK relationship.

    Does NOT block unauthenticated requests — endpoint-level auth= decorators
    handle that. This middleware only establishes tenant context when available.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        tenant_request = as_tenant_request(request)
        # Default: no tenant (public endpoints, unauthenticated requests)
        tenant_request.tenant = None

        # PERF: no DB query — user.tenant was loaded by JWTAuth's select_related
        user = getattr(request, "user", None)
        if (
            user is not None
            and hasattr(user, "is_authenticated")
            and user.is_authenticated
        ):
            tenant = getattr(user, "tenant", None)
            if tenant is not None:
                # SEC: tenant derived from User FK, not from request headers
                tenant_request.tenant = tenant
            # SUPER_ADMIN users have tenant=None — they operate at platform level

        response = self.get_response(request)
        return response
