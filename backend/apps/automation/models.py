"""
Loyallia Automation Models
Campaign automation, triggers, and scheduled actions.
"""

import uuid

from django.core.validators import MinValueValidator
from django.db import models

from apps.cards.models import Card
from apps.customers.models import Customer
from apps.tenants.models import Tenant
from common.models import TimestampedModel


class AutomationTrigger(models.TextChoices):
    """Events that can trigger automations."""

    CUSTOMER_ENROLLED = "customer_enrolled", "Customer Enrolled"
    TRANSACTION_COMPLETED = "transaction_completed", "Transaction Completed"
    REWARD_EARNED = "reward_earned", "Reward Earned"
    REWARD_READY = "reward_ready", "Reward Ready"
    BIRTHDAY_COMING = "birthday_coming", "Birthday Coming"
    INACTIVE_REMINDER = "inactive_reminder", "Inactive Reminder"
    MILESTONE_REACHED = "milestone_reached", "Milestone Reached"
    POINTS_THRESHOLD = "points_threshold", "Points Threshold"
    SCHEDULED_TIME = "scheduled_time", "Scheduled Time"


class AutomationAction(models.TextChoices):
    """Actions that can be automated."""

    SEND_NOTIFICATION = "send_notification", "Send Push Notification"
    SEND_EMAIL = "send_email", "Send Email"
    SEND_SMS = "send_sms", "Send SMS (Twilio)"
    SEND_WHATSAPP = "send_whatsapp", "Send WhatsApp"
    ISSUE_REWARD = "issue_reward", "Issue Reward"
    UPDATE_SEGMENT = "update_segment", "Update Segment"
    SEND_WALLET = "send_wallet", "Send Wallet Push"
    TRIGGER_WEBHOOK = "trigger_webhook", "Trigger Webhook"


