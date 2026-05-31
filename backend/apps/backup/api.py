"""
Loyallia Backup SuperAdmin API (apps/backup/api.py)

Django Ninja router for backup management.
All endpoints require SUPER_ADMIN role.

Endpoints:
    GET    /api/v1/superadmin/backups/          -- List backup history (paginated)
    GET    /api/v1/superadmin/backups/status/   -- Latest backup status summary
    POST   /api/v1/superadmin/backups/trigger/  -- Trigger a manual backup
    GET    /api/v1/superadmin/backups/{id}/     -- Get a single backup job detail
    POST   /api/v1/superadmin/backups/{id}/verify/   -- Verify a backup
    POST   /api/v1/superadmin/backups/{id}/restore/  -- Restore from backup
    GET    /api/v1/superadmin/backups/settings/      -- Read backup settings
    PUT    /api/v1/superadmin/backups/settings/      -- Update backup settings

Security (SEC):
Called by: SuperAdmin dashboard (Backup & Restore page).
"""

import logging

from django.http import HttpRequest
from django.shortcuts import get_object_or_404
from ninja import Router
from ninja.errors import HttpError

from apps.audit.models import AuditAction
from apps.audit.service import log_action
from apps.backup.models import BackupJob, BackupJobStatus
from apps.backup.schemas import (
    BackupActionOut,
    BackupJobOut,
    BackupListOut,
    BackupSettingsOut,
    BackupStatusOut,
    BackupVerifyOut,
    RestoreFromBackupIn,
    TriggerBackupIn,
)
from apps.backup.tasks import (
    cleanup_old_backups,
    run_full_backup,
    verify_backup,
)
from apps.tenants.models import PlatformSetting
from common.messages import get_message
from common.permissions import jwt_auth, require_role

logger = logging.getLogger("loyallia.backup")

router = Router()

# Helpers


def _job_to_schema(job: BackupJob) -> BackupJobOut:
    """Convert a BackupJob model instance to a response schema."""
    return BackupJobOut(
        id=str(job.id),
        status=job.status,
        backup_type=job.backup_type,
        include_media=job.include_media,
        include_vault=job.include_vault,
        encryption_enabled=job.encryption_enabled,
        compression_enabled=job.compression_enabled,
        started_at=job.started_at.isoformat() if job.started_at else None,
        completed_at=job.completed_at.isoformat() if job.completed_at else None,
        file_size_bytes=job.file_size_bytes,
        human_readable_size=job.human_readable_size,
        file_path=job.file_path,
        s3_key=job.s3_key,
        verification_status=job.verification_status,
        verification_details=job.verification_details,
        error_message=job.error_message,
        retry_count=job.retry_count,
        duration_seconds=job.duration_seconds,
        created_at=job.created_at.isoformat(),
        updated_at=job.updated_at.isoformat(),
    )


def _audit(
    request: HttpRequest,
    action: str,
    resource_type: str = "backup_job",
    resource_id: str = "",
    details: dict | None = None,
    status: str = "success",
) -> None:
    """Log an audit entry for backup operations."""
    log_action(
        request=request,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        details=details or {},
        status=status,
    )


# GET /api/v1/superadmin/backups/


@router.get(
    "/",
    auth=jwt_auth,
    response=BackupListOut,
    summary="List backup history",
)
@require_role("SUPER_ADMIN")
def list_backups(
    request: HttpRequest,
    limit: int = 50,
    offset: int = 0,
    status: str = "",
    backup_type: str = "",
    verification_status: str = "",
):
    """Paginated list of all backup jobs.

    Filters:
        status: pending, running, completed, failed, verified, corrupted
        backup_type: full, incremental, manual
        verification_status: pending, verified, corrupted
    """
    limit = max(1, min(limit, 500))
    offset = max(0, offset)

    qs = BackupJob.objects.all().order_by("-created_at")

    if status:
        qs = qs.filter(status=status)
    if backup_type:
        qs = qs.filter(backup_type=backup_type)
    if verification_status:
        qs = qs.filter(verification_status=verification_status)

    total = qs.count()
    jobs = list(qs[offset : offset + limit])

    _audit(
        request,
        AuditAction.READ,
        resource_type="backup_job",
        details={"filters_applied": True, "count": total},
    )

    return BackupListOut(
        total=total,
        count=len(jobs),
        jobs=[_job_to_schema(j) for j in jobs],
    )


# GET /api/v1/superadmin/backups/status/


