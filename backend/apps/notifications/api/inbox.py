"""Customer notification inbox endpoints."""

from django.shortcuts import get_object_or_404
from ninja.errors import HttpError

from apps.notifications.models import Notification
from common.messages import get_message
from common.permissions import jwt_auth

from .base import _get_customer_or_403, router

@router.get("/inbox/", auth=jwt_auth, summary="Get notification inbox")
def get_notifications(request, limit: int = 20, offset: int = 0, unread_only: bool = False):
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
def list_notifications(request, limit: int = 20, offset: int = 0, unread_only: bool = False):
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

@router.delete("/notifications/{notification_id}/", auth=jwt_auth, summary="Delete notification")
def delete_notification(request, notification_id: str):
    """Delete a notification."""
    customer = _get_customer_or_403(request)
    notification = get_object_or_404(Notification, id=notification_id)

 # Verify ownership
    if notification.customer.id != customer.id:
        raise HttpError(403, get_message("NOTIFICATION_NOT_FOUND"))

    notification.delete()

 #
    from django.http import HttpResponse

    return HttpResponse(status=204)
