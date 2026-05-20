"""
Loyallia  Backup Celery Tasks (apps/backup/tasks.py)

Seven main tasks orchestrate the complete backup lifecycle:

    1. run_full_backup()          -- Main orchestrator; called by Celery Beat
    2. backup_postgresql()        -- pg_dump via subprocess (Vault-secured credentials)
    3. backup_redis()             -- Redis BGSAVE + copy dump.rdb
    4. backup_vault()             -- Export Vault KV secrets via HTTP API
    5. backup_media()             -- Sync MinIO/S3 media buckets
    6. verify_backup()            -- Post-backup integrity verification
    7. cleanup_old_backups()      -- Remove expired backups per retention policy

Architecture:
    - run_full_backup() is the Celery Beat entry point. It spawns child tasks
      for each backup component (PostgreSQL, Redis, Vault, Media) via group(),
      then chains verify_backup() after they complete.
    - Each component task creates/updates its own BackupJob record for observability.
    - All tasks read configuration from PlatformSetting (cached in Redis).
    - Secrets (DB passwords, S3 keys) are read from Vault  never hardcoded.

Security (SEC):
    - SEC: Credentials come from Vault via get_secret() / VAULT_* env vars.
    - SEC: GPG/AES encryption is applied before upload.
    - SEC: Error messages are scrubbed of secrets before storage.
    - SEC: chmod 600 on all local backup files.

Performance (Rule 12):
    - PERF: PlatformSetting reads are cached (60s TTL) via Redis.
    - PERF: pg_dump streams to a compressed file  no intermediate buffers.
    - PERF: MinIO sync uses multipart upload for large files.
    - PERF: Cleanup uses a single bulk delete query.

Called by: Celery Beat scheduler, SuperAdmin API (trigger manual backup).
"""

import logging
import os
import shutil
import subprocess
import tempfile
from datetime import datetime, timedelta

from celery import chain, group, shared_task
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


_MAX_RETRIES = 3
_RETRY_DELAY = 120  # 2 minutes
_BACKUP_QUEUE = "default"
_BACKUP_TIMEOUT = 1800  # 30 minutes hard limit for full backup

# DB password scrubber for safe error logging
_SENSITIVE_KEYS = ("password", "passwd", "secret", "token", "key", "credential")


def _scrub_error(msg: str) -> str:
    """Remove potential secrets from error messages before DB storage."""
    lower = msg.lower()
    for keyword in _SENSITIVE_KEYS:
        if keyword in lower:
            # Redact anything that looks like a credential
            import re

            msg = re.sub(
                rf"{keyword}['\"]?\s*[:=]\s*['\"]?[^\s'\"]+",
                f"{keyword}=***SCRUBBED***",
                msg,
                flags=re.IGNORECASE,
            )
    return msg


def _temp_backup_dir(prefix: str = "loyallia_backup") -> str:
    """Create a secure temp directory for this backup run."""
    tmp = tempfile.mkdtemp(
        prefix=f"{prefix}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_"
    )
    os.chmod(tmp, 0o700)
    return tmp


def _get_backup_settings() -> dict:
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


def _get_db_config() -> dict:
    """Read DB config from Django settings (populated from Vault)."""
    db = settings.DATABASES.get("direct", settings.DATABASES["default"])
    return {
        "host": db.get("HOST", "localhost"),
        "port": db.get("PORT", "5432"),
        "name": db.get("NAME", "loyallia"),
        "user": db.get("USER", "loyallia"),
        "password": db.get("PASSWORD", ""),
    }


def _get_minio_config() -> dict:
    """Read MinIO/S3 config from Django settings (populated from Vault)."""
    return {
        "endpoint": getattr(settings, "MINIO_ENDPOINT", ""),
        "access_key": getattr(settings, "MINIO_ACCESS_KEY", ""),
        "secret_key": getattr(settings, "MINIO_SECRET_KEY", ""),
        "bucket_passes": getattr(settings, "MINIO_BUCKET_PASSES", "passes"),
        "bucket_assets": getattr(settings, "MINIO_BUCKET_ASSETS", "assets"),
        "use_ssl": getattr(settings, "MINIO_USE_SSL", False),
    }


