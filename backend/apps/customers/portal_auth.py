"""
Loyallia Customer Portal Authentication

JWT auth for customer self-service portal.
Uses same JWT secret as staff auth but with type="customer_access" claim
to prevent token cross-use.
"""

from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
from django.conf import settings
from django.http import HttpRequest
from ninja.security import HttpBearer

from common.request import as_tenant_request

UTC = UTC


def _utcnow() -> datetime:
    return datetime.now(tz=UTC)


def _get_signing_key() -> str:
    """Get the key used for signing JWTs (same as staff auth)."""
    from apps.authentication.tokens import _get_signing_key as staff_signing_key

    return staff_signing_key()


def _get_verification_key() -> str:
    """Get the key used for verifying JWTs (same as staff auth)."""
    from apps.authentication.tokens import (
        _get_verification_key as staff_verification_key,
    )

    return staff_verification_key()


def create_customer_access_token(customer_id: str) -> str:
    """Create a short-lived JWT access token for a customer portal user.

    Payload:
        customer_id: str UUID
        iat: issued at
        exp: expiry (30 minutes)
        type: "customer_access"
    """
    now = _utcnow()
    payload = {
        "customer_id": str(customer_id),
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=30)).timestamp()),
        "type": "customer_access",
    }
    return jwt.encode(payload, _get_signing_key(), algorithm=settings.JWT_ALGORITHM)


def decode_customer_access_token(token: str) -> dict | None:
    """Decode and verify a customer JWT access token.

    Returns payload dict on success, None on any failure.
    """
    try:
        payload = jwt.decode(
            token,
            _get_verification_key(),
            algorithms=[settings.JWT_ALGORITHM],
        )
        if payload.get("type") != "customer_access":
            return None
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


class CustomerJWTAuth(HttpBearer):
    """Django Ninja bearer token auth for customer portal.

    Decodes customer JWT + loads CustomerPortalAccount.
    Attaches `request.portal_customer` for downstream use.
    """

    def authenticate(self, request: HttpRequest, token: str) -> Any:
        tenant_request = as_tenant_request(request)
        payload = decode_customer_access_token(token)
        if payload is None:
            return None

        from apps.customers.models import CustomerPortalAccount

        try:
            customer = CustomerPortalAccount.objects.get(
                id=payload["customer_id"],
                is_active=True,
            )
        except (CustomerPortalAccount.DoesNotExist, KeyError):
            return None

        tenant_request.portal_customer = customer
        return customer


class OptionalCustomerJWTAuth(HttpBearer):
    """Bearer auth that allows unauthenticated access.

    Returns None (not 401) when token is missing or invalid.
    """

    def authenticate(self, request: HttpRequest, token: str) -> Any:
        if not token:
            return None
        try:
            return CustomerJWTAuth().authenticate(request, token)
        except Exception:
            return None


# Singleton instances
portal_auth = CustomerJWTAuth()
optional_portal_auth = OptionalCustomerJWTAuth()
