"""
Loyallia — Notification Service
Handles sending push notifications, emails, and SMS.
"""

import logging

from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils import timezone

from apps.customers.models import Customer, CustomerPass
from apps.notifications.models import (
    Notification,
    NotificationChannel,
    NotificationType,
)
from apps.tenants.models import Tenant
from common.messages import get_message

logger = logging.getLogger(__name__)


class NotificationService:
    """Service to manage sending notifications across multiple channels."""

    @staticmethod
    def send_reward_notification(
        customer_pass: CustomerPass,
        reward_type: str,
        reward_description: str,
        tenant: Tenant,
    ) -> Notification:
        """Send notification when customer earns a reward."""
        notification = Notification.objects.create(
            tenant=tenant,
            customer=customer_pass.customer,
            customer_pass=customer_pass,
            notification_type=NotificationType.REWARD_EARNED,
            channel=NotificationChannel.PUSH,
            title="¡Recompensa ganada!",
            message=f"¡Felicitaciones! {reward_description}",
            notification_data={
                "reward_type": reward_type,
                "card_id": str(customer_pass.card.id),
            },
        )

        # Send immediately
        NotificationService.send_notification(notification)
        return notification

    @staticmethod
    def send_reward_ready_notification(
        customer_pass: CustomerPass, tenant: Tenant
    ) -> Notification:
        """Send notification when reward is ready for redemption."""
        card_name = customer_pass.card.name
        notification = Notification.objects.create(
            tenant=tenant,
            customer=customer_pass.customer,
            customer_pass=customer_pass,
            notification_type=NotificationType.REWARD_READY,
            channel=NotificationChannel.PUSH,
            title="¡Tu recompensa está lista!",
            message=f"Visita {card_name} para reclamar tu recompensa",
            action_url=f"/passes/{customer_pass.id}/redeem",
            notification_data={
                "card_id": str(customer_pass.card.id),
            },
        )

        NotificationService.send_notification(notification)
        return notification

    @staticmethod
    def send_reminder_notification(customer: Customer, tenant: Tenant) -> Notification:
        """Send reminder to visit a program."""
        programs = customer.passes.filter(is_active=True)
        if programs.exists():
            program = programs.first()
            notification = Notification.objects.create(
                tenant=tenant,
                customer=customer,
                customer_pass=program,
                notification_type=NotificationType.REMINDER,
                channel=NotificationChannel.PUSH,
                title="¿Vuelve pronto?",
                message=f"Tienes un pase activo en {program.card.name}. ¡Ven a visitarnos!",
                action_url=f"/passes/{program.id}",
                notification_data={
                    "days_since_last_visit": (
                        (timezone.now() - customer.last_visit).days
                        if customer.last_visit
                        else -1
                    ),
                },
            )

            NotificationService.send_notification(notification)
            return notification

        return None

    @staticmethod
    def send_birthday_notification(customer, tenant) -> "Notification":
        """Send birthday push to customer for any active loyalty pass they hold."""
        # Use any active pass for the notification context
        active_pass = (
            customer.passes.filter(is_active=True).select_related("card").first()
        )
        if not active_pass:
            logger.info(
                "No active passes for birthday customer %s — skipping birthday push.",
                customer.id,
            )
            return None

        notification = Notification.objects.create(
            tenant=tenant,
            customer=customer,
            customer_pass=active_pass,
            notification_type=NotificationType.BIRTHDAY,
            channel=NotificationChannel.PUSH,
            title=get_message("NOTIFICATION_BIRTHDAY_TITLE"),
            message=get_message(
                "NOTIFICATION_BIRTHDAY_MSG", program_name=active_pass.card.name
            ),
            action_url=f"/passes/{active_pass.id}",
            notification_data={"offer_type": "birthday"},
        )

        NotificationService.send_notification(notification)

        # Also try to send via Google Wallet Push API
        try:
            from apps.customers.pass_engine.google_pass import send_push_notification

            send_push_notification(
                active_pass,
                header=notification.title,
                body=notification.message,
                action_url="",
            )
        except Exception as e:
            logger.warning(f"Google Wallet push failed: {e}")

        return notification

    @staticmethod
    def send_notification(notification: Notification) -> bool:
        """
        Send a notification through the configured channel.
        Returns True if sent successfully.
        """
        try:
            if notification.channel == NotificationChannel.PUSH:
                return NotificationService._send_push_notification(notification)
            elif notification.channel == NotificationChannel.EMAIL:
                return NotificationService._send_email_notification(notification)
            elif notification.channel == NotificationChannel.SMS:
                return NotificationService._send_sms_notification(notification)
            elif notification.channel == NotificationChannel.IN_APP:
                # In-app notifications don't need external sending
                notification.mark_as_sent()
                return True
        except Exception as e:
            logger.error(f"Failed to send notification {notification.id}: {str(e)}")
            return False

        return False

    @staticmethod
    def _send_push_notification(notification: Notification) -> bool:
        """Send push notification via APNs (iOS) and FCM (Android) dispatcher."""
        from apps.notifications.push.dispatcher import dispatch_push

        delivered = dispatch_push(notification)

        if delivered > 0:
            notification.mark_as_sent()
            return True

        # No devices reached — mark as sent anyway to avoid re-dispatch loops
        # (the dispatcher logs specific reasons)
        notification.mark_as_sent()
        return False

    @staticmethod
    def _send_email_notification(notification: Notification) -> bool:
        """Send email notification."""
        from django.conf import settings as django_settings

        try:
            html_message = render_to_string(
                "emails/notification.html",
                {
                    "title": notification.title,
                    "message": notification.message,
                    "action_url": notification.action_url,
                    "image_url": notification.image_url,
                },
            )

            send_mail(
                subject=notification.title,
                message=notification.message,
                from_email=django_settings.DEFAULT_FROM_EMAIL,
                recipient_list=[notification.customer.email],
                html_message=html_message,
            )

            notification.mark_as_sent()
            return True
        except Exception as e:
            logger.error(f"Failed to send email: {str(e)}")
            return False

    @staticmethod
    def _send_sms_notification(notification: Notification) -> bool:
        """Send SMS notification."""
        try:
            phone = notification.customer.phone
            if not phone:
                logger.warning(
                    f"No phone number for customer {notification.customer.id}"
                )
                return False

            # In production, use Twilio or similar service
            logger.info(f"Would send SMS to {phone}: {notification.message}")

            notification.mark_as_sent()
            return True
        except Exception as e:
            logger.error(f"Failed to send SMS: {str(e)}")
            return False

    @staticmethod
    def send_bulk_notifications(
        customers: list[Customer],
        title: str,
        message: str,
        notification_type: NotificationType,
        tenant: Tenant,
        action_url: str = "",
        image_url: str = "",
    ) -> int:
        """Send bulk notifications to multiple customers."""
        sent_count = 0

        for customer in customers:
            try:
                notification = Notification.objects.create(
                    tenant=tenant,
                    customer=customer,
                    notification_type=notification_type,
                    channel=NotificationChannel.PUSH,
                    title=title,
                    message=message,
                    action_url=action_url,
                    image_url=image_url,
                )

                if NotificationService.send_notification(notification):
                    sent_count += 1
            except Exception as e:
                logger.error(
                    f"Failed to send notification to customer {customer.id}: {str(e)}"
                )

        return sent_count