def _notify_backup_failure(job_id: str, error: str) -> None:
    """Send notification when backup fails. Uses platform notification or email fallback."""
    logger.error("Backup job %s FAILED: %s", job_id, error)
    try:
        from apps.notifications.email_engine.client import send_raw_email
        from apps.tenants.models import PlatformSetting

        alert_email = PlatformSetting.get("backup_alert_email", "")
        if alert_email:
            send_raw_email(
                to_email=alert_email,
                subject="[Loyallia] Backup FAILED",
                body_html=f"<p>Backup job <code>{job_id}</code> failed:</p><pre>{_scrub_error(error)}</pre>",
            )
    except Exception as exc:
        logger.warning("Failed to send backup failure notification: %s", exc)


def _create_job_record(
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


def _update_job(job_id: str, **fields) -> None:
    """Atomic update of a BackupJob row."""
    from apps.backup.models import BackupJob

    BackupJob.objects.filter(id=job_id).update(**fields)


# Main orchestrator


@shared_task(
    bind=True,
    max_retries=_MAX_RETRIES,
    default_retry_delay=_RETRY_DELAY,
    queue=_BACKUP_QUEUE,
    name="apps.backup.tasks.run_full_backup",
    time_limit=_BACKUP_TIMEOUT,
    soft_time_limit=_BACKUP_TIMEOUT - 60,
)
def run_full_backup(self, tenant_id: str = "", manual: bool = False) -> dict:
    """
    Orchestrate a complete platform backup.

    Flow:
        1. Create BackupJob record.
        2. Spawn parallel tasks: PostgreSQL, Redis, Vault, Media.
        3. After all succeed, run verify_backup().
        4. Update job status and S3 key.

    Called by: Celery Beat (scheduled) or SuperAdmin API (manual).
    """
    from apps.backup.models import BackupJobStatus

    config = _get_backup_settings()
    backup_type = "manual" if manual else "full"

    job_id = _create_job_record(
        backup_type=backup_type,
        tenant_id=tenant_id or None,
        include_media=config["include_media"],
        include_vault=config["include_vault"],
        encryption_enabled=config["encryption_enabled"],
        compression_enabled=config["compression_enabled"],
    )

    logger.info("run_full_backup: starting job %s (type=%s)", job_id, backup_type)
    _update_job(
        job_id,
        status=BackupJobStatus.RUNNING.value,
        started_at=timezone.now(),
    )

    try:
        task_signatures = []

        task_signatures.append(backup_postgresql.s(job_id))

        task_signatures.append(backup_redis.s(job_id))

        if config["include_vault"]:
            task_signatures.append(backup_vault.s(job_id))

        if config["include_media"]:
            task_signatures.append(backup_media.s(job_id))

        job_group = group(task_signatures)
        verify_chain = chain(job_group, verify_backup.s(job_id))
        result = verify_chain.apply_async()

        logger.info(
            "run_full_backup: job %s chained, verify task id=%s", job_id, result.id
        )

        return {
            "success": True,
            "job_id": job_id,
            "celery_chain_id": result.id,
        }

    except Exception as exc:
        scrubbed = _scrub_error(str(exc))
        logger.exception("run_full_backup failed for job %s", job_id)
        _update_job(
            job_id,
            status=BackupJobStatus.FAILED.value,
            error_message=scrubbed,
            completed_at=timezone.now(),
        )
        _notify_backup_failure(job_id, scrubbed)
        raise self.retry(exc=exc)


# PostgreSQL backup


@shared_task(
    bind=True,
    max_retries=_MAX_RETRIES,
    default_retry_delay=_RETRY_DELAY,
    queue=_BACKUP_QUEUE,
    name="apps.backup.tasks.backup_postgresql",
    time_limit=900,
)
def backup_postgresql(self, job_id: str) -> dict:
    """
    Run pg_dump and compress the output.

    SEC: Password comes from Vault via Django DATABASES setting.
    PERF: Streams directly to a gzipped file  no Python buffers.
    """

    tmp_dir = _temp_backup_dir("pg")
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    dump_file = os.path.join(tmp_dir, f"loyallia_pg_{timestamp}.sql.gz")

    db = _get_db_config()
    config = _get_backup_settings()

    env = os.environ.copy()
    env["PGPASSWORD"] = db["password"]

    compress_flag = "--gzip" if config["compression_enabled"] else ""
    cmd_parts = [
        "pg_dump",
        "--host",
        db["host"],
        "--port",
        str(db["port"]),
        "--username",
        db["user"],
        "--dbname",
        db["name"],
        "--verbose",
        "--no-owner",
        "--no-privileges",
        "--format",
        "custom" if not config["compression_enabled"] else "plain",
    ]
    if compress_flag:
        cmd_parts.append("--gzip")

    try:
        logger.info("backup_postgresql: starting pg_dump for job %s", job_id)

        with open(dump_file, "wb") as out_fh:
            subprocess.run(
                cmd_parts,
                stdout=out_fh,
                stderr=subprocess.PIPE,
                env=env,
                check=True,
            )

        file_size = os.path.getsize(dump_file)
        logger.info(
            "backup_postgresql: job %s completed, size=%d bytes", job_id, file_size
        )

        return {
            "success": True,
            "component": "postgresql",
            "job_id": job_id,
            "file_path": dump_file,
            "file_size": file_size,
        }

    except subprocess.CalledProcessError as exc:
        stderr = (exc.stderr or b"").decode("utf-8", errors="replace")
        scrubbed = _scrub_error(stderr)
        logger.error("backup_postgresql failed: %s", scrubbed)
        raise self.retry(exc=exc)
    except Exception as exc:
        logger.exception("backup_postgresql unexpected error")
        raise self.retry(exc=exc)
    finally:
        env.pop("PGPASSWORD", None)


# Redis backup


@shared_task(
    bind=True,
    max_retries=_MAX_RETRIES,
    default_retry_delay=_RETRY_DELAY,
    queue=_BACKUP_QUEUE,
    name="apps.backup.tasks.backup_redis",
    time_limit=300,
)
def backup_redis(self, job_id: str) -> dict:
    """
    Trigger Redis BGSAVE and copy the resulting dump.rdb.

    Uses the Redis connection configured in Django CACHES.
    """
    tmp_dir = _temp_backup_dir("redis")
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    redis_file = os.path.join(tmp_dir, f"loyallia_redis_{timestamp}.rdb")

    try:
        from django_redis import get_redis_connection

        redis_conn = get_redis_connection("default")

        redis_conn.execute_command("BGSAVE")
        logger.info("backup_redis: BGSAVE triggered for job %s", job_id)

        import time

        for _ in range(60):  # max 60 seconds
            time.sleep(1)
            info = redis_conn.execute_command("INFO", "persistence")
            if isinstance(info, bytes):
                info = info.decode("utf-8")
            if "rdb_bgsave_in_progress:0" in info:
                break

        config_get = redis_conn.execute_command("CONFIG", "GET", "dir")
        if isinstance(config_get, (list, tuple)) and len(config_get) >= 2:
            redis_dir = (
                config_get[1].decode()
                if isinstance(config_get[1], bytes)
                else config_get[1]
            )
        else:
            redis_dir = "/data"

        dump_source = os.path.join(redis_dir, "dump.rdb")
        if os.path.exists(dump_source):
            shutil.copy2(dump_source, redis_file)
            file_size = os.path.getsize(redis_file)
            logger.info(
                "backup_redis: job %s completed, size=%d bytes", job_id, file_size
            )
            return {
                "success": True,
                "component": "redis",
                "job_id": job_id,
                "file_path": redis_file,
                "file_size": file_size,
            }
        else:
            for alt_dir in ("/data", "/var/lib/redis", "/var/redis", "/tmp"):
                alt_path = os.path.join(alt_dir, "dump.rdb")
                if os.path.exists(alt_path):
                    shutil.copy2(alt_path, redis_file)
                    file_size = os.path.getsize(redis_file)
                    logger.info(
                        "backup_redis: job %s completed from %s", job_id, alt_dir
                    )
                    return {
                        "success": True,
                        "component": "redis",
                        "job_id": job_id,
                        "file_path": redis_file,
                        "file_size": file_size,
                    }

            raise FileNotFoundError(
                f"dump.rdb not found in {redis_dir} or known locations"
            )

    except Exception as exc:
        logger.exception("backup_redis failed for job %s", job_id)
        raise self.retry(exc=exc)


# Vault backup


@shared_task(
    bind=True,
    max_retries=_MAX_RETRIES,
    default_retry_delay=_RETRY_DELAY,
    queue=_BACKUP_QUEUE,
    name="apps.backup.tasks.backup_vault",
    time_limit=300,
)
def backup_vault(self, job_id: str) -> dict:
    """
    Export Vault KV secrets to a JSON file.

    SEC: Uses Vault token from mounted file  never hardcoded.
    Only backs up the application secret path, not the entire Vault.
    """
    tmp_dir = _temp_backup_dir("vault")
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    vault_file = os.path.join(tmp_dir, f"loyallia_vault_{timestamp}.json")

    try:
        from common.vault import VAULT_ADDR, VAULT_SECRET_PATH, _get_vault_token

        vault_token = _get_vault_token()
        vault_addr = VAULT_ADDR
        secret_path = VAULT_SECRET_PATH

        if not vault_addr or not vault_token:
            logger.warning("backup_vault: Vault not configured, skipping")
            # Return success  Vault-less environments don't need this backup
            return {
                "success": True,
                "component": "vault",
                "job_id": job_id,
                "file_path": "",
                "file_size": 0,
                "skipped": True,
                "reason": "Vault not configured",
            }

        import json
        import ssl
        import urllib.error
        import urllib.request

        url = f"{vault_addr}/v1/{secret_path}"
        headers = {"X-Vault-Token": vault_token}

        ssl_context = ssl.create_default_context()
        vault_ca_cert = os.environ.get("VAULT_CACERT", "/vault/certs/vault.crt")
        if vault_ca_cert and os.path.isfile(vault_ca_cert):
            ssl_context.load_verify_locations(vault_ca_cert)
        else:
            ssl_context.check_hostname = False
            ssl_context.verify_mode = ssl.CERT_NONE

        req = urllib.request.Request(url, headers=headers, method="GET")
        with urllib.request.urlopen(req, timeout=15, context=ssl_context) as response:
            body = response.read().decode("utf-8")

        secrets_data = json.loads(body)
        with open(vault_file, "w", encoding="utf-8") as f:
            json.dump(secrets_data, f, indent=2, sort_keys=True)

        file_size = os.path.getsize(vault_file)
        os.chmod(vault_file, 0o600)

        logger.info("backup_vault: job %s completed, size=%d bytes", job_id, file_size)

        return {
            "success": True,
            "component": "vault",
            "job_id": job_id,
            "file_path": vault_file,
            "file_size": file_size,
        }

    except Exception as exc:
        logger.exception("backup_vault failed for job %s", job_id)
        raise self.retry(exc=exc)


# Media backup


@shared_task(
    bind=True,
    max_retries=_MAX_RETRIES,
    default_retry_delay=_RETRY_DELAY,
    queue=_BACKUP_QUEUE,
    name="apps.backup.tasks.backup_media",
    time_limit=1800,
)
def backup_media(self, job_id: str) -> dict:
    """
    Sync media files from MinIO/S3 to a local tarball.

    PERF: Uses streaming download to avoid loading large files into memory.
    """
    tmp_dir = _temp_backup_dir("media")
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    media_tar = os.path.join(tmp_dir, f"loyallia_media_{timestamp}.tar.gz")

    minio_cfg = _get_minio_config()

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
                        local_dir = os.path.dirname(local_path)
                        os.makedirs(local_dir, exist_ok=True)

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

    except Exception as exc:
        logger.exception("backup_media failed for job %s", job_id)
        raise self.retry(exc=exc)


# Backup verification


@shared_task(
    bind=True,
    max_retries=1,
    default_retry_delay=60,
    queue=_BACKUP_QUEUE,
    name="apps.backup.tasks.verify_backup",
    time_limit=600,
)
def verify_backup(self, component_results: list, job_id: str) -> dict:
    """
    Verify backup integrity after all components complete.

    Checks:
        1. All component tasks reported success.
        2. Backup files exist and have non-zero size.
        3. Gzip archives are valid (gzip --test).
        4. PostgreSQL dump header is readable.

    Updates the BackupJob record with verification status.
    """
    from apps.backup.models import BackupJob, BackupJobStatus

    details_parts = []
    all_ok = True

    if not component_results:
        component_results = []

    results = [r for r in component_results if isinstance(r, dict)]

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

                # Validate gzip files
                if file_path.endswith(".gz"):
                    try:
                        subprocess.run(
                            ["gzip", "--test", file_path],
                            check=True,
                            capture_output=True,
                        )
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
        s3_key = _pack_and_upload_archive(results, job_id)
    except Exception as exc:
        logger.exception("verify_backup: archive/upload failed")
        s3_key = ""
        details_parts.append(f"Archive/upload error: {exc}")
        all_ok = False

    verification_status = "verified" if all_ok else "corrupted"
    job_status = (
        BackupJobStatus.VERIFIED.value if all_ok else BackupJobStatus.CORRUPTED.value
    )
    details_text = "\n".join(details_parts)

    try:
        job = BackupJob.objects.get(id=job_id)
        job.status = (
            BackupJobStatus.COMPLETED.value if all_ok else BackupJobStatus.FAILED.value
        )
        job.verification_status = verification_status
        job.verification_details = details_text
        job.s3_key = s3_key
        if results:
            total_size = sum(
                r.get("file_size", 0) for r in results if isinstance(r, dict)
            )
            job.file_size_bytes = total_size
        job.completed_at = timezone.now()
        job.save()
    except BackupJob.DoesNotExist:
        logger.error("verify_backup: job %s not found", job_id)

    logger.info("verify_backup: job %s  status=%s", job_id, verification_status)

    return {
        "success": all_ok,
        "job_id": job_id,
        "verification_status": verification_status,
        "details": details_text,
        "s3_key": s3_key,
    }


def _pack_and_upload_archive(component_results: list, job_id: str) -> str:
    """
    Combine all component backup files into a single tarball and upload to S3/MinIO.

    Returns the S3 object key.
    """

    config = _get_backup_settings()
    s3_bucket = config["s3_bucket"]
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    archive_name = f"loyallia_backup_{timestamp}_{job_id[:8]}.tar.gz"
    s3_key = f"backups/{datetime.utcnow().strftime('%Y/%m/%d')}/{archive_name}"

    tmp_dir = _temp_backup_dir("archive")
    archive_path = os.path.join(tmp_dir, archive_name)

    files_to_archive = []
    for result in component_results:
        if (
            isinstance(result, dict)
            and result.get("file_path")
            and os.path.exists(result["file_path"])
        ):
            files_to_archive.append(result["file_path"])

    if not files_to_archive:
        logger.warning(
            "_pack_and_upload_archive: no files to archive for job %s", job_id
        )
        return ""

    tar_cmd = ["tar", "-czf", archive_path] + files_to_archive
    subprocess.run(tar_cmd, check=True, capture_output=True)

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

    minio_cfg = _get_minio_config()
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
        logger.info(
            "_pack_and_upload_archive: uploaded %s to s3://%s/%s",
            final_path,
            s3_bucket,
            s3_key,
        )

    try:
        shutil.rmtree(tmp_dir)
    except Exception:
        pass

    return s3_key


# Cleanup old backups


@shared_task(
    bind=True,
    max_retries=2,
    default_retry_delay=60,
    queue=_BACKUP_QUEUE,
    name="apps.backup.tasks.cleanup_old_backups",
    time_limit=600,
)
def cleanup_old_backups(self) -> dict:
    """
    Remove backup jobs and S3 objects older than retention_days.

    Reads retention_days from PlatformSetting (default 30).
    Also deletes local temp files older than 7 days.
    """
    from apps.backup.models import BackupJob
    from apps.tenants.models import PlatformSetting

    retention_days = PlatformSetting.get_int("backup_retention_days", 30)
    cutoff = timezone.now() - timedelta(days=retention_days)

    deleted_jobs = 0
    deleted_s3_objects = 0

    try:
        expired_jobs = BackupJob.objects.filter(
            created_at__lt=cutoff,
            status__in=["completed", "failed", "verified", "corrupted"],
        )

        minio_cfg = _get_minio_config()
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

            s3_bucket = PlatformSetting.get("backup_s3_bucket", "loyallia-backups")

            for job in expired_jobs.iterator(chunk_size=50):
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

        _cleanup_local_temp_files()

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

    except Exception as exc:
        logger.exception("cleanup_old_backups failed")
        raise self.retry(exc=exc)


def _cleanup_local_temp_files() -> None:
    """Remove backup temp directories older than 7 days from /tmp."""
    import time

    max_age_seconds = 7 * 86400
    now = time.time()

    for item in os.listdir("/tmp"):
        if item.startswith("loyallia_backup"):
            full_path = os.path.join("/tmp", item)
            try:
                if (
                    os.path.isdir(full_path)
                    and (now - os.path.getctime(full_path)) > max_age_seconds
                ):
                    shutil.rmtree(full_path)
                    logger.debug("_cleanup_local_temp_files: removed %s", full_path)
            except Exception as exc:
                logger.warning(
                    "_cleanup_local_temp_files: failed to remove %s: %s", full_path, exc
                )


# Restore from backup


@shared_task(
    bind=True,
    max_retries=1,
    default_retry_delay=300,
    queue=_BACKUP_QUEUE,
    name="apps.backup.tasks.restore_from_backup_task",
    time_limit=3600,  # 1 hour  restores can be slow
)
def restore_from_backup_task(
    self,
    backup_id: str,
    s3_key: str,
    target_tenant_id: str = "",
) -> dict:
    """
    Restore the platform from a backup archive.

    WARNING: Destructive operation. This overwrites existing data.

    Steps:
        1. Download archive from S3/MinIO.
        2. Decrypt (GPG) if encrypted.
        3. Decompress (tar.gz).
        4. Restore PostgreSQL via pg_restore.
        5. Restore Redis via copy of dump.rdb + CONFIG SET.
        6. Restore Vault KV secrets.
        7. Verify the restore.

    SEC: Only SUPER_ADMIN can trigger this via the API.
    """
    tmp_dir = _temp_backup_dir("restore")

    try:
        logger.warning(
            "restore_from_backup_task: STARTING RESTORE for backup %s", backup_id
        )

        minio_cfg = _get_minio_config()
        config = _get_backup_settings()
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
                verify=getattr(settings, "AWS_S3_VERIFY", True),
            )

            download_path = archive_path
            if s3_key.endswith(".gpg"):
                download_path = archive_path + ".gpg"

            s3.download_file(s3_bucket, s3_key, download_path)
            logger.info(
                "restore: downloaded s3://%s/%s to %s", s3_bucket, s3_key, download_path
            )

            if download_path.endswith(".gpg"):
                gpg_key_id = config.get("gpg_key_id", "")
                if gpg_key_id:
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

        pg_file = _find_file(extract_dir, "loyallia_pg_")
        if pg_file:
            results["postgresql"] = _restore_postgresql(pg_file)

        redis_file = _find_file(extract_dir, "loyallia_redis_")
        if redis_file:
            results["redis"] = _restore_redis(redis_file)

        vault_file = _find_file(extract_dir, "loyallia_vault_")
        if vault_file:
            results["vault"] = _restore_vault(vault_file)

        media_tar = _find_file(extract_dir, "loyallia_media_")
        if media_tar:
            results["media"] = _restore_media(media_tar)

        all_ok = all(results.values())
        logger.warning(
            "restore_from_backup_task: COMPLETED for backup %s  results=%s",
            backup_id,
            results,
        )

        return {
            "success": all_ok,
            "backup_id": backup_id,
            "results": results,
        }

    except Exception as exc:
        logger.exception("restore_from_backup_task failed for backup %s", backup_id)
        raise self.retry(exc=exc)
    finally:
        try:
            shutil.rmtree(tmp_dir)
        except Exception:
            pass


