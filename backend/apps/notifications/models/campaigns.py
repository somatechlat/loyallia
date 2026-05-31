"""
Loyallia Campaign Models

Campaign execution tracking and per-recipient delivery logs.
"""

import uuid

from django.db import models

from apps.customers.models import Customer
from apps.tenants.models import Tenant

from .base import CampaignStatus, DeliveryStatus, NotificationChannel


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
    segment_id = models.CharField(max_length=50, default="all", verbose_name="Segmento")
    status = models.CharField(
        max_length=20,
        choices=CampaignStatus.choices,
        default=CampaignStatus.QUEUED,
        verbose_name="Estado",
    )

    # Aggregate counters (updated by Celery worker after each message)
    total_recipients = models.IntegerField(
        default=0, verbose_name="Total destinatarios"
    )
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
        return f"{self.title} ({self.channel})  {self.status}"

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


class CampaignDeliveryLog(models.Model):
    """Per-recipient delivery status for a campaign.

    One row per (campaign_run, customer) pair. Provides full audit trail
    of each message's lifecycle from queue to read receipt.

    PERF: Indexed on (campaign_run, status) for fast aggregate queries.
    SEC: Phone/email denormalized here for audit  persists even if
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
    recipient_email = models.EmailField(blank=True, default="", verbose_name="Email")
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

    # Provider message ID for correlation
    external_message_id = models.CharField(
        max_length=200,
        blank=True,
        default="",
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
    delivered_at = models.DateTimeField(null=True, blank=True, verbose_name="Entregado")
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
            models.Index(fields=["status", "-created_at"]),
        ]
        unique_together = ["campaign_run", "customer"]

    def __str__(self) -> str:
        name = self.recipient_name or str(self.customer_id)
        return f"{name}  {self.status}"
