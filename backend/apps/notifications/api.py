# =============================================================================
# Loyallia — Notifications API router
#
# NOTE: Push notifications (FCM/APNs) require a mobile app and device tokens.
# For WALLET-ONLY deployments, we use:
# 1. Email campaigns (for promotions)
# 2. Wallet Pass Updates (when pass data changes, wallet auto-updates)
# =============================================================================

from django.shortcuts import get_object_or_404
from ninja import Router
from ninja.errors import HttpError
from pydantic import BaseModel

from apps.customers.models import Customer
from apps.notifications.models import (
    Notification,
    NotificationChannel,
    NotificationType,
    PushDevice,
)
from apps.notifications.service import NotificationService
from common.messages import get_message
from common.permissions import is_owner, jwt_auth
from common.plan_enforcement import enforce_limit

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

    return {"success": True, "message": "Notification deleted"}


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
    """Get notification statistics for the business."""
    notifications = Notification.objects.filter(tenant=request.tenant)

    total = notifications.count()
    sent = notifications.filter(is_sent=True).count()
    read = notifications.filter(is_read=True).count()
    clicked = notifications.filter(is_clicked=True).count()

    # By type
    by_type = {}
    for notif_type in NotificationType.choices:
        count = notifications.filter(notification_type=notif_type[0]).count()
        if count > 0:
            by_type[notif_type[1]] = count

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


@router.post("/campaigns/", auth=jwt_auth, response=dict, summary="Crear campaña")
@enforce_limit("notifications_month")
def create_campaign(request, data: CampaignCreateIn):
    """Send an email, wallet, or WhatsApp mock notification campaign to customers in a segment.

    OWNER only. Supports three channels:
    - 'email': Rich HTML email with images
    - 'wallet': Creates notifications that appear when customers check their wallet cards
    - 'whatsapp': Mock WhatsApp campaign — creates in-app notifications (ready for future integration)
    """
    if not is_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))

    if data.channel == "email":
        from apps.notifications.tasks import send_email_campaign

        send_email_campaign.delay(
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

        send_wallet_notification_campaign.delay(
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
        # LYL-M-API-019: Move synchronous campaign send to async Celery task
        from apps.notifications.tasks import send_whatsapp_campaign

        send_whatsapp_campaign.delay(
            tenant_id=str(request.tenant.id),
            title=data.title,
            message=data.message,
            segment_id=data.segment_id,
            image_url=data.image_url or "",
        )
        return {
            "success": True,
            "message": f"Campaña de WhatsApp (Mock) iniciada para segmento '{data.segment_id}'. "
            f"En producción, estas se enviarían via WhatsApp Business API.",
        }
    else:
        raise HttpError(400, "Canal no válido. Usa 'email', 'wallet' o 'whatsapp'.")
