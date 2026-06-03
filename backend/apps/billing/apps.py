"""
Loyallia Billing App Configuration
"""

from django.apps import AppConfig


class BillingConfig(AppConfig):
    """Django app configuration for billing and subscription management."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.billing"
    verbose_name = "Facturación y Suscripciones"
