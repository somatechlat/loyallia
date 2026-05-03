"""
Loyallia — Shared Permission Classes for Django Ninja endpoints.
All permissions extend TenantScopedPermission to enforce tenant isolation.
"""

from functools import wraps
from typing import Any, cast

from django.http import HttpRequest
from ninja.security import HttpBearer

from apps.authentication.tokens import decode_access_token
from common.messages import get_message
from common.request import as_tenant_request


class JWTAuth(HttpBearer):
    """
    Django Ninja HTTP Bearer token authentication.
    Decodes JWT, attaches user and tenant to request.
    """

    def authenticate(self, request: HttpRequest, token: str) -> Any:
        tenant_request = as_tenant_request(request)
        payload = decode_access_token(token)
        if payload is None:
            return None

        from apps.authentication.models import User

        try:
            user = User.objects.select_related("tenant").get(
                id=payload["user_id"],
                is_active=True,
            )
        except User.DoesNotExist:
            return None

        tenant_request.user = user
        tenant_request.tenant = user.tenant
        return user


class OptionalJWTAuth(HttpBearer):
    """Bearer auth that allows unauthenticated access (returns None instead of 401)."""

    def authenticate(self, request: HttpRequest, token: str) -> Any:
        tenant_request = as_tenant_request(request)
        if not token:
            return None
        payload = decode_access_token(token)
        if payload is None:
            return None
        from apps.authentication.models import User

        try:
            user = User.objects.select_related("tenant").get(
                id=payload["user_id"],
                is_active=True,
            )
            tenant_request.user = user
            tenant_request.tenant = user.tenant
            return user
        except User.DoesNotExist:
            return None


# Singleton instances for use in endpoint decorators
jwt_auth = JWTAuth()
optional_jwt_auth = OptionalJWTAuth()


def _role_user(request: HttpRequest):
    user = getattr(request, "user", None)
    if user is None:
        return None
    if not getattr(user, "is_authenticated", False):
        return None
    if not hasattr(user, "role"):
        return None
    return user


def require_role(*roles: str):
    """
    Decorator factory for role-based access control on Ninja endpoints.
    Usage: @require_role("OWNER", "MANAGER")
    """

    def decorator(func):
        @wraps(func)
        def wrapper(request, *args, **kwargs):
            typed_request = as_tenant_request(cast(HttpRequest, request))
            user = _role_user(typed_request)
            if user is None:
                from ninja.errors import HttpError

                raise HttpError(401, get_message("AUTH_TOKEN_INVALID"))
            if user.role not in roles:
                from ninja.errors import HttpError

                raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
            return func(request, *args, **kwargs)

        return wrapper

    return decorator


def is_owner(request: HttpRequest) -> bool:
    user = _role_user(as_tenant_request(request))
    return bool(user and user.role == "OWNER")


def is_manager_or_owner(request: HttpRequest) -> bool:
    user = _role_user(as_tenant_request(request))
    return bool(user and user.role in ("OWNER", "MANAGER"))


def is_staff_or_above(request: HttpRequest) -> bool:
    user = _role_user(as_tenant_request(request))
    return bool(user and user.role in ("OWNER", "MANAGER", "STAFF"))


def is_super_admin(request: HttpRequest) -> bool:
    user = _role_user(as_tenant_request(request))
    return bool(user and user.role == "SUPER_ADMIN")
