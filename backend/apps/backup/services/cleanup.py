"""Backup cleanup and temp file removal."""

import logging
import os
import shutil
import time
from datetime import timedelta

from django.conf import settings
from django.utils import timezone

from apps.backup.services.config import get_minio_config

logger = logging.getLogger(__name__)


def cleanup_old_backups() -> dict:
    """Remove backup jobs and S3 objects older than retention_days.

    Returns a dict with counts of deleted jobs and S3 objects.
    Raises on failure for Celery retry.
    """
    from apps.backup.models import BackupJob
    from apps.tenants.models import PlatformSetting

    retention_days = PlatformSetting.get_int("backup_retention_days", 30)
    cutoff = timezone.now() - timedelta(days=retention_days)
    deleted_jobs = 0
    deleted_s3_objects = 0

    expired_jobs = BackupJob.objects.filter(
        created_at__lt=cutoff,
        status__in=["completed", "failed", "verified", "corrupted"],
    )

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
            verify=getattr(
                __import__("django.conf", fromlist=["settings"]).settings,
                "AWS_S3_VERIFY",
                True,
            ),
        )
        s3_bucket = PlatformSetting.get("backup_s3_bucket", "loyallia-backups")

        for job in expired_jobs.iterator(chunk_size=settings.ITERATOR_CHUNK_SIZE_SMALL):
            if job.s3_key:
                try:
                    s3.delete_object(Bucket=s3_bucket, Key=job.s3_key)
                    deleted_s3_objects += 1
                except Exception as exc:
                    logger.warning(
                        "cleanup_old_backups: failed to delete s3://%s/%s: %s",
                        s3_bucket,
                        job.s3_key,
                        exc,
                    )

    deleted_jobs, _ = expired_jobs.delete()
    cleanup_local_temp_files()

    logger.info(
        "cleanup_old_backups: deleted %d jobs, %d S3 objects",
        deleted_jobs,
        deleted_s3_objects,
    )
    return {
        "success": True,
        "deleted_jobs": deleted_jobs,
        "deleted_s3_objects": deleted_s3_objects,
        "retention_days": retention_days,
        "cutoff": cutoff.isoformat(),
    }


def cleanup_local_temp_files() -> None:
    """Remove backup temp directories older than 7 days from /tmp."""
    max_age_seconds = 7 * 86400
    now = time.time()
    for item in os.listdir("/tmp"):
        if item.startswith("loyallia_backup"):
            full_path = os.path.join("/tmp", item)
            try:
                if os.path.isdir(full_path) and (now - os.path.getctime(full_path)) > max_age_seconds:
                    shutil.rmtree(full_path)
                    logger.debug("cleanup_local_temp_files: removed %s", full_path)
            except Exception as exc:
                logger.warning("cleanup_local_temp_files: failed to remove %s: %s", full_path, exc)
