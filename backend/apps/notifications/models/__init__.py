"""
Loyallia — Notifications Models Package

Re-exports all model classes and enums for backward compatibility.
Existing imports like ``from apps.notifications.models import PushDevice``
continue to work unchanged.
"""

from .base import CampaignStatus, DeliveryStatus, NotificationChannel, NotificationType
from .campaigns import CampaignDeliveryLog, CampaignRun
from .email import TenantEmailConfig
from .misc import Notification, WhatsAppSession
from .push import PushDevice

__all__ = [
    "CampaignDeliveryLog",
    "CampaignRun",
    "CampaignStatus",
    "DeliveryStatus",
    "Notification",
    "NotificationChannel",
    "NotificationType",
    "PushDevice",
    "TenantEmailConfig",
    "WhatsAppSession",
]
