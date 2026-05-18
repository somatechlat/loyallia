"""
Loyallia  Authentication & Authorization Layer (common/permissions.py)

Fires on EVERY authenticated API request. This is the hottest path in the
backend  all latency here multiplies across the entire application.

Architecture:
    JWTAuth.authenticate() → decode JWT → load User+Tenant (1 query) → attach to request
    Role helpers (is_owner, is_manager_or_owner, etc.) read from the already-loaded user.

Performance (Rule 12):
    - User.objects.select_related("tenant") ensures User+Tenant load in a single JOIN
      instead of two queries. This saves ~1ms per request at scale.
    - Role checks use simple string comparison (no polymorphism, no class hierarchy).
    - Singleton JWTAuth instances (jwt_auth, optional_jwt_auth) avoid re-instantiation.

Security (SEC):
    - SEC: JWT payload is verified cryptographically by decode_access_token() before
      any DB lookup. Invalid/expired tokens never hit the database.
    - SEC: is_active=True filter prevents deactivated users from authenticating.
    - SEC: Tenant is attached from the User's FK, not from request data, preventing
      tenant spoofing via header manipulation.

Called by: Every endpoint decorated with `auth=jwt_auth` or `auth=optional_jwt_auth`.
"""

from functools import wraps
from typing import Any, cast

from django.http import HttpRequest
from ninja.security import HttpBearer

from apps.authentication.tokens import decode_access_token
from common.messages import get_message
from common.request import as_tenant_request


class JWTAuth(HttpBearer):
    """Django Ninja bearer token auth  decodes JWT + loads User+Tenant in one query.

    On success, attaches `request.user` and `request.tenant` for downstream use.
    Returns None on invalid/expired token (Ninja translates this to 401).
    """

    def authenticate(self, request: HttpRequest, token: str) -> Any:
        tenant_request = as_tenant_request(request)
 # SEC: cryptographic verification before any DB work
        payload = decode_access_token(token)
        if payload is None:
            return None

        from apps.authentication.models import User

        try:
 # PERF: select_related("tenant") = single JOIN instead of 2 queries
 # SEC: is_active=True prevents deactivated users from authenticating
            user = User.objects.select_related("tenant").get(
                id=payload["user_id"],
                is_active=True,
            )
        except User.DoesNotExist:
            return None

 # SEC: tenant derived from User FK, not request headers (prevents spoofing)
        tenant_request.user = user
        tenant_request.tenant = user.tenant
        return user


class OptionalJWTAuth(HttpBearer):
    """Bearer auth that allows unauthenticated access for public endpoints.

    Used on endpoints like enrollment pages where auth is optional.
    Returns None (not 401) when token is missing or invalid.
    """

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


# Singleton instances avoids re-instantiation on every endpoint registration
jwt_auth = JWTAuth()
optional_jwt_auth = OptionalJWTAuth()


def _role_user(request: HttpRequest):
    """Extract the authenticated User from request, or None if not valid.

    Performs three guard checks in order:
    1. User object exists on request (set by JWTAuth.authenticate)
    2. User is authenticated (not AnonymousUser)
    3. User has a role attribute (is a Loyallia User, not a Django admin)
    """
    user = getattr(request, "user", None)
    if user is None:
        return None
    if not getattr(user, "is_authenticated", False):
        return None
    if not hasattr(user, "role"):
        return None
    return user


def require_role(*roles: str):
    """Decorator for role-based access control on Django Ninja endpoints.

    Usage: @require_role("OWNER", "MANAGER")

    SEC: Checks role AFTER JWTAuth has verified the token and loaded the user.
    Uses simple string-in-tuple comparison  no polymorphism overhead (Rule 12).
    """

    def decorator(func):
        @wraps(func)
        def wrapper(request, *args, **kwargs):
            typed_request = as_tenant_request(cast(HttpRequest, request))
            user = _role_user(typed_request)
            if user is None:
                from ninja.errors import HttpError

                raise HttpError(401, get_message("AUTH_TOKEN_INVALID"))
 # SEC: role checked against the DB-loaded user, not request data
            if user.role not in roles:
                from ninja.errors import HttpError

                raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
            return func(request, *args, **kwargs)

        return wrapper

    return decorator


def is_owner(request: HttpRequest) -> bool:
    """Check if authenticated user has OWNER role."""
    user = _role_user(as_tenant_request(request))
    return bool(user and user.role == "OWNER")


def is_manager_or_owner(request: HttpRequest) -> bool:
    """Check if authenticated user has MANAGER or OWNER role."""
    user = _role_user(as_tenant_request(request))
    return bool(user and user.role in ("OWNER", "MANAGER"))


def is_staff_or_above(request: HttpRequest) -> bool:
    """Check if authenticated user has STAFF, MANAGER, or OWNER role."""
    user = _role_user(as_tenant_request(request))
    return bool(user and user.role in ("OWNER", "MANAGER", "STAFF"))


def is_super_admin(request: HttpRequest) -> bool:
    """Check if authenticated user has SUPER_ADMIN role (platform-level access)."""
    user = _role_user(as_tenant_request(request))
    return bool(user and user.role == "SUPER_ADMIN")
