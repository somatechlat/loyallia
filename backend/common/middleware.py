"""
Loyallia Common Middleware (common/middleware.py)

Three middleware classes that run on EVERY request:
1. RequestIDMiddleware (B-011): Distributed tracing via X-Request-ID.
2. CSPNonceMiddleware: Per-request CSP nonce generation.
3. CSRFExemptAPIMiddleware: Exempt JWT-authenticated API routes from CSRF.

Performance (Rule 12):
    All three middlewares are O(1) with zero database queries.
    RequestIDMiddleware: uuid4().hex is a single call.
    CSPNonceMiddleware: token_urlsafe(16) is a single call.
    CSRFExemptAPIMiddleware: single startswith() string check.

Called by: Django middleware chain (MIDDLEWARE setting in settings/base.py).
"""

import logging
import secrets
import uuid

logger = logging.getLogger(__name__)


class RequestIDMiddleware:
    """Attach a unique X-Request-ID to every request and response.

    If the incoming request already carries an X-Request-ID header
    (e.g. from an upstream load balancer or API gateway), it is reused.
    Otherwise a new UUID4 is generated.

    The ID is stored on ``request.request_id`` and echoed back in the
    response header so clients can correlate logs.
    """

    HEADER = "X-Request-ID"

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # PERF: reuse upstream ID if present, otherwise generate (single uuid4 call)
        request_id = request.META.get(f"HTTP_{self.HEADER.upper().replace('-', '_')}", "")
        if not request_id:
            request_id = uuid.uuid4().hex

        request.request_id = request_id

        response = self.get_response(request)
        # Echo ID back so clients can correlate requests with server logs
        response[self.HEADER] = request_id
        return response


class CSPNonceMiddleware:
    """

    Each request gets a cryptographically random nonce that is:
    - Stored on ``request.csp_nonce`` for template use
    - Set in the ``Content-Security-Policy`` response header

    This replaces 'unsafe-inline' with nonce-based script/style allowlisting.
    The nonce is a base64url token (22 chars, 128 bits of entropy).
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # SEC: 128-bit cryptographic nonce (22 chars base64url) per request
        nonce = secrets.token_urlsafe(16)
        request.csp_nonce = nonce

        response = self.get_response(request)

        # Build CSP header with nonce
        #
        # CSP violations when Google OAuth is enabled.
        response_content_type = response.get("Content-Type", "")
        if "application/json" not in response_content_type:
            csp_directives = [
                "default-src 'self'",
                f"script-src 'self' 'nonce-{nonce}' https://accounts.google.com https://apis.google.com",
                f"style-src 'self' 'nonce-{nonce}' https://accounts.google.com https://fonts.googleapis.com",
                "img-src 'self' data: https: blob:",
                "font-src 'self' https://fonts.gstatic.com",
                "connect-src 'self' https://oauth2.googleapis.com https://accounts.google.com https://apis.google.com",
                "frame-src 'self' https://accounts.google.com",
                "base-uri 'self'",
                "form-action 'self'",
                "frame-ancestors 'self'",
            ]
            response["Content-Security-Policy"] = "; ".join(csp_directives)
        return response


class CSRFExemptAPIMiddleware:
    """

    Django Ninja routes are authenticated via JWT Bearer tokens and are inherently
    CSRF-immune (browsers don't send Authorization headers automatically).
    This middleware marks /api/ paths as CSRF-exempt so the CsrfViewMiddleware
    skips them, while all other routes (admin, template views) remain protected.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # SEC: /api/ paths use JWT Bearer tokens which are CSRF-immune by design.
        # Browsers never auto-attach Authorization headers, so CSRF is impossible.
        if request.path.startswith("/api/") or request.path.startswith("/wallet/apple/"):
            request._dont_enforce_csrf_checks = True

        response = self.get_response(request)
        return response


class AuditUserMiddleware:
    """Store the authenticated user ID in thread-local storage for audit fields.

    This allows model save() methods to automatically set created_by/updated_by
    without passing the user through every call stack.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        from common.models import set_current_user_id

        user = getattr(request, "user", None)
        if user is not None and getattr(user, "is_authenticated", False):
            set_current_user_id(getattr(user, "id", None))
        else:
            set_current_user_id(None)

        response = self.get_response(request)
        set_current_user_id(None)
        return response
