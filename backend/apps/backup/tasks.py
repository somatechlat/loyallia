"""
Loyallia Backup Celery Tasks (apps/backup/tasks)

Thin Celery task wrappers around the backup service layer.
All business logic lives in apps.backup.services.

Flow:
    1. run_full_backup() is the Celery Beat entry point.
    2. It delegates to the unified backup CLI.
    3. Verification is a separate step via verify_backup().

Called by: Celery Beat scheduler, SuperAdmin API (manual backup).
"""

import logging
import subprocess
from pathlib import Path
from typing import Any, cast

from celery import shared_task
from django.conf import settings
from django.utils import timezone

from apps.backup.services.cleanup import cleanup_old_backups as cleanup_old_backups_svc
from apps.backup.services.config import (
    create_job_record,
    get_backup_settings,
    notify_backup_failure,
    scrub_error,
    update_job,
)
from apps.backup.services.media import backup_media as backup_media_svc
from apps.backup.services.postgres import backup_postgresql as backup_postgresql_svc
from apps.backup.services.redis import backup_redis as backup_redis_svc
from apps.backup.services.restore import restore_from_backup
from apps.backup.services.vault import backup_vault as backup_vault_svc
from apps.backup.services.verification import verify_backup as verify_backup_svc

logger = logging.getLogger(__name__)

_RETRY_DELAY = 120
_BACKUP_QUEUE = "default"


def _project_root() -> Path:
    return Path(settings.BASE_DIR).parent


def _backup_script() -> Path:
    return _project_root() / "deploy" / "backups" / "backup"


def _restore_script() -> Path:
    return _project_root() / "deploy" / "backups" / "restore"


@shared_task(
    bind=True,
    max_retries=settings.CELERY_MAX_RETRIES_DEFAULT,
    default_retry_delay=_RETRY_DELAY,
    queue=_BACKUP_QUEUE,
    name="apps.backup.tasks.run_full_backup",
    time_limit=settings.CELERY_TIME_LIMIT_BACKUP_LONG,
    soft_time_limit=settings.CELERY_TIME_LIMIT_BACKUP_LONG - 60,
)
def run_full_backup(self, tenant_id: str = "", manual: bool = False) -> dict:
    """Orchestrate a complete platform backup via unified CLI."""
    from apps.backup.models import BackupJobStatus

    config = get_backup_settings()
    backup_type = "manual" if manual else "full"

    job_id = create_job_record(
        backup_type=backup_type,
        tenant_id=tenant_id or None,
        include_media=config["include_media"],
        include_vault=config["include_vault"],
        encryption_enabled=config["encryption_enabled"],
        compression_enabled=config["compression_enabled"],
    )

    logger.info("run_full_backup: starting job %s (type=%s)", job_id, backup_type)
    update_job(job_id, status=BackupJobStatus.RUNNING.value, started_at=timezone.now())

    try:
        script = _backup_script()
        result = subprocess.run(
            [str(script), "--full", "--offsite"],
            capture_output=True,
            text=True,
            cwd=str(_project_root()),
            timeout=settings.CELERY_TIME_LIMIT_BACKUP_LONG,
        )
        success = result.returncode == 0

        update_job(
            job_id,
            status=(
                BackupJobStatus.COMPLETED.value
                if success
                else BackupJobStatus.FAILED.value
            ),
            error_message=scrub_error(result.stderr) if not success else "",
            completed_at=timezone.now(),
        )

        if success:
            cast(Any, verify_backup).delay([], job_id)

        return {
            "success": success,
            "job_id": job_id,
            "stdout": result.stdout,
            "stderr": result.stderr,
        }

    except Exception as exc:
        scrubbed = scrub_error(str(exc))
        logger.exception("run_full_backup failed for job %s", job_id)
        update_job(
            job_id,
            status=BackupJobStatus.FAILED.value,
            error_message=scrubbed,
            completed_at=timezone.now(),
        )
        notify_backup_failure(job_id, scrubbed)
        raise self.retry(exc=exc)


