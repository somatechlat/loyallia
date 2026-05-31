"""
Loyallia Backup Celery Tasks (apps/backup/tasks)

Thin Celery task wrappers around the backup service layer.
All business logic lives in apps.backup.services.

Flow:
    1. run_full_backup() is the Celery Beat entry point.
    2. It spawns parallel tasks via group(), then chains verify_backup().
    3. Each component task delegates to its service module.

Called by: Celery Beat scheduler, SuperAdmin API (manual backup).
"""

import logging

from celery import chain, group, shared_task
from django.utils import timezone

from apps.backup.services.cleanup import cleanup_old_backups
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

_MAX_RETRIES = 3
_RETRY_DELAY = 120
_BACKUP_QUEUE = "default"
_BACKUP_TIMEOUT = 1800


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
    """Orchestrate a complete platform backup."""
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
        task_signatures = [
            backup_postgresql_task.s(job_id),
            backup_redis_task.s(job_id),
        ]
        if config["include_vault"]:
            task_signatures.append(backup_vault_task.s(job_id))
        if config["include_media"]:
            task_signatures.append(backup_media_task.s(job_id))

        job_group = group(task_signatures)
        verify_chain = chain(job_group, verify_backup_task.s(job_id))
        result = verify_chain.apply_async()

        logger.info(
            "run_full_backup: job %s chained, verify task id=%s", job_id, result.id
        )
        return {"success": True, "job_id": job_id, "celery_chain_id": result.id}

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
    max_retries=_MAX_RETRIES,
    default_retry_delay=_RETRY_DELAY,
    queue=_BACKUP_QUEUE,
    name="apps.backup.tasks.backup_postgresql",
    time_limit=900,
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
    max_retries=_MAX_RETRIES,
    default_retry_delay=_RETRY_DELAY,
    queue=_BACKUP_QUEUE,
    name="apps.backup.tasks.backup_redis",
    time_limit=300,
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
    max_retries=_MAX_RETRIES,
    default_retry_delay=_RETRY_DELAY,
    queue=_BACKUP_QUEUE,
    name="apps.backup.tasks.backup_vault",
    time_limit=300,
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
    max_retries=_MAX_RETRIES,
    default_retry_delay=_RETRY_DELAY,
    queue=_BACKUP_QUEUE,
    name="apps.backup.tasks.backup_media",
    time_limit=1800,
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
    max_retries=1,
    default_retry_delay=60,
    queue=_BACKUP_QUEUE,
    name="apps.backup.tasks.verify_backup",
    time_limit=600,
)
def verify_backup(self, component_results: list, job_id: str) -> dict:
    """Celery wrapper for backup verification service."""
    try:
        return verify_backup_svc(component_results, job_id)
    except Exception as exc:
        logger.exception("verify_backup failed for job %s", job_id)
        raise self.retry(exc=exc)


@shared_task(
    bind=True,
    max_retries=2,
    default_retry_delay=60,
    queue=_BACKUP_QUEUE,
    name="apps.backup.tasks.cleanup_old_backups",
    time_limit=600,
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
    max_retries=1,
    default_retry_delay=300,
    queue=_BACKUP_QUEUE,
    name="apps.backup.tasks.restore_from_backup_task",
    time_limit=3600,
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
