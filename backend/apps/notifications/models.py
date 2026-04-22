"""
Loyallia — Notifications Models
Push notifications, in-app notifications, and notification history.
"""
import uuid
from django.db import models
from apps.tenants.models import Tenant
from apps.customers.models import Customer, CustomerPass


class NotificationChannel(models.TextChoices):
    """Available notification channels."""
    PUSH = "push", "Push Notification"
    SMS = "sms", "SMS"
    EMAIL = "email", "Email"
    IN_APP = "in_app", "In-App Notification"


class NotificationType(models.TextChoices):
    """Types of notifications."""
    REWARD_EARNED = "reward_earned", "Reward Earned"
    REWARD_READY = "reward_ready", "Reward Ready for Redemption"
    SPECIAL_OFFER = "special_offer", "Special Offer"
    REMINDER = "reminder", "Reminder to Visit"
    MILESTONE = "milestone", "Milestone Reached"
    BIRTHDAY = "birthday", "Birthday Offer"
    SYSTEM = "system", "System Notification"
    MARKETING = "marketing", "Marketing Campaign"


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
        verbose_name="Cliente"
    )
    
    # Device information
    device_type = models.CharField(
        max_length=10,
        choices=[("ios", "iOS"), ("android", "Android"), ("web", "Web")],
        verbose_name="Tipo de dispositivo"
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
        help_text="Incremented per failed push; device deactivated at 5"
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

    def __str__(self) -> str:
        return f"{self.customer.full_name} - {self.device_type}"


class Notification(models.Model):
    """
    Notification record for audit trail and analytics.
    Tracks all sent notifications across all channels.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="notifications",
        verbose_name="Negocio"
    )
    customer = models.ForeignKey(
        Customer,
        on_delete=models.CASCADE,
        related_name="notifications",
        verbose_name="Cliente"
    )
    customer_pass = models.ForeignKey(
        CustomerPass,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="notifications",
        verbose_name="Pase del cliente"
    )
    
    # Notification details
    notification_type = models.CharField(
        max_length=30,
        choices=NotificationType.choices,
        verbose_name="Tipo de notificación"
    )
    channel = models.CharField(
        max_length=20,
        choices=NotificationChannel.choices,
        default=NotificationChannel.PUSH,
        verbose_name="Canal"
    )
    
    # Content
    title = models.CharField(max_length=200, verbose_name="Título")
    message = models.TextField(verbose_name="Mensaje")
    image_url = models.URLField(blank=True, default="", verbose_name="URL de imagen")
    action_url = models.URLField(blank=True, default="", verbose_name="URL de acción")
    
    # Metadata
    notification_data = models.JSONField(default=dict, verbose_name="Datos adicionales")
    
    # Delivery status
    is_sent = models.BooleanField(default=False, verbose_name="Enviado")
    is_read = models.BooleanField(default=False, verbose_name="Leído")
    is_clicked = models.BooleanField(default=False, verbose_name="Clickeado")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de creación")
    sent_at = models.DateTimeField(null=True, blank=True, verbose_name="Fecha de envío")
    read_at = models.DateTimeField(null=True, blank=True, verbose_name="Fecha de lectura")
    clicked_at = models.DateTimeField(null=True, blank=True, verbose_name="Fecha de click")
    
    class Meta:
        db_table = "loyallia_notifications"
        verbose_name = "Notificación"
        verbose_name_plural = "Notificaciones"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["customer", "-created_at"]),
            models.Index(fields=["is_sent", "is_read"]),
        ]

    def __str__(self) -> str:
        return f"{self.title} - {self.customer.full_name}"

    def mark_as_sent(self) -> None:
        """Mark notification as sent."""
        from django.utils import timezone
        self.is_sent = True
        self.sent_at = timezone.now()
        self.save(update_fields=["is_sent", "sent_at"])

    def mark_as_read(self) -> None:
        """Mark notification as read."""
        from django.utils import timezone
        self.is_read = True
        self.read_at = timezone.now()
        self.save(update_fields=["is_read", "read_at"])

    def mark_as_clicked(self) -> None:
        """Mark notification as clicked."""
        from django.utils import timezone
        self.is_clicked = True
        self.clicked_at = timezone.now()
        self.save(update_fields=["is_clicked", "clicked_at"])
