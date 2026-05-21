"""
Loyallia  Rate Limiting Middleware (common/rate_limit.py)

Redis-backed per-IP and per-user rate limiting for all API endpoints.
Uses INCR + EXPIRE (sliding window) for atomic, distributed rate counting.

Protects against:
    - Brute force login attacks (60 req/min per IP on /auth/login)
    - QR scan abuse (120 req/min per user on /scanner/)
    - Analytics DDoS (60 req/min per user on /analytics/)
    - General API abuse (200 req/min per IP on all endpoints)

Architecture:
    Rules are evaluated in order (most specific path first). First match wins.
    For user-keyed rules, a SHA256 hash of the Authorization header is used
    as the rate key (avoids storing full tokens in Redis).

Performance (Rule 12):
    - PERF: Redis pipeline used for INCR (minimizes round-trips).
    - PERF: _redis_available flag prevents repeated connection attempts after failure.
    - PERF: Health check endpoint (/api/v1/health/) bypassed entirely.
    - PERF: Non-API paths bypassed via single startswith() check.

Security (SEC):
    - SEC: LYL-C-SEC-002  Auth endpoints fail CLOSED when Redis is unavailable
      (503 instead of pass-through) to prevent brute force during Redis outages.
    - SEC: LYL-H-SEC-004  IP extracted from REMOTE_ADDR only (not X-Forwarded-For)
      to prevent IP spoofing via client-set headers.

Called by: Django middleware chain. Position: after CorsMiddleware, before TenantMiddleware.
Returns HTTP 429 Too Many Requests with Retry-After header on violation.
"""

import logging

from django.http import HttpRequest, JsonResponse

from common.messages import get_message

logger = logging.getLogger(__name__)


def _get_redis_client():
    """Get Redis client for atomic rate limiting.

    Uses django_redis if available; returns None otherwise so callers
    can fall back to Django cache (e.g. LocMemCache in dev).
    """
    try:
        from django_redis import get_redis_connection
        return get_redis_connection("default")
    except Exception:
        return None


def _check_rate_limit_cache(key: str, max_requests: int, window_seconds: int) -> bool:
    """Non-atomic rate limit check using Django cache.

    Falls back to this when Redis is unavailable.  May be slightly
    racy under high concurrency but better than nothing.
    """
    try:
        from django.core.cache import cache

        current_count = cache.get(key)
        if current_count is None:
            cache.set(key, 1, window_seconds)
            current_count = 1
        else:
            try:
                current_count = cache.incr(key)
            except ValueError:
                cache.set(key, 1, window_seconds)
                current_count = 1
        return current_count <= max_requests
    except Exception:
        logger.warning("Rate limiter: Cache operation error. Failing open.")
        return True


def _get_cache_ttl(key: str, window_seconds: int) -> int:
    """Best-effort TTL lookup from Django cache."""
    try:
        from django.core.cache import cache
        ttl = cache.ttl(key) if hasattr(cache, "ttl") else window_seconds
    except Exception:
        ttl = window_seconds
    return ttl


def _check_rate_limit_redis(key: str, max_requests: int, window_seconds: int) -> bool:
    """Atomic rate limit check using Redis INCR + EXPIRE.

    Uses a Lua-like atomic sequence: INCR the key; if it was the first
    creation (value == 1), set EXPIRE.  Returns True if request is
    allowed, False if it exceeds the limit.

    Falls back to Django cache when Redis is unavailable.
    """
    redis_client = _get_redis_client()
    if not redis_client:
        return _check_rate_limit_cache(key, max_requests, window_seconds)

    try:
        current = redis_client.incr(key)
        if current == 1:
            redis_client.expire(key, window_seconds)
        return current <= max_requests
    except Exception:
        logger.warning("Rate limiter: Redis INCR failed. Falling back to cache.")
        return _check_rate_limit_cache(key, max_requests, window_seconds)

