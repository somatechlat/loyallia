"""
Loyallia  Backup Models (apps/backup/models.py)

BackupJob model tracks every backup/restore operation with full lifecycle:
PENDING → RUNNING → COMPLETED/FAILED → VERIFIED/CORRUPTED.

Architecture:
    - Each backup run creates a BackupJob record for observability.
    - Configuration is snapshotted at creation time (type, encryption, compression).
    - Verification is a separate step that can be run async after completion.
    - Cleanup_old_backups uses the retention_days PlatformSetting.

Security (SEC):
    - SEC: file_path stores only the local temp path  never credentials.
    - SEC: s3_key stores the object key in S3-compatible storage (MinIO).
    - SEC: error_message is TEXT and never contains secrets (scrubbed in tasks).

Compliance:
    - LOPDP Art. 47 / GDPR Art. 30: Backup operations are auditable.
"""

import uuid
from enum import Enum

from django.db import models


class BackupJobStatus(str, Enum):
    """Backup job lifecycle states."""

    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    VERIFIED = "verified"
    CORRUPTED = "corrupted"


class BackupJobType(str, Enum):
    """Kinds of backup operations."""

    FULL = "full"
    INCREMENTAL = "incremental"
    MANUAL = "manual"


class BackupJob(models.Model):
    """
    A single backup/restore operation.

    Snapshots configuration at creation so historical backups remain
    interpretable even if platform settings change later.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # -- Ownership --
    tenant = models.ForeignKey(
        "tenants.Tenant",
        on_delete=models.CASCADE,
        related_name="backup_jobs",
        null=True,
        blank=True,
        help_text="Null for platform-level backups (SuperAdmin scope).",
    )

    # -- Lifecycle --
    status = models.CharField(
        max_length=20,
        choices=[(s.value, s.value) for s in BackupJobStatus],
        default=BackupJobStatus.PENDING.value,
        db_index=True,
    )

    # -- Configuration snapshot (at time of backup) --
    backup_type = models.CharField(
        max_length=20,
        choices=[(t.value, t.value) for t in BackupJobType],
        default=BackupJobType.FULL.value,
    )
    include_media = models.BooleanField(default=True)
    include_vault = models.BooleanField(default=True)
    encryption_enabled = models.BooleanField(default=True)
    compression_enabled = models.BooleanField(default=True)

    # -- Results --
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    file_size_bytes = models.BigIntegerField(null=True, blank=True)
    file_path = models.CharField(max_length=500, blank=True, default="")
    s3_key = models.CharField(max_length=500, blank=True, default="")

    # -- Verification --
    verification_status = models.CharField(max_length=20, default="pending")
    verification_details = models.TextField(blank=True, default="")

    # -- Error handling --
    error_message = models.TextField(blank=True, default="")
    retry_count = models.IntegerField(default=0)

    # -- Timestamps --
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "backup_jobs"
        ordering = ["-created_at"]
        verbose_name = "Backup Job"
        verbose_name_plural = "Backup Jobs"
        indexes = [
            models.Index(fields=["tenant", "status", "created_at"]),
            models.Index(fields=["backup_type", "status"]),
            models.Index(fields=["verification_status", "created_at"]),
        ]

    def __str__(self) -> str:
        return f"BackupJob({self.id.hex[:8]} {self.backup_type} {self.status})"

    @property
    def duration_seconds(self) -> int | None:
        """Return elapsed time in seconds, or None if not finished."""
        if self.started_at and self.completed_at:
            return int((self.completed_at - self.started_at).total_seconds())
        return None

    @property
    def human_readable_size(self) -> str:
        """Return file size as human-readable string."""
        size = self.file_size_bytes
        if size is None:
            return "N/A"
        for unit in ("B", "KiB", "MiB", "GiB", "TiB"):
            if abs(size) < 1024:
                return f"{size:3.1f} {unit}"
            size //= 1024  # type: ignore[assignment]
        return f"{size} PiB"
