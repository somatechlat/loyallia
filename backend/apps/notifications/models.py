"""
Loyallia — Notifications Models
Push notifications, in-app notifications, and notification history.
"""

import uuid

from django.db import models

from apps.customers.models import Customer, CustomerPass
from apps.tenants.models import Tenant


class NotificationChannel(models.TextChoices):
    """Available notification channels."""

    PUSH = "push", "Push Notification"
    SMS = "sms", "SMS"
    EMAIL = "email", "Email"
    IN_APP = "in_app", "In-App Notification"
    WHATSAPP = "whatsapp", "WhatsApp"


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
        verbose_name="Cliente",
    )

    # Device information
    device_type = models.CharField(
        max_length=10,
        choices=[("ios", "iOS"), ("android", "Android"), ("web", "Web")],
        verbose_name="Tipo de dispositivo",
    )
    device_token = models.CharField(
        max_length=500, verbose_name="Token del dispositivo"
    )
    device_model = models.CharField(
        max_length=100, blank=True, default="", verbose_name="Modelo del dispositivo"
    )

    # Push service identifiers
    apns_token = models.CharField(
        max_length=500, blank=True, default="", verbose_name="Token APNS"
    )
    fcm_token = models.CharField(
        max_length=500, blank=True, default="", verbose_name="Token FCM"
    )

    # Status
    is_active = models.BooleanField(default=True, verbose_name="Dispositivo activo")
    push_failures = models.PositiveSmallIntegerField(
        default=0,
        verbose_name="Fallos consecutivos de push",
        help_text="Incremented per failed push; device deactivated at 5",
    )

    # Timestamps
    registered_at = models.DateTimeField(
        auto_now_add=True, verbose_name="Fecha de registro"
    )
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
        on_delete=models.CASCADE,
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
    created_at = models.DateTimeField(
        auto_now_add=True, verbose_name="Fecha de creación"
    )
    sent_at = models.DateTimeField(null=True, blank=True, verbose_name="Fecha de envío")
    read_at = models.DateTimeField(
        null=True, blank=True, verbose_name="Fecha de lectura"
    )
    clicked_at = models.DateTimeField(
        null=True, blank=True, verbose_name="Fecha de click"
    )

    class Meta:
        db_table = "loyallia_notifications"
        verbose_name = "Notificación"
        verbose_name_plural = "Notificaciones"
        ordering = ["-created_at"]
        indexes = [
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


# =============================================================================
# CAMPAIGN DELIVERY TRACKING (LYL-SRS-006)
# =============================================================================


class CampaignStatus(models.TextChoices):
    """Campaign execution lifecycle states."""

    QUEUED = "queued", "En cola"
    IN_PROGRESS = "in_progress", "Enviando"
    COMPLETED = "completed", "Completado"
    FAILED = "failed", "Fallido"
    PAUSED = "paused", "Pausado"


class CampaignRun(models.Model):
    """Tracks a single campaign execution with aggregate metrics.

    Created when a campaign is launched; counters updated in real-time
    by Celery workers and delivery webhooks.

    PERF: Aggregate counters denormalized here to avoid COUNT() queries
    on CampaignDeliveryLog for dashboard rendering.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="campaign_runs",
        verbose_name="Negocio",
    )
    channel = models.CharField(
        max_length=20,
        choices=NotificationChannel.choices,
        verbose_name="Canal",
    )
    title = models.CharField(max_length=200, verbose_name="Título")
    message_preview = models.TextField(
        max_length=500, verbose_name="Vista previa del mensaje"
    )
    segment_id = models.CharField(
        max_length=50, default="all", verbose_name="Segmento"
    )
    status = models.CharField(
        max_length=20,
        choices=CampaignStatus.choices,
        default=CampaignStatus.QUEUED,
        verbose_name="Estado",
    )

    # Aggregate counters (updated by Celery worker after each message)
    total_recipients = models.IntegerField(default=0, verbose_name="Total destinatarios")
    sent_count = models.IntegerField(default=0, verbose_name="Enviados")
    delivered_count = models.IntegerField(default=0, verbose_name="Entregados")
    failed_count = models.IntegerField(default=0, verbose_name="Fallidos")
    read_count = models.IntegerField(default=0, verbose_name="Leídos")

    # Timing
    started_at = models.DateTimeField(
        null=True, blank=True, verbose_name="Inicio de envío"
    )
    completed_at = models.DateTimeField(
        null=True, blank=True, verbose_name="Fin de envío"
    )

    # Error summary (if campaign-level failure)
    error_summary = models.TextField(
        blank=True, default="", verbose_name="Resumen de errores"
    )

    # Sender domain used for this campaign
    sender_domain = models.CharField(
        max_length=20,
        default="loyallia",
        verbose_name="Dominio remitente",
        help_text="'loyallia' for default or 'custom' for tenant SMTP",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "loyallia_campaign_runs"
        verbose_name = "Ejecución de campaña"
        verbose_name_plural = "Ejecuciones de campaña"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["tenant", "-created_at"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self) -> str:
        return f"{self.title} ({self.channel}) — {self.status}"

    @property
    def delivery_rate(self) -> float:
        """Percentage of messages delivered out of total sent."""
        if self.sent_count == 0:
            return 0.0
        return round((self.delivered_count / self.sent_count) * 100, 1)

    @property
    def read_rate(self) -> float:
        """Percentage of messages read out of total delivered."""
        if self.delivered_count == 0:
            return 0.0
        return round((self.read_count / self.delivered_count) * 100, 1)

    @property
    def failure_rate(self) -> float:
        """Percentage of messages that failed out of total recipients."""
        if self.total_recipients == 0:
            return 0.0
        return round((self.failed_count / self.total_recipients) * 100, 1)

    @property
    def duration_minutes(self) -> int | None:
        """Duration of the campaign execution in minutes."""
        if self.started_at and self.completed_at:
            delta = self.completed_at - self.started_at
            return int(delta.total_seconds() / 60)
        return None


class DeliveryStatus(models.TextChoices):
    """Per-recipient delivery states."""

    QUEUED = "queued", "En cola"
    SENT = "sent", "Enviado"
    DELIVERED = "delivered", "Entregado"
    READ = "read", "Leído"
    FAILED = "failed", "Fallido"
    BOUNCED = "bounced", "Rebotado"


class CampaignDeliveryLog(models.Model):
    """Per-recipient delivery status for a campaign.

    One row per (campaign_run, customer) pair. Provides full audit trail
    of each message's lifecycle from queue to read receipt.

    PERF: Indexed on (campaign_run, status) for fast aggregate queries.
    SEC: Phone/email denormalized here for audit — persists even if
    customer record is deleted.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    campaign_run = models.ForeignKey(
        CampaignRun,
        on_delete=models.CASCADE,
        related_name="delivery_logs",
        verbose_name="Campaña",
    )
    customer = models.ForeignKey(
        Customer,
        on_delete=models.SET_NULL,
        null=True,
        related_name="campaign_deliveries",
        verbose_name="Cliente",
    )

    # Denormalized recipient info for audit trail
    recipient_phone = models.CharField(
        max_length=20, blank=True, default="", verbose_name="Teléfono"
    )
    recipient_email = models.EmailField(
        blank=True, default="", verbose_name="Email"
    )
    recipient_name = models.CharField(
        max_length=200, blank=True, default="", verbose_name="Nombre"
    )

    # Delivery tracking
    status = models.CharField(
        max_length=20,
        choices=DeliveryStatus.choices,
        default=DeliveryStatus.QUEUED,
        verbose_name="Estado",
    )

    # Bridge/Listmonk message ID for correlation
    external_message_id = models.CharField(
        max_length=200, blank=True, default="",
        verbose_name="ID externo del mensaje",
    )

    # Error details (if failed)
    error_code = models.CharField(
        max_length=50, blank=True, default="", verbose_name="Código de error"
    )
    error_message = models.TextField(
        blank=True, default="", verbose_name="Mensaje de error"
    )

    # Timestamps for each state transition
    created_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(null=True, blank=True, verbose_name="Enviado")
    delivered_at = models.DateTimeField(
        null=True, blank=True, verbose_name="Entregado"
    )
    read_at = models.DateTimeField(null=True, blank=True, verbose_name="Leído")
    failed_at = models.DateTimeField(null=True, blank=True, verbose_name="Fallido")

    class Meta:
        db_table = "loyallia_campaign_delivery_logs"
        verbose_name = "Log de entrega"
        verbose_name_plural = "Logs de entrega"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["campaign_run", "status"]),
            models.Index(fields=["customer", "-created_at"]),
        ]
        unique_together = ["campaign_run", "customer"]

    def __str__(self) -> str:
        name = self.recipient_name or str(self.customer_id)
        return f"{name} — {self.status}"


