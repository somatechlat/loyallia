"""Business owner notification send and statistics endpoints."""

from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from ninja.errors import HttpError

from apps.customers.models import Customer
from apps.notifications.models import Notification, NotificationType
from apps.notifications.service import NotificationService
from common.messages import get_message
from common.permissions import is_owner, jwt_auth

from .base import SendNotificationSchema, router


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
    by_type_qs = notifications.values("notification_type").annotate(count=Count("id")).filter(count__gt=0)
    by_type = {type_labels.get(row["notification_type"], row["notification_type"]): row["count"] for row in by_type_qs}

    return {
        "total_notifications": total,
        "sent": sent,
        "read": read,
        "clicked": clicked,
        "open_rate": (read / sent * 100) if sent > 0 else 0,
        "click_rate": (clicked / sent * 100) if sent > 0 else 0,
        "by_type": by_type,
    }
