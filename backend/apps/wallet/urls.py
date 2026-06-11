"""
Django URL configuration for Wallet Template endpoints.

Mounted at /api/v1/wallet/templates/ via loyallia/urls.py.
"""

from apps.wallet.api import router

urlpatterns = router.urls
