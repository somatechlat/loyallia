"""
Loyallia Customers Celery Tasks (apps/customers/tasks.py)

Async pass generation, wallet update notifications, and customer analytics recalculation.

Architecture:
    All tasks run on the 'pass_generation' queue to isolate CPU-intensive QR
    generation from the main API worker pool. Each task is idempotent and
    retries with exponential backoff on failure.

Performance (Rule 12):
    - PERF: select_related used on all pass/customer lookups to prevent N+1.
    - PERF: Analytics recalculation (update_metrics) runs SQL aggregates, not Python loops.
    - PERF: QR generation is deferred to async worker so scanner response is never blocked.

Called by: Transaction endpoint (transact), Enrollment endpoint, Analytics scheduler.
"""

import logging

from celery import shared_task
from django.conf import settings

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    max_retries=settings.CELERY_MAX_RETRIES_DEFAULT,
    default_retry_delay=settings.CELERY_DEFAULT_RETRY_DELAY_MEDIUM,
    queue="pass_generation",
    name="apps.customers.tasks.generate_qr_for_pass",
)
def generate_qr_for_pass(self, customer_pass_id: str) -> dict:
    """Generate and store a QR code image for a CustomerPass.

    Called after enrollment to produce the scannable HMAC-signed QR image.
    PERF: select_related loads customer+card in one JOIN for QR data assembly.
    Retry: 3 attempts with 60s delay on failure.
    """
    import uuid

    from apps.customers.models import CustomerPass
    from apps.customers.pass_engine.qr_generator import generate_and_store_qr

    try:
        pass_obj = CustomerPass.objects.select_related("customer", "card").get(
            id=uuid.UUID(customer_pass_id)
        )
    except CustomerPass.DoesNotExist:
        logger.error("generate_qr_for_pass: pass %s not found", customer_pass_id)
        return {"success": False, "error": "Pass not found"}

    try:
        qr_url = generate_and_store_qr(pass_obj)
        logger.info(
            "QR generated for pass %s → %s",
            customer_pass_id,
            qr_url,
        )
        return {"success": True, "qr_url": qr_url}

    except Exception as exc:
        logger.error("QR generation failed for pass %s: %s", customer_pass_id, exc)
        raise self.retry(exc=exc)


@shared_task(
    bind=True,
    max_retries=settings.CELERY_MAX_RETRIES_DEFAULT,
    default_retry_delay=settings.CELERY_DEFAULT_RETRY_DELAY_SHORT,
    queue="pass_generation",
    name="apps.customers.tasks.trigger_pass_update",
)
def trigger_pass_update(self, customer_pass_id: str) -> dict:
    """Trigger digital wallet pass update after a transaction.

    Sends a push notification that tells the wallet app to re-fetch the pass.
    Apple Wallet: PKPushPayload triggers passbook device update webhook.
    Google Wallet: Patches the object via Wallet API.

    PERF: select_related loads pass+customer+card+tenant in one JOIN.
    Retry: 3 attempts with 30s delay.
    """
    import uuid

    from apps.customers.models import CustomerPass
    from apps.notifications.models import (
        Notification,
        NotificationChannel,
        NotificationType,
    )
    from apps.notifications.service import NotificationService

    try:
        pass_obj = CustomerPass.objects.select_related(
            "customer", "card", "card__tenant"
        ).get(id=uuid.UUID(customer_pass_id))
    except CustomerPass.DoesNotExist:
        logger.error("trigger_pass_update: pass %s not found", customer_pass_id)
        return {"success": False, "error": "Pass not found"}

    try:
        tenant = pass_obj.card.tenant
        customer = pass_obj.customer

        # 1. Google Wallet: silently PATCH object data first
        try:
            from apps.customers.pass_engine.google_pass import update_wallet_object

            gw_result = update_wallet_object(pass_obj)
            if gw_result.get("success"):
                logger.info(
                    "Google Wallet object updated for pass %s", customer_pass_id
                )
            else:
                logger.warning(
                    "Google Wallet object update failed for pass %s: %s",
                    customer_pass_id,
                    gw_result.get("error", "unknown"),
                )
        except Exception as exc:
            logger.warning(
                "Google Wallet object update error for pass %s: %s",
                customer_pass_id,
                exc,
            )

        # 2. Apple Wallet: send empty APNs background push
        try:
            from apps.customers.pass_engine.apple_push import notify_pass_updated

            apple_count = notify_pass_updated(pass_obj)
            if apple_count > 0:
                logger.info(
                    "Apple Wallet push sent to %d device(s) for pass %s",
                    apple_count,
                    customer_pass_id,
                )
        except Exception as exc:
            logger.warning(
                "Apple Wallet push error for pass %s: %s", customer_pass_id, exc
            )

        # 3. In-app push notification (secondary channel)
        notification = Notification.objects.create(
            tenant=tenant,
            customer=customer,
            customer_pass=pass_obj,
            notification_type=NotificationType.SYSTEM,
            channel=NotificationChannel.PUSH,
            title=pass_obj.card.name,
            message="Tu tarjeta ha sido actualizada.",
            notification_data={
                "action": "pass_update",
                "pass_id": str(pass_obj.id),
                "card_type": pass_obj.card.card_type,
            },
        )

        NotificationService.send_notification(notification)

        logger.info("Pass update notification sent for pass %s", customer_pass_id)
        return {"success": True}

    except Exception as exc:
        logger.error("trigger_pass_update failed for %s: %s", customer_pass_id, exc)
        raise self.retry(exc=exc)


