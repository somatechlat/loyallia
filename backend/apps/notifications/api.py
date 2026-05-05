# =============================================================================
# Loyallia — Notifications API router
#
# NOTE: Push notifications (FCM/APNs) require a mobile app and device tokens.
# For WALLET-ONLY deployments, we use:
# 1. Email campaigns (for promotions)
# 2. Wallet Pass Updates (when pass data changes, wallet auto-updates)
# =============================================================================

from typing import Any

from django.shortcuts import get_object_or_404
from ninja import Router
from ninja.errors import HttpError
from pydantic import BaseModel

from apps.customers.models import Customer
from apps.notifications.models import (
    CampaignDeliveryLog,
    CampaignRun,
    CampaignStatus,
    DeliveryStatus,
    Notification,
    NotificationType,
    PushDevice,
)
from apps.notifications.service import NotificationService
from common.messages import get_message
from common.permissions import is_owner, jwt_auth
from common.plan_enforcement import (
    check_feature_access,
    check_plan_limit,
    enforce_limit,
)

router = Router()


# ============ Pydantic Schemas ============
class PushDeviceSchema(BaseModel):
    device_type: str  # ios, android, web
    device_token: str
    device_model: str | None = None
    fcm_token: str | None = None
    apns_token: str | None = None


class NotificationSchema(BaseModel):
    id: str
    title: str
    message: str
    notification_type: str
    is_sent: bool
    is_read: bool
    is_clicked: bool
    created_at: str


class SendNotificationSchema(BaseModel):
    title: str
    message: str
    notification_type: str
    channel: str = "push"
    action_url: str | None = None
    image_url: str | None = None


# ============ Device Management ============
def _get_customer_or_403(request):
    """Resolve the Customer object for the authenticated user, or raise 403."""
    if not hasattr(request.user, "customer") or request.user.customer is None:
        raise HttpError(403, get_message("CUSTOMER_REQUIRED"))
    return request.user.customer


@router.post(
    "/devices/register/",
    auth=jwt_auth,
    summary="Register device for push notifications",
)
def register_device(request, data: PushDeviceSchema):
    """Register a device for push notifications."""
    customer = _get_customer_or_403(request)

    # Get or create device
    device, created = PushDevice.objects.update_or_create(
        customer=customer,
        device_token=data.device_token,
        defaults={
            "device_type": data.device_type,
            "device_model": data.device_model,
            "fcm_token": data.fcm_token,
            "apns_token": data.apns_token,
            "is_active": True,
        },
    )

    return {
        "success": True,
        "message": "Device registered successfully",
        "device_id": str(device.id),
    }


@router.delete("/devices/{device_id}/", auth=jwt_auth, summary="Unregister device")
def unregister_device(request, device_id: str):
    """Unregister a device from push notifications.
    LYL-H-API-012: Device queries are tenant-scoped via customer relationship.
    """
    customer = _get_customer_or_403(request)
    # LYL-H-API-012: Scope device query to customer's devices (tenant isolation)
    device = get_object_or_404(PushDevice, id=device_id, customer=customer)

    device.is_active = False
    device.save()

    return {"success": True, "message": "Device unregistered"}


@router.get("/devices/", auth=jwt_auth, summary="List registered devices")
def list_devices(request):
    """List all registered devices for current user."""
    customer = _get_customer_or_403(request)

    devices = PushDevice.objects.filter(customer=customer, is_active=True)

    return [
        {
            "id": str(device.id),
            "device_type": device.device_type,
            "device_model": device.device_model,
            "registered_at": device.registered_at.isoformat(),
            "last_used": device.last_used.isoformat() if device.last_used else None,
        }
        for device in devices
    ]


# ============ Customer Notifications ============
@router.get("/inbox/", auth=jwt_auth, summary="Get notification inbox")
def get_notifications(
    request, limit: int = 20, offset: int = 0, unread_only: bool = False
):
    """Get customer's notification inbox."""
    # Handle non-customer users (like Owner/Admin)
    if not hasattr(request.user, "customer") or not request.user.customer:
        return {"total": 0, "count": 0, "notifications": []}

    customer = request.user.customer

    query = Notification.objects.filter(customer=customer)

    if unread_only:
        query = query.filter(is_read=False)

    total = query.count()
    notifications = query[offset : offset + limit]

    return {
        "total": total,
        "count": len(notifications),
        "notifications": [
            {
                "id": str(n.id),
                "title": n.title,
                "message": n.message,
                "type": n.notification_type,
                "is_read": n.is_read,
                "is_clicked": n.is_clicked,
                "created_at": n.created_at.isoformat(),
                "action_url": n.action_url,
                "image_url": n.image_url,
            }
            for n in notifications
        ],
    }


@router.get("/", auth=jwt_auth, summary="Get notification inbox")
def list_notifications(
    request, limit: int = 20, offset: int = 0, unread_only: bool = False
):
    """Compatibility alias for notification inbox."""
    return get_notifications(request, limit, offset, unread_only)


