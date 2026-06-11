"""
Loyallia Billing Enums (apps/billing/enums.py)
"""

from django.db import models


class SubscriptionStatus(models.TextChoices):
    """Subscription lifecycle states."""

    TRIALING = "trialing", "Período de prueba"
    ACTIVE = "active", "Activo"
    PAST_DUE = "past_due", "Pago pendiente"
    SUSPENDED = "suspended", "Suspendido"
    CANCELED = "canceled", "Cancelado"
