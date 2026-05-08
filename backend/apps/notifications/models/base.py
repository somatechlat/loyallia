"""
Loyallia — Notifications Base Models

Shared enums and choices used across notification modules.
"""

from __future__ import annotations

from django.db import models


class NotificationChannel(models.TextChoices):
    """Available notification channels."""

    PUSH = "push", "Push Notification"
    SMS = "sms", "SMS"
    EMAIL = "email", "Email"
    IN_APP = "in_app", "In-App Notification"
    WHATSAPP = "whatsapp", "WhatsApp"


class NotificationType(models.TextChoices):
    """Types of notifications."""

    REWARD_EARNED = "reward_earned", "Reward Earned"
    REWARD_READY = "reward_ready", "Reward Ready for Redemption"
    SPECIAL_OFFER = "special_offer", "Special Offer"
    REMINDER = "reminder", "Reminder to Visit"
    MILESTONE = "milestone", "Milestone Reached"
    BIRTHDAY = "birthday", "Birthday Offer"
    SYSTEM = "system", "System Notification"
    MARKETING = "marketing", "Marketing Campaign"


class CampaignStatus(models.TextChoices):
    """Campaign execution lifecycle states."""

    QUEUED = "queued", "En cola"
    IN_PROGRESS = "in_progress", "Enviando"
    COMPLETED = "completed", "Completado"
    FAILED = "failed", "Fallido"
    PAUSED = "paused", "Pausado"


class DeliveryStatus(models.TextChoices):
    """Per-recipient delivery states."""

    QUEUED = "queued", "En cola"
    SENT = "sent", "Enviado"
    DELIVERED = "delivered", "Entregado"
    READ = "read", "Leído"
    FAILED = "failed", "Fallido"
    BOUNCED = "bounced", "Rebotado"