@router.get(
    "/status/",
    auth=jwt_auth,
    response=BackupStatusOut,
    summary="Get latest backup status",
)
@require_role("SUPER_ADMIN")
def get_backup_status(request: HttpRequest):
    """Return a summary of backup status including the latest job and counts."""

    total = BackupJob.objects.count()
    completed = BackupJob.objects.filter(status=BackupJobStatus.COMPLETED.value).count()
    failed = BackupJob.objects.filter(status=BackupJobStatus.FAILED.value).count()
    pending = BackupJob.objects.filter(
        status__in=[BackupJobStatus.PENDING.value, BackupJobStatus.RUNNING.value]
    ).count()

    latest = (
        BackupJob.objects.filter(
            status__in=[
                BackupJobStatus.COMPLETED.value,
                BackupJobStatus.VERIFIED.value,
                BackupJobStatus.FAILED.value,
            ]
        )
        .order_by("-created_at")
        .first()
    )

    last_successful = (
        BackupJob.objects.filter(status=BackupJobStatus.VERIFIED.value)
        .order_by("-created_at")
        .first()
    )

    _audit(
        request,
        AuditAction.READ,
        resource_type="backup_status",
        details={"total": total},
    )

    return BackupStatusOut(
        latest_backup=_job_to_schema(latest) if latest else None,
        total_backups=total,
        completed_backups=completed,
        failed_backups=failed,
        pending_backups=pending,
        last_successful_at=(
            last_successful.created_at.isoformat() if last_successful else None
        ),
    )


# POST /api/v1/superadmin/backups/trigger/


@router.post(
    "/trigger/",
    auth=jwt_auth,
    response=BackupActionOut,
    summary="Trigger a manual backup",
)
@require_role("SUPER_ADMIN")
def trigger_manual_backup(request: HttpRequest, payload: TriggerBackupIn):
    """Trigger a manual backup asynchronously.

    Returns immediately with the job ID; use GET /{id}/ to track progress.
    """
    try:
        result = run_full_backup.delay(
            tenant_id="",
            manual=True,
        )

        job_id = result.id
        _audit(
            request,
            AuditAction.CREATE,
            resource_type="backup_job",
            resource_id=str(job_id) if job_id else "",
            details={"backup_type": payload.backup_type, "manual": True},
        )

        return BackupActionOut(
            success=True,
            message=get_message("BACKUP_TRIGGERED"),
            job_id=str(job_id) if job_id else None,
        )

    except Exception as exc:
        logger.exception("trigger_manual_backup failed")
        _audit(
            request,
            AuditAction.CREATE,
            resource_type="backup_job",
            details={"error": str(exc)},
            status="error",
        )
        return BackupActionOut(
            success=False,
            message=get_message("BACKUP_TRIGGER_FAILED", detail=str(exc)),
        )


# GET /api/v1/superadmin/backups/{id}/


@router.get(
    "/{backup_id}/",
    auth=jwt_auth,
    response=BackupJobOut,
    summary="Get backup job detail",
)
@require_role("SUPER_ADMIN")
def get_backup_detail(request: HttpRequest, backup_id: str):
    """Get a single backup job by its UUID."""
    job = get_object_or_404(BackupJob, id=backup_id)

    _audit(
        request,
        AuditAction.READ,
        resource_type="backup_job",
        resource_id=str(job.id),
        details={"status": job.status},
    )

    return _job_to_schema(job)


# POST /api/v1/superadmin/backups/{id}/verify/


@router.post(
    "/{backup_id}/verify/",
    auth=jwt_auth,
    response=BackupVerifyOut,
    summary="Verify a backup",
)
@require_role("SUPER_ADMIN")
def verify_backup_endpoint(request: HttpRequest, backup_id: str):
    """Run verification on an existing backup job.

    Re-reads the backup files from S3 and re-verifies integrity.
    """
    job = get_object_or_404(BackupJob, id=backup_id)

    # Only completed backups can be verified
    if job.status not in (
        BackupJobStatus.COMPLETED.value,
        BackupJobStatus.VERIFIED.value,
        BackupJobStatus.CORRUPTED.value,
    ):
        raise HttpError(
            400,
            get_message("BACKUP_VERIFY_INVALID_STATE", status=job.status),
        )

    try:
        result = verify_backup.delay([], str(job.id))

        _audit(
            request,
            AuditAction.UPDATE,
            resource_type="backup_job",
            resource_id=str(job.id),
            details={"action": "verify", "celery_task_id": result.id},
        )

        return BackupVerifyOut(
            success=True,
            job_id=str(job.id),
            verification_status="pending",
            details="Verification task queued",
        )

    except Exception as exc:
        logger.exception("verify_backup_endpoint failed for job %s", backup_id)
        return BackupVerifyOut(
            success=False,
            job_id=str(job.id),
            verification_status="error",
            details=str(exc),
        )


# POST /api/v1/superadmin/backups/{id}/restore/


