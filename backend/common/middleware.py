"""
Loyallia — Common Middleware
B-011: Request ID middleware for distributed tracing.
LYL-H-SEC-010: CSP nonce generation for script/style tags.
LYL-M-SEC-018: CSRF enforcement on non-API routes.
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
        request_id = request.META.get(
            f"HTTP_{self.HEADER.upper().replace('-', '_')}", ""
        )
        if not request_id:
            request_id = uuid.uuid4().hex

        request.request_id = request_id

        response = self.get_response(request)
        response[self.HEADER] = request_id
        return response


class CSPNonceMiddleware:
    """LYL-H-SEC-010: Generate a per-request CSP nonce and set Content-Security-Policy header.

    Each request gets a cryptographically random nonce that is:
    - Stored on ``request.csp_nonce`` for template use
    - Set in the ``Content-Security-Policy`` response header

    This replaces 'unsafe-inline' with nonce-based script/style allowlisting.
    The nonce is a base64url token (22 chars, 128 bits of entropy).
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        nonce = secrets.token_urlsafe(16)
        request.csp_nonce = nonce

        response = self.get_response(request)

        # Build CSP header with nonce
        csp_directives = [
            f"default-src 'self'",
            f"script-src 'self' 'nonce-{nonce}' https://accounts.google.com https://apis.google.com",
            f"style-src 'self' 'nonce-{nonce}'",
            f"img-src 'self' data: https:",
            f"font-src 'self' https://fonts.gstatic.com",
            f"connect-src 'self' https://oauth2.googleapis.com",
            f"frame-src 'self' https://accounts.google.com",
            f"base-uri 'self'",
            f"form-action 'self'",
            f"frame-ancestors 'self'",
        ]
        response["Content-Security-Policy"] = "; ".join(csp_directives)
        return response


class CSRFExemptAPIMiddleware:
    """LYL-M-SEC-018: Exempt Django Ninja API routes from CSRF while protecting all others.

    Django Ninja routes are authenticated via JWT Bearer tokens and are inherently
    CSRF-immune (browsers don't send Authorization headers automatically).
    This middleware marks /api/ paths as CSRF-exempt so the CsrfViewMiddleware
    skips them, while all other routes (admin, template views) remain protected.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Mark API paths as CSRF-exempt (JWT auth is CSRF-immune)
        if request.path.startswith("/api/"):
            request._dont_enforce_csrf_checks = True

        response = self.get_response(request)
        return response
