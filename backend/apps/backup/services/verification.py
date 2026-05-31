"""Backup verification and archive upload."""

import logging
import os
import subprocess
from datetime import datetime

from django.conf import settings

from apps.backup.services.config import get_backup_settings, get_minio_config, scrub_error, temp_backup_dir

logger = logging.getLogger(__name__)


def verify_backup(component_results: list, job_id: str) -> dict:
    """Verify backup integrity after all components complete.

    Checks that all component tasks reported success, files exist and are
    non-empty, and gzip archives are valid.
    """
    from apps.backup.models import BackupJob, BackupJobStatus

    details_parts = []
    all_ok = True
    results = [r for r in (component_results or []) if isinstance(r, dict)]

    for result in results:
        component = result.get("component", "unknown")
        success = result.get("success", False)
        file_path = result.get("file_path", "")
        file_size = result.get("file_size", 0)

        if not success:
            details_parts.append(f"FAIL: {component} reported failure")
            all_ok = False
            continue

        if result.get("skipped"):
            details_parts.append(f"SKIP: {component}  {result.get('reason', '')}")
            continue

        if file_path and os.path.exists(file_path):
            actual_size = os.path.getsize(file_path)
            if actual_size == 0:
                details_parts.append(f"FAIL: {component} file is empty")
                all_ok = False
            else:
                details_parts.append(f"OK: {component}  {actual_size} bytes")
                if file_path.endswith(".gz"):
                    try:
                        subprocess.run(["gzip", "--test", file_path], check=True, capture_output=True)
                        details_parts.append(f"  Valid gzip: {component}")
                    except subprocess.CalledProcessError:
                        details_parts.append(f"  FAIL: {component} gzip corrupted")
                        all_ok = False
        elif not file_path:
            details_parts.append(f"SKIP: {component}  no file produced")
        else:
            details_parts.append(f"FAIL: {component} file not found: {file_path}")
            all_ok = False

    try:
        s3_key = pack_and_upload_archive(results, job_id)
    except Exception as exc:
        logger.exception("verify_backup: archive/upload failed")
        s3_key = ""
        details_parts.append(f"Archive/upload error: {exc}")
        all_ok = False

    verification_status = "verified" if all_ok else "corrupted"
    job_status = BackupJobStatus.VERIFIED.value if all_ok else BackupJobStatus.CORRUPTED.value
    details_text = "\n".join(details_parts)

    try:
        job = BackupJob.objects.get(id=job_id)
        job.status = BackupJobStatus.COMPLETED.value if all_ok else BackupJobStatus.FAILED.value
        job.verification_status = verification_status
        job.verification_details = details_text
        job.s3_key = s3_key
        if results:
            total_size = sum(r.get("file_size", 0) for r in results if isinstance(r, dict))
            job.file_size_bytes = total_size
        job.completed_at = __import__("django.utils.timezone", fromlist=["now"]).now()
        job.save()
    except BackupJob.DoesNotExist:
        logger.error("verify_backup: job %s not found", job_id)

    logger.info("verify_backup: job %s  status=%s", job_id, verification_status)
    return {"success": all_ok, "job_id": job_id, "verification_status": verification_status, "details": details_text, "s3_key": s3_key}


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

    subprocess.run(["tar", "-czf", archive_path] + files_to_archive, check=True, capture_output=True)

    gpg_key_id = config.get("gpg_key_id", "")
    final_path = archive_path
    if gpg_key_id:
        encrypted_path = archive_path + ".gpg"
        subprocess.run(
            ["gpg", "--batch", "--yes", "--recipient", gpg_key_id,
             "--output", encrypted_path, "--encrypt", archive_path],
            check=True, capture_output=True,
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
        except Exception:
            s3.create_bucket(Bucket=s3_bucket)
        s3.upload_file(final_path, s3_bucket, s3_key)
        logger.info("pack_and_upload_archive: uploaded %s to s3://%s/%s", final_path, s3_bucket, s3_key)

    try:
        import shutil
        shutil.rmtree(tmp_dir)
    except Exception:
        pass

    return s3_key