@shared_task(
    bind=True,
    max_retries=settings.CELERY_MAX_RETRIES_LOW,
    default_retry_delay=settings.CELERY_DEFAULT_RETRY_DELAY_LONG,
    queue="pass_generation",
    name="apps.customers.tasks.update_customer_analytics",
)
def update_customer_analytics(self, customer_id: str) -> dict:
    """Recalculate and store analytics for a single customer.

    Called after each transaction to keep pre-computed analytics fresh.
    PERF: update_metrics() uses SQL aggregates internally.
    select_related("tenant") prevents extra query for tenant FK.
    """
    import uuid

    from apps.analytics.models import CustomerAnalytics
    from apps.customers.models import Customer

    try:
        customer = Customer.objects.select_related("tenant").get(
            id=uuid.UUID(customer_id)
        )
    except Customer.DoesNotExist:
        logger.error("update_customer_analytics: customer %s not found", customer_id)
        return {"success": False}

    analytics, _ = CustomerAnalytics.objects.get_or_create(
        customer=customer,
        defaults={"tenant": customer.tenant},
    )
    analytics.update_metrics()

    logger.debug("Analytics updated for customer %s", customer_id)
    return {"success": True}


# ---------------------------------------------------------------------------
# GOOGLE WALLET ASYNC HTTP TASKS
# Moved from request threads to Celery to avoid blocking WSGI workers.
# ---------------------------------------------------------------------------


@shared_task(
    bind=True,
    max_retries=settings.CELERY_MAX_RETRIES_DEFAULT,
    default_retry_delay=settings.CELERY_DEFAULT_RETRY_DELAY_SHORT,
    queue="pass_generation",
    name="apps.customers.tasks.update_loyalty_class_async",
)
def update_loyalty_class_async(self, card_id: str, base_url: str = "") -> dict:
    """Upsert a Google Wallet Loyalty/Offer/GiftCard class via HTTP.

    Called when a Card is updated so Google Wallet reflects new branding.
    """
    from apps.cards.models import Card
    from apps.customers.pass_engine.google_pass import update_loyalty_class

    try:
        card = Card.objects.get(id=card_id)
    except Card.DoesNotExist:
        logger.error("update_loyalty_class_async: card %s not found", card_id)
        return {"success": False, "error": "Card not found"}

    try:
        return update_loyalty_class(card, base_url=base_url)
    except Exception as exc:
        logger.error("update_loyalty_class_async failed for %s: %s", card_id, exc)
        raise self.retry(exc=exc)


@shared_task(
    bind=True,
    max_retries=settings.CELERY_MAX_RETRIES_DEFAULT,
    default_retry_delay=settings.CELERY_DEFAULT_RETRY_DELAY_SHORT,
    queue="pass_generation",
    name="apps.customers.tasks.update_wallet_object_async",
)
def update_wallet_object_async(self, customer_pass_id: str, base_url: str = "") -> dict:
    """PATCH a Google Wallet Object with updated pass data."""
    import uuid

    from apps.customers.models import CustomerPass
    from apps.customers.pass_engine.google_pass import update_wallet_object

    try:
        pass_obj = CustomerPass.objects.select_related(
            "customer", "card", "card__tenant"
        ).get(id=uuid.UUID(customer_pass_id))
    except CustomerPass.DoesNotExist:
        logger.error("update_wallet_object_async: pass %s not found", customer_pass_id)
        return {"success": False, "error": "Pass not found"}

    try:
        return update_wallet_object(pass_obj, base_url=base_url)
    except Exception as exc:
        logger.error(
            "update_wallet_object_async failed for %s: %s", customer_pass_id, exc
        )
        raise self.retry(exc=exc)


@shared_task(
    bind=True,
    max_retries=settings.CELERY_MAX_RETRIES_DEFAULT,
    default_retry_delay=settings.CELERY_DEFAULT_RETRY_DELAY_SHORT,
    queue="pass_generation",
    name="apps.customers.tasks.send_google_push_notification_async",
)
def send_google_push_notification_async(
    self,
    customer_pass_id: str,
    header: str,
    body: str,
    action_url: str = "",
) -> dict:
    """Send a Google Wallet push notification via the Add Message API."""
    import uuid

    from apps.customers.models import CustomerPass
    from apps.customers.pass_engine.google_pass import send_push_notification

    try:
        pass_obj = CustomerPass.objects.select_related(
            "customer", "card", "card__tenant"
        ).get(id=uuid.UUID(customer_pass_id))
    except CustomerPass.DoesNotExist:
        logger.error(
            "send_google_push_notification_async: pass %s not found",
            customer_pass_id,
        )
        return {"success": False, "error": "Pass not found"}

    try:
        return send_push_notification(
            pass_obj, header=header, body=body, action_url=action_url
        )
    except Exception as exc:
        logger.error(
            "send_google_push_notification_async failed for %s: %s",
            customer_pass_id,
            exc,
        )
        raise self.retry(exc=exc)


@shared_task(
    bind=True,
    max_retries=settings.CELERY_MAX_RETRIES_DEFAULT,
    default_retry_delay=settings.CELERY_DEFAULT_RETRY_DELAY_SHORT,
    queue="pass_generation",
    name="apps.customers.tasks.delete_wallet_class_async",
)
def delete_wallet_class_async(self, card_id: str) -> dict:
    """Delete a Google Wallet Class when a Card is permanently removed."""
    from apps.cards.models import Card
    from apps.customers.pass_engine.google_pass import delete_wallet_class

    try:
        card = Card.objects.get(id=card_id)
    except Card.DoesNotExist:
        logger.error("delete_wallet_class_async: card %s not found", card_id)
        return {"success": False, "error": "Card not found"}

    try:
        return delete_wallet_class(card)
    except Exception as exc:
        logger.error("delete_wallet_class_async failed for %s: %s", card_id, exc)
        raise self.retry(exc=exc)
