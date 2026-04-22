"""
Loyallia — Shared Permission Classes for Django Ninja endpoints.
All permissions extend TenantScopedPermission to enforce tenant isolation.
"""
from typing import Any
from ninja.security import HttpBearer
from django.http import HttpRequest
from apps.authentication.tokens import decode_access_token
from common.messages import get_message


class JWTAuth(HttpBearer):
    """
    Django Ninja HTTP Bearer token authentication.
    Decodes JWT, attaches user and tenant to request.
    """

    def authenticate(self, request: HttpRequest, token: str) -> Any:
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

        request.user = user
        request.tenant = user.tenant
        return user


class OptionalJWTAuth(HttpBearer):
    """Bearer auth that allows unauthenticated access (returns None instead of 401)."""

    def authenticate(self, request: HttpRequest, token: str) -> Any:
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
            request.user = user
            request.tenant = user.tenant
            return user
        except User.DoesNotExist:
            return None


# Singleton instances for use in endpoint decorators
jwt_auth = JWTAuth()
optional_jwt_auth = OptionalJWTAuth()


def require_role(*roles: str):
    """
    Decorator factory for role-based access control on Ninja endpoints.
    Usage: @require_role("OWNER", "MANAGER")
    """
    def decorator(func):
        def wrapper(request, *args, **kwargs):
            if not hasattr(request, "user") or request.user is None:
                from ninja.errors import HttpError
                raise HttpError(401, get_message("AUTH_TOKEN_INVALID"))
            if request.user.role not in roles:
                from ninja.errors import HttpError
                raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
            return func(request, *args, **kwargs)
        wrapper.__wrapped__ = func
        return wrapper
    return decorator


def is_owner(request: HttpRequest) -> bool:
    return hasattr(request, "user") and request.user.role == "OWNER"


def is_manager_or_owner(request: HttpRequest) -> bool:
    return hasattr(request, "user") and request.user.role in ("OWNER", "MANAGER")


def is_staff_or_above(request: HttpRequest) -> bool:
    return hasattr(request, "user") and request.user.role in ("OWNER", "MANAGER", "STAFF")


def is_super_admin(request: HttpRequest) -> bool:
    return hasattr(request, "user") and request.user.role == "SUPER_ADMIN"
