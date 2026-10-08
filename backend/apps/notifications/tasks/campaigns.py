"""
Loyallia Campaign Delivery Celery Tasks (apps/notifications/tasks/campaigns.py)

Wallet push notification campaigns. WhatsApp campaigns live in
whatsapp_campaign.py; email/SMS live in their own modules.
"""

import logging

from celery import shared_task
from django.conf import settings

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    max_retries=settings.CELERY_MAX_RETRIES_MINIMAL,
    default_retry_delay=settings.CELERY_DEFAULT_RETRY_DELAY_EXTRA_LONG,
    queue="default",
    name="apps.notifications.tasks.send_wallet_notification_campaign",
    soft_time_limit=settings.CELERY_SOFT_TIME_LIMIT_NOTIFICATIONS_CAMPAIGN,
    time_limit=settings.CELERY_TIME_LIMIT_NOTIFICATIONS_CAMPAIGN,
)
def send_wallet_notification_campaign(
    self,
    tenant_id: str,
    title: str,
    message: str,
    segment_id: str = "all",
    wallet_platform: str = "both",
    action_url: str = "",
    target_program_ids: list[str] | None = None,
    target_device_type: str = "both",
    target_wallet_platform: str = "both",
    target_customer_ids: list[str] | None = None,
) -> dict:
    """Send wallet push notifications to customers with active passes.

    Platform isolation (``wallet_platform``):
        - ``google``: Google addMessage only — no ``last_message`` write and no
          Apple APNs wake.
        - ``apple``: per-pass ``apply_campaign_message`` mutation + Apple wake
          only — no Google addMessage.
        - ``both``: both of the above.

    Apple order per pass: mutate ``pass_data["last_message"]`` first (bumps
    ``last_updated`` so the web service re-serves pass.json), then
    ``notify_pass_updated``. Waking without a mutation yields no visible alert
    because PassKit only fires ``changeMessage`` when the field value changed.
    Re-sending the identical message is a no-op (pin): ``apply_campaign_message``
    reports ``changed=False`` and the wake is skipped.

    PERF: For 'all' segment, uses broadcast mode (send_push_notification_to_class)
    which sends one push per card class instead of N individual Google pushes.
    Apple is always per-pass even in broadcast mode (a class-level wake cannot
    change a per-pass field value), so the per-customer loop below is the Apple
    fan-out over passes. For targeted segments, sends individual pushes per pass.
    PERF: iterator(chunk_size=50) streams customers in batches.
    """
    import uuid

    from django.conf import settings
    from django.utils import timezone

    from apps.customers.models import Customer, CustomerPass
    from apps.customers.pass_engine.campaign_message import apply_campaign_message
    from apps.customers.pass_engine.google_pass import send_push_notification
    from apps.notifications.models import (
        CampaignDeliveryLog,
        CampaignRun,
        CampaignStatus,
        DeliveryStatus,
        Notification,
        NotificationChannel,
        NotificationType,
    )
    from apps.tenants.models import Tenant
    from common.messages import get_message

    try:
        tenant = Tenant.objects.get(id=uuid.UUID(tenant_id))
    except Tenant.DoesNotExist:
        return {"success": False, "error": "Tenant not found"}

    from apps.notifications.tasks.plan_gates import enforce_fire_time_plan_gate

    gate_error = enforce_fire_time_plan_gate(tenant, "wallet")
    if gate_error:
        return {"success": False, "error": gate_error, "blocked_by_plan": True}

    from apps.customers.segment_api import apply_campaign_filters

    base_qs = Customer.objects.filter(tenant=tenant, is_active=True)
    audience = apply_campaign_filters(
        base_qs,
        segment_id=segment_id,
        target_program_ids=target_program_ids,
        target_device_type=target_device_type,
        target_wallet_platform=target_wallet_platform,
        target_customer_ids=target_customer_ids,
        require_notification_consent=True,
    )
    total = (
        CustomerPass.objects.filter(customer__in=audience, is_active=True)
        .values("customer_id")
        .distinct()
        .count()
    )

    logger.info(
        "Wallet campaign: tenant=%s segment=%s audience=%d",
        tenant_id,
        segment_id,
        total,
    )

    campaign_run = CampaignRun.objects.create(
        tenant=tenant,
        channel=NotificationChannel.WALLET,
        title=title,
        message_preview=message[:500],
        segment_id=segment_id,
        status=CampaignStatus.IN_PROGRESS,
        total_recipients=total,
        target_device_types=target_device_type,
        target_wallet_platforms=target_wallet_platform,
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

    succeeded = 0
    failed = 0
    push_sent = 0
    error_summary = ""

    try:
        # For "all" segment, optimized Google broadcast (one class-level
        # addMessage per card). Apple always goes per-pass (see docstring).
        apple_push_sent = 0
        broadcast_message_ids = {}

        use_broadcast = segment_id == "all" and not (
            target_customer_ids
            or target_program_ids
            or target_device_type != "both"
            or target_wallet_platform != "both"
        )

        if use_broadcast:
            from apps.cards.models import Card
            from apps.customers.pass_engine.google_pass import (
                send_push_notification_to_class,
            )

            active_cards = Card.objects.filter(tenant=tenant, is_active=True)
            for card in active_cards:
                if action_url:
                    broadcast_url = action_url
                else:
                    from apps.tenants.models import PlatformSetting

                    dashboard_url = PlatformSetting.get(
                        "dashboard_url", settings.PUBLIC_BASE_URL
                    )
                    broadcast_url = f"{dashboard_url}/enroll/{str(card.id)}"

                if wallet_platform in ("google", "both"):
                    # Google Wallet broadcast
                    result = send_push_notification_to_class(
                        card, header=title, body=message, action_url=broadcast_url
                    )
                    if result.get("success"):
                        logger.info("Google broadcast push sent for card %s", card.name)
                        if result.get("message_id"):
                            broadcast_message_ids[str(card.id)] = result["message_id"]
                    else:
                        error_msg = result.get("error") or result.get(
                            "response", "Unknown error"
                        )
                        logger.error(
                            "Google broadcast push FAILED for card %s: %s",
                            card.name,
                            error_msg,
                        )
                        error_summary += (
                            f"Google push failed for {card.name}: {error_msg}; "
                        )

                # Apple: no class-level wake in broadcast mode — changeMessage
                # only fires after a per-pass last_message mutation, so Apple is
                # handled per pass in the customer loop below.

        # Pre-fetch all active CustomerPass records for the audience to avoid N+1
        all_passes = CustomerPass.objects.filter(
            customer__in=audience, is_active=True
        ).select_related("card", "card__tenant")
        passes_by_customer: dict[str, list] = {}
        for cp in all_passes:
            passes_by_customer.setdefault(str(cp.customer_id), []).append(cp)

        for customer in audience.iterator(
            chunk_size=settings.ITERATOR_CHUNK_SIZE_SMALL
        ):
            passes = passes_by_customer.get(str(customer.id), [])
            if not passes:
                continue

            delivery_log = CampaignDeliveryLog.objects.create(
                campaign_run=campaign_run,
                customer=customer,
                recipient_phone=customer.phone or "",
                recipient_email=customer.email or "",
                recipient_name=f"{customer.first_name} {customer.last_name}".strip(),
                status=DeliveryStatus.QUEUED,
            )

            try:
                notification = Notification.objects.create(
                    tenant=tenant,
                    customer=customer,
                    notification_type=NotificationType.MARKETING,
                    channel=NotificationChannel.WALLET,
                    title=title,
                    message=message[:500],
                )
                notification.mark_as_sent()

                # SENT only when at least one platform actually delivered
                # (Google push success, Apple wake success, or intentional pin).
                platform_ok = False
                platform_errors: list[str] = []

                for pass_obj in passes:
                    # Apple: mutate last_message BEFORE the wake so the
                    # re-served pass.json carries a changed changeMessage value.
                    message_changed = True
                    if wallet_platform in ("apple", "both"):
                        message_changed = bool(
                            apply_campaign_message(pass_obj, message).get(
                                "changed", True
                            )
                        )
                        # Pin (identical text) is still a successful delivery.
                        platform_ok = True

                    if action_url:
                        pass_action_url = action_url
                    else:
                        from apps.tenants.models import PlatformSetting

                        dashboard_url = PlatformSetting.get(
                            "dashboard_url", settings.PUBLIC_BASE_URL
                        )
                        pass_action_url = (
                            f"{dashboard_url}/enroll/{str(pass_obj.card.id)}"
                        )

                    if wallet_platform in ("apple", "both") and message_changed:
                        # Apple Wallet wake AFTER mutation
                        try:
                            from apps.customers.pass_engine.apple_push import (
                                notify_pass_updated,
                            )

                            apple_count = notify_pass_updated(pass_obj)
                            apple_push_sent += apple_count
                            if apple_count > 0:
                                platform_ok = True
                            else:
                                platform_errors.append(
                                    f"Apple push failed for pass {pass_obj.id}"
                                )
                        except Exception as exc:
                            logger.warning(
                                "Apple push failed for pass %s: %s",
                                pass_obj.id,
                                exc,
                            )
                            platform_errors.append(
                                f"Apple push exception for pass {pass_obj.id}: {str(exc)[:100]}"
                            )

                    if wallet_platform in ("google", "both") and not use_broadcast:
                        # Google Wallet individual push (broadcast segments
                        # already got one class-level addMessage per card).
                        result = send_push_notification(
                            pass_obj,
                            header=title,
                            body=message,
                            action_url=pass_action_url,
                        )
                        if result.get("success"):
                            push_sent += 1
                            platform_ok = True
                            logger.info("Google push sent to pass %s", pass_obj.id)
                            if result.get("message_id"):
                                delivery_log.external_message_id = result[
                                    "message_id"
                                ]
                        else:
                            platform_errors.append(
                                f"Google push failed for pass {pass_obj.id}: {str(result.get('error', 'unknown'))[:80]}"
                            )

                if segment_id == "all" and broadcast_message_ids:
                    first_pass = passes[0] if passes else None
                    card_id = str(first_pass.card.id) if first_pass else ""
                    if card_id and card_id in broadcast_message_ids:
                        delivery_log.external_message_id = broadcast_message_ids[
                            card_id
                        ]
                        platform_ok = True

                if platform_ok:
                    delivery_log.status = DeliveryStatus.SENT
                    delivery_log.sent_at = timezone.now()
                    delivery_log.save(
                        update_fields=["status", "sent_at", "external_message_id"]
                    )
                    succeeded += 1
                else:
                    delivery_log.status = DeliveryStatus.FAILED
                    delivery_log.failed_at = timezone.now()
                    delivery_log.error_code = "WALLET_PUSH_FAILED"
                    delivery_log.error_message = "; ".join(platform_errors)[:500] or (
                        get_message("WALLET_PUSH_FAILED")
                    )
                    delivery_log.save(
                        update_fields=[
                            "status",
                            "failed_at",
                            "error_code",
                            "error_message",
                        ]
                    )
                    failed += 1
                    error_summary += "; ".join(platform_errors)[:200] + "; "

            except Exception as exc:
                error_msg = str(exc)[:500]
                logger.error("Wallet campaign failed for %s: %s", customer.id, exc)
                delivery_log.status = DeliveryStatus.FAILED
                delivery_log.failed_at = timezone.now()
                delivery_log.error_code = "WALLET_PUSH_ERROR"
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
    except Exception as exc:
        error_summary = str(exc)[:500]
        logger.exception("Wallet campaign failed before completion")
        raise
    finally:
        campaign_run.sent_count = succeeded
        campaign_run.failed_count = failed
        campaign_run.status = (
            CampaignStatus.FAILED if error_summary else CampaignStatus.COMPLETED
        )
        campaign_run.completed_at = timezone.now()
        campaign_run.error_summary = error_summary
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
        "Wallet campaign complete: %d/%d (google_push: %d, apple_push: %d)",
        succeeded,
        total,
        push_sent,
        apple_push_sent,
    )
    return {
        "success": True,
        "campaign_run_id": str(campaign_run.id),
        "attempted": total,
        "succeeded": succeeded,
        "failed": failed,
        "google_push_sent": push_sent,
        "apple_push_sent": apple_push_sent,
    }
