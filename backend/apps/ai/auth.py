"""
AI App Authentication Helpers

Provides a Django-view decorator that replicates the JWT validation
performed by Ninja's JWTAuth, for use with standard Django URL includes.
"""

import functools
import logging
from collections.abc import Callable

from django.http import HttpRequest, JsonResponse

from apps.authentication.tokens import decode_access_token
from common.messages import get_message
from common.request import as_tenant_request

logger = logging.getLogger(__name__)


def jwt_required(view_func: Callable) -> Callable:
    """Decorator for standard Django views that requires a valid JWT access token.

    Extracts the Bearer token from the Authorization header, validates it
    cryptographically, and loads the User+Tenant (select_related) in one query.
    Attaches request.user and request.tenant for downstream use.
    """

    @functools.wraps(view_func)
    def wrapper(request: HttpRequest, *args, **kwargs):
        auth_header = request.META.get("HTTP_AUTHORIZATION", "")
        if not auth_header.startswith("Bearer "):
            return JsonResponse(
                {"success": False, "error": "AUTH_REQUIRED", "message": get_message("AUTH_PERMISSION_DENIED")},
                status=401,
            )

        token = auth_header[7:].strip()
        payload = decode_access_token(token)
        if payload is None:
            return JsonResponse(
                {"success": False, "error": "AUTH_INVALID_TOKEN", "message": get_message("AUTH_PERMISSION_DENIED")},
                status=401,
            )

        from apps.authentication.models import User

        try:
            user = User.objects.select_related("tenant").get(
                id=payload["user_id"],
                is_active=True,
            )
        except User.DoesNotExist:
            return JsonResponse(
                {"success": False, "error": "AUTH_USER_NOT_FOUND", "message": get_message("AUTH_PERMISSION_DENIED")},
                status=401,
            )

        tenant_request = as_tenant_request(request)
        tenant_request.user = user
        tenant_request.tenant = user.tenant
        return view_func(request, *args, **kwargs)

    return wrapper
