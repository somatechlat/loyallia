"""
Loyallia — Audit Service (REQ-DPR-002)
Functions for writing audit log entries.
All entries are immutable and comply with LOPDP/GDPR.
"""

import logging

from django.http import HttpRequest

from apps.audit.models import AuditAction, AuditLog, AuditStatus

logger = logging.getLogger("loyallia.audit")


def _get_client_ip(request: HttpRequest) -> str:
    """Extract client IP from request headers."""
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "")


def log_action(
    request: HttpRequest,
    action: str,
    resource_type: str,
    resource_id: str = "",
    tenant_id=None,
    details: dict | None = None,
    justification: str = "",
    status: str = AuditStatus.SUCCESS,
) -> AuditLog:
    """
    Write an immutable audit log entry.
    Called from API endpoints and middleware.
    """
    user = getattr(request, "user", None)
    actor_id = str(user.id) if user and hasattr(user, "id") else "anonymous"
    actor_email = getattr(user, "email", "anonymous")
    actor_role = getattr(user, "role", "unknown")

    # Resolve tenant_id
    if tenant_id is None:
        tenant = getattr(request, "tenant", None)
        if tenant:
            tenant_id = tenant.id

    entry = AuditLog.objects.create(
        actor_id=actor_id,
        actor_email=actor_email,
        actor_role=actor_role,
        action=action,
        resource_type=resource_type,
        resource_id=str(resource_id),
        tenant_id=tenant_id,
        ip_address=_get_client_ip(request),
        user_agent=request.META.get("HTTP_USER_AGENT", "")[:500],
        justification=justification,
        details=details or {},
        status=status,
    )

    logger.info(
        "AUDIT: %s %s %s %s [%s]",
        actor_email,
        action,
        resource_type,
        resource_id,
        status,
    )
    return entry


def log_data_export(
    request: HttpRequest,
    resource_type: str,
    record_count: int,
    tenant_id=None,
) -> AuditLog:
    """Special logging for data exports (CSV, reports)."""
    return log_action(
        request=request,
        action=AuditAction.EXPORT,
        resource_type=resource_type,
        details={"record_count": record_count, "format": "csv"},
        tenant_id=tenant_id,
    )


def log_impersonation(
    request: HttpRequest,
    target_tenant,
    justification: str,
) -> AuditLog:
    """
    Required justification for impersonation events.
    Raises ValueError if justification is empty.
    """
    if not justification or len(justification.strip()) < 10:
        raise ValueError(
            "Impersonation requires a justification of at least 10 characters."
        )

    return log_action(
        request=request,
        action=AuditAction.IMPERSONATE,
        resource_type="tenant",
        resource_id=str(target_tenant.id),
        tenant_id=target_tenant.id,
        justification=justification,
        details={
            "tenant_name": target_tenant.name,
            "tenant_slug": target_tenant.slug,
        },
    )