@router.post(
    "/{backup_id}/restore/",
    auth=jwt_auth,
    response=BackupActionOut,
    summary="Restore from backup",
)
@require_role("SUPER_ADMIN")
def restore_from_backup(
    request: HttpRequest,
    backup_id: str,
    payload: RestoreFromBackupIn,
):
    """Restore the platform from a backup.

    WARNING: This is a destructive operation.
    Requires payload.confirm=True to proceed.
    Only SUPER_ADMIN can execute this.

    The restore is executed asynchronously via Celery.
    """
    job = get_object_or_404(BackupJob, id=backup_id)

    if not payload.confirm:
        return BackupActionOut(
            success=False,
            message=get_message("BACKUP_RESTORE_CONFIRM_REQUIRED"),
        )

    # Only verified backups can be restored
    if job.verification_status != "verified":
        return BackupActionOut(
            success=False,
            message=get_message("BACKUP_RESTORE_NOT_VERIFIED"),
        )

    try:
        from apps.backup.tasks import restore_from_backup_task

        result = restore_from_backup_task.delay(
            backup_id=str(job.id),
            s3_key=job.s3_key,
            target_tenant_id=payload.target_tenant_id or "",
        )

        _audit(
            request,
            AuditAction.UPDATE,
            resource_type="backup_job",
            resource_id=str(job.id),
            details={"action": "restore", "celery_task_id": result.id},
        )

        return BackupActionOut(
            success=True,
            message=get_message("BACKUP_RESTORE_STARTED"),
            job_id=str(job.id),
        )

    except Exception as exc:
        logger.exception("restore_from_backup failed for job %s", backup_id)
        _audit(
            request,
            AuditAction.UPDATE,
            resource_type="backup_job",
            resource_id=str(job.id),
            details={"action": "restore", "error": str(exc)},
            status="error",
        )
        return BackupActionOut(
            success=False,
            message=get_message("BACKUP_RESTORE_FAILED", detail=str(exc)),
        )


# GET /api/v1/superadmin/backups/settings/


@router.get(
    "/settings/",
    auth=jwt_auth,
    response=BackupSettingsOut,
    summary="Get backup settings",
)
@require_role("SUPER_ADMIN")
def get_backup_settings(request: HttpRequest):
    """Read current backup configuration from PlatformSetting."""
    frequency = PlatformSetting.get("backup_frequency", "daily")
    hour = PlatformSetting.get_int("backup_hour", 3)
    minute = PlatformSetting.get_int("backup_minute", 0)

    _audit(request, AuditAction.READ, resource_type="backup_settings")

    return BackupSettingsOut(
        backup_frequency=frequency,
        backup_retention_days=PlatformSetting.get_int("backup_retention_days", 30),
        backup_encryption_enabled=PlatformSetting.get_bool(
            "backup_encryption_enabled", True
        ),
        backup_compression_enabled=PlatformSetting.get_bool(
            "backup_compression_enabled", True
        ),
        backup_include_media=PlatformSetting.get_bool("backup_include_media", True),
        backup_include_vault=PlatformSetting.get_bool("backup_include_vault", True),
        backup_hour=hour,
        backup_minute=minute,
    )


# PUT /api/v1/superadmin/backups/settings/


@router.put(
    "/settings/",
    auth=jwt_auth,
    response=BackupSettingsOut,
    summary="Update backup settings",
)
@require_role("SUPER_ADMIN")
def update_backup_settings(request: HttpRequest, payload: BackupSettingsOut):
    """Update backup configuration in PlatformSetting.

    Changes take effect immediately for the next scheduled backup.
    """
    valid_frequencies = ("hourly", "daily", "weekly", "disabled")
    if payload.backup_frequency not in valid_frequencies:
        raise HttpError(
            400,
            get_message(
                "VALIDATION_ERROR",
                detail=f"frequency must be one of {valid_frequencies}",
            ),
        )

    settings_map = {
        "backup_frequency": payload.backup_frequency,
        "backup_retention_days": str(payload.backup_retention_days),
        "backup_encryption_enabled": (
            "true" if payload.backup_encryption_enabled else "false"
        ),
        "backup_compression_enabled": (
            "true" if payload.backup_compression_enabled else "false"
        ),
        "backup_include_media": "true" if payload.backup_include_media else "false",
        "backup_include_vault": "true" if payload.backup_include_vault else "false",
        "backup_hour": str(payload.backup_hour),
        "backup_minute": str(payload.backup_minute),
    }

    for key, value in settings_map.items():
        setting, created = PlatformSetting.objects.update_or_create(
            key=key,
            defaults={"value": value, "category": "backup"},
        )

    _audit(
        request,
        AuditAction.UPDATE,
        resource_type="backup_settings",
        details={"updated_keys": list(settings_map.keys())},
    )

    # Signal Celery Beat to refresh the schedule
    from django.core.cache import cache

    cache.set("backup_settings_updated", "1", timeout=60)

    return payload


# POST /api/v1/superadmin/backups/cleanup/


@router.post(
    "/cleanup/",
    auth=jwt_auth,
    response=BackupActionOut,
    summary="Run backup cleanup",
)
@require_role("SUPER_ADMIN")
def run_cleanup(request: HttpRequest):
    """Manually trigger the cleanup of expired backups."""
    try:
        result = cleanup_old_backups.delay()

        _audit(
            request,
            AuditAction.DELETE,
            resource_type="backup_job",
            details={"action": "cleanup", "celery_task_id": result.id},
        )

        return BackupActionOut(
            success=True,
            message=get_message("BACKUP_CLEANUP_STARTED"),
        )

    except Exception as exc:
        logger.exception("run_cleanup failed")
        return BackupActionOut(
            success=False,
            message=get_message("BACKUP_CLEANUP_FAILED", detail=str(exc)),
        )
