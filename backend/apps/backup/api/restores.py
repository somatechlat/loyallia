"""
Restore operation endpoints: shell restore, options, status.
"""

from typing import Any, cast

from django.http import HttpRequest
from ninja.errors import HttpError

from apps.audit.models import AuditAction
from apps.backup.models import BackupJob
from apps.backup.schemas import (
    BackupActionOut,
    RestoreOptionsOut,
    RestoreShellIn,
    RestoreStatusOut,
)
from apps.backup.tasks import run_restore_task
from common.messages import get_message
from common.permissions import jwt_auth, require_role

from .core import _audit, logger, router


@router.post(
    "/restore/",
    auth=jwt_auth,
    response=BackupActionOut,
    summary="Restore from local or offsite backup",
)
@require_role("SUPER_ADMIN")
def restore_shell(request: HttpRequest, payload: RestoreShellIn):
    """Restore a component from local or offsite backups."""
    if not payload.confirm:
        return BackupActionOut(
            success=False,
            message=get_message("BACKUP_RESTORE_CONFIRM_REQUIRED"),
        )

    from apps.backup.services.restore import validate_restore_request

    valid, error = validate_restore_request(payload.dict())
    if not valid:
        raise HttpError(400, error)

    try:
        result = cast(Any, run_restore_task).delay(
            component=payload.component,
            source=payload.source,
            date=payload.date,
        )

        _audit(
            request,
            AuditAction.RESTORE,
            resource_type="backup_restore",
            resource_id=str(result.id) if result.id else "",
            details={
                "component": payload.component,
                "source": payload.source,
                "date": payload.date,
                "celery_task_id": result.id,
            },
        )

        return BackupActionOut(
            success=True,
            message=get_message("BACKUP_RESTORE_STARTED"),
            job_id=str(result.id) if result.id else None,
        )

    except Exception as exc:
        logger.exception("restore_shell failed")
        _audit(
            request,
            AuditAction.RESTORE,
            resource_type="backup_restore",
            details={"error": str(exc)},
            status="error",
        )
        return BackupActionOut(
            success=False,
            message=get_message("BACKUP_RESTORE_FAILED", detail=str(exc)),
        )


@router.get(
    "/restore/options/",
    auth=jwt_auth,
    response=RestoreOptionsOut,
    summary="List available restore options",
)
@require_role("SUPER_ADMIN")
def get_restore_options_endpoint(request: HttpRequest):
    """Return local and offsite backup options grouped by date and component."""
    from apps.backup.services.config import get_restore_options

    options = get_restore_options()

    _audit(
        request,
        AuditAction.READ,
        resource_type="backup_restore_options",
    )

    return RestoreOptionsOut(
        local=options.get("local", []),
        offsite=options.get("offsite", []),
    )


@router.get(
    "/restore/status/",
    auth=jwt_auth,
    response=RestoreStatusOut,
    summary="Current restore job status",
)
@require_role("SUPER_ADMIN")
def get_restore_status(request: HttpRequest):
    """Return the status of the most recent restore job."""
    job = BackupJob.objects.filter(backup_type="restore").order_by("-created_at").first()

    if not job:
        return RestoreStatusOut(status="no_restore_jobs")

    _audit(
        request,
        AuditAction.READ,
        resource_type="backup_restore_status",
        resource_id=str(job.id),
        details={"status": job.status},
    )

    return RestoreStatusOut(
        status=job.status,
        started_at=job.started_at.isoformat() if job.started_at else None,
        completed_at=job.completed_at.isoformat() if job.completed_at else None,
        error_message=job.error_message,
    )