# =============================================================================
# WHATSAPP SESSION MANAGEMENT (LYL-SRS-006)
# =============================================================================


class WhatsAppSession(models.Model):
    """Per-tenant WhatsApp bridge session state.

    Tracks the connection status of the business owner's WhatsApp
    number paired via QR code through the Baileys bridge service.

    SEC: No WhatsApp credentials stored here — auth state lives in Redis
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
        max_length=20, blank=True, default="",
        verbose_name="Número de WhatsApp",
    )
    is_connected = models.BooleanField(
        default=False, verbose_name="Conectado"
    )
    last_qr_at = models.DateTimeField(
        null=True, blank=True, verbose_name="Último QR generado"
    )

    # Rate limiting state
    messages_sent_today = models.IntegerField(
        default=0, verbose_name="Mensajes enviados hoy"
    )
    daily_limit = models.IntegerField(
        default=200, verbose_name="Límite diario (legacy)"
    )
    warmup_day = models.IntegerField(
        default=0,
        verbose_name="Día de calentamiento",
        help_text="0=new number, 7=fully warmed up. Limit scales linearly.",
    )

    # LYL-SRS-008: Tenant override — set by SuperAdmin per-tenant
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
        status = "🟢" if self.is_connected else "🔴"
        return f"{status} {self.tenant.name} — {self.phone_number or 'sin vincular'}"

    @property
    def plan_daily_limit(self) -> int:
        """Plan-based daily limit from SubscriptionPlan.max_whatsapp_day.

        LYL-SRS-008: Resolves the ceiling in this priority:
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

        LYL-SRS-008: The plan (or tenant override) sets the ceiling.
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


