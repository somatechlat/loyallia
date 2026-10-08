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
    """One linked WhatsApp number for a tenant (multi-account).

    A business may link N WhatsApp numbers (bounded by
    SubscriptionPlan.max_whatsapp_accounts). Each number is scanned by a
    user via QR and can send campaigns independently.

    Rate limits:
      - Per-account: warm-up ramp + optional SuperAdmin daily_limit_override,
        hard ceiling 200/day (Baileys anti-ban).
      - Per-tenant pool: SubscriptionPlan.max_whatsapp_day is the total
        messages/day across all linked accounts.

    SEC: No WhatsApp credentials stored here  auth state lives in Redis
    on the bridge container. This model only mirrors the session status.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="whatsapp_sessions",
        verbose_name="Negocio",
    )
    linked_by = models.ForeignKey(
        "authentication.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="whatsapp_sessions",
        verbose_name="Vinculado por",
    )
    label = models.CharField(
        max_length=50,
        blank=True,
        default="",
        verbose_name="Etiqueta",
        help_text="Optional name, e.g. 'Ventas', 'Soporte'.",
    )
    phone_number = models.CharField(
        max_length=20,
        blank=True,
        default="",
        verbose_name="Número de WhatsApp",
    )
    is_connected = models.BooleanField(default=False, verbose_name="Conectado")
    is_active = models.BooleanField(default=True, verbose_name="Activo")
    last_qr_at = models.DateTimeField(
        null=True, blank=True, verbose_name="Último QR generado"
    )

    # LOPDP/GDPR: owner consent before linking their personal WhatsApp.
    consent_at = models.DateTimeField(
        null=True, blank=True, verbose_name="Consentimiento"
    )
    consent_by = models.UUIDField(
        null=True, blank=True, verbose_name="Consentimiento por"
    )

    # Rate limiting state (per this account)
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

    #
    # SuperAdmin per-number override. 0=use warm-up / plan-derived ceiling.
    daily_limit_override = models.PositiveIntegerField(
        default=0,
        verbose_name="Override límite diario",
        help_text="SuperAdmin override for THIS number. 0=auto. Max safe value: 200.",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "loyallia_whatsapp_sessions"
        verbose_name = "Sesión de WhatsApp"
        verbose_name_plural = "Sesiones de WhatsApp"
        constraints = [
            models.UniqueConstraint(
                fields=["tenant", "phone_number"],
                name="uniq_whatsapp_session_tenant_phone",
                condition=~models.Q(phone_number=""),
            ),
        ]
        indexes = [
            models.Index(fields=["tenant", "is_connected"]),
            models.Index(fields=["tenant", "is_active"]),
        ]

    def __str__(self) -> str:
        status = "[ON]" if self.is_connected else ""
        label = self.label or self.phone_number or "sin vincular"
        return f"{status} {self.tenant.name}  {label}"

    # Hard Baileys anti-ban ceiling per phone number. Not plan-editable.
    HARD_DAILY_PER_NUMBER = 200

    @property
    def plan_account_ceiling(self) -> int:
        """Per-account daily ceiling derived from the plan pool.

        plan.max_whatsapp_day is the tenant-wide pool across all linked
        accounts. The fair share per account is pool / accounts (min 1).
        SuperAdmin daily_limit_override replaces this when > 0.
        """
        if self.daily_limit_override > 0:
            return min(self.daily_limit_override, self.HARD_DAILY_PER_NUMBER)

        from apps.billing.models import Subscription

        subscription = Subscription.objects.filter(tenant=self.tenant).first()
        pool = self.daily_limit
        accounts = 1
        if subscription:
            plan = subscription.subscription_plan
            if plan and plan.max_whatsapp_day > 0:
                pool = plan.max_whatsapp_day
                accounts = max(1, getattr(plan, "max_whatsapp_accounts", 1) or 1)
            elif subscription.is_trial_active:
                pool = self.daily_limit
                accounts = 1

        share = max(1, pool // max(1, accounts))
        return min(share, self.HARD_DAILY_PER_NUMBER)

    @property
    def plan_daily_limit(self) -> int:
        """Backward-compatible alias: per-account ceiling (not the tenant pool)."""
        return self.plan_account_ceiling

    def try_reserve_message(self) -> bool:
        """Atomically reserve one send slot for this account (and the tenant pool).

        Real DB gate: SELECT FOR UPDATE this session, check warm-up / override
        ceiling AND the tenant-wide pool (sum of all sessions' messages_sent_today),
        then increment. Returns False when either cap is hit. This is the
        authoritative daily anti-ban / plan gate — callers must not send when
        it returns False.
        """
        from django.db import transaction
        from django.db.models import Sum

        with transaction.atomic():
            locked = WhatsAppSession.objects.select_for_update().get(pk=self.pk)
            if locked.messages_sent_today >= locked.effective_daily_limit:
                return False

            from apps.billing.models import Subscription

            subscription = Subscription.objects.filter(tenant=locked.tenant).first()
            pool_limit = subscription.get_limit("whatsapp_day") if subscription else 0
            if pool_limit > 0:
                used = (
                    WhatsAppSession.objects.filter(tenant=locked.tenant).aggregate(
                        total=Sum("messages_sent_today")
                    )["total"]
                    or 0
                )
                if used >= pool_limit:
                    return False

            locked.messages_sent_today += 1
            locked.save(update_fields=["messages_sent_today", "updated_at"])
            self.messages_sent_today = locked.messages_sent_today
            return True

    @property
    def effective_daily_limit(self) -> int:
        """Effective daily limit for THIS number = min(account_ceiling, warmup_limit).

        Warm-up starts at 20/day and scales linearly to the account ceiling
        over 7 days so new numbers are not banned.
        """
        ceiling = self.plan_account_ceiling
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
