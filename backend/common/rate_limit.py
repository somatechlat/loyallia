"""
Loyallia — Rate Limiting Middleware
Redis-backed per-IP and per-user rate limiting for all API endpoints.

Protects against:
  - Brute force login attacks (5 req/min per IP on /auth/)
  - QR scan abuse (120 req/min per user on /scanner/)
  - Analytics DDoS (20 req/min per user on /analytics/)
  - General API abuse (200 req/min per IP on all endpoints)

Rate limits are enforced using Redis INCR + EXPIRE (sliding window).
Returns HTTP 429 Too Many Requests with Retry-After header on violation.
"""

import logging
import time

from django.http import HttpRequest, JsonResponse

logger = logging.getLogger(__name__)

# Rate limit rules: (path_prefix, key_type, max_requests, window_seconds)
RATE_LIMIT_RULES = [
    ("/api/v1/auth/login", "ip", 5, 60),         # 5 login attempts per minute per IP
    ("/api/v1/auth/register", "ip", 10, 60),      # 10 registrations per minute per IP
    ("/api/v1/auth/phone/", "ip", 3, 60),         # HARDENED: 3 OTP requests per min to prevent SMS spam cost
    ("/api/v1/wallet/", "ip", 30, 60),            # HARDENED: 30 PKPass requests per min to prevent CPU exhaustion
    ("/api/v1/auth/google/config", "ip", 200, 60),# 200 config requests per minute per IP
    ("/api/v1/auth/me", "ip", 200, 60),           # 200 session checks per minute per IP
    ("/api/v1/auth/", "ip", 20, 60),              # 20 general auth requests per minute per IP
    ("/api/v1/scanner/", "user", 120, 60),         # 120 scans per minute per user
    ("/api/v1/analytics/", "user", 20, 60),        # 20 analytics queries per minute per user
    ("/api/v1/notifications/", "user", 30, 60),    # 30 notification ops per minute per user
    ("/api/v1/", "ip", 200, 60),                   # 200 general API requests per minute per IP
]


def _get_client_ip(request: HttpRequest) -> str:
    """Extract real client IP from X-Forwarded-For (behind Nginx) or REMOTE_ADDR."""
    xff = request.META.get("HTTP_X_FORWARDED_FOR")
    if xff:
        # Take the first IP (client), not proxy IPs
        return xff.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "unknown")


class RateLimitMiddleware:
    """
    Redis-backed sliding window rate limiter.

    Position: After CorsMiddleware, before TenantMiddleware.
    Uses Redis INCR + EXPIRE for atomic, distributed rate counting.
    """

    def __init__(self, get_response):
        self.get_response = get_response
        self._redis_available = None

    def _get_redis(self):
        """Lazy Redis connection from Django cache backend."""
        if self._redis_available is False:
            return None
        try:
            from django_redis import get_redis_connection
            conn = get_redis_connection("default")
            self._redis_available = True
            return conn
        except Exception:
            # Redis unavailable — fail open (allow all requests)
            self._redis_available = False
            logger.warning("Rate limiter: Redis unavailable. Failing open.")
            return None

    def __call__(self, request: HttpRequest):
        # Only rate-limit API endpoints
        path = request.path
        if not path.startswith("/api/"):
            return self.get_response(request)

        # Skip health checks
        if path == "/api/v1/health/":
            return self.get_response(request)

        redis = self._get_redis()
        if redis is None:
            # Fail open — no Redis, no rate limiting
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
                    token_hash = hashlib.md5(auth_header.encode()).hexdigest()[:12]
                    rate_key = f"rl:{rule_path}:user:{token_hash}"
            else:
                rate_key = f"rl:{rule_path}:ip:{client_ip}"

            try:
                # Use pipeline to minimize round-trips
                pipe = redis.pipeline()
                pipe.incr(rate_key)
                # Only set TTL on first request to prevent permanent lockouts
                results = pipe.execute()
                current_count = results[0]
                
                if current_count == 1:
                    redis.expire(rate_key, window)
            except Exception:
                # Redis error — fail open
                logger.warning("Rate limiter: Redis pipeline error. Failing open.")
                break

            if current_count > max_requests:
                # Get TTL for Retry-After header
                try:
                    ttl = redis.ttl(rate_key)
                except Exception:
                    ttl = window

                logger.warning(
                    "Rate limit exceeded: path=%s ip=%s key=%s count=%d limit=%d",
                    path, client_ip, rate_key, current_count, max_requests,
                )
                return JsonResponse(
                    {
                        "success": False,
                        "error": "RATE_LIMIT_EXCEEDED",
                        "message": "Demasiadas solicitudes. Intente de nuevo en un momento.",
                        "retry_after": ttl,
                    },
                    status=429,
                    headers={"Retry-After": str(ttl)},
                )

            # Only apply the first matching rule
            break

        return self.get_response(request)
