"""
Loyallia — Audit Models (REQ-DPR-002)
Immutable audit trail for data access and mutations.
Compliant with LOPDP Art. 47 (Ecuador) and GDPR Art. 30 (EU).
Entries cannot be edited or deleted. 7-year retention.
"""

import uuid

from django.db import models


class AuditAction(models.TextChoices):
    """Auditable action types."""

    CREATE = "CREATE", "Crear"
    READ = "READ", "Leer"
    UPDATE = "UPDATE", "Actualizar"
    DELETE = "DELETE", "Eliminar"
    EXPORT = "EXPORT", "Exportar"
    IMPORT = "IMPORT", "Importar"
    IMPERSONATE = "IMPERSONATE", "Suplantación"
    LOGIN = "LOGIN", "Inicio de sesión"
    LOGOUT = "LOGOUT", "Cierre de sesión"
    API_ACCESS = "API_ACCESS", "Acceso API"


class AuditStatus(models.TextChoices):
    """Audit entry status."""

    SUCCESS = "success", "Exitoso"
    DENIED = "denied", "Denegado"
    ERROR = "error", "Error"


class AuditLog(models.Model):
    """
    Immutable audit trail entry.
    Records WHO did WHAT, WHEN, WHERE, and WHY.
    Cannot be edited or deleted (enforced at application level).
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # WHO
    actor_id = models.UUIDField(
        db_index=True, verbose_name="ID del actor"
    )
    actor_email = models.CharField(
        max_length=255, verbose_name="Email del actor"
    )
    actor_role = models.CharField(
        max_length=20, verbose_name="Rol del actor"
    )

    # WHAT
    action = models.CharField(
        max_length=20,
        choices=AuditAction.choices,
        verbose_name="Acción",
    )
    resource_type = models.CharField(
        max_length=50, verbose_name="Tipo de recurso"
    )
    resource_id = models.CharField(
        max_length=100, blank=True, default="",
        verbose_name="ID del recurso",
    )

    # CONTEXT
    tenant_id = models.UUIDField(
        null=True, blank=True, db_index=True,
        verbose_name="ID del negocio",
    )
    ip_address = models.GenericIPAddressField(
        null=True, blank=True, verbose_name="Dirección IP"
    )
    user_agent = models.TextField(
        blank=True, default="", verbose_name="User Agent"
    )
    justification = models.TextField(
        blank=True, default="",
        verbose_name="Justificación",
        help_text="Required for impersonation actions",
    )

    # RESULT
    details = models.JSONField(
        default=dict, verbose_name="Detalles"
    )
    status = models.CharField(
        max_length=20,
        choices=AuditStatus.choices,
        default=AuditStatus.SUCCESS,
        verbose_name="Estado",
    )

    # WHEN (immutable)
    created_at = models.DateTimeField(
        auto_now_add=True, db_index=True, verbose_name="Fecha"
    )

    class Meta:
        db_table = "loyallia_audit_log"
        ordering = ["-created_at"]
        verbose_name = "Registro de auditoría"
        verbose_name_plural = "Registros de auditoría"
        indexes = [
            models.Index(fields=["actor_id", "created_at"]),
            models.Index(fields=["resource_type", "created_at"]),
            models.Index(fields=["tenant_id", "created_at"]),
            models.Index(fields=["action", "created_at"]),
        ]

    def __str__(self) -> str:
        return (
            f"[{self.created_at:%Y-%m-%d %H:%M}] "
            f"{self.actor_email} {self.action} {self.resource_type}"
        )

    def save(self, *args, **kwargs):
        """Prevent updates to existing entries (immutability)."""
        if self.pk and AuditLog.objects.filter(pk=self.pk).exists():
            raise ValueError("Audit log entries are immutable and cannot be modified.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        """Prevent deletion of audit entries (compliance requirement)."""
        raise ValueError("Audit log entries cannot be deleted (LOPDP compliance).")