class Automation(TimestampedModel):
    """
    Automated workflow for customer engagement.
    Triggers actions based on events or schedules.
    """

    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="automations",
        verbose_name="Negocio",
        help_text="The business this record belongs to.",
    )

    # Basic info
    name = models.CharField(
        max_length=200, verbose_name="Nombre", help_text="Name of this record."
    )
    description = models.TextField(
        blank=True,
        default="",
        verbose_name="Descripción",
        help_text="Description of this record.",
    )

    # Trigger configuration
    trigger = models.CharField(
        max_length=30,
        choices=AutomationTrigger.choices,
        verbose_name="Disparador",
        help_text="Trigger.",
    )
    trigger_config = models.JSONField(
        default=dict,
        verbose_name="Configuración del disparador",
        help_text="Trigger configuration stored as JSON.",
    )

    # Action configuration
    action = models.CharField(
        max_length=30,
        choices=AutomationAction.choices,
        verbose_name="Acción",
        help_text="Action performed.",
    )
    action_config = models.JSONField(
        default=dict,
        verbose_name="Configuración de la acción",
        help_text="Action configuration stored as JSON.",
    )

    # Targeting
    target_programs = models.ManyToManyField(
        Card,
        blank=True,
        related_name="automations",
        verbose_name="Programas objetivo",
        help_text="Target programs.",
    )
    target_segments = models.JSONField(
        default=list,
        verbose_name="Segmentos objetivo",
        help_text="Target customer segments.",
    )  # List of segment names

    # Scheduling
    is_active = models.BooleanField(
        default=True,
        verbose_name="Activo",
        help_text="Whether this record is currently active.",
    )
    schedule_config = models.JSONField(
        default=dict,
        verbose_name="Configuración de horario",
        help_text="Schedule configuration stored as JSON.",
    )  # For scheduled automations

    # Limits and throttling
    max_executions_per_day = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name="Ejecuciones máximas por día",
        help_text="Maximum executions allowed per day.",
    )
    cooldown_hours = models.PositiveIntegerField(
        default=24,
        validators=[MinValueValidator(1)],
        verbose_name="Horas de enfriamiento",
        help_text="Minimum hours between executions for the same customer.",
    )

    # Analytics
    total_executions = models.PositiveIntegerField(
        default=0,
        verbose_name="Ejecuciones totales",
        help_text="Total number of executions.",
    )
    last_executed = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Última ejecución",
        help_text="Timestamp of the most recent execution.",
    )

    class Meta:  # pyright: ignore[reportIncompatibleVariableOverride]
        """Model metadata and database configuration."""

        db_table = "loyallia_automations"
        verbose_name = "Automatización"
        verbose_name_plural = "Automatizaciones"
        ordering = ["-created_at"]

    def __repr__(self) -> str:
        return f"<Automation: {self.name} - {self.trigger} → {self.action}>"

    def __str__(self) -> str:
        """Return a human-readable string representation."""
        return f"{self.name} - {self.trigger} → {self.action}"

    def can_execute_for_customer(self, customer) -> bool:
        """Check if this automation can execute for a given customer.

        The cooldown is checked against the last execution for THIS customer,
        not the global last_executed timestamp.
        """
        if not self.is_active:
            return False

        from apps.analytics.models import CustomerAnalytics

        # Check if customer is in target segments
        if self.target_segments:
            try:
                analytics = CustomerAnalytics.objects.get(customer=customer)
                if analytics.segment not in self.target_segments:
                    return False
            except CustomerAnalytics.DoesNotExist:
                return False

        # Check if customer is in target programs
        if self.target_programs.exists():
            customer_programs = customer.passes.filter(
                card__in=self.target_programs, is_active=True
            )
            if not customer_programs.exists():
                return False

        if self.cooldown_hours > 0:
            from datetime import timedelta

            from django.utils import timezone

            last_for_customer = (
                AutomationExecution.objects.filter(
                    automation=self, customer=customer, success=True
                )
                .order_by("-executed_at")
                .first()
            )
            if last_for_customer:
                cooldown_end = last_for_customer.executed_at + timedelta(
                    hours=self.cooldown_hours
                )
                if timezone.now() < cooldown_end:
                    return False

        return True

    def execute(self, customer, context=None) -> bool:
        """Execute the automation for a customer.

        Returns True if successful.

        Uses F() expression to prevent lost updates on counter.
        """
        if not self.can_execute_for_customer(customer):
            return False

        # Enforce max_executions_per_day limit
        if self.max_executions_per_day is not None:
            from django.utils import timezone

            today_start = timezone.now().replace(
                hour=0, minute=0, second=0, microsecond=0
            )
            executions_today = AutomationExecution.objects.filter(
                automation=self, executed_at__gte=today_start
            ).count()
            if executions_today >= self.max_executions_per_day:
                return False

        execution_context = {
            k: v for k, v in (context or {}).items() if not str(k).startswith("_")
        }
        try:
            success = False

            if self.action == AutomationAction.SEND_NOTIFICATION:
                success = self._execute_send_notification(customer, context)
            elif self.action == AutomationAction.SEND_EMAIL:
                success = self._execute_send_email(customer, context)
            elif self.action == AutomationAction.SEND_SMS:
                success = self._execute_send_sms(customer, context)
            elif self.action == AutomationAction.SEND_WHATSAPP:
                success = self._execute_send_whatsapp(customer, context)
            elif self.action == AutomationAction.ISSUE_REWARD:
                success = self._execute_issue_reward(customer, context)
            elif self.action == AutomationAction.UPDATE_SEGMENT:
                success = self._execute_update_segment(customer, context)
            elif self.action == AutomationAction.SEND_WALLET:
                success = self._execute_send_wallet(customer, context)
            elif self.action == AutomationAction.TRIGGER_WEBHOOK:
                success = self._execute_trigger_webhook(customer, context)

            if success:
                # Use F() to prevent lost updates under concurrency
                from django.db.models import F
                from django.utils import timezone

                Automation.objects.filter(pk=self.pk).update(
                    total_executions=F("total_executions") + 1,
                    last_executed=timezone.now(),
                )
                self.refresh_from_db(fields=["total_executions", "last_executed"])

            AutomationExecution.objects.create(
                automation=self,
                customer=customer,
                trigger_event=self.trigger,
                execution_context=execution_context,
                success=success,
            )
            return success
        except Exception as e:
            # Log error but don't crash
            import logging

            logger = logging.getLogger(__name__)
            logger.error("Automation execution failed: %s", e)
            return False

    def _execute_send_notification(self, customer, context) -> bool:
        """Send notification to customer."""
        from apps.notifications.models import (
            Notification,
            NotificationChannel,
            NotificationType,
        )
        from apps.notifications.service import NotificationService

        title = self.action_config.get("title", "Notificación automática")
        message = self.action_config.get("message", "")
        notification_type = self.action_config.get(
            "notification_type", NotificationType.SYSTEM
        )

        notification = Notification.objects.create(
            tenant=self.tenant,
            customer=customer,
            notification_type=notification_type,
            channel=NotificationChannel.PUSH,
            title=title,
            message=message,
        )

        return NotificationService.send_notification(notification)

    def _execute_send_email(self, customer, context) -> bool:
        """Send branded HTML email to customer via Django SMTP.

        Uses tenant branding (name, primary_color) for professional templates.
        """
        if not customer.email:
            return False

        from django.core.mail import EmailMultiAlternatives
        from django.template.loader import render_to_string

        from apps.notifications.models import (
            Notification,
            NotificationChannel,
            NotificationType,
        )
        from common.email_config import get_default_from_email

        subject = self.action_config.get("title", "Notificación")
        body_text = self.action_config.get("message", "")
        from_email = get_default_from_email()
        primary_color = getattr(self.tenant, "primary_color", "#6366f1")

        # Create notification record for audit trail
        Notification.objects.create(
            tenant=self.tenant,
            customer=customer,
            notification_type=NotificationType.SYSTEM,
            channel=NotificationChannel.EMAIL,
            title=subject,
            message=body_text[:500],
        )

        html_content = render_to_string(
            "automation/branded_email.html",
            {
                "primary_color": primary_color,
                "tenant_name": self.tenant.name,
                "body_text": body_text,
            },
        )

        try:
            msg = EmailMultiAlternatives(
                subject=subject,
                body=body_text,
                from_email=from_email,
                to=[customer.email],
            )
            msg.attach_alternative(html_content, "text/html")
            msg.send(fail_silently=False)
            return True
        except Exception as exc:
            import logging

            logging.getLogger(__name__).error(
                "Automation email failed for %s: %s", customer.id, exc
            )
            return False

    def _execute_send_sms(self, customer, context) -> bool:
        """Send SMS via Twilio to customer."""
        if not customer.phone:
            return False

        from apps.notifications.sms.client import is_sms_available, send_sms

        if not is_sms_available():
            import logging

            logging.getLogger(__name__).warning(
                "Twilio SMS not configured  cannot send automation SMS"
            )
            return False

        title = self.action_config.get("title", "")
        message = self.action_config.get("message", "")
        full_msg = f"{title}: {message}" if title else message

        result = send_sms(phone=customer.phone, message=full_msg)
        return result.get("success", False)

    def _execute_send_whatsapp(self, customer, context) -> bool:
        """Send WhatsApp message via Baileys bridge."""
        if not customer.phone:
            return False

        from apps.notifications.whatsapp.client import is_bridge_available, send_message
        from common.plan_enforcement import check_plan_limit

        if not is_bridge_available():
            import logging

            logging.getLogger(__name__).warning(
                "WhatsApp bridge not available  cannot send automation message"
            )
            return False

        # Enforce daily WhatsApp plan limit (prevents automation bypass)
        try:
            check_plan_limit(self.tenant, "whatsapp_day", write=True)
        except Exception as e:
            import logging

            logging.getLogger(__name__).warning(
                "WhatsApp automation blocked: plan limit exceeded for tenant %s (%s)",
                self.tenant.id,
                e,
            )
            return False

        from apps.notifications.whatsapp.client import check_whatsapp_cooldown

        if check_whatsapp_cooldown(customer.phone):
            import logging

            logging.getLogger(__name__).info(
                "WhatsApp automation cooldown: skipping %s", customer.phone
            )
            return False

        title = self.action_config.get("title", "")
        message = self.action_config.get("message", "")
        full_msg = f"*{title}*\n{message}" if title else message

        try:
            result = send_message(
                tenant_id=str(self.tenant.id),
                phone=customer.phone,
                message=full_msg,
            )
            return result.get("success", False)
        except Exception as exc:
            import logging

            logging.getLogger(__name__).error(
                "Automation WhatsApp failed for %s: %s", customer.id, exc
            )
            return False

    def _execute_send_wallet(self, customer, context) -> bool:
        """Send wallet push notification to customer's active passes.

        Respects wallet_platform config: "apple", "google", or "both" (default).
        """
        from apps.customers.models import CustomerPass

        passes = CustomerPass.objects.filter(
            customer=customer, is_active=True
        ).select_related("card", "card__tenant")

        if not passes.exists():
            return False

        title = self.action_config.get("title", "Notificación")
        message = self.action_config.get("message", "")
        wallet_platform = self.action_config.get("wallet_platform", "both")
        push_sent = False

        for pass_obj in passes:
            # Google Wallet
            if wallet_platform in ("google", "both"):
                try:
                    # Fire Google Wallet updates asynchronously to avoid blocking
                    from apps.customers.tasks import (
                        send_google_push_notification_async,
                        update_wallet_object_async,
                    )

                    update_wallet_object_async.delay(str(pass_obj.id))
                    push_sent = True

                    from django.conf import settings

                    from apps.tenants.models import PlatformSetting

                    dashboard_url = PlatformSetting.get(
                        "dashboard_url", settings.PUBLIC_BASE_URL
                    )
                    action_url = f"{dashboard_url}/enroll/{str(pass_obj.card.id)}"
                    send_google_push_notification_async.delay(
                        str(pass_obj.id),
                        header=title,
                        body=message,
                        action_url=action_url,
                    )
                except Exception as exc:
                    import logging

                    logging.getLogger(__name__).warning(
                        "Google wallet enqueue failed for pass %s: %s", pass_obj.id, exc
                    )

            # Apple Wallet
            if wallet_platform in ("apple", "both"):
                try:
                    from apps.customers.pass_engine.apple_push import (
                        notify_pass_updated,
                    )

                    apple_count = notify_pass_updated(pass_obj)
                    if apple_count > 0:
                        push_sent = True
                except Exception as exc:
                    import logging

                    logging.getLogger(__name__).warning(
                        "Apple wallet push failed for pass %s: %s", pass_obj.id, exc
                    )

        return push_sent

    def _execute_issue_reward(self, customer, context) -> bool:
        """Issue a reward to customer."""
        # Find customer's pass for the program
        program_id = self.action_config.get("program_id")
        if program_id:
            try:
                card = Card.objects.get(id=program_id, tenant=self.tenant)
                customer_pass = customer.passes.get(card=card, is_active=True)

                # Process reward transaction
                result = customer_pass.process_transaction("remote_reward")
                return result.get("pass_updated", False)
            except (Card.DoesNotExist, customer.passes.model.DoesNotExist):
                return False
        return False

    def _execute_update_segment(self, customer, context) -> bool:
        """Update customer's segment."""
        new_segment = self.action_config.get("new_segment")
        if new_segment:
            from apps.analytics.models import CustomerAnalytics

            analytics, created = CustomerAnalytics.objects.get_or_create(
                customer=customer, defaults={"tenant": self.tenant}
            )
            analytics.segment = new_segment
            analytics.save(update_fields=["segment"])
            return True
        return False

    def _execute_trigger_webhook(self, customer, context) -> bool:
        """Trigger a webhook with automation context.

        Sends tenant_id, rule_id, customer_id, trigger type and timestamp.
        """
        import logging

        import requests
        from django.utils import timezone

        webhook_url = self.action_config.get("webhook_url")
        if not webhook_url:
            logging.getLogger(__name__).warning(
                "No webhook URL configured for automation %s", self.id
            )
            return False

        payload = {
            "tenant_id": str(getattr(self, "tenant_id", None)),
            "automation_id": str(self.id),
            "automation_name": self.name,
            "customer_id": str(customer.id),
            "customer_name": f"{customer.first_name} {customer.last_name}".strip(),
            "customer_email": getattr(customer, "email", None),
            "customer_phone": getattr(customer, "phone", None),
            "trigger": self.trigger,
            "trigger_config": self.trigger_config,
            "timestamp": timezone.now().isoformat(),
            "context": {
                k: v for k, v in (context or {}).items() if not str(k).startswith("_")
            },
        }

        try:
            headers = {"Content-Type": "application/json"}
            # Support custom headers from action_config
            custom_headers = self.action_config.get("headers", {})
            if custom_headers:
                headers.update(custom_headers)

            response = requests.post(
                webhook_url,
                json=payload,
                headers=headers,
                timeout=30,
            )
            response.raise_for_status()
            logging.getLogger(__name__).info(
                "Webhook triggered successfully: %s (automation=%s, customer=%s, status=%d)",
                webhook_url,
                self.id,
                customer.id,
                response.status_code,
            )
            return True
        except requests.exceptions.Timeout:
            logging.getLogger(__name__).error(
                "Webhook timeout: %s (automation=%s, customer=%s)",
                webhook_url,
                self.id,
                customer.id,
            )
            return False
        except requests.RequestException as e:
            logging.getLogger(__name__).error(
                "Webhook trigger failed: %s (automation=%s, customer=%s) - %s",
                webhook_url,
                self.id,
                customer.id,
                str(e),
            )
            return False


