"""
Loyallia — Customers Celery Tasks
Async pass generation and update tasks.
"""
import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    queue="pass_generation",
    name="apps.customers.tasks.generate_qr_for_pass",
)
def generate_qr_for_pass(self, customer_pass_id: str) -> dict:
    """
    Generate and store a QR code image for a CustomerPass.
    Called after enrollment to produce the scannable QR image.

    Args:
        customer_pass_id: UUID string of the CustomerPass

    Returns:
        dict with qr_url and success flag
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
    max_retries=3,
    default_retry_delay=30,
    queue="pass_generation",
    name="apps.customers.tasks.trigger_pass_update",
)
def trigger_pass_update(self, customer_pass_id: str) -> dict:
    """
    Trigger digital wallet pass update after a transaction.
    Sends push notification with 'pass updated' payload for Apple/Google Wallet refresh.

    Apple Wallet: PKPushPayload → triggers passbook device update webhook.
    Google Wallet: Patch the object via Wallet API (requires Google SA JSON).

    For now, sends a push notification to the customer's device
    informing the wallet app to re-fetch the pass.

    Args:
        customer_pass_id: UUID string of CustomerPass

    Returns:
        dict with success status
    """
    import uuid

    from apps.customers.models import CustomerPass
    from apps.notifications.models import Notification, NotificationChannel, NotificationType
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
    max_retries=2,
    default_retry_delay=120,
    queue="pass_generation",
    name="apps.customers.tasks.update_customer_analytics",
)
def update_customer_analytics(self, customer_id: str) -> dict:
    """
    Recalculate and store analytics for a single customer.
    Called after each transaction to keep analytics fresh.

    Args:
        customer_id: UUID string of Customer

    Returns:
        dict with success status
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
