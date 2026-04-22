"""
Loyallia — Push Notification Dispatcher

Central entry point for all push delivery.
Dispatches to APNs (iOS) or FCM (Android) based on device type.
Handles per-device delivery status, stale token cleanup, and logging.
"""

import logging
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from apps.notifications.models import Notification

logger = logging.getLogger(__name__)


def dispatch_push(notification: "Notification") -> int:
    """
    Dispatch a push notification to all active devices for the notification's customer.

    Args:
        notification: A Notification model instance (must have customer with devices)

    Returns:
        Number of devices successfully reached (0 = no devices or all failed)
    """
    from apps.notifications.push.apns_client import send_apns_message
    from apps.notifications.push.fcm_client import send_fcm_message

    customer = notification.customer
    devices = customer.devices.filter(is_active=True)

    if not devices.exists():
        logger.info(
            "No active devices for customer %s — skipping push for notification %s",
            customer.id,
            notification.id,
        )
        return 0

    payload_data = {
        "notification_id": str(notification.id),
        "notification_type": notification.notification_type,
        "action_url": notification.action_url or "",
    }
    if hasattr(notification, "notification_data") and notification.notification_data:
        payload_data.update(
            {k: str(v) for k, v in notification.notification_data.items()}
        )

    delivered = 0

    for device in devices:
        success = False

        if device.device_type == "ios" and device.apns_token:
            success = send_apns_message(
                device_token=device.apns_token,
                title=notification.title,
                body=notification.message,
                data=payload_data,
            )

        elif device.device_type == "android" and device.fcm_token:
            success = send_fcm_message(
                fcm_token=device.fcm_token,
                title=notification.title,
                body=notification.message,
                data=payload_data,
                image_url=(
                    notification.image_url
                    if hasattr(notification, "image_url")
                    else None
                ),
            )

        else:
            logger.debug(
                "Device %s has no valid push token (type=%s). Skipping.",
                device.id,
                device.device_type,
            )

        if success:
            delivered += 1
        elif device.device_type in ("ios", "android"):
            # Increment failure counter; deactivate device after 5 consecutive failures
            device.push_failures = getattr(device, "push_failures", 0) + 1
            if device.push_failures >= 5:
                device.is_active = False
                logger.warning(
                    "Deactivating device %s after %d consecutive push failures.",
                    device.id,
                    device.push_failures,
                )
            device.save(update_fields=["push_failures", "is_active"])

    return delivered