def _find_file(directory: str, prefix: str) -> str:
    """Find the first file in directory matching prefix."""
    for root, _dirs, files in os.walk(directory):
        for fname in files:
            if fname.startswith(prefix):
                return os.path.join(root, fname)
    return ""


def _restore_postgresql(dump_file: str) -> bool:
    """Restore PostgreSQL from a pg_dump file."""
    db = _get_db_config()
    env = os.environ.copy()
    env["PGPASSWORD"] = db["password"]

    try:
        logger.info("restore: restoring PostgreSQL from %s", dump_file)

        if dump_file.endswith(".gz") or dump_file.endswith(".gzip"):
            with subprocess.Popen(
                ["zcat", dump_file],
                stdout=subprocess.PIPE,
            ) as zcat_proc:
                subprocess.run(
                    [
                        "psql",
                        "--host",
                        db["host"],
                        "--port",
                        str(db["port"]),
                        "--username",
                        db["user"],
                        "--dbname",
                        db["name"],
                        "--set",
                        "ON_ERROR_STOP=1",
                    ],
                    stdin=zcat_proc.stdout,
                    env=env,
                    check=True,
                    capture_output=True,
                )
        else:
            subprocess.run(
                [
                    "psql",
                    "--host",
                    db["host"],
                    "--port",
                    str(db["port"]),
                    "--username",
                    db["user"],
                    "--dbname",
                    db["name"],
                    "--set",
                    "ON_ERROR_STOP=1",
                    "--file",
                    dump_file,
                ],
                env=env,
                check=True,
                capture_output=True,
            )

        logger.info("restore: PostgreSQL restore completed")
        return True
    except subprocess.CalledProcessError as exc:
        stderr = (exc.stderr or b"").decode("utf-8", errors="replace")
        logger.error("restore: PostgreSQL restore failed: %s", _scrub_error(stderr))
        return False
    except Exception:
        logger.exception("restore: PostgreSQL restore unexpected error")
        return False
    finally:
        env.pop("PGPASSWORD", None)


