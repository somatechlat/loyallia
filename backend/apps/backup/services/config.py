"""Backup configuration and shared utilities."""

import logging
import os
import re
import tempfile
from datetime import datetime

from django.conf import settings

logger = logging.getLogger(__name__)

_SENSITIVE_KEYS = ("password", "passwd", "secret", "token", "key", "credential")


def scrub_error(msg: str) -> str:
    """Remove potential secrets from error messages before DB storage."""
    lower = msg.lower()
    for keyword in _SENSITIVE_KEYS:
        if keyword in lower:
            msg = re.sub(
                rf"{keyword}['\"]?\s*[:=]\s*['\"]?[^\s'\"]+",
                f"{keyword}=***SCRUBBED***",
                msg,
                flags=re.IGNORECASE,
            )
    return msg


def temp_backup_dir(prefix: str = "loyallia_backup") -> str:
    """Create a secure temp directory for this backup run."""
    tmp = tempfile.mkdtemp(
        prefix=f"{prefix}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_"
    )
    os.chmod(tmp, 0o700)
    return tmp


def get_backup_settings() -> dict:
    """Read backup configuration from PlatformSetting (cached)."""
    from apps.tenants.models import PlatformSetting

    return {
        "retention_days": PlatformSetting.get_int("backup_retention_days", 30),
        "encryption_enabled": PlatformSetting.get_bool(
            "backup_encryption_enabled", True
        ),
        "compression_enabled": PlatformSetting.get_bool(
            "backup_compression_enabled", True
        ),
        "include_media": PlatformSetting.get_bool("backup_include_media", True),
        "include_vault": PlatformSetting.get_bool("backup_include_vault", True),
        "gpg_key_id": PlatformSetting.get("backup_gpg_key_id", ""),
        "s3_bucket": PlatformSetting.get("backup_s3_bucket", "loyallia-backups"),
        "s3_endpoint": PlatformSetting.get("backup_s3_endpoint", ""),
    }


def get_db_config() -> dict:
    """Read DB config from Django settings (populated from Vault)."""
    db = settings.DATABASES.get("direct", settings.DATABASES["default"])
    return {
        "host": db.get("HOST", "localhost"),
        "port": db.get("PORT", "5432"),
        "name": db.get("NAME", "loyallia"),
        "user": db.get("USER", "loyallia"),
        "password": db.get("PASSWORD", ""),
    }


def get_minio_config() -> dict:
    """Read MinIO/S3 config from Django settings (populated from Vault)."""
    return {
        "endpoint": getattr(settings, "MINIO_ENDPOINT", ""),
        "access_key": getattr(settings, "MINIO_ACCESS_KEY", ""),
        "secret_key": getattr(settings, "MINIO_SECRET_KEY", ""),
        "bucket_passes": getattr(settings, "MINIO_BUCKET_PASSES", "passes"),
        "bucket_assets": getattr(settings, "MINIO_BUCKET_ASSETS", "assets"),
        "use_ssl": getattr(settings, "MINIO_USE_SSL", False),
    }


def notify_backup_failure(job_id: str, error: str) -> None:
    """Send notification when backup fails."""
    logger.error("Backup job %s FAILED: %s", job_id, error)
    try:
        from apps.notifications.email_engine.client import send_raw_email
        from apps.tenants.models import PlatformSetting

        alert_email = PlatformSetting.get("backup_alert_email", "")
        if alert_email:
            send_raw_email(
                to_email=alert_email,
                subject="[Loyallia] Backup FAILED",
                body_html=f"<p>Backup job <code>{job_id}</code> failed:</p><pre>{scrub_error(error)}</pre>",
            )
    except Exception as exc:
        logger.warning("Failed to send backup failure notification: %s", exc)


def create_job_record(
    backup_type: str = "full",
    tenant_id: str | None = None,
    include_media: bool = True,
    include_vault: bool = True,
    encryption_enabled: bool = True,
    compression_enabled: bool = True,
) -> str:
    """Create a BackupJob row and return its ID as a hex string."""
    import uuid

    from apps.backup.models import BackupJob, BackupJobStatus
    from apps.tenants.models import Tenant

    kwargs: dict = {
        "status": BackupJobStatus.PENDING.value,
        "backup_type": backup_type,
        "include_media": include_media,
        "include_vault": include_vault,
        "encryption_enabled": encryption_enabled,
        "compression_enabled": compression_enabled,
    }
    if tenant_id:
        try:
            kwargs["tenant"] = Tenant.objects.get(id=uuid.UUID(tenant_id))
        except (Tenant.DoesNotExist, ValueError):
            pass

    job = BackupJob.objects.create(**kwargs)
    return str(job.id)


def update_job(job_id: str, **fields) -> None:
    """Atomic update of a BackupJob row."""
    from apps.backup.models import BackupJob

    BackupJob.objects.filter(id=job_id).update(**fields)
