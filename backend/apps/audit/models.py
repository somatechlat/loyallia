"""
Loyallia Audit Models (REQ-DPR-002)
Immutable audit trail for data access and mutations.
Compliant with LOPDP Art. 47 (Ecuador) and GDPR Art. 30 (EU).
Entries cannot be edited or deleted. 7-year retention.
"""

import uuid

from django.db import models


class AuditAction:
    """Auditable action types."""

    CREATE = "CREATE"
    READ = "READ"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
    EXPORT = "EXPORT"
    IMPORT = "IMPORT"
    IMPERSONATE = "IMPERSONATE"
    LOGIN = "LOGIN"
    LOGOUT = "LOGOUT"
    API_ACCESS = "API_ACCESS"
    FACTORY_RESET = "FACTORY_RESET"
    SEED_DEMO = "SEED_DEMO"
    BACKUP = "BACKUP"
    RESTORE = "RESTORE"

    @classmethod
    def choices(cls):
        """Return Django model choices tuple for auditable actions."""
        return [
            (cls.CREATE, "Crear"),
            (cls.READ, "Leer"),
            (cls.UPDATE, "Actualizar"),
            (cls.DELETE, "Eliminar"),
            (cls.EXPORT, "Exportar"),
            (cls.IMPORT, "Importar"),
            (cls.IMPERSONATE, "Suplantación"),
            (cls.LOGIN, "Inicio de sesión"),
            (cls.LOGOUT, "Cierre de sesión"),
            (cls.API_ACCESS, "Acceso API"),
            (cls.FACTORY_RESET, "Restauración de fábrica"),
            (cls.SEED_DEMO, "Carga de datos demo"),
            (cls.BACKUP, "Respaldo"),
            (cls.RESTORE, "Restauración"),
        ]


class AuditStatus:
    """Audit entry status."""

    SUCCESS = "success"
    DENIED = "denied"
    ERROR = "error"

    @classmethod
    def choices(cls):
        """Return Django model choices tuple for audit entry statuses."""
        return [
            (cls.SUCCESS, "Exitoso"),
            (cls.DENIED, "Denegado"),
            (cls.ERROR, "Error"),
        ]


class AuditLog(models.Model):
    """
    Immutable audit trail entry.
    Records WHO did WHAT, WHEN, WHERE, and WHY.
    Cannot be edited or deleted (enforced at application level).
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, help_text="Unique identifier for this record.")

    # WHO
    actor_id = models.UUIDField(db_index=True, verbose_name="ID del actor", help_text="ID of the actor who performed the action.")
    actor_email = models.CharField(max_length=255, verbose_name="Email del actor", help_text="Email of the actor who performed the action.")
    actor_role = models.CharField(max_length=20, verbose_name="Rol del actor", help_text="Role of the actor.")

    # WHAT
    action = models.CharField(
        max_length=20,
        choices=AuditAction.choices(),
        verbose_name="Acción",
        help_text="Action performed.",
    )
    resource_type = models.CharField(max_length=50, verbose_name="Tipo de recurso", help_text="Type of resource affected.")
    resource_id = models.CharField(
        max_length=100,
        blank=True,
        default="",
        verbose_name="ID del recurso",
        help_text="Identifier of the affected resource.",
    )

    # CONTEXT
    tenant_id = models.UUIDField(
        null=True,
        blank=True,
        db_index=True,
        verbose_name="ID del negocio",
        help_text="Identifier of the business.",
    )
    ip_address = models.GenericIPAddressField(
        null=True, blank=True, verbose_name="Dirección IP"
        ,help_text="IP address of the client.",
    )
    user_agent = models.TextField(blank=True, default="", verbose_name="User Agent", help_text="Client user agent string.")
    justification = models.TextField(
        blank=True,
        default="",
        verbose_name="Justificación",
        help_text="Required for impersonation actions",
    )

    # RESULT
    details = models.JSONField(default=dict, verbose_name="Detalles", help_text="Additional details or context.")
    status = models.CharField(
        max_length=20,
        choices=AuditStatus.choices(),
        default=AuditStatus.SUCCESS,
        verbose_name="Estado",
        help_text="Current status of this record.",
    )

    # WHEN (immutable)
    created_at = models.DateTimeField(
        auto_now_add=True, db_index=True, verbose_name="Fecha"
        ,help_text="Timestamp for created.",
    )

    class Meta:
        """Model metadata and database configuration."""
        db_table = "loyallia_audit_log"
        ordering = ["-created_at"]
        verbose_name = "Registro de auditoría"
        verbose_name_plural = "Registros de auditoría"
        indexes = [
            models.Index(fields=["actor_id", "created_at"]),
            models.Index(fields=["resource_type", "created_at"]),
            models.Index(fields=["tenant_id", "created_at"]),
            models.Index(fields=["action", "created_at"]),
            models.Index(fields=["ip_address", "created_at"]),
        ]

    def __str__(self) -> str:
        """Human-readable summary for admin/debugging."""
        return f"[{self.created_at:%Y-%m-%d %H:%M}] {self.actor_email} {self.action} {self.resource_type}"

    def save(self, *args, **kwargs):
        """Prevent updates to existing entries (immutability)."""
        if self.pk and AuditLog.objects.filter(pk=self.pk).exists():
            raise ValueError("Audit log entries are immutable and cannot be modified.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        """Prevent deletion of audit entries (compliance requirement)."""
        raise ValueError("Audit log entries cannot be deleted (LOPDP compliance).")
