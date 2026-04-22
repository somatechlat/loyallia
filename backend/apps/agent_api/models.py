"""
Loyallia — Agent API Models (REQ-AGENT-001)
API key management for external AI agent access.
Keys are SHA-256 hashed — raw key shown only once at creation.
"""

import hashlib
import secrets
import uuid

from django.db import models

from apps.tenants.models import Tenant


class AgentAPIKey(models.Model):
    """
    API key for external AI agent access.
    SHA-256 hashed — raw key returned only at creation.
    Enterprise plan feature only.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="agent_api_keys",
        verbose_name="Negocio",
    )
    name = models.CharField(
        max_length=100,
        verbose_name="Nombre de la clave",
        help_text="Descriptive name for this key (e.g., 'SOMA Agent Production')",
    )

    # Key storage (hashed — never store raw key)
    key_hash = models.CharField(
        max_length=64,
        unique=True,
        verbose_name="Hash SHA-256",
    )
    key_prefix = models.CharField(
        max_length=8,
        verbose_name="Prefijo de clave",
        help_text="First 8 characters for identification",
    )

    # Access control
    is_active = models.BooleanField(default=True, verbose_name="Activo")
    last_used_at = models.DateTimeField(
        null=True, blank=True, verbose_name="Último uso"
    )
    expires_at = models.DateTimeField(
        null=True, blank=True, verbose_name="Expira en"
    )

    # Audit
    created_by_id = models.UUIDField(verbose_name="Creado por (user_id)")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "loyallia_agent_api_keys"
        verbose_name = "Clave de API (Agente)"
        verbose_name_plural = "Claves de API (Agentes)"
        ordering = ["-created_at"]

    def __str__(self) -> str:
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
