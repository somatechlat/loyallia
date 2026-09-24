"""Media (MinIO/S3) backup and restore operations."""

import logging
import os
import subprocess
from datetime import datetime

from django.conf import settings

from apps.backup.services.config import get_minio_config, temp_backup_dir

logger = logging.getLogger(__name__)


def backup_media(job_id: str) -> dict:
    """Sync media files from MinIO/S3 to a local tarball."""
    tmp_dir = temp_backup_dir("media")
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    media_tar = os.path.join(tmp_dir, f"loyallia_media_{timestamp}.tar.gz")
    minio_cfg = get_minio_config()

    try:
        import boto3
        from botocore.client import Config
        from botocore.exceptions import ClientError

        s3 = boto3.client(
            "s3",
            endpoint_url=minio_cfg["endpoint"],
            aws_access_key_id=minio_cfg["access_key"],
            aws_secret_access_key=minio_cfg["secret_key"],
            config=Config(signature_version="s3v4"),
            verify=getattr(settings, "AWS_S3_VERIFY", True),
        )

        media_dir = os.path.join(tmp_dir, "media")
        os.makedirs(media_dir, exist_ok=True)
        buckets = [
            b for b in (minio_cfg["bucket_passes"], minio_cfg["bucket_assets"]) if b
        ]
        total_files = 0
        total_bytes = 0

        for bucket in buckets:
            try:
                bucket_dir = os.path.join(media_dir, bucket)
                os.makedirs(bucket_dir, exist_ok=True)
                paginator = s3.get_paginator("list_objects_v2")
                for page in paginator.paginate(Bucket=bucket):
                    for obj in page.get("Contents", []):
                        key = obj["Key"]
                        local_path = os.path.join(bucket_dir, key)
                        os.makedirs(os.path.dirname(local_path), exist_ok=True)
                        s3.download_file(bucket, key, local_path)
                        total_files += 1
                        total_bytes += obj.get("Size", 0)
                logger.info(
                    "backup_media: downloaded %d files from bucket '%s'",
                    total_files,
                    bucket,
                )
            except ClientError as exc:
                error_code = exc.response.get("Error", {}).get("Code", "Unknown")
                if error_code == "NoSuchBucket":
                    logger.warning(
                        "backup_media: bucket '%s' does not exist, skipping", bucket
                    )
                    continue
                raise

        subprocess.run(
            ["tar", "-czf", media_tar, "-C", tmp_dir, "media"],
            check=True,
            capture_output=True,
        )
        file_size = os.path.getsize(media_tar)
        logger.info(
            "backup_media: job %s completed, files=%d, tar_size=%d bytes",
            job_id,
            total_files,
            file_size,
        )
        return {
            "success": True,
            "component": "media",
            "job_id": job_id,
            "file_path": media_tar,
            "file_size": file_size,
            "files_backed_up": total_files,
        }
    except Exception as e:
        logger.exception("backup_media failed for job %s: %s", job_id, e)
        raise


def restore_media(media_tar: str) -> bool:
    """Restore media files from tarball to MinIO/S3."""
    try:
        minio_cfg = get_minio_config()
        if not minio_cfg["endpoint"] or not minio_cfg["access_key"]:
            logger.warning("restore: S3/MinIO not configured, skipping media restore")
            return True

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

        tmp_dir = temp_backup_dir("media_restore")
        subprocess.run(
            ["tar", "-xzf", media_tar, "-C", tmp_dir], check=True, capture_output=True
        )

        media_root = os.path.join(tmp_dir, "media")
        for root, _dirs, files in os.walk(media_root):
            for fname in files:
                local_path = os.path.join(root, fname)
                relative_path = os.path.relpath(local_path, media_root)
                parts = relative_path.split(os.sep, 1)
                bucket, s3_key = (
                    (parts[0], parts[1])
                    if len(parts) == 2
                    else (minio_cfg["bucket_assets"], relative_path)
                )
                try:
                    s3.upload_file(local_path, bucket, s3_key)
                except Exception as exc:
                    logger.warning(
                        "restore: failed to upload %s to s3://%s/%s: %s",
                        local_path,
                        bucket,
                        s3_key,
                        exc,
                    )

        logger.info("restore: media files restored")
        import shutil

        shutil.rmtree(tmp_dir, ignore_errors=True)
        return True
    except Exception as e:
        logger.exception("restore: media restore failed: %s", e)
        return False