@shared_task(
    bind=True,
    max_retries=settings.CELERY_MAX_RETRIES_DEFAULT,
    default_retry_delay=_RETRY_DELAY,
    queue=_BACKUP_QUEUE,
    name="apps.backup.tasks.run_selective_backup_task",
    time_limit=settings.CELERY_TIME_LIMIT_BACKUP_STANDARD,
    soft_time_limit=settings.CELERY_SOFT_TIME_LIMIT_BACKUP_STANDARD,
)
def run_selective_backup_task(
    self, component: str, tenant_id: str = "", manual: bool = False
) -> dict:
    """Run a selective component backup via unified CLI."""
    from apps.backup.models import BackupJobStatus

    config = get_backup_settings()
    backup_type = f"manual_{component}" if manual else component

    job_id = create_job_record(
        backup_type=backup_type,
        tenant_id=tenant_id or None,
        include_media=config["include_media"],
        include_vault=config["include_vault"],
        encryption_enabled=config["encryption_enabled"],
        compression_enabled=config["compression_enabled"],
    )

    logger.info(
        "run_selective_backup_task: starting job %s (component=%s)", job_id, component
    )
    update_job(job_id, status=BackupJobStatus.RUNNING.value, started_at=timezone.now())

    try:
        script = _backup_script()
        result = subprocess.run(
            [str(script), f"--{component}", "--offsite"],
            capture_output=True,
            text=True,
            cwd=str(_project_root()),
            timeout=settings.HTTP_TIMEOUT_BACKUP_CLI,
        )
        success = result.returncode == 0

        update_job(
            job_id,
            status=(
                BackupJobStatus.COMPLETED.value
                if success
                else BackupJobStatus.FAILED.value
            ),
            error_message=scrub_error(result.stderr) if not success else "",
            completed_at=timezone.now(),
        )

        return {
            "success": success,
            "job_id": job_id,
            "stdout": result.stdout,
            "stderr": result.stderr,
        }

    except Exception as exc:
        scrubbed = scrub_error(str(exc))
        logger.exception("run_selective_backup_task failed for job %s", job_id)
        update_job(
            job_id,
            status=BackupJobStatus.FAILED.value,
            error_message=scrubbed,
            completed_at=timezone.now(),
        )
        notify_backup_failure(job_id, scrubbed)
        raise self.retry(exc=exc)


@shared_task(
    bind=True,
    max_retries=settings.CELERY_MAX_RETRIES_DEFAULT,
    default_retry_delay=_RETRY_DELAY,
    queue=_BACKUP_QUEUE,
    name="apps.backup.tasks.backup_postgresql",
    time_limit=settings.CELERY_TIME_LIMIT_BACKUP_STANDARD,
)
def backup_postgresql(self, job_id: str) -> dict:
    """Celery wrapper for PostgreSQL backup service."""
    try:
        return backup_postgresql_svc(job_id)
    except Exception as exc:
        logger.exception("backup_postgresql failed for job %s", job_id)
        raise self.retry(exc=exc)


@shared_task(
    bind=True,
    max_retries=settings.CELERY_MAX_RETRIES_DEFAULT,
    default_retry_delay=_RETRY_DELAY,
    queue=_BACKUP_QUEUE,
    name="apps.backup.tasks.backup_redis",
    time_limit=settings.CELERY_TIME_LIMIT_BACKUP_SHORT,
)
def backup_redis(self, job_id: str) -> dict:
    """Celery wrapper for Redis backup service."""
    try:
        return backup_redis_svc(job_id)
    except Exception as exc:
        logger.exception("backup_redis failed for job %s", job_id)
        raise self.retry(exc=exc)


@shared_task(
    bind=True,
    max_retries=settings.CELERY_MAX_RETRIES_DEFAULT,
    default_retry_delay=_RETRY_DELAY,
    queue=_BACKUP_QUEUE,
    name="apps.backup.tasks.backup_vault",
    time_limit=settings.CELERY_TIME_LIMIT_BACKUP_SHORT,
)
def backup_vault(self, job_id: str) -> dict:
    """Celery wrapper for Vault backup service."""
    try:
        return backup_vault_svc(job_id)
    except Exception as exc:
        logger.exception("backup_vault failed for job %s", job_id)
        raise self.retry(exc=exc)


@shared_task(
    bind=True,
    max_retries=settings.CELERY_MAX_RETRIES_DEFAULT,
    default_retry_delay=_RETRY_DELAY,
    queue=_BACKUP_QUEUE,
    name="apps.backup.tasks.backup_media",
    time_limit=settings.CELERY_TIME_LIMIT_BACKUP_LONG,
)
def backup_media(self, job_id: str) -> dict:
    """Celery wrapper for Media backup service."""
    try:
        return backup_media_svc(job_id)
    except Exception as exc:
        logger.exception("backup_media failed for job %s", job_id)
        raise self.retry(exc=exc)


@shared_task(
    bind=True,
    max_retries=settings.CELERY_MAX_RETRIES_MINIMAL,
    default_retry_delay=settings.CELERY_DEFAULT_RETRY_DELAY_MEDIUM,
    queue=_BACKUP_QUEUE,
    name="apps.backup.tasks.verify_backup",
    time_limit=settings.CELERY_TIME_LIMIT_BACKUP_MEDIUM,
)
def verify_backup(self, component_results: list, job_id: str) -> dict:
    """Celery wrapper for backup verification service.

    Delegates to the unified backup CLI (--verify).
    """
    try:
        return verify_backup_svc(component_results, job_id)
    except Exception as exc:
        logger.exception("verify_backup failed for job %s", job_id)
        raise self.retry(exc=exc)


