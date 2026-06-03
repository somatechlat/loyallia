"""Backup configuration and shared utilities."""

import contextlib
import logging
import os
import re
import tempfile
from datetime import datetime
from pathlib import Path

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
        with contextlib.suppress(Tenant.DoesNotExist, ValueError):
            kwargs["tenant"] = Tenant.objects.get(id=uuid.UUID(tenant_id))

    job = BackupJob.objects.create(**kwargs)
    return str(job.id)


def update_job(job_id: str, **fields) -> None:
    """Atomic update of a BackupJob row."""
    from apps.backup.models import BackupJob

    BackupJob.objects.filter(id=job_id).update(**fields)


def _get_project_root() -> Path:
    """Derive project root (parent of Django BASE_DIR)."""
    return Path(settings.BASE_DIR).parent


def _detect_deploy_env() -> str:
    """Detect deployment environment from .env file."""
    project_root = _get_project_root()
    env_file = project_root / ".env"
    if env_file.exists():
        content = env_file.read_text()
        if "COMPOSE_FILE" in content and "prod" in content:
            return "production"
        if "DJANGO_SETTINGS_MODULE" in content and "production" in content:
            return "production"
    return "development"


def get_local_backup_list() -> list[dict]:
    """List local backups from the backup directory."""
    project_root = _get_project_root()
    env = _detect_deploy_env()
    env_script = project_root / "deploy" / "backups" / env / "env.sh"

    backup_dir = ""
    if env_script.exists():
        for line in env_script.read_text().splitlines():
            if line.strip().startswith("BACKUP_DIR="):
                backup_dir = line.split("=", 1)[1].strip().strip('"')
                break

    if not backup_dir:
        backup_dir = str(project_root / "backups") if env == "development" else "/var/backups/loyallia"

    backup_dir = backup_dir.replace("$PROJECT_ROOT", str(project_root))

    if not os.path.isdir(backup_dir):
        return []

    backups: list[dict] = []
    for root, _dirs, files in os.walk(backup_dir):
        for fname in files:
            if fname.endswith((".age", ".tar.gz", ".gpg", ".tar")):
                fpath = os.path.join(root, fname)
                try:
                    mtime = os.path.getmtime(fpath)
                    backups.append(
                        {
                            "path": fpath,
                            "name": fname,
                            "size": os.path.getsize(fpath),
                            "date": datetime.fromtimestamp(mtime).strftime("%Y-%m-%d"),
                        }
                    )
                except OSError:
                    continue
    return backups


def get_offsite_backup_list() -> list[dict]:
    """List offsite backups on MinIO using boto3."""
    minio_cfg = get_minio_config()
    backup_cfg = get_backup_settings()

    endpoint = minio_cfg.get("endpoint") or backup_cfg.get("s3_endpoint")
    access_key = minio_cfg.get("access_key", "")
    secret_key = minio_cfg.get("secret_key", "")
    bucket = backup_cfg.get("s3_bucket", "loyallia-backups")

    if not endpoint or not access_key or not secret_key:
        logger.warning("MinIO not configured for offsite listing")
        return []

    try:
        import boto3
        from botocore.client import Config

        s3 = boto3.client(
            "s3",
            endpoint_url=endpoint,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            config=Config(signature_version="s3v4"),
            verify=getattr(settings, "AWS_S3_VERIFY", True),
        )

        backups: list[dict] = []
        paginator = s3.get_paginator("list_objects_v2")
        for page in paginator.paginate(Bucket=bucket):
            for obj in page.get("Contents", []):
                key = obj["Key"]
                if key.endswith("/"):
                    continue
                backups.append(
                    {
                        "key": key,
                        "size": obj["Size"],
                        "last_modified": obj["LastModified"].isoformat(),
                    }
                )
        return backups
    except Exception:
        logger.exception("Failed to list offsite backups")
        return []


def get_restore_options() -> dict:
    """Combine local and offsite backup lists into restore options grouped by date."""
    from collections import defaultdict

    local_backups = get_local_backup_list()
    offsite_backups = get_offsite_backup_list()

    def _group(backups: list[dict]) -> list[dict]:
        by_date: dict[str, set[str]] = defaultdict(set)
        for b in backups:
            date = b.get("date", "unknown")
            name = b.get("name", b.get("key", ""))
            for comp in ("postgres", "redis", "vault", "minio", "snapshot"):
                if comp in name.lower():
                    by_date[date].add(comp)
            if not by_date[date]:
                by_date[date].add("full")
        return [
            {"date": d, "components": sorted(list(c))}
            for d, c in sorted(by_date.items(), reverse=True)
        ]

    return {
        "local": _group(local_backups),
        "offsite": _group(offsite_backups),
    }
