"""Restore orchestration and file discovery."""

import contextlib
import logging
import os
import re
import shutil
import subprocess

from django.conf import settings

from apps.backup.services.config import (
    get_backup_settings,
    get_minio_config,
    temp_backup_dir,
)
from apps.backup.services.media import restore_media
from apps.backup.services.postgres import restore_postgresql
from apps.backup.services.redis import restore_redis
from apps.backup.services.vault import restore_vault

logger = logging.getLogger(__name__)

_GPG_KEY_ID_RE = re.compile(r"^[0-9A-Fa-f]{16}$|^[0-9A-Fa-f]{40}$")


def _validate_gpg_key_id(key_id: str) -> bool:
    """Validate GPG key ID (16 hex chars) or fingerprint (40 hex chars)."""
    return bool(_GPG_KEY_ID_RE.match(key_id))


def restore_from_backup(backup_id: str, s3_key: str, target_tenant_id: str = "") -> dict:
    """Restore the platform from a backup archive.

    WARNING: Destructive operation. Overwrites existing data.
    Only SUPER_ADMIN can trigger this via the API.
    """
    tmp_dir = temp_backup_dir("restore")

    try:
        logger.warning("restore_from_backup: STARTING RESTORE for backup %s", backup_id)

        minio_cfg = get_minio_config()
        config = get_backup_settings()
        s3_bucket = config["s3_bucket"]
        archive_path = os.path.join(tmp_dir, "backup.tar.gz")

        if s3_key and minio_cfg["endpoint"] and minio_cfg["access_key"]:
            import boto3
            from botocore.client import Config

            s3 = boto3.client(
                "s3",
                endpoint_url=minio_cfg["endpoint"],
                aws_access_key_id=minio_cfg["access_key"],
                aws_secret_access_key=minio_cfg["secret_key"],
                config=Config(signature_version="s3v4"),
                verify=getattr(
                    __import__("django.conf", fromlist=["settings"]).settings,
                    "AWS_S3_VERIFY",
                    True,
                ),
            )
            download_path = archive_path
            if s3_key.endswith(".gpg"):
                download_path = archive_path + ".gpg"
            s3.download_file(s3_bucket, s3_key, download_path)
            logger.info("restore: downloaded s3://%s/%s to %s", s3_bucket, s3_key, download_path)

            if download_path.endswith(".gpg"):
                gpg_key_id = config.get("gpg_key_id", "")
                if gpg_key_id:
                    if not _validate_gpg_key_id(gpg_key_id):
                        return {
                            "success": False,
                            "error": f"Invalid GPG key ID: {gpg_key_id}",
                        }
                    subprocess.run(
                        [
                            "gpg",
                            "--batch",
                            "--yes",
                            "--recipient",
                            gpg_key_id,
                            "--output",
                            archive_path,
                            "--decrypt",
                            download_path,
                        ],
                        check=True,
                        capture_output=True,
                    )
                    logger.info("restore: decrypted archive to %s", archive_path)
        elif not s3_key:
            return {"success": False, "error": "No S3 key available for restore"}
        else:
            return {"success": False, "error": "S3/MinIO not configured"}

        extract_dir = os.path.join(tmp_dir, "extracted")
        os.makedirs(extract_dir, exist_ok=True)
        subprocess.run(
            ["tar", "-xzf", archive_path, "-C", extract_dir],
            check=True,
            capture_output=True,
        )
        logger.info("restore: extracted archive to %s", extract_dir)

        results = {
            "postgresql": False,
            "redis": False,
            "vault": False,
            "media": False,
        }

        pg_file = find_file(extract_dir, "loyallia_pg_")
        if pg_file:
            results["postgresql"] = restore_postgresql(pg_file)

        redis_file = find_file(extract_dir, "loyallia_redis_")
        if redis_file:
            results["redis"] = restore_redis(redis_file)

        vault_file = find_file(extract_dir, "loyallia_vault_")
        if vault_file:
            results["vault"] = restore_vault(vault_file)

        media_tar = find_file(extract_dir, "loyallia_media_")
        if media_tar:
            results["media"] = restore_media(media_tar)

        all_ok = all(results.values())
        logger.warning(
            "restore_from_backup: COMPLETED for backup %s  results=%s",
            backup_id,
            results,
        )
        return {"success": all_ok, "backup_id": backup_id, "results": results}

    except Exception as e:
        logger.exception("restore_from_backup failed for backup %s: %s", backup_id, e)
        raise
    finally:
        with contextlib.suppress(OSError):
            shutil.rmtree(tmp_dir)


def find_file(directory: str, prefix: str) -> str:
    """Find the first file in directory matching prefix."""
    for root, _dirs, files in os.walk(directory):
        for fname in files:
            if fname.startswith(prefix):
                return os.path.join(root, fname)
    return ""


VALID_COMPONENTS = ("postgres", "redis", "vault", "minio", "full", "snapshot")
VALID_SOURCES = ("local", "offsite")


def execute_restore(component: str, source: str, date: str) -> dict:
    """Run the restore shell command for a component.

    WARNING: Destructive operation. Overwrites live data.
    """
    from pathlib import Path

    project_root = Path(settings.BASE_DIR).parent
    restore_script = project_root / "deploy" / "backups" / "restore"

    if not restore_script.exists():
        raise FileNotFoundError(f"Restore script not found: {restore_script}")

    cmd = [str(restore_script), f"--{component}"]
    if source == "offsite":
        cmd.append("--offsite")
    if date:
        cmd.append(f"--date={date}")

    logger.warning(
        "execute_restore: running %s (component=%s source=%s date=%s)",
        cmd,
        component,
        source,
        date,
    )

    result = subprocess.run(
        cmd,
        input="RESTORE\n",
        text=True,
        capture_output=True,
        cwd=str(project_root),
        timeout=settings.HTTP_TIMEOUT_BACKUP_RESTORE,
    )

    return {
        "success": result.returncode == 0,
        "returncode": result.returncode,
        "stdout": result.stdout,
        "stderr": result.stderr,
    }


def get_restore_options() -> dict:
    """Get available restore dates/components."""
    from apps.backup.services.config import get_restore_options as _get_restore_options

    return _get_restore_options()


def validate_restore_request(data: dict) -> tuple[bool, str]:
    """Validate the restore request body."""
    component = data.get("component", "")
    source = data.get("source", "")
    date = data.get("date", "")
    confirm = data.get("confirm", False)

    if component not in VALID_COMPONENTS:
        return (
            False,
            f"Invalid component. Must be one of: {', '.join(VALID_COMPONENTS)}",
        )
    if source not in VALID_SOURCES:
        return False, f"Invalid source. Must be one of: {', '.join(VALID_SOURCES)}"
    if not confirm:
        return False, "confirm=true is required"
    if not date or not isinstance(date, str):
        return False, "date is required (YYYY-MM-DD)"
    if not re.match(r"^\d{4}-\d{2}-\d{2}$", date):
        return False, "date must be in YYYY-MM-DD format"

    return True, ""
