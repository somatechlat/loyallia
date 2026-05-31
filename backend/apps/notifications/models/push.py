"""
Loyallia Push Notification Models

Device registration and push notification state.
"""

import uuid

from django.db import models

from apps.customers.models import Customer


class PushDevice(models.Model):
    """
    Device registration for push notifications.
    Supports Apple and Google push services.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.ForeignKey(
        Customer,
        on_delete=models.CASCADE,
        related_name="devices",
        verbose_name="Cliente",
    )

 # Device information
    device_type = models.CharField(
        max_length=10,
        choices=[("ios", "iOS"), ("android", "Android"), ("web", "Web")],
        verbose_name="Tipo de dispositivo",
    )
    device_token = models.CharField(max_length=500, verbose_name="Token del dispositivo")
    device_model = models.CharField(max_length=100, blank=True, default="", verbose_name="Modelo del dispositivo")

 # Push service identifiers
    apns_token = models.CharField(max_length=500, blank=True, default="", verbose_name="Token APNS")
    fcm_token = models.CharField(max_length=500, blank=True, default="", verbose_name="Token FCM")

 # Status
    is_active = models.BooleanField(default=True, verbose_name="Dispositivo activo")
    push_failures = models.PositiveSmallIntegerField(
        default=0,
        verbose_name="Fallos consecutivos de push",
        help_text="Incremented per failed push; device deactivated at 5",
    )

 # Timestamps
    registered_at = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de registro")
    last_used = models.DateTimeField(null=True, blank=True, verbose_name="Último uso")

    class Meta:
        db_table = "loyallia_push_devices"
        verbose_name = "Dispositivo de push"
        verbose_name_plural = "Dispositivos de push"
        ordering = ["-registered_at"]
        unique_together = ["customer", "device_token"]

    def __repr__(self) -> str:
        return f"<PushDevice: {self.customer.full_name} - {self.device_type}>"

    def __str__(self) -> str:
        return f"{self.customer.full_name} - {self.device_type}"