# =============================================================================
# TENANT EMAIL CONFIGURATION (LYL-SRS-006)
# =============================================================================


class TenantEmailConfig(models.Model):
    """Per-tenant custom SMTP configuration for email campaigns.

    Allows business owners to send campaigns from their own domain
    instead of the default @loyallia.com sender. Optional — when not
    configured, all emails go through the platform's default SMTP.

    SEC: SMTP password stored encrypted. In production, retrieved from
    HashiCorp Vault. In dev, stored plaintext in this model.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.OneToOneField(
        Tenant,
        on_delete=models.CASCADE,
        related_name="email_config",
        verbose_name="Negocio",
    )

    # Custom sender identity
    sender_name = models.CharField(
        max_length=200, blank=True, default="",
        verbose_name="Nombre del remitente",
        help_text="Display name: 'H&M Ecuador'",
    )
    sender_email = models.EmailField(
        blank=True, default="",
        verbose_name="Email del remitente",
        help_text="From address: promotions@hm-ecuador.com",
    )

    # Custom SMTP relay (optional — falls back to platform default)
    smtp_host = models.CharField(
        max_length=255, blank=True, default="",
        verbose_name="Servidor SMTP",
    )
    smtp_port = models.PositiveIntegerField(
        default=587, verbose_name="Puerto SMTP"
    )
    smtp_user = models.CharField(
        max_length=255, blank=True, default="",
        verbose_name="Usuario SMTP",
    )
    smtp_password = models.CharField(
        max_length=500, blank=True, default="",
        verbose_name="Contraseña SMTP",
        help_text="SEC: Encrypted at rest in production via Vault",
    )
    use_tls = models.BooleanField(default=True, verbose_name="Usar TLS")

    # Verification status
    is_verified = models.BooleanField(
        default=False,
        verbose_name="Verificado",
        help_text="Set to True after successful test email delivery",
    )
    verified_at = models.DateTimeField(
        null=True, blank=True, verbose_name="Verificado el"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "loyallia_tenant_email_configs"
        verbose_name = "Configuración de email"
        verbose_name_plural = "Configuraciones de email"

    def __str__(self) -> str:
        if self.sender_email:
            return f"{self.tenant.name} — {self.sender_email}"
        return f"{self.tenant.name} — sin configurar"

    @property
    def is_configured(self) -> bool:
        """Whether all required SMTP fields are set."""
        return bool(
            self.sender_email
            and self.smtp_host
            and self.smtp_user
            and self.smtp_password
        )
