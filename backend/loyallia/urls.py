"""
Loyallia URL Configuration  Root router.
Mounts:
  /api/v1/   → Django Ninja API (all REST endpoints)
  /admin/    → Django admin
  /          → Next.js handles all other routes via Nginx proxy
"""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path
from ninja import NinjaAPI

from apps.api.router import api  # Django Ninja instance
from apps.customers.pass_engine.apple_pass_web_service import (
    router as apple_wallet_router,
)

# Apple Wallet Web Service separate NinjaAPI instance (no JWT auth,
# uses ApplePass header auth per Apple spec)
apple_wallet_api = NinjaAPI(
    title="Loyallia Apple Wallet Web Service",
    version="1.0.0",
    docs_url=None,  # No OpenAPI docs for Apple endpoints
    auth=None,  # Auth handled per-endpoint via ApplePass header
)
apple_wallet_api.add_router("", apple_wallet_router)

urlpatterns = [
 # Django Admin (super-admin access)
    path("django-admin/", admin.site.urls),
 # Ninja API v1 all REST endpoints
    path("api/v1/", api.urls),
 # Apple Wallet Web Service per Apple PassKit spec, these endpoints must
 # be accessible at the webServiceURL path set in pass.json
    path("wallet/apple/", apple_wallet_api.urls),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