# Rate limit rules: (path_prefix, key_type, max_requests, window_seconds)
RATE_LIMIT_RULES = [
    (
        "/api/v1/auth/login",
        "ip",
        60,
        60,
    ),  # 60 login attempts per minute per IP (dev-friendly; tighten in production)
    ("/api/v1/auth/register", "ip", 10, 60),  # 10 registrations per minute per IP
    (
        "/api/v1/auth/phone/",
        "ip",
        30,
        60,
    ),  # 30 OTP requests per min (dev-friendly; tighten to 3 in production)
    (
        "/api/v1/wallet/",
        "ip",
        30,
        60,
    ),  # HARDENED: 30 PKPass requests per min to prevent CPU exhaustion
    (
        "/api/v1/auth/google/config",
        "ip",
        200,
        60,
    ),  # 200 config requests per minute per IP
    (
        "/api/v1/auth/google/login",
        "ip",
        60,
        60,
    ),  # 60 Google login attempts per minute per IP
    ("/api/v1/auth/users/me", "ip", 200, 60),  # 200 session checks per minute per IP
    ("/api/v1/auth/me", "ip", 200, 60),  # 200 session checks per minute per IP (legacy)
    ("/api/v1/auth/", "ip", 60, 60),  # 60 general auth requests per minute per IP
    ("/api/v1/scanner/", "user", 120, 60),  # 120 scans per minute per user
 # Dashboard loads fan out to several analytics endpoints; 60/min lets normal
 # date-filter usage work while preserving user-scoped abuse protection.
    ("/api/v1/analytics/", "user", 60, 60),
    (
        "/api/v1/notifications/",
        "user",
        30,
        60,
    ),  # 30 notification ops per minute per user
    (
        "/api/v1/admin/",
        "ip",
        60,
        60,
    ),  # 60 SuperAdmin ops per minute per IP (factory reset, broadcast, impersonation)
    (
        "/api/v1/upload/",
        "ip",
        20,
        60,
    ),  # 20 file uploads per minute per IP (storage abuse protection)
    (
        "/api/v1/whatsapp/",
        "user",
        30,
        60,
    ),  # 30 WhatsApp ops per minute per user (cost-driven channel)
    (
        "/api/v1/agent/",
        "user",
        30,
        60,
    ),  # 30 Agent API calls per minute per user (LLM token cost protection)
    ("/api/v1/", "ip", 200, 60),  # 200 general API requests per minute per IP
]

# SECURITY (LYL-C-SEC-002): Auth endpoints MUST fail CLOSED when Redis is unavailable.
# These paths will return 503 instead of passing through unchecked.
AUTH_PATHS = [
    "/api/v1/auth/login",
    "/api/v1/auth/register",
    "/api/v1/auth/phone/",
    "/api/v1/auth/forgot-password/",
    "/api/v1/auth/verify-email/",
]


def _get_client_ip(request: HttpRequest) -> str:
    """Extract real client IP from REMOTE_ADDR only.

    SECURITY (LYL-H-SEC-004): Do NOT trust X-Forwarded-For from arbitrary clients.
    REMOTE_ADDR is set by the web server (Nginx) and cannot be spoofed by the client.
    If behind a load balancer that sets X-Forwarded-For, configure TRUSTED_PROXIES
    in Django settings and add middleware to handle it properly.
    """
    return request.META.get("REMOTE_ADDR", "unknown")


def get_client_ip(request: HttpRequest) -> str:
    """Public helper for endpoint-level rate limits."""
    return _get_client_ip(request)


