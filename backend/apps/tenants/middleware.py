"""
Loyallia — Tenant Middleware
Resolves the active tenant from the JWT access token on every authenticated request.
Attaches request.tenant for downstream code to use without re-querying.

Middleware position: After AuthenticationMiddleware in MIDDLEWARE list.
"""

import logging

from django.http import HttpRequest, HttpResponse

logger = logging.getLogger(__name__)


class TenantMiddleware:
    """
    Resolves request.tenant from the JWT access token.

    - For authenticated requests: decodes JWT, reads tenant_id, attaches Tenant object.
    - For unauthenticated requests (public enrollment, health check): request.tenant = None.
    - Does NOT block unauthenticated requests — that is the responsibility of auth= on Ninja endpoints.
    - Resolves in O(1) from request.user.tenant (already fetched by JWTAuth.authenticate via select_related).
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        # Attach tenant placeholder early so all downstream code can always check request.tenant
        if not hasattr(request, "tenant"):
            request.tenant = None

        response = self.get_response(request)
        return response
