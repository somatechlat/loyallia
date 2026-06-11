"""
Loyallia Backup API Core (apps/backup/api/core.py)

Shared router, helpers, and audit utilities for the backup API.
All endpoints require SUPER_ADMIN role.
"""

import logging

from django.http import HttpRequest
from ninja import Router

from apps.audit.service import log_action
from apps.backup.models import BackupJob
from apps.backup.schemas import BackupJobOut

logger = logging.getLogger("loyallia.backup")

router = Router()


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
