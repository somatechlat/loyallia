"""
Loyallia WhatsApp Campaign Celery Task (apps/notifications/tasks/whatsapp_campaign.py)

Multi-account WhatsApp campaign delivery with per-session and per-tenant
quota enforcement. Session routing lives here; bridge I/O is in
apps/notifications/whatsapp/client.py.
"""

import logging

from celery import shared_task
from django.conf import settings

logger = logging.getLogger(__name__)


class _SessionRotation:
    """Pick the sending WhatsApp session for each message (multi-account).

    Non-fanout: a single session. Fan-out: round-robin across sessions,
    skipping any that exhausted their per-number daily limit. Consumption is
    recorded locally per run so in-flight sends count against the limit even
    before the bridge delivery webhook lands.
    """

    def __init__(self, sessions) -> None:
        self.sessions = list(sessions)
        self.remaining = {
            str(s.id): max(0, s.messages_remaining_today) for s in self.sessions
        }
        self._idx = 0

    def take(self):
        """Return the next session with remaining quota (no consumption)."""
        n = len(self.sessions)
        for _ in range(n):
            session = self.sessions[self._idx % n]
            self._idx += 1
            if self.remaining[str(session.id)] > 0:
                return session
        return None

    def consume(self, session) -> None:
        key = str(session.id)
        self.remaining[key] = max(0, self.remaining[key] - 1)


def _resolve_send_sessions(tenant, whatsapp_session_id: str | None, whatsapp_fanout: bool):
    """Resolve which linked WhatsApp session(s) may send this campaign.

    Priority: explicit session id → fan-out across connected accounts →
    default first connected account. Raises ValueError on an unknown id.
    """
    from apps.notifications.models import WhatsAppSession

    base_qs = WhatsAppSession.objects.filter(tenant=tenant, is_active=True)
    if whatsapp_session_id:
        session = base_qs.filter(id=whatsapp_session_id).first()
        if session is None:
            raise ValueError("session_not_found")
        return [session]
    if whatsapp_fanout:
        sessions = list(base_qs.filter(is_connected=True).order_by("created_at"))
        return sessions
    session = (
        base_qs.filter(is_connected=True).order_by("created_at").first()
        or base_qs.order_by("created_at").first()
    )
    return [session] if session else []


def _tenant_whatsapp_pool(tenant) -> int:
    """Tenant-wide daily WhatsApp pool (SubscriptionPlan.max_whatsapp_day)."""
    from apps.billing.models import Subscription

    subscription = Subscription.objects.filter(tenant=tenant).first()
    if not subscription:
        return 0
    return subscription.get_limit("whatsapp_day")


def _tenant_pool_used(tenant) -> int:
    """Sum of messages_sent_today across ALL linked sessions."""
    from django.db.models import Sum

    from apps.notifications.models import WhatsAppSession

    total = WhatsAppSession.objects.filter(tenant=tenant).aggregate(
        total=Sum("messages_sent_today")
    )["total"]
    return int(total or 0)


