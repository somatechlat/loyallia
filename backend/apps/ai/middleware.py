"""
AI Endpoint Rate Limiting Middleware

Enforces per-user rate limits specifically for AI endpoints:
  - Hourly limit: 10 requests per user
  - Daily limit: 50 requests per user

Returns HTTP 429 Too Many Requests with Retry-After header when exceeded.

This middleware should be placed AFTER TenantMiddleware in Django settings
so that request.user is available, but it also works with Authorization header
hashing as a fallback.
"""

import hashlib
import logging

from django.http import HttpRequest, JsonResponse
from django.core.cache import cache

from common.messages import get_message

logger = logging.getLogger(__name__)

# Rate limits for AI endpoints
AI_HOURLY_LIMIT = 10
AI_DAILY_LIMIT = 50
AI_HOURLY_WINDOW = 3600  # 1 hour in seconds
AI_DAILY_WINDOW = 86400  # 24 hours in seconds

# Paths that this middleware watches
AI_PATH_PREFIXES = (
    "/api/v1/ai/generate-template/",
    "/api/v1/ai/suggest-colors/",
    "/api/v1/ai/critique-design/",
    "/api/v1/ai/suggest-stamp-icons/",
)


def _get_user_key(request: HttpRequest) -> str:
    """Build a stable per-user rate limit key.

    Prefers the authenticated user's ID. Falls back to a hash of the
    Authorization header to avoid storing raw tokens in cache keys.
    """
    user = getattr(request, "user", None)
    if user and hasattr(user, "id") and user.is_authenticated:
        return f"user:{user.id}"

    auth_header = request.META.get("HTTP_AUTHORIZATION", "")
    if auth_header:
        token_hash = hashlib.sha256(auth_header.encode()).hexdigest()[:16]
        return f"token:{token_hash}"

    # Unauthenticated fallback — use IP (not spoofable via X-Forwarded-For)
    client_ip = request.META.get("REMOTE_ADDR", "unknown")
    return f"ip:{client_ip}"


def _check_limit(key: str, max_requests: int, window_seconds: int) -> tuple[bool, int]:
    """Check a single rate limit using Django cache.

    Returns (allowed, retry_after).
    """
    try:
        current = cache.get(key)
        if current is None:
            cache.set(key, 1, window_seconds)
            current = 1
        else:
            try:
                current = cache.incr(key)
            except ValueError:
                cache.set(key, 1, window_seconds)
                current = 1
    except Exception as exc:
        logger.warning("AI rate limiter: cache error (%s). Failing open.", exc)
        return True, 0

    if current > max_requests:
        ttl = window_seconds
        try:
            _ttl_func = getattr(cache, "ttl", None)
            if _ttl_func is not None:
                ttl = _ttl_func(key) or window_seconds
        except Exception:
            pass
        return False, max(1, ttl)

    return True, 0


class AIRateLimitMiddleware:
    """Rate limiting middleware for AI endpoints.

    Enforces per-user hourly and daily caps to control LLM token costs.
    Should be added to MIDDLEWARE after authentication/tenant middleware.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request: HttpRequest):
        path = request.path

        if not path.startswith("/api/v1/ai/"):
            return self.get_response(request)

        if not any(path.startswith(prefix) for prefix in AI_PATH_PREFIXES):
            return self.get_response(request)

        user_key = _get_user_key(request)

        # Hourly check
        hourly_key = f"ai:rl:hourly:{user_key}"
        allowed_hourly, retry_hourly = _check_limit(
            hourly_key, AI_HOURLY_LIMIT, AI_HOURLY_WINDOW
        )
        if not allowed_hourly:
            logger.warning(
                "AI hourly rate limit exceeded: path=%s user=%s",
                path,
                user_key,
            )
            return JsonResponse(
                {
                    "success": False,
                    "error": "RATE_LIMIT_EXCEEDED",
                    "message": get_message("RATE_LIMIT_EXCEEDED"),
                    "retry_after": retry_hourly,
                    "limit": "hourly",
                },
                status=429,
                headers={"Retry-After": str(retry_hourly)},
            )

        # Daily check
        daily_key = f"ai:rl:daily:{user_key}"
        allowed_daily, retry_daily = _check_limit(
            daily_key, AI_DAILY_LIMIT, AI_DAILY_WINDOW
        )
        if not allowed_daily:
            logger.warning(
                "AI daily rate limit exceeded: path=%s user=%s",
                path,
                user_key,
            )
            return JsonResponse(
                {
                    "success": False,
                    "error": "RATE_LIMIT_EXCEEDED",
                    "message": get_message("RATE_LIMIT_EXCEEDED"),
                    "retry_after": retry_daily,
                    "limit": "daily",
                },
                status=429,
                headers={"Retry-After": str(retry_daily)},
            )

        return self.get_response(request)