@shared_task(
    bind=True,
    max_retries=settings.CELERY_MAX_RETRIES_LOW,
    default_retry_delay=settings.CELERY_DEFAULT_RETRY_DELAY_MEDIUM,
    queue=_BACKUP_QUEUE,
    name="apps.backup.tasks.cleanup_old_backups",
    time_limit=settings.CELERY_TIME_LIMIT_BACKUP_MEDIUM,
)
def cleanup_old_backups(self) -> dict:
    """Celery wrapper for backup cleanup service."""
    try:
        return cleanup_old_backups_svc()
    except Exception as exc:
        logger.exception("cleanup_old_backups failed")
        raise self.retry(exc=exc)


@shared_task(
    bind=True,
    max_retries=settings.CELERY_MAX_RETRIES_MINIMAL,
    default_retry_delay=settings.CELERY_DEFAULT_RETRY_DELAY_EXTRA_LONG,
    queue=_BACKUP_QUEUE,
    name="apps.backup.tasks.restore_from_backup_task",
    time_limit=settings.CELERY_TIME_LIMIT_BACKUP_RESTORE,
)
def restore_from_backup_task(
    self, backup_id: str, s3_key: str, target_tenant_id: str = ""
) -> dict:
    """Celery wrapper for restore service.

    WARNING: Destructive operation. Only SUPER_ADMIN can trigger.
    """
    try:
        return restore_from_backup(backup_id, s3_key, target_tenant_id)
    except Exception as exc:
        logger.exception("restore_from_backup_task failed for backup %s", backup_id)
        raise self.retry(exc=exc)


@shared_task(
    bind=True,
    max_retries=settings.CELERY_MAX_RETRIES_MINIMAL,
    default_retry_delay=settings.CELERY_DEFAULT_RETRY_DELAY_MEDIUM,
    queue=_BACKUP_QUEUE,
    name="apps.backup.tasks.run_restore_task",
    time_limit=settings.CELERY_TIME_LIMIT_BACKUP_RESTORE,
)
def run_restore_task(self, component: str, source: str, date: str) -> dict:
    """Celery wrapper for unified restore CLI.

    WARNING: Destructive operation. Only SUPER_ADMIN can trigger.
    """
    from apps.backup.models import BackupJobStatus
    from apps.backup.services.restore import execute_restore

    job_id = create_job_record(backup_type="restore")
    logger.warning(
        "run_restore_task: starting restore job %s (component=%s source=%s date=%s)",
        job_id,
        component,
        source,
        date,
    )
    update_job(job_id, status=BackupJobStatus.RUNNING.value, started_at=timezone.now())

    try:
        result = execute_restore(component, source, date)
        success = result.get("success", False)

        update_job(
            job_id,
            status=(
                BackupJobStatus.COMPLETED.value
                if success
                else BackupJobStatus.FAILED.value
            ),
            error_message=result.get("stderr", "") if not success else "",
            completed_at=timezone.now(),
        )

        return {**result, "job_id": job_id}

    except Exception as exc:
        scrubbed = scrub_error(str(exc))
        logger.exception("run_restore_task failed for job %s", job_id)
        update_job(
            job_id,
            status=BackupJobStatus.FAILED.value,
            error_message=scrubbed,
            completed_at=timezone.now(),
        )
        raise self.retry(exc=exc)


@shared_task(
    bind=True,
    max_retries=settings.CELERY_MAX_RETRIES_MINIMAL,
    default_retry_delay=settings.CELERY_DEFAULT_RETRY_DELAY_SHORT,
    queue=_BACKUP_QUEUE,
    name="apps.backup.tasks.list_restore_options_task",
    time_limit=settings.CELERY_TIME_LIMIT_BACKUP_SHORT,
)
def list_restore_options_task(self) -> dict:
    """Celery wrapper that calls the unified restore CLI with --list."""
    try:
        script = _restore_script()
        result = subprocess.run(
            [str(script), "--list"],
            capture_output=True,
            text=True,
            cwd=str(_project_root()),
            timeout=settings.HTTP_TIMEOUT_BACKUP_CLI_SHORT,
        )

        stdout = result.stdout
        local: list[str] = []
        offsite: list[str] = []
        current_section: str | None = None

        for line in stdout.splitlines():
            stripped = line.strip()
            if "Local backups" in stripped:
                current_section = "local"
                continue
            if "Offsite backups" in stripped:
                current_section = "offsite"
                continue
            if stripped and current_section == "local" and stripped.startswith("/"):
                local.append(stripped)
            elif stripped and current_section == "offsite" and "/" in stripped:
                offsite.append(stripped)

        return {
            "success": result.returncode == 0,
            "local": local,
            "offsite": offsite,
            "raw": stdout,
            "stderr": result.stderr,
        }

    except Exception as exc:
        logger.exception("list_restore_options_task failed")
        raise self.retry(exc=exc)
