"""
Loyallia Authentication App Configuration
"""

from django.apps import AppConfig


class AuthenticationConfig(AppConfig):
    """Django app configuration for the authentication module."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.authentication"
    verbose_name = "Autenticación"
