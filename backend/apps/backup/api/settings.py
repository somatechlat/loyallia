"""
Backup settings endpoints: read and update configuration.
"""

from django.conf import settings
from django.http import HttpRequest
from ninja.errors import HttpError

from apps.audit.models import AuditAction
from apps.backup.schemas import BackupSettingsOut
from apps.tenants.models import PlatformSetting
from common.messages import get_message
from common.permissions import jwt_auth, require_role

from .core import _audit, router


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
        backup_encryption_enabled=PlatformSetting.get_bool("backup_encryption_enabled", True),
        backup_compression_enabled=PlatformSetting.get_bool("backup_compression_enabled", True),
        backup_include_media=PlatformSetting.get_bool("backup_include_media", True),
        backup_include_vault=PlatformSetting.get_bool("backup_include_vault", True),
        backup_hour=hour,
        backup_minute=minute,
    )


@router.put(
    "/settings/",
    auth=jwt_auth,
    response=BackupSettingsOut,
    summary="Update backup settings",
)
@require_role("SUPER_ADMIN")
def update_backup_settings(request: HttpRequest, payload: BackupSettingsOut):
    """Update backup configuration in PlatformSetting."""
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
        "backup_encryption_enabled": ("true" if payload.backup_encryption_enabled else "false"),
        "backup_compression_enabled": ("true" if payload.backup_compression_enabled else "false"),
        "backup_include_media": ("true" if payload.backup_include_media else "false"),
        "backup_include_vault": ("true" if payload.backup_include_vault else "false"),
        "backup_hour": str(payload.backup_hour),
        "backup_minute": str(payload.backup_minute),
    }

    for key, value in settings_map.items():
        PlatformSetting.objects.update_or_create(
            key=key,
            defaults={"value": value, "category": "backup"},
        )

    _audit(
        request,
        AuditAction.UPDATE,
        resource_type="backup_settings",
        details={"updated_keys": list(settings_map.keys())},
    )

    from django.core.cache import cache

    cache.set("backup_settings_updated", "1", timeout=settings.CACHE_TTL_BACKUP_SETTINGS)

    return payload
