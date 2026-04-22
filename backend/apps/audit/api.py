"""
Loyallia — Audit API Endpoints (REQ-DPR-003)
Super Admin audit dashboard using Django Ninja with typed schemas.
Self-auditing: viewing the audit log creates an audit entry.
"""

import logging
from datetime import timedelta

from django.db.models import Count
from django.http import HttpRequest
from django.shortcuts import get_object_or_404
from django.utils import timezone
from ninja import Query, Router

from apps.audit.models import AuditAction, AuditLog
from apps.audit.schemas import (
    AuditEntryDetailSchema,
    AuditEntrySchema,
    AuditListResponseSchema,
    AuditStatsSchema,
)
from apps.audit.service import log_action
from common.permissions import jwt_auth, require_role

logger = logging.getLogger("loyallia.audit")

router = Router()


@router.get(
    "/",
    auth=jwt_auth,
    response=AuditListResponseSchema,
    summary="Listar registros de auditoría",
)
@require_role("SUPER_ADMIN")
def list_audit_logs(
    request: HttpRequest,
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    action: str = "",
    resource_type: str = "",
    actor_email: str = "",
    tenant_id: str = "",
    status: str = "",
    date_from: str = "",
    date_to: str = "",
):
    """Paginated audit log with filters. Self-auditing."""
    qs = AuditLog.objects.all()

    if action:
        qs = qs.filter(action=action)
    if resource_type:
        qs = qs.filter(resource_type=resource_type)
    if actor_email:
        qs = qs.filter(actor_email__icontains=actor_email)
    if tenant_id:
        qs = qs.filter(tenant_id=tenant_id)
    if status:
        qs = qs.filter(status=status)
    if date_from:
        qs = qs.filter(created_at__gte=date_from)
    if date_to:
        qs = qs.filter(created_at__lte=date_to)

    total = qs.count()
    entries = list(qs[offset : offset + limit])

    # Self-audit
    log_action(
        request=request,
        action=AuditAction.READ,
        resource_type="audit_log",
        details={"filters_applied": bool(action or resource_type or actor_email)},
    )

    return AuditListResponseSchema(
        total=total,
        count=len(entries),
        entries=[
            AuditEntrySchema(
                id=str(e.id),
                actor_email=e.actor_email,
                actor_role=e.actor_role,
                action=e.action,
                resource_type=e.resource_type,
                resource_id=e.resource_id,
                tenant_id=str(e.tenant_id) if e.tenant_id else None,
                ip_address=e.ip_address,
                justification=e.justification,
                status=e.status,
                details=e.details,
                created_at=e.created_at.isoformat(),
            )
            for e in entries
        ],
    )


@router.get(
    "/stats/",
    auth=jwt_auth,
    response=AuditStatsSchema,
    summary="Estadísticas de auditoría",
)
@require_role("SUPER_ADMIN")
def audit_stats(request: HttpRequest):
    """Aggregated audit statistics for the dashboard."""
    now = timezone.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    total = AuditLog.objects.count()
    today = AuditLog.objects.filter(created_at__gte=today_start).count()

    actions_breakdown = list(
        AuditLog.objects.values("action")
        .annotate(count=Count("id"))
        .order_by("-count")
    )

    thirty_days_ago = now - timedelta(days=30)
    top_actors = list(
        AuditLog.objects.filter(created_at__gte=thirty_days_ago)
        .values("actor_email")
        .annotate(count=Count("id"))
        .order_by("-count")[:10]
    )

    return AuditStatsSchema(
        total_entries=total,
        today_entries=today,
        actions=actions_breakdown,
        top_actors=top_actors,
    )


@router.get(
    "/{entry_id}/",
    auth=jwt_auth,
    response=AuditEntryDetailSchema,
    summary="Detalle de entrada de auditoría",
)
@require_role("SUPER_ADMIN")
def get_audit_entry(request: HttpRequest, entry_id: str):
    """Get a single audit entry with full details."""
    entry = get_object_or_404(AuditLog, id=entry_id)

    return AuditEntryDetailSchema(
        id=str(entry.id),
        actor_id=str(entry.actor_id),
        actor_email=entry.actor_email,
        actor_role=entry.actor_role,
        action=entry.action,
        resource_type=entry.resource_type,
        resource_id=entry.resource_id,
        tenant_id=str(entry.tenant_id) if entry.tenant_id else None,
        ip_address=entry.ip_address,
        user_agent=entry.user_agent,
        justification=entry.justification,
        details=entry.details,
        status=entry.status,
        created_at=entry.created_at.isoformat(),
    )