class AutomationExecution(models.Model):
    """
    Log of automation executions for audit and analytics.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier for this record.",
    )
    automation = models.ForeignKey(
        Automation,
        on_delete=models.CASCADE,
        related_name="executions",
        verbose_name="Automatización",
        help_text="The automation rule that was executed.",
    )
    customer = models.ForeignKey(
        Customer,
        on_delete=models.CASCADE,
        related_name="automation_executions",
        verbose_name="Cliente",
        help_text="The customer associated with this record.",
    )

    # Execution details
    trigger_event = models.CharField(
        max_length=50,
        verbose_name="Evento disparador",
        help_text="Event that triggered this execution.",
    )
    execution_context = models.JSONField(
        default=dict,
        verbose_name="Contexto de ejecución",
        help_text="Execution context stored as JSON.",
    )
    success = models.BooleanField(
        verbose_name="Éxito", help_text="Whether the execution or operation succeeded."
    )

    # Timestamps
    executed_at = models.DateTimeField(
        auto_now_add=True, help_text="Timestamp when this execution occurred."
    )

    class Meta:
        """Model metadata and database configuration."""

        db_table = "loyallia_automation_executions"
        verbose_name = "Ejecución de automatización"
        verbose_name_plural = "Ejecuciones de automatizaciones"
        ordering = ["-executed_at"]
        indexes = [
            models.Index(fields=["automation", "-executed_at"]),
            models.Index(fields=["customer", "-executed_at"]),
        ]

    def __repr__(self) -> str:
        return (
            f"<AutomationExecution: {self.automation.name} → {self.customer.full_name}>"
        )

    def __str__(self) -> str:
        """Return a human-readable string representation."""
        return f"{self.automation.name} → {self.customer.full_name}"
