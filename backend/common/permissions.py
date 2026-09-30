"""
Loyallia Authentication & Authorization Layer (common/permissions.py)

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
    - SEC: SUPER_ADMIN is admitted by is_scanner_operator / is_manager_or_owner /
      is_owner so a platform admin impersonating a tenant can operate that tenant.
      Platform-only surfaces keep using is_super_admin (or an explicit role list).
    - SEC: The scanner is an OPERATIONAL surface (validate / transact / remote-issue),
      not a management surface. Every device-holding role must be able to redeem.

Called by: Every endpoint decorated with `auth=jwt_auth` or `auth=optional_jwt_auth`.
"""

import logging
from functools import wraps
from typing import Any, cast

from django.http import HttpRequest
from ninja.security import HttpBearer

from apps.authentication.models import UserRole
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

    Thin wrapper around JWTAuth: catches AuthenticationError and returns None.
    """

    def authenticate(self, request: HttpRequest, token: str) -> Any:
        if not token:
            return None
        try:
            return JWTAuth().authenticate(request, token)
        except Exception as e:
            logging.getLogger(__name__).debug("OptionalJWTAuth suppressed: %s", e)
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

    Usage: @require_role(UserRole.OWNER.value, UserRole.MANAGER.value)

    SEC: Checks role AFTER JWTAuth has verified the token and loaded the user.
    Uses simple string-in-tuple comparison  no polymorphism overhead (Rule 12).
    Pass canonical ``UserRole`` values, never free-typed role strings.
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


def is_scanner_operator(request: HttpRequest) -> bool:
    """Check if authenticated user may operate the scanner.

    The scanner is an operational surface (validate / transact / remote-issue),
    not a management surface: every role that can hold a device must be able
    to scan and redeem whatever card type is presented. SUPER_ADMIN is
    included so a platform admin impersonating a tenant can work the floor
    like any other operator.

    Management surfaces (transactions list, program design, billing) use
    is_manager_or_owner / is_owner / is_super_admin instead.
    """
    user = _role_user(as_tenant_request(request))
    return bool(user and user.role in UserRole.values)


def is_owner(request: HttpRequest) -> bool:
    """Check if authenticated user has OWNER role.

    SUPER_ADMIN is also admitted: a platform admin impersonating a tenant
    must be able to perform owner-level actions (program design, billing,
    settings) inside that tenant. Platform-only surfaces must call
    is_super_admin instead.
    """
    user = _role_user(as_tenant_request(request))
    return bool(user and user.role in (UserRole.OWNER.value, UserRole.SUPER_ADMIN.value))


def is_manager_or_owner(request: HttpRequest) -> bool:
    """Check if authenticated user has MANAGER or OWNER role.

    SUPER_ADMIN is also admitted so a platform admin impersonating a tenant
    can view management surfaces (transactions, analytics, programs) for
    that tenant.
    """
    user = _role_user(as_tenant_request(request))
    return bool(
        user
        and user.role
        in (UserRole.OWNER.value, UserRole.MANAGER.value, UserRole.SUPER_ADMIN.value)
    )


def is_staff_or_above(request: HttpRequest) -> bool:
    """Backward-compatible alias for is_scanner_operator.

    Historical name: scanner endpoints used this gate. New call sites should
    prefer is_scanner_operator, which states the operational intent.
    """
    return is_scanner_operator(request)


def is_super_admin(request: HttpRequest) -> bool:
    """Check if authenticated user has SUPER_ADMIN role (platform-level access)."""
    user = _role_user(as_tenant_request(request))
    return bool(user and user.role == UserRole.SUPER_ADMIN.value)
