"""
Backup job endpoints: list, status, trigger, detail, verify, restore, cleanup.
"""

from typing import Any, cast

from django.http import HttpRequest
from django.shortcuts import get_object_or_404
from ninja.errors import HttpError

from apps.audit.models import AuditAction
from apps.backup.models import BackupJob, BackupJobStatus
from apps.backup.schemas import (
    BackupActionOut,
    BackupJobOut,
    BackupListOut,
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
from common.messages import get_message
from common.permissions import jwt_auth, require_role

from .core import _audit, _job_to_schema, logger, router


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
    """Paginated list of all backup jobs."""
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
        status__in=[
            BackupJobStatus.PENDING.value,
            BackupJobStatus.RUNNING.value,
        ]
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

    last_successful = BackupJob.objects.filter(status=BackupJobStatus.VERIFIED.value).order_by("-created_at").first()

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
        last_successful_at=(last_successful.created_at.isoformat() if last_successful else None),
    )


@router.post(
    "/trigger/",
    auth=jwt_auth,
    response=BackupActionOut,
    summary="Trigger a manual backup",
)
@require_role("SUPER_ADMIN")
def trigger_manual_backup(request: HttpRequest, payload: TriggerBackupIn):
    """Trigger a manual backup asynchronously."""
    try:
        result = cast(Any, run_full_backup).delay(
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


@router.get(
    "/{backup_id}/",
    auth=jwt_auth,
    response=BackupJobOut,
    summary="Get backup job detail",
)
@require_role("SUPER_ADMIN")
def get_backup_detail(request: HttpRequest, backup_id: str):
    """Get a single backup job by its UUID."""
    import uuid as _uuid

    try:
        _uuid.UUID(backup_id)
    except (ValueError, AttributeError):
        from django.http import Http404

        raise Http404("Not found")
    job = get_object_or_404(BackupJob, id=backup_id)

    _audit(
        request,
        AuditAction.READ,
        resource_type="backup_job",
        resource_id=str(job.id),
        details={"status": job.status},
    )

    return _job_to_schema(job)


@router.post(
    "/{backup_id}/verify/",
    auth=jwt_auth,
    response=BackupVerifyOut,
    summary="Verify a backup",
)
@require_role("SUPER_ADMIN")
def verify_backup_endpoint(request: HttpRequest, backup_id: str):
    """Run verification on an existing backup job."""
    import uuid as _uuid

    try:
        _uuid.UUID(backup_id)
    except (ValueError, AttributeError):
        from django.http import Http404

        raise Http404("Not found")
    job = get_object_or_404(BackupJob, id=backup_id)

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
        result = cast(Any, verify_backup).delay([], str(job.id))

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
    """Restore the platform from a backup."""
    import uuid as _uuid

    try:
        _uuid.UUID(backup_id)
    except (ValueError, AttributeError):
        from django.http import Http404

        raise Http404("Not found")
    job = get_object_or_404(BackupJob, id=backup_id)

    if not payload.confirm:
        return BackupActionOut(
            success=False,
            message=get_message("BACKUP_RESTORE_CONFIRM_REQUIRED"),
        )

    if job.verification_status != "verified":
        return BackupActionOut(
            success=False,
            message=get_message("BACKUP_RESTORE_NOT_VERIFIED"),
        )

    try:
        from apps.backup.tasks import restore_from_backup_task

        result = cast(Any, restore_from_backup_task).delay(
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
        result = cast(Any, cleanup_old_backups).delay()

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
