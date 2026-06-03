"""
Loyallia Backup API Schemas (apps/backup/schemas.py)

Django Ninja request/response schemas for the SuperAdmin backup API.
All timestamps are ISO-8601 strings.
"""

from ninja import Schema

# -- Request schemas --


class TriggerBackupIn(Schema):
    """Request body for triggering a manual backup."""

    backup_type: str = "manual"
    include_media: bool = True
    include_vault: bool = True
    encryption_enabled: bool = True
    compression_enabled: bool = True


class RestoreFromBackupIn(Schema):
    """Request body for restoring from a backup."""

    confirm: bool = False
    target_tenant_id: str | None = None


# -- Response schemas --


class BackupJobOut(Schema):
    """Single backup job representation."""

    id: str
    status: str
    backup_type: str
    include_media: bool
    include_vault: bool
    encryption_enabled: bool
    compression_enabled: bool
    started_at: str | None = None
    completed_at: str | None = None
    file_size_bytes: int | None = None
    human_readable_size: str
    file_path: str
    s3_key: str
    verification_status: str
    verification_details: str
    error_message: str
    retry_count: int
    duration_seconds: int | None = None
    created_at: str
    updated_at: str


class BackupListOut(Schema):
    """Paginated list of backup jobs."""

    total: int
    count: int
    jobs: list[BackupJobOut]


class BackupStatusOut(Schema):
    """Latest backup status summary."""

    latest_backup: BackupJobOut | None = None
    total_backups: int
    completed_backups: int
    failed_backups: int
    pending_backups: int
    last_successful_at: str | None = None


class BackupActionOut(Schema):
    """Generic action response (trigger, verify, restore)."""

    success: bool
    message: str
    job_id: str | None = None


class BackupVerifyOut(Schema):
    """Backup verification response."""

    success: bool
    job_id: str
    verification_status: str
    details: str


class RestoreShellIn(Schema):
    """Request body for restoring from local/offsite via unified CLI."""

    component: str
    source: str
    date: str
    confirm: bool = False


class RestoreOptionItem(Schema):
    """Single restore option grouped by date."""

    date: str
    components: list[str]


class RestoreOptionsOut(Schema):
    """Available restore options from local and offsite."""

    local: list[RestoreOptionItem]
    offsite: list[RestoreOptionItem]


class RestoreStatusOut(Schema):
    """Current restore job status."""

    status: str
    component: str | None = None
    source: str | None = None
    date: str | None = None
    started_at: str | None = None
    completed_at: str | None = None
    error_message: str = ""


class OffsiteBackupOut(Schema):
    """Single offsite backup object."""

    key: str
    size: int
    last_modified: str


class OffsiteBackupListOut(Schema):
    """List of offsite backups on MinIO."""

    backups: list[OffsiteBackupOut]


class BackupSettingsOut(Schema):
    """Current backup settings from PlatformSetting."""

    backup_frequency: str
    backup_retention_days: int
    backup_encryption_enabled: bool
    backup_compression_enabled: bool
    backup_include_media: bool
    backup_include_vault: bool
    backup_hour: int
    backup_minute: int