@router.post(
    "/notifications/{notification_id}/read/",
    auth=jwt_auth,
    summary="Mark notification as read",
)
def mark_notification_read(request, notification_id: str):
    """Mark a notification as read."""
    customer = _get_customer_or_403(request)
    notification = get_object_or_404(Notification, id=notification_id)

    # Verify ownership
    if notification.customer.id != customer.id:
        raise HttpError(403, get_message("NOTIFICATION_NOT_FOUND"))

    notification.mark_as_read()

    return {"success": True, "message": "Notification marked as read"}


@router.post(
    "/notifications/{notification_id}/click/",
    auth=jwt_auth,
    summary="Mark notification as clicked",
)
def mark_notification_clicked(request, notification_id: str):
    """Mark a notification as clicked (action taken)."""
    customer = _get_customer_or_403(request)
    notification = get_object_or_404(Notification, id=notification_id)

    # Verify ownership
    if notification.customer.id != customer.id:
        raise HttpError(403, get_message("NOTIFICATION_NOT_FOUND"))

    notification.mark_as_clicked()

    return {"success": True, "message": "Notification action recorded"}


@router.delete(
    "/notifications/{notification_id}/", auth=jwt_auth, summary="Delete notification"
)
def delete_notification(request, notification_id: str):
    """Delete a notification."""
    customer = _get_customer_or_403(request)
    notification = get_object_or_404(Notification, id=notification_id)

    # Verify ownership
    if notification.customer.id != customer.id:
        raise HttpError(403, get_message("NOTIFICATION_NOT_FOUND"))

    notification.delete()

    # LYL-M-API-023: Return 204 No Content on successful delete
    from django.http import HttpResponse

    return HttpResponse(status=204)


# ============ Business Owner Notifications ============
@router.post("/send/", auth=jwt_auth, summary="Send notification to customer")
def send_notification(request, customer_id: str, data: SendNotificationSchema):
    """Send a notification to a specific customer. OWNER only."""
    if not is_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    # Verify ownership - user must own the tenant
    customer = get_object_or_404(Customer, id=customer_id, tenant=request.tenant)

    notification = Notification.objects.create(
        tenant=request.tenant,
        customer=customer,
        notification_type=data.notification_type,
        channel=data.channel,
        title=data.title,
        message=data.message,
        action_url=data.action_url or "",
        image_url=data.image_url or "",
    )

    success = NotificationService.send_notification(notification)

    return {
        "success": success,
        "notification_id": str(notification.id),
        "message": "Notification sent" if success else "Failed to send notification",
    }


@router.get("/stats/", auth=jwt_auth, summary="Get notification statistics")
def get_notification_stats(request):
    """Get notification statistics for the business.

    PERF-F5: Uses a single aggregate query + a single GROUP BY query
    instead of N separate COUNT queries per notification type.
    """
    from django.db.models import Count, Q

    notifications = Notification.objects.filter(tenant=request.tenant)

    # Single aggregate query: total, sent, read, clicked in one DB round-trip
    agg = notifications.aggregate(
        total=Count("id"),
        sent=Count("id", filter=Q(is_sent=True)),
        read=Count("id", filter=Q(is_read=True)),
        clicked=Count("id", filter=Q(is_clicked=True)),
    )
    total = agg["total"]
    sent = agg["sent"]
    read = agg["read"]
    clicked = agg["clicked"]

    # Single GROUP BY query instead of N separate COUNT queries
    type_labels = dict(NotificationType.choices)
    by_type_qs = (
        notifications.values("notification_type")
        .annotate(count=Count("id"))
        .filter(count__gt=0)
    )
    by_type = {
        type_labels.get(row["notification_type"], row["notification_type"]): row["count"]
        for row in by_type_qs
    }

    return {
        "total_notifications": total,
        "sent": sent,
        "read": read,
        "clicked": clicked,
        "open_rate": (read / sent * 100) if sent > 0 else 0,
        "click_rate": (clicked / sent * 100) if sent > 0 else 0,
        "by_type": by_type,
    }


class CampaignOut(BaseModel):
    id: str
    title: str
    message: str
    segment: str
    status: str
    sent_count: int
    created_at: str


@router.get("/campaigns/", auth=jwt_auth, response=dict, summary="Listar campañas")
def list_campaigns(request):
    """List all push campaigns."""
    notifications = Notification.objects.filter(
        tenant=request.tenant, notification_type=NotificationType.MARKETING
    ).order_by("-created_at")[:50]

    # Group notifications by campaign (using created_at date as grouping key)
    campaigns_dict = {}
    for n in notifications:
        # Use title + date as unique campaign key
        campaign_key = f"{n.title}_{n.created_at.date() if n.created_at else 'unknown'}"
        if campaign_key not in campaigns_dict:
            # Determine status based on is_sent and is_read (sent = delivered to at least one)
            if n.is_sent and n.is_read:
                status = "delivered"
            elif n.is_sent:
                status = "sent"
            else:
                status = "pending"

            # Determine campaign type from channel
            channel = n.channel if n.channel else "email"

            campaigns_dict[campaign_key] = {
                "id": str(n.id),
                "title": n.title or "Sin título",
                "message": n.message or "",
                "segment": "All",
                "status": status,
                "sent_count": 0,
                "created_at": n.created_at.isoformat() if n.created_at else "",
                "channel": channel,  # 'email', 'push', or 'in_app' (wallet)
            }
        if n.is_sent:
            campaigns_dict[campaign_key]["sent_count"] += 1

    campaign_list = list(campaigns_dict.values())
    return {"campaigns": campaign_list, "total": len(campaign_list)}


