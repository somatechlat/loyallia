"""
Loyallia URL Configuration — Root router.
Mounts:
  /api/v1/   → Django Ninja API (all REST endpoints)
  /admin/    → Django admin
  /          → Next.js handles all other routes via Nginx proxy
"""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path

from apps.api.router import api  # Django Ninja instance

urlpatterns = [
    # Django Admin (super-admin access)
    path("django-admin/", admin.site.urls),
    # Ninja API v1 — all REST endpoints
    path("api/v1/", api.urls),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
