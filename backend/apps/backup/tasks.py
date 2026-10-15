"""
Loyallia Backup Celery Tasks (apps/backup/tasks)

Thin Celery task wrappers around the backup service layer.
All business logic lives in apps.backup.services.

Flow:
    1. run_full_backup() is the Celery Beat entry point.
    2. It orchestrates the Python backup services (postgres/redis/vault/media).
    3. Verification is a separate step via verify_backup().

Called by: Celery Beat scheduler, SuperAdmin API (manual backup).
"""

import logging
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


def _run_component_backups(config: dict, job_id: str) -> list[dict]:
    """Run each configured component backup via the Python service layer."""
    from apps.backup.services.media import backup_media as backup_media_svc
    from apps.backup.services.postgres import backup_postgresql as backup_postgresql_svc
    from apps.backup.services.redis import backup_redis as backup_redis_svc
    from apps.backup.services.vault import backup_vault as backup_vault_svc

    results: list[dict] = [backup_postgresql_svc(job_id, config["compression_enabled"])]
    results.append(backup_redis_svc(job_id))
    if config.get("include_vault"):
        results.append(backup_vault_svc(job_id))
    if config.get("include_media"):
        results.append(backup_media_svc(job_id))
    return results


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
    """Orchestrate a complete platform backup via the Python service layer."""
    from apps.backup.models import BackupJobStatus
    from apps.backup.services.verification import (
        pack_and_upload_archive,
    )

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
        component_results = _run_component_backups(config, job_id)
        failed = [r for r in component_results if isinstance(r, dict) and not r.get("success", True)]
        success = not failed

        archive_key = ""
        if success:
            archive_key = pack_and_upload_archive(component_results, job_id)

        update_job(
            job_id,
            status=(
                BackupJobStatus.COMPLETED.value
                if success
                else BackupJobStatus.FAILED.value
            ),
            error_message=(
                scrub_error(str(failed[0].get("error", "component backup failed")))
                if failed
                else ""
            ),
            completed_at=timezone.now(),
        )

        if success:
            cast(Any, verify_backup).delay(component_results, job_id)

        return {
            "success": success,
            "job_id": job_id,
            "components": component_results,
            "archive_key": archive_key,
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
    """Run a selective component backup via the Python service layer."""
    from apps.backup.models import BackupJobStatus
    from apps.backup.services.media import backup_media as backup_media_svc
    from apps.backup.services.postgres import backup_postgresql as backup_postgresql_svc
    from apps.backup.services.redis import backup_redis as backup_redis_svc
    from apps.backup.services.vault import backup_vault as backup_vault_svc

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
        runners = {
            "postgres": lambda: backup_postgresql_svc(
                job_id, config["compression_enabled"]
            ),
            "redis": lambda: backup_redis_svc(job_id),
            "vault": lambda: backup_vault_svc(job_id),
            "media": lambda: backup_media_svc(job_id),
        }
        runner = runners.get(component)
        if runner is None:
            raise ValueError(f"Unknown backup component: {component}")

        result = runner()
        success = bool(result.get("success", False)) if isinstance(result, dict) else True

        update_job(
            job_id,
            status=(
                BackupJobStatus.COMPLETED.value
                if success
                else BackupJobStatus.FAILED.value
            ),
            error_message=(
                scrub_error(str(result.get("error", "component backup failed")))
                if not success
                else ""
            ),
            completed_at=timezone.now(),
        )

        return {
            "success": success,
            "job_id": job_id,
            "component": component,
            "result": result,
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
    """List restore options from the Python backup services."""
    try:
        from apps.backup.services.config import get_restore_options

        options = get_restore_options()
        return {
            "success": True,
            "local": options.get("local", []),
            "offsite": options.get("offsite", []),
        }

    except Exception as exc:
        logger.exception("list_restore_options_task failed")
        raise self.retry(exc=exc)
