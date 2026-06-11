"""
Offsite backup endpoints: list backups on MinIO.
"""

from django.http import HttpRequest
from ninja.errors import HttpError

from apps.audit.models import AuditAction
from apps.backup.schemas import OffsiteBackupListOut
from apps.backup.services.offsite import (
    list_offsite_backups as list_offsite_backups_service,
)
from common.permissions import jwt_auth, require_role

from .core import _audit, logger, router


@router.get(
    "/offsite/",
    auth=jwt_auth,
    response=OffsiteBackupListOut,
    summary="List offsite backups on MinIO",
)
@require_role("SUPER_ADMIN")
def list_offsite_backups(request: HttpRequest):
    """List offsite backups using the MinIO client wrapper script."""
    try:
        backups = list_offsite_backups_service()
    except RuntimeError as exc:
        logger.exception("list_offsite_backups failed")
        raise HttpError(500, str(exc)) from exc

    _audit(
        request,
        AuditAction.READ,
        resource_type="backup_offsite",
        details={"count": len(backups)},
    )

    return OffsiteBackupListOut(backups=backups)
