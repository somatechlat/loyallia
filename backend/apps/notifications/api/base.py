"""Shared components for the notifications API.

Contains the Ninja Router instance, Pydantic schemas used by multiple
endpoints, and base dependency helpers.
"""
from __future__ import annotations

from ninja import Router
from ninja.errors import HttpError
from pydantic import BaseModel

from common.messages import get_message

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


# ============ Base dependencies ============
def _get_customer_or_403(request):
    """Resolve the Customer object for the authenticated user, or raise 403."""
    if not hasattr(request.user, "customer") or request.user.customer is None:
        raise HttpError(403, get_message("CUSTOMER_REQUIRED"))
    return request.user.customer
