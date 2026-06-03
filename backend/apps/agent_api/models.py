"""
Loyallia Agent API Models (REQ-AGENT-001)
API key management for external AI agent access.
Keys are SHA-256 hashed  raw key shown only once at creation.
"""

import hashlib
import secrets
import uuid

from django.db import models

from apps.tenants.models import Tenant


class AgentAPIKey(models.Model):
    """
    API key for external AI agent access.
    SHA-256 hashed  raw key returned only at creation.
    Enterprise plan feature only.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, help_text="Unique identifier for this record.")
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="agent_api_keys",
        verbose_name="Negocio",
        help_text="The business this record belongs to.",
    )
    name = models.CharField(
        max_length=100,
        verbose_name="Nombre de la clave",
        help_text="Descriptive name for this key (e.g., 'SOMA Agent Production')",
    )

    # Key storage (hashed never store raw key)
    key_hash = models.CharField(
        max_length=64,
        unique=True,
        verbose_name="Hash SHA-256",
        help_text="Hashed credential for security.",
    )
    key_prefix = models.CharField(
        max_length=8,
        verbose_name="Prefijo de clave",
        help_text="First 8 characters for identification",
    )

    # Access control
    is_active = models.BooleanField(default=True, verbose_name="Activo", help_text="Whether this record is currently active.")
    last_used_at = models.DateTimeField(
        null=True, blank=True, verbose_name="Último uso"
        ,help_text="Timestamp for last used.",
    )
    expires_at = models.DateTimeField(null=True, blank=True, verbose_name="Expira en", help_text="Timestamp for expires.")

    # Audit
    created_by_id = models.UUIDField(verbose_name="Creado por (user_id)", help_text="ID of the user who created this record.")
    created_at = models.DateTimeField(auto_now_add=True, help_text="Timestamp for created.")
    updated_at = models.DateTimeField(auto_now=True, help_text="Timestamp for updated.")

    class Meta:
        """Model metadata and database configuration."""
        db_table = "loyallia_agent_api_keys"
        verbose_name = "Clave de API (Agente)"
        verbose_name_plural = "Claves de API (Agentes)"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        """Return a human-readable string representation."""
        return f"{self.name} ({self.key_prefix}...)"

    @classmethod
    def generate_key(cls) -> tuple[str, str]:
        """
        Generate a new API key.
        Returns (raw_key, key_hash). Raw key is shown once.
        """
        raw_key = f"lyl_{secrets.token_urlsafe(32)}"
        key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
        return raw_key, key_hash

    @classmethod
    def hash_key(cls, raw_key: str) -> str:
        """Hash a raw API key for comparison."""
        return hashlib.sha256(raw_key.encode()).hexdigest()


class AgentAPICallLog(models.Model):
    """
    Log of every Agent API call for rate-limiting and audit purposes.
    One row per call. Expired rows are cleaned by a periodic Celery task.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, help_text="Unique identifier for this record.")
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="agent_api_call_logs",
        verbose_name="Negocio",
        help_text="The business this record belongs to.",
    )
    api_key = models.ForeignKey(
        AgentAPIKey,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="call_logs",
        verbose_name="Clave de API",
        help_text="Unique key or identifier.",
    )
    endpoint = models.CharField(
        max_length=255,
        verbose_name="Endpoint",
        help_text="URL path of the API call",
    )
    method = models.CharField(
        max_length=10,
        verbose_name="Método HTTP",
        help_text="HTTP method used.",
    )
    status_code = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        verbose_name="Código de respuesta",
        help_text="HTTP response status code.",
    )
    created_at = models.DateTimeField(
        auto_now_add=True, verbose_name="Fecha de llamada"
        ,help_text="Timestamp for created.",
    )

    class Meta:
        """Model metadata and database configuration."""
        db_table = "loyallia_agent_api_call_logs"
        verbose_name = "Log de llamada API (Agente)"
        verbose_name_plural = "Logs de llamadas API (Agentes)"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["tenant", "created_at"]),
        ]
