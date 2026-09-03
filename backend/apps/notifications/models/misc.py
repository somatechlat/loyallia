"""
Loyallia Miscellaneous Notification Models

Core notification records and WhatsApp session management.
"""

import uuid

from django.db import models

from apps.customers.models import Customer, CustomerPass
from apps.tenants.models import Tenant

from .base import NotificationChannel, NotificationType


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
        verbose_name="Negocio",
    )
    customer = models.ForeignKey(
        Customer,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="notifications",
        verbose_name="Cliente",
    )
    customer_pass = models.ForeignKey(
        CustomerPass,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="notifications",
        verbose_name="Pase del cliente",
    )

    # Notification details
    notification_type = models.CharField(
        max_length=30,
        choices=NotificationType.choices,
        verbose_name="Tipo de notificación",
    )
    channel = models.CharField(
        max_length=20,
        choices=NotificationChannel.choices,
        default=NotificationChannel.PUSH,
        verbose_name="Canal",
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
            models.Index(fields=["tenant", "-created_at"]),
            models.Index(fields=["customer", "-created_at"]),
            models.Index(fields=["is_sent", "is_read"]),
        ]

    def __repr__(self) -> str:
        return f"<Notification: {self.title} - {self.customer.full_name}>"

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


class WhatsAppSession(models.Model):
    """Per-tenant WhatsApp bridge session state.

    Tracks the connection status of the business owner's WhatsApp
    number paired via QR code through the Baileys bridge service.

    SEC: No WhatsApp credentials stored here  auth state lives in Redis
    on the bridge container. This model only mirrors the session status.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.OneToOneField(
        Tenant,
        on_delete=models.CASCADE,
        related_name="whatsapp_session",
        verbose_name="Negocio",
    )
    phone_number = models.CharField(
        max_length=20,
        blank=True,
        default="",
        verbose_name="Número de WhatsApp",
    )
    is_connected = models.BooleanField(default=False, verbose_name="Conectado")
    last_qr_at = models.DateTimeField(null=True, blank=True, verbose_name="Último QR generado")

    # Rate limiting state
    messages_sent_today = models.IntegerField(default=0, verbose_name="Mensajes enviados hoy")
    daily_limit = models.IntegerField(default=200, verbose_name="Límite diario (legacy)")
    warmup_day = models.IntegerField(
        default=0,
        verbose_name="Día de calentamiento",
        help_text="0=new number, 7=fully warmed up. Limit scales linearly.",
    )

    #
    # When set (> 0), overrides the plan's max_whatsapp_day for this tenant.
    daily_limit_override = models.PositiveIntegerField(
        default=0,
        verbose_name="Override límite diario",
        help_text="SuperAdmin override. 0=use plan limit. Max safe value: 200.",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "loyallia_whatsapp_sessions"
        verbose_name = "Sesión de WhatsApp"
        verbose_name_plural = "Sesiones de WhatsApp"

    def __str__(self) -> str:
        status = "[ON]" if self.is_connected else ""
        return f"{status} {self.tenant.name}  {self.phone_number or 'sin vincular'}"

    @property
    def plan_daily_limit(self) -> int:
        """Plan-based daily limit from SubscriptionPlan.max_whatsapp_day.

        1. Tenant override (SuperAdmin set) if > 0
        2. SubscriptionPlan.max_whatsapp_day if plan exists
        3. Legacy self.daily_limit as fallback
        """
        if self.daily_limit_override > 0:
            return self.daily_limit_override

        from apps.billing.models import Subscription

        subscription = Subscription.objects.filter(tenant=self.tenant).first()
        if subscription:
            plan = subscription.subscription_plan
            if plan and plan.max_whatsapp_day > 0:
                return plan.max_whatsapp_day
            # Trial users: use legacy daily_limit (200)
            if subscription.is_trial_active:
                return self.daily_limit

        return self.daily_limit

    @property
    def effective_daily_limit(self) -> int:
        """Effective daily limit = min(plan_ceiling, warmup_limit).

        The plan (or tenant override) sets the ceiling.
        The warm-up progression sets the floor to prevent WhatsApp bans.
        New numbers start at 20/day and scale linearly over 7 days.
        """
        ceiling = self.plan_daily_limit
        if self.warmup_day >= 7:
            return ceiling
        base = 20
        increment = (ceiling - base) / 7
        warmup_limit = int(base + (increment * self.warmup_day))
        return min(ceiling, warmup_limit)

    @property
    def messages_remaining_today(self) -> int:
        """How many more messages can be sent today."""
        return max(0, self.effective_daily_limit - self.messages_sent_today)