class CampaignCreateIn(BaseModel):
    title: str
    message: str
    segment_id: str
    image_url: str | None = ""
    channel: str | None = "email"  # 'email', 'wallet', or 'whatsapp'
    sender_domain: str | None = "loyallia"  # 'loyallia' or 'custom'


@router.post("/campaigns/", auth=jwt_auth, response=dict, summary="Crear campaña")
@enforce_limit("notifications_month")
def create_campaign(request, data: CampaignCreateIn):
    """Send an email, wallet, or WhatsApp notification campaign to customers in a segment.

    OWNER only. Supports three channels:
    - 'email': Rich HTML email with images
    - 'wallet': Creates notifications that appear when customers check their wallet cards
    - 'whatsapp': WhatsApp campaign via Baileys bridge — messages queued with Gaussian jitter anti-ban
    """
    if not is_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))

    if data.channel == "email":
        # LYL-SRS-008: Gate email campaigns by plan feature + monthly quota
        check_feature_access(request.tenant, "email_campaigns")
        check_plan_limit(request.tenant, "emails_month")

        from apps.notifications.tasks import send_email_campaign

        task_fn: Any = send_email_campaign
        task_fn.delay(
            tenant_id=str(request.tenant.id),
            subject=data.title,
            html_body=data.message,
            segment_id=data.segment_id,
            image_url=data.image_url or "",
        )
        return {
            "success": True,
            "message": f"Campaña de EMAIL iniciada para segmento '{data.segment_id}'. Los clientes recibirán un correo electrónico.",
        }
    elif data.channel == "wallet":
        from apps.notifications.tasks import send_wallet_notification_campaign

        task_fn: Any = send_wallet_notification_campaign
        task_fn.delay(
            tenant_id=str(request.tenant.id),
            title=data.title,
            message=data.message,
            segment_id=data.segment_id,
        )
        return {
            "success": True,
            "message": f"Campaña de WALLET iniciada para segmento '{data.segment_id}'. Los clientes recibirán una notificación en sus tarjetas.",
        }
    elif data.channel == "whatsapp":
        # LYL-SRS-008: Gate WhatsApp campaigns by plan feature + daily quota
        check_feature_access(request.tenant, "whatsapp_campaigns")
        check_plan_limit(request.tenant, "whatsapp_day")

        from apps.notifications.tasks import send_whatsapp_campaign

        task_fn: Any = send_whatsapp_campaign
        task_fn.delay(
            tenant_id=str(request.tenant.id),
            title=data.title,
            message=data.message,
            segment_id=data.segment_id,
            image_url=data.image_url or "",
        )
        return {
            "success": True,
            "message": f"Campaña de WhatsApp iniciada para segmento '{data.segment_id}'. "
            f"Los mensajes se enviarán de forma progresiva (~8 por minuto).",
        }
    else:
        raise HttpError(
            400,
            get_message(
                "VALIDATION_ERROR",
                detail="Canal no válido. Usa 'email', 'wallet' o 'whatsapp'.",
            ),
        )


# =============================================================================
# CAMPAIGN ANALYTICS ENDPOINTS (LYL-SRS-006)
# =============================================================================


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

    runs = CampaignRun.objects.filter(tenant=request.tenant).order_by("-created_at")[:50]
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

    run = get_object_or_404(
        CampaignRun, id=campaign_run_id, tenant=request.tenant
    )

    # Aggregate errors by type
    from django.db.models import Count

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
def get_campaign_recipients(request, campaign_run_id: str, status: str | None = None, page: int = 1):
    """Get per-recipient delivery status for a campaign (paginated, filterable)."""
    if not is_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))

    run = get_object_or_404(
        CampaignRun, id=campaign_run_id, tenant=request.tenant
    )

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
    import csv
    import io

    from django.http import HttpResponse

    if not is_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))

    run = get_object_or_404(
        CampaignRun, id=campaign_run_id, tenant=request.tenant
    )

    logs = CampaignDeliveryLog.objects.filter(campaign_run=run).order_by("created_at")

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Nombre", "Teléfono", "Email", "Estado", "Error",
        "Enviado", "Entregado", "Leído", "Fallido",
    ])

    for log in logs:
        writer.writerow([
            log.recipient_name,
            log.recipient_phone,
            log.recipient_email,
            log.get_status_display(),
            log.error_code,
            log.sent_at.isoformat() if log.sent_at else "",
            log.delivered_at.isoformat() if log.delivered_at else "",
            log.read_at.isoformat() if log.read_at else "",
            log.failed_at.isoformat() if log.failed_at else "",
        ])

    response = HttpResponse(output.getvalue(), content_type="text/csv")
    safe_title = run.title.replace(" ", "_")[:30]
    response["Content-Disposition"] = (
        f'attachment; filename="loyallia_campaign_{safe_title}.csv"'
    )
    return response