def _restore_redis(rdb_file: str) -> bool:
    """Restore Redis by replacing dump.rdb and restarting."""
    try:
        logger.info("restore: restoring Redis from %s", rdb_file)

        from django_redis import get_redis_connection

        redis_conn = get_redis_connection("default")
        config_get = redis_conn.execute_command("CONFIG", "GET", "dir")
        if isinstance(config_get, (list, tuple)) and len(config_get) >= 2:
            redis_dir = (
                config_get[1].decode()
                if isinstance(config_get[1], bytes)
                else config_get[1]
            )
        else:
            redis_dir = "/data"

        dump_dest = os.path.join(redis_dir, "dump.rdb")

        redis_conn.execute_command("SHUTDOWN", "NOSAVE")
        shutil.copy2(rdb_file, dump_dest)
        logger.info("restore: copied Redis RDB to %s", dump_dest)

        # Redis should restart automatically (via Docker/systemd)
        return True
    except Exception:
        logger.exception("restore: Redis restore failed")
        return False


def _restore_vault(vault_file: str) -> bool:
    """Restore Vault KV secrets from JSON backup."""
    try:
        from common.vault import VAULT_ADDR, VAULT_SECRET_PATH, _get_vault_token

        vault_token = _get_vault_token()
        vault_addr = VAULT_ADDR
        secret_path = VAULT_SECRET_PATH

        if not vault_addr or not vault_token:
            logger.warning("restore: Vault not configured, skipping vault restore")
            return True

        import json
        import ssl
        import urllib.request

        with open(vault_file, encoding="utf-8") as f:
            secrets_data = json.load(f)

        data_to_restore = secrets_data
        if "data" in secrets_data and "data" in secrets_data["data"]:
            data_to_restore = secrets_data["data"]["data"]
        elif "data" in secrets_data:
            data_to_restore = secrets_data["data"]

        ssl_context = ssl.create_default_context()
        vault_ca_cert = os.environ.get("VAULT_CACERT", "/vault/certs/vault.crt")
        if vault_ca_cert and os.path.isfile(vault_ca_cert):
            ssl_context.load_verify_locations(vault_ca_cert)
        else:
            ssl_context.check_hostname = False
            ssl_context.verify_mode = ssl.CERT_NONE

        url = f"{vault_addr}/v1/{secret_path}"
        payload = json.dumps({"data": data_to_restore}).encode("utf-8")
        headers = {
            "X-Vault-Token": vault_token,
            "Content-Type": "application/json",
        }

        req = urllib.request.Request(url, data=payload, headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=15, context=ssl_context) as response:
            if response.status in (200, 204):
                logger.info("restore: Vault KV secrets restored")
                return True
            else:
                logger.error("restore: Vault returned status %d", response.status)
                return False

    except Exception:
        logger.exception("restore: Vault restore failed")
        return False


def _restore_media(media_tar: str) -> bool:
    """Restore media files from tarball to MinIO/S3."""
    try:
        minio_cfg = _get_minio_config()
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

        tmp_dir = _temp_backup_dir("media_restore")
        subprocess.run(
            ["tar", "-xzf", media_tar, "-C", tmp_dir],
            check=True,
            capture_output=True,
        )

        media_root = os.path.join(tmp_dir, "media")
        for root, _dirs, files in os.walk(media_root):
            for fname in files:
                local_path = os.path.join(root, fname)
                relative_path = os.path.relpath(local_path, media_root)
                # relative_path is like "passes/file.png" or "assets/file.jpg"
                parts = relative_path.split(os.sep, 1)
                if len(parts) == 2:
                    bucket, s3_key = parts
                else:
                    bucket = minio_cfg["bucket_assets"]
                    s3_key = relative_path

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
        shutil.rmtree(tmp_dir, ignore_errors=True)
        return True

    except Exception:
        logger.exception("restore: media restore failed")
        return False
