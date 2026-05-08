"""Campaign analytics endpoints (LYL-SRS-006)."""

import csv
import io

from django.db.models import Count
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from ninja.errors import HttpError
from pydantic import BaseModel

from apps.notifications.models import (
    CampaignDeliveryLog,
    CampaignRun,
    DeliveryStatus,
)
from common.messages import get_message
from common.permissions import is_owner, jwt_auth

from .base import router


class CampaignResultsOut(BaseModel):
    campaign_run_id: str
    title: str
    channel: str
    status: str
    segment: str
    total_recipients: int
    sent: int
    delivered: int
    read: int
    failed: int
    delivery_rate: float
    read_rate: float
    failure_rate: float
    started_at: str | None
    completed_at: str | None
    duration_minutes: int | None
    errors_by_type: dict
    sender_domain: str


class RecipientStatusOut(BaseModel):
    customer_id: str | None
    name: str
    phone: str
    email: str
    status: str
    error_code: str
    error_message: str
    sent_at: str | None
    delivered_at: str | None
    read_at: str | None
    failed_at: str | None


class RecipientListOut(BaseModel):
    total: int
    page: int
    per_page: int
    recipients: list[RecipientStatusOut]


class CampaignRunListOut(BaseModel):
    id: str
    title: str
    channel: str
    status: str
    total_recipients: int
    sent_count: int
    delivered_count: int
    failed_count: int
    read_count: int
    delivery_rate: float
    created_at: str


@router.get(
    "/campaigns/runs/",
    auth=jwt_auth,
    response=list[CampaignRunListOut],
    summary="Listar ejecuciones de campañas",
)
def list_campaign_runs(request):
    """List all campaign runs for the tenant with aggregate metrics."""
    if not is_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))

    runs = CampaignRun.objects.filter(tenant=request.tenant).order_by("-created_at")[
        :50
    ]
    return [
        CampaignRunListOut(
            id=str(run.id),
            title=run.title,
            channel=run.channel,
            status=run.status,
            total_recipients=run.total_recipients,
            sent_count=run.sent_count,
            delivered_count=run.delivered_count,
            failed_count=run.failed_count,
            read_count=run.read_count,
            delivery_rate=run.delivery_rate,
            created_at=run.created_at.isoformat(),
        )
        for run in runs
    ]


@router.get(
    "/campaigns/{campaign_run_id}/results/",
    auth=jwt_auth,
    response=CampaignResultsOut,
    summary="Resultados de campaña",
)
def get_campaign_results(request, campaign_run_id: str):
    """Get aggregate campaign metrics including delivery rates and error breakdown."""
    if not is_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))

    run = get_object_or_404(CampaignRun, id=campaign_run_id, tenant=request.tenant)

    # Aggregate errors by type
    error_counts = (
        CampaignDeliveryLog.objects.filter(
            campaign_run=run,
            status=DeliveryStatus.FAILED,
        )
        .exclude(error_code="")
        .values("error_code")
        .annotate(count=Count("id"))
    )
    errors_by_type = {row["error_code"]: row["count"] for row in error_counts}

    return CampaignResultsOut(
        campaign_run_id=str(run.id),
        title=run.title,
        channel=run.channel,
        status=run.status,
        segment=run.segment_id,
        total_recipients=run.total_recipients,
        sent=run.sent_count,
        delivered=run.delivered_count,
        read=run.read_count,
        failed=run.failed_count,
        delivery_rate=run.delivery_rate,
        read_rate=run.read_rate,
        failure_rate=run.failure_rate,
        started_at=run.started_at.isoformat() if run.started_at else None,
        completed_at=run.completed_at.isoformat() if run.completed_at else None,
        duration_minutes=run.duration_minutes,
        errors_by_type=errors_by_type,
        sender_domain=run.sender_domain,
    )


@router.get(
    "/campaigns/{campaign_run_id}/recipients/",
    auth=jwt_auth,
    response=RecipientListOut,
    summary="Detalle de destinatarios",
)
def get_campaign_recipients(
    request, campaign_run_id: str, status: str | None = None, page: int = 1
):
    """Get per-recipient delivery status for a campaign (paginated, filterable)."""
    if not is_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))

    run = get_object_or_404(CampaignRun, id=campaign_run_id, tenant=request.tenant)

    per_page = 50
    qs = CampaignDeliveryLog.objects.filter(campaign_run=run)
    if status:
        qs = qs.filter(status=status)

    total = qs.count()
    offset = (page - 1) * per_page
    logs = qs[offset : offset + per_page]

    recipients = [
        RecipientStatusOut(
            customer_id=str(log.customer_id) if log.customer_id else None,
            name=log.recipient_name,
            phone=log.recipient_phone,
            email=log.recipient_email,
            status=log.status,
            error_code=log.error_code,
            error_message=log.error_message,
            sent_at=log.sent_at.isoformat() if log.sent_at else None,
            delivered_at=log.delivered_at.isoformat() if log.delivered_at else None,
            read_at=log.read_at.isoformat() if log.read_at else None,
            failed_at=log.failed_at.isoformat() if log.failed_at else None,
        )
        for log in logs
    ]

    return RecipientListOut(
        total=total, page=page, per_page=per_page, recipients=recipients
    )


@router.get(
    "/campaigns/{campaign_run_id}/export/",
    auth=jwt_auth,
    summary="Exportar resultados CSV",
)
def export_campaign_results(request, campaign_run_id: str):
    """Export campaign delivery results as a CSV download."""
    if not is_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))

    run = get_object_or_404(CampaignRun, id=campaign_run_id, tenant=request.tenant)

    logs = CampaignDeliveryLog.objects.filter(campaign_run=run).order_by("created_at")

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(
        [
            "Nombre",
            "Teléfono",
            "Email",
            "Estado",
            "Error",
            "Enviado",
            "Entregado",
            "Leído",
            "Fallido",
        ]
    )

    for log in logs:
        writer.writerow(
            [
                log.recipient_name,
                log.recipient_phone,
                log.recipient_email,
                log.get_status_display(),
                log.error_code,
                log.sent_at.isoformat() if log.sent_at else "",
                log.delivered_at.isoformat() if log.delivered_at else "",
                log.read_at.isoformat() if log.read_at else "",
                log.failed_at.isoformat() if log.failed_at else "",
            ]
        )

    response = HttpResponse(output.getvalue(), content_type="text/csv")
    safe_title = run.title.replace(" ", "_")[:30]
    response["Content-Disposition"] = (
        f'attachment; filename="loyallia_campaign_{safe_title}.csv"'
    )
    return response