@shared_task(
    bind=True,
    max_retries=settings.CELERY_MAX_RETRIES_MINIMAL,
    default_retry_delay=settings.CELERY_DEFAULT_RETRY_DELAY_EXTRA_LONG,
    queue="whatsapp_delivery",
    name="apps.notifications.tasks.send_whatsapp_campaign",
    soft_time_limit=settings.CELERY_SOFT_TIME_LIMIT_NOTIFICATIONS_CAMPAIGN_LARGE,
    time_limit=settings.CELERY_TIME_LIMIT_NOTIFICATIONS_CAMPAIGN_LARGE,
)
def send_whatsapp_campaign(
    self,
    tenant_id: str,
    title: str,
    message: str,
    segment_id: str = "all",
    image_url: str = "",
    target_program_ids: list[str] | None = None,
    target_device_type: str = "both",
    target_wallet_platform: str = "both",
    target_customer_ids: list[str] | None = None,
    whatsapp_session_id: str | None = None,
    whatsapp_fanout: bool = False,
) -> dict:
    """WhatsApp campaign via Baileys bridge with per-message tracking.

    Creates a CampaignRun and CampaignDeliveryLog rows, then sends messages
    through the WhatsApp bridge, keyed by WhatsAppSession id (multi-account).

    Quota enforcement per message:
      - per-session: session.messages_remaining_today (warm-up + SuperAdmin cap)
      - tenant pool: sum of all sessions' messages_sent_today vs max_whatsapp_day
    Recipients beyond the quota are recorded with error_code=SKIPPED_QUOTA.

    If the bridge is unavailable, falls back to creating in-app notifications.

    FIRE-TIME PLAN GATE: scheduled campaigns re-check feature + quota here
    (HTTP create-time gates can be bypassed by ETA delay after a plan change).
    """
    import uuid

    from django.utils import timezone

    from apps.customers.models import Customer
    from apps.notifications.models import (
        CampaignDeliveryLog,
        CampaignRun,
        CampaignStatus,
        DeliveryStatus,
        Notification,
        NotificationChannel,
        NotificationType,
    )
    from apps.notifications.whatsapp import client as wa_client
    from apps.tenants.models import Tenant
    from common.messages import get_message

    try:
        tenant = Tenant.objects.get(id=uuid.UUID(tenant_id))
    except (Tenant.DoesNotExist, ValueError):
        return {"success": False, "error": get_message("TENANT_NOT_FOUND")}

    from apps.notifications.tasks.plan_gates import enforce_fire_time_plan_gate

    gate_error = enforce_fire_time_plan_gate(tenant, "whatsapp")
    if gate_error:
        return {"success": False, "error": gate_error, "blocked_by_plan": True}

    try:
        send_sessions = _resolve_send_sessions(
            tenant, whatsapp_session_id, whatsapp_fanout
        )
    except ValueError:
        return {"success": False, "error": get_message("WHATSAPP_SESSION_NOT_FOUND")}
    if not send_sessions:
        return {"success": False, "error": get_message("WHATSAPP_SESSION_REQUIRED")}

    from apps.customers.segment_api import apply_campaign_filters

    base_qs = Customer.objects.filter(tenant=tenant, is_active=True)
    audience = apply_campaign_filters(
        base_qs,
        segment_id=segment_id,
        target_program_ids=target_program_ids,
        target_device_type=target_device_type,
        target_wallet_platform=target_wallet_platform,
        target_customer_ids=target_customer_ids,
    )
    total = audience.count()

    # Create CampaignRun record (attributed to the primary sending session)
    campaign_run = CampaignRun.objects.create(
        tenant=tenant,
        channel=NotificationChannel.WHATSAPP,
        title=title,
        message_preview=message[:500],
        segment_id=segment_id,
        status=CampaignStatus.IN_PROGRESS,
        total_recipients=total,
        target_device_types=target_device_type,
        target_wallet_platforms=target_wallet_platform,
        whatsapp_session=send_sessions[0],
        started_at=timezone.now(),
    )
    if target_program_ids:
        from apps.cards.models import Card

        program_cards = Card.objects.filter(
            tenant=tenant, id__in=target_program_ids
        )
        campaign_run.target_programs.set(program_cards)
    if target_customer_ids:
        target_customers = Customer.objects.filter(
            tenant=tenant, id__in=target_customer_ids
        )
        campaign_run.target_customers.set(target_customers)

    # Check bridge availability
    bridge_available = wa_client.is_bridge_available()
    if not bridge_available:
        logger.warning(
            "WhatsApp bridge unavailable for tenant %s  falling back to in-app",
            tenant_id,
        )
    else:
        # Ensure sockets exist (file auth reconnect) before enqueueing.
        for sess in send_sessions:
            try:
                wa_client.ensure_session_running(
                    str(sess.id), str(sess.tenant_id)
                )
            except Exception as exc:
                logger.warning(
                    "ensure_session_running failed for %s: %s", sess.id, exc
                )

    rotation = _SessionRotation(send_sessions)
    enqueued = 0
    succeeded = 0
    failed = 0
    quota_skipped = 0

    for customer in audience.iterator(chunk_size=settings.ITERATOR_CHUNK_SIZE_SMALL):
        # Create delivery log row (status=QUEUED)
        delivery_log = CampaignDeliveryLog.objects.create(
            campaign_run=campaign_run,
            customer=customer,
            recipient_phone=customer.phone or "",
            recipient_email=customer.email or "",
            recipient_name=f"{customer.first_name} {customer.last_name}".strip(),
            status=DeliveryStatus.QUEUED,
        )

        if bridge_available and customer.phone:
            if wa_client.check_whatsapp_cooldown(customer.phone):
                logger.info("WhatsApp cooldown: skipping %s", customer.phone)
                delivery_log.status = DeliveryStatus.FAILED
                delivery_log.failed_at = timezone.now()
                delivery_log.error_code = "COOLDOWN"
                delivery_log.error_message = get_message("WHATSAPP_COOLDOWN_MSG")
                delivery_log.save(
                    update_fields=[
                        "status",
                        "failed_at",
                        "error_code",
                        "error_message",
                    ]
                )
                failed += 1
                continue

            # Per-message quota: atomic DB reserve (session cap + tenant pool).
            session = None
            reserved = False
            for _ in range(max(1, len(rotation.sessions))):
                candidate = rotation.take()
                if candidate is None:
                    break
                if candidate.try_reserve_message():
                    session = candidate
                    reserved = True
                    break
            if not reserved or session is None:
                delivery_log.status = DeliveryStatus.FAILED
                delivery_log.failed_at = timezone.now()
                delivery_log.error_code = "SKIPPED_QUOTA"
                delivery_log.error_message = get_message("WHATSAPP_QUOTA_REACHED")
                delivery_log.save(
                    update_fields=[
                        "status",
                        "failed_at",
                        "error_code",
                        "error_message",
                    ]
                )
                failed += 1
                quota_skipped += 1
                continue

            try:
                result = wa_client.send_message(
                    session_id=str(session.id),
                    phone=customer.phone,
                    message=message[:500],
                    media_url=image_url or None,
                    metadata={
                        "delivery_log_id": str(delivery_log.id),
                        "campaign_run_id": str(campaign_run.id),
                    },
                )
                enqueued += 1
                # Bridge accepted the message into its queue
                delivery_log.status = DeliveryStatus.SENT
                delivery_log.sent_at = timezone.now()
                delivery_log.external_message_id = result.get("job_id", "")
                delivery_log.save(
                    update_fields=[
                        "status",
                        "sent_at",
                        "external_message_id",
                    ]
                )
                succeeded += 1
                # Keep run counter live so late webhooks do not double-write.
                CampaignRun.objects.filter(id=campaign_run.id).update(
                    sent_count=succeeded
                )
            except Exception as exc:
                error_msg = str(exc)[:500]
                logger.error(
                    "WhatsApp send failed for customer %s: %s",
                    customer.id,
                    error_msg,
                )
                # Release the reserved daily slot so failed sends do not
                # burn the warm-up / plan counter.
                from django.db.models import F

                from apps.notifications.models import WhatsAppSession

                WhatsAppSession.objects.filter(id=session.id).update(
                    messages_sent_today=F("messages_sent_today") - 1
                )
                delivery_log.status = DeliveryStatus.FAILED
                delivery_log.failed_at = timezone.now()
                delivery_log.error_code = "BRIDGE_ERROR"
                delivery_log.error_message = error_msg
                delivery_log.save(
                    update_fields=[
                        "status",
                        "failed_at",
                        "error_code",
                        "error_message",
                    ]
                )
                failed += 1
        else:
            # No phone or bridge down create in-app fallback
            if not customer.phone:
                delivery_log.status = DeliveryStatus.FAILED
                delivery_log.failed_at = timezone.now()
                delivery_log.error_code = "NO_PHONE"
                delivery_log.error_message = get_message("WHATSAPP_NO_PHONE")
                delivery_log.save(
                    update_fields=[
                        "status",
                        "failed_at",
                        "error_code",
                        "error_message",
                    ]
                )
                failed += 1
            else:
                # Bridge unavailable queue as in-app notification
                Notification.objects.create(
                    tenant=tenant,
                    customer=customer,
                    notification_type=NotificationType.MARKETING,
                    channel=NotificationChannel.IN_APP,
                    title=f"[WhatsApp] {title}",
                    message=message[:500],
                    action_url=image_url,
                )
                delivery_log.status = DeliveryStatus.FAILED
                delivery_log.failed_at = timezone.now()
                delivery_log.error_code = "BRIDGE_UNAVAILABLE"
                delivery_log.error_message = get_message("WHATSAPP_BRIDGE_FALLBACK")
                delivery_log.save(
                    update_fields=[
                        "status",
                        "failed_at",
                        "error_code",
                        "error_message",
                    ]
                )
                failed += 1

    # Finalize campaign run — set sent_count from the local succeeded
    # counter (idempotent; webhook may have already bumped it for late
    # /send-direct confirmations, so we only write when it differs).
    if campaign_run.sent_count != succeeded:
        campaign_run.sent_count = succeeded
    campaign_run.failed_count = failed
    if not bridge_available:
        campaign_run.error_summary = get_message("WHATSAPP_CAMPAIGN_BRIDGE_FALLBACK")
    elif quota_skipped:
        campaign_run.error_summary = get_message("WHATSAPP_QUOTA_REACHED")
    campaign_run.status = (
        CampaignStatus.FAILED if campaign_run.error_summary else CampaignStatus.COMPLETED
    )
    campaign_run.completed_at = timezone.now()
    campaign_run.save(
        update_fields=[
            "sent_count",
            "failed_count",
            "status",
            "completed_at",
            "error_summary",
        ]
    )

    logger.info(
        "WhatsApp campaign %s complete: %d/%d sent, %d failed (%d quota-skipped)",
        campaign_run.id,
        succeeded,
        total,
        failed,
        quota_skipped,
    )
    return {
        "success": True,
        "campaign_run_id": str(campaign_run.id),
        "attempted": total,
        "succeeded": succeeded,
        "failed": failed,
        "quota_skipped": quota_skipped,
    }