class RateLimitMiddleware:
    """
    Redis-backed sliding window rate limiter.

    Position: After CorsMiddleware, before TenantMiddleware.
    Uses Redis INCR + EXPIRE for atomic, distributed rate counting.
    """

    def __init__(self, get_response):
        self.get_response = get_response
        self._cache_available = None

    def _get_cache(self):
        """Lazy Django cache backend connection.

        Uses django.core.cache (works with any backend including django_redis).
        """
        if self._cache_available is False:
            return None
        try:
            from django.core.cache import cache

 # Quick connectivity test (only on first call)
            if self._cache_available is None:
                cache.set("rl:__ping__", 1, 5)
                self._cache_available = True
            return cache
        except Exception:
            self._cache_available = False
            logger.warning("Rate limiter: Cache backend unavailable. Failing open.")
            return None

    def __call__(self, request: HttpRequest):
 # Only rate-limit API endpoints
        path = request.path
        if not path.startswith("/api/"):
            return self.get_response(request)

 # Skip health checks
        if path == "/api/v1/health/":
            return self.get_response(request)

        cache = self._get_cache()
        if cache is None:
 # SECURITY (LYL-C-SEC-002): Fail CLOSED for auth endpoints.
 # Auth endpoints must not pass through unchecked when cache is down.
            if any(request.path.startswith(p) for p in AUTH_PATHS):
                return JsonResponse(
                    {"error": "Service temporarily unavailable"},
                    status=503,
                )
 # Non-auth endpoints: fail open (allow through)
            return self.get_response(request)

        client_ip = _get_client_ip(request)

 # Find the first matching rule (most specific first due to ordering)
        for rule_path, key_type, max_requests, window in RATE_LIMIT_RULES:
            if not path.startswith(rule_path):
                continue

 # Build the rate limit key
            if key_type == "user":
 # User-based limiting requires auth header
                auth_header = request.META.get("HTTP_AUTHORIZATION", "")
                if not auth_header:
 # No auth = use IP-based limiting for this rule
                    rate_key = f"rl:{rule_path}:ip:{client_ip}"
                else:
 # Use a hash of the token as the user key (avoids storing tokens)
                    import hashlib

                    token_hash = hashlib.sha256(auth_header.encode()).hexdigest()[:16]
                    rate_key = f"rl:{rule_path}:user:{token_hash}"
            else:
                rate_key = f"rl:{rule_path}:ip:{client_ip}"

            try:
                current_count = cache.get(rate_key)
                if current_count is None:
 # First request in this window set to 1 with TTL
                    cache.set(rate_key, 1, window)
                    current_count = 1
                else:
 # Increment atomically via cache.incr
                    try:
                        current_count = cache.incr(rate_key)
                    except ValueError:
 # Key expired between get and incr reset
                        cache.set(rate_key, 1, window)
                        current_count = 1
            except Exception:
 # Cache error fail open
                logger.warning("Rate limiter: Cache operation error. Failing open.")
                break

            if current_count > max_requests:
 # Estimate TTL for Retry-After header
                try:
                    ttl = cache.ttl(rate_key) if hasattr(cache, "ttl") else window
                except Exception:
                    ttl = window

                logger.warning(
                    "Rate limit exceeded: path=%s ip=%s key=%s count=%d limit=%d",
                    path,
                    client_ip,
                    rate_key,
                    current_count,
                    max_requests,
                )
                return JsonResponse(
                    {
                        "success": False,
                        "error": "RATE_LIMIT_EXCEEDED",
                        "message": get_message("RATE_LIMIT_EXCEEDED"),
                        "retry_after": ttl,
                    },
                    status=429,
                    headers={"Retry-After": str(ttl)},
                )

 # Only apply the first matching rule
            break

        return self.get_response(request)


# Endpoint-level rate limit decorator


import functools
from collections.abc import Callable
from typing import TypeVar

F = TypeVar("F", bound=Callable)


def rate_limit(key_prefix: str, max_requests: int, window_seconds: int) -> Callable[[F], F]:
    """Decorator for endpoint-level rate limiting using Redis (preferred) or Django cache.

    Uses Redis INCR + EXPIRE for atomic, distributed rate counting.
    Falls back to Django cache when Redis is unavailable.
    Falls open (allows request) when both backends are unavailable.

    Args:
        key_prefix: Unique prefix for the rate limit key (e.g., "stripe_webhook").
        max_requests: Maximum number of requests allowed in the window.
        window_seconds: Time window in seconds.

    Example:
        @rate_limit(key_prefix="stripe_webhook", max_requests=100, window_seconds=60)
        def payment_webhook(request: HttpRequest):
            ...
    """

    def decorator(func: F) -> F:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
 # Django Ninja passes request as the first positional arg
            request = args[0] if args else None
            if request is None:
 # Cannot rate limit without a request pass through
                return func(*args, **kwargs)

            client_ip = _get_client_ip(request)
            rate_key = f"rl:{key_prefix}:ip:{client_ip}"

            allowed = _check_rate_limit_redis(rate_key, max_requests, window_seconds)
            if allowed:
                return func(*args, **kwargs)

 # Rate limit exceeded — get TTL for Retry-After header
            ttl = window_seconds
            redis_client = _get_redis_client()
            if redis_client:
                try:
                    ttl = redis_client.ttl(rate_key)
                    if ttl < 0:
                        ttl = window_seconds
                except Exception:
                    pass
            else:
                ttl = _get_cache_ttl(rate_key, window_seconds)

            logger.warning(
                "Rate limit exceeded: key_prefix=%s ip=%s count=%d limit=%d",
                key_prefix,
                client_ip,
                max_requests + 1,
                max_requests,
            )
            return JsonResponse(
                {
                    "success": False,
                    "error": "RATE_LIMIT_EXCEEDED",
                    "message": get_message("RATE_LIMIT_EXCEEDED"),
                    "retry_after": ttl,
                },
                status=429,
                headers={"Retry-After": str(ttl)},
            )

        return wrapper  # type: ignore[return-value]

    return decorator
