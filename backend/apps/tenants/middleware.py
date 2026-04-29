"""
Loyallia — Tenant Middleware
LYL-M-ARCH-020: Resolves the active tenant from the authenticated user
on every request. Attaches request.tenant for downstream code.

Middleware position: After AuthenticationMiddleware in MIDDLEWARE list.
"""

import logging

from django.http import HttpRequest, HttpResponse

logger = logging.getLogger(__name__)


class TenantMiddleware:
    """
    Resolves request.tenant from the authenticated user.

    - For authenticated requests with a user that has a tenant FK:
      attaches request.tenant = user.tenant (already fetched by JWTAuth via select_related).
    - For SUPER_ADMIN users (no tenant): request.tenant = None.
    - For unauthenticated requests (public enrollment, health check): request.tenant = None.
    - Does NOT block unauthenticated requests — that is the responsibility of auth= on Ninja endpoints.
    - Logs tenant resolution for audit trail on API requests.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        # Default: no tenant
        request.tenant = None

        # Resolve tenant from authenticated user
        user = getattr(request, "user", None)
        if user is not None and hasattr(user, "is_authenticated") and user.is_authenticated:
            tenant = getattr(user, "tenant", None)
            if tenant is not None:
                request.tenant = tenant
            # SUPER_ADMIN users have tenant=None — that's expected

        response = self.get_response(request)
        return response
