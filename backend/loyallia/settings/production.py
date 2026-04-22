"""
Loyallia Django Settings — PRODUCTION
Inherits from base. Enforces HTTPS, strict security headers.
"""

from .base import *  # noqa: F401, F403

DEBUG = False

# HTTPS enforcement via Nginx reverse proxy
# Nginx sets X-Forwarded-Proto: https — Django uses this to detect SSL
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

# Trust the Nginx proxy for host validation
ALLOWED_HOSTS = config("ALLOWED_HOSTS", default="rewards.loyallia.com", cast=Csv())
