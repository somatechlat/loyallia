"""Backup verification and archive upload."""

import logging
import os
import subprocess
from datetime import datetime
from pathlib import Path

from django.conf import settings

from apps.backup.services.config import (
    get_backup_settings,
    get_minio_config,
    temp_backup_dir,
)

logger = logging.getLogger(__name__)


def verify_backup(component_results: list, job_id: str) -> dict:
    """Verify backups by calling the unified backup CLI.

    Returns a structured result with status, components, and errors.
    """
    from apps.backup.models import BackupJob, BackupJobStatus

    project_root = Path(settings.BASE_DIR).parent
    backup_script = project_root / "deploy" / "backups" / "backup"

    if not backup_script.exists():
        raise FileNotFoundError(f"Backup script not found: {backup_script}")

    result = subprocess.run(
        [str(backup_script), "--verify"],
        capture_output=True,
        text=True,
        cwd=str(project_root),
    )

    success = result.returncode == 0
    stdout = result.stdout
    stderr = result.stderr

    components: dict[str, str] = {}
    errors: list[str] = []

    for line in (stdout + "\n" + stderr).splitlines():
        line_stripped = line.strip()
        if line_stripped.startswith("OK:"):
            comp = line_stripped.replace("OK:", "").strip().split()[0]
            components[comp] = "ok"
        elif line_stripped.startswith("FAIL:"):
            comp = line_stripped.replace("FAIL:", "").strip().split()[0]
            components[comp] = "failed"
            errors.append(line_stripped)
        elif "error" in line_stripped.lower() or "fail" in line_stripped.lower():
            errors.append(line_stripped)

    status = "ok" if success and not errors else "failed"

    try:
        job = BackupJob.objects.get(id=job_id)
        job.verification_status = "verified" if status == "ok" else "corrupted"
        job.verification_details = stdout + "\n" + stderr
        if status == "ok":
            job.status = BackupJobStatus.VERIFIED.value
        job.save()
    except BackupJob.DoesNotExist:
        logger.error("verify_backup: job %s not found", job_id)

    logger.info("verify_backup: job %s  status=%s", job_id, status)
    return {
        "status": status,
        "job_id": job_id,
        "components": components,
        "errors": errors,
        "stdout": stdout,
        "stderr": stderr,
    }


def pack_and_upload_archive(component_results: list, job_id: str) -> str:
    """Combine all component backup files into a single tarball and upload to S3/MinIO."""
    config = get_backup_settings()
    s3_bucket = config["s3_bucket"]
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    archive_name = f"loyallia_backup_{timestamp}_{job_id[:8]}.tar.gz"
    s3_key = f"backups/{datetime.utcnow().strftime('%Y/%m/%d')}/{archive_name}"

    tmp_dir = temp_backup_dir("archive")
    archive_path = os.path.join(tmp_dir, archive_name)

    files_to_archive = [
        result["file_path"]
        for result in component_results
        if isinstance(result, dict) and result.get("file_path") and os.path.exists(result["file_path"])
    ]

    if not files_to_archive:
        logger.warning("pack_and_upload_archive: no files to archive for job %s", job_id)
        return ""

    subprocess.run(
        ["tar", "-czf", archive_path] + files_to_archive,
        check=True,
        capture_output=True,
    )

    gpg_key_id = config.get("gpg_key_id", "")
    final_path = archive_path
    if gpg_key_id:
        encrypted_path = archive_path + ".gpg"
        subprocess.run(
            [
                "gpg",
                "--batch",
                "--yes",
                "--recipient",
                gpg_key_id,
                "--output",
                encrypted_path,
                "--encrypt",
                archive_path,
            ],
            check=True,
            capture_output=True,
        )
        final_path = encrypted_path
        s3_key += ".gpg"

    minio_cfg = get_minio_config()
    if minio_cfg["endpoint"] and minio_cfg["access_key"]:
        import boto3
        from botocore.client import Config

        s3 = boto3.client(
            "s3",
            endpoint_url=minio_cfg["endpoint"],
            aws_access_key_id=minio_cfg["access_key"],
            aws_secret_access_key=minio_cfg["secret_key"],
            config=Config(signature_version="s3v4"),
            verify=getattr(settings, "AWS_S3_VERIFY", True),
        )
        try:
            s3.head_bucket(Bucket=s3_bucket)
        except Exception as e:
            logger.warning("S3 head_bucket failed (%s), attempting create_bucket", e)
            s3.create_bucket(Bucket=s3_bucket)
        s3.upload_file(final_path, s3_bucket, s3_key)
        logger.info(
            "pack_and_upload_archive: uploaded %s to s3://%s/%s",
            final_path,
            s3_bucket,
            s3_key,
        )

    try:
        import shutil

        shutil.rmtree(tmp_dir)
    except Exception as exc:
        logger.warning(
            "pack_and_upload_archive: failed to remove temp dir %s: %s",
            tmp_dir,
            exc,
        )

    return s3_key
