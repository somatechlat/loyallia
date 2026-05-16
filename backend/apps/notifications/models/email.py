"""
Loyallia — Email Configuration Models

Per-tenant SMTP configuration for campaign delivery.
"""

import uuid

from django.db import models

from apps.tenants.models import Tenant


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
        max_length=200,
        blank=True,
        default="",
        verbose_name="Nombre del remitente",
        help_text="Display name: 'H&M Ecuador'",
    )
    sender_email = models.EmailField(
        blank=True,
        default="",
        verbose_name="Email del remitente",
        help_text="From address: promotions@hm-ecuador.com",
    )

    # Custom SMTP relay (optional — falls back to platform default)
    smtp_host = models.CharField(
        max_length=255,
        blank=True,
        default="",
        verbose_name="Servidor SMTP",
    )
    smtp_port = models.PositiveIntegerField(default=587, verbose_name="Puerto SMTP")
    smtp_user = models.CharField(
        max_length=255,
        blank=True,
        default="",
        verbose_name="Usuario SMTP",
    )
    smtp_password = models.CharField(
        max_length=500,
        blank=True,
        default="",
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
    verified_at = models.DateTimeField(null=True, blank=True, verbose_name="Verificado el")

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
        return bool(self.sender_email and self.smtp_host and self.smtp_user and self.smtp_password)
