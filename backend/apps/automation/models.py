"""
Loyallia — Automation Models
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
    SCHEDULED_TIME = "scheduled_time", "Scheduled Time"


class AutomationAction(models.TextChoices):
    """Actions that can be automated.

    LYL-SRS-009: All actions have REAL implementations — no stubs.
    """

    SEND_NOTIFICATION = "send_notification", "Send Push Notification"
    SEND_EMAIL = "send_email", "Send Email"
    SEND_SMS = "send_sms", "Send SMS (Twilio)"
    SEND_WHATSAPP = "send_whatsapp", "Send WhatsApp"
    ISSUE_REWARD = "issue_reward", "Issue Reward"
    UPDATE_SEGMENT = "update_segment", "Update Segment"
    SEND_WALLET = "send_wallet", "Send Wallet Push"


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
    )

    # Basic info
    name = models.CharField(max_length=200, verbose_name="Nombre")
    description = models.TextField(blank=True, default="", verbose_name="Descripción")

    # Trigger configuration
    trigger = models.CharField(
        max_length=30, choices=AutomationTrigger.choices, verbose_name="Disparador"
    )
    trigger_config = models.JSONField(
        default=dict, verbose_name="Configuración del disparador"
    )

    # Action configuration
    action = models.CharField(
        max_length=30, choices=AutomationAction.choices, verbose_name="Acción"
    )
    action_config = models.JSONField(
        default=dict, verbose_name="Configuración de la acción"
    )

    # Targeting
    target_programs = models.ManyToManyField(
        Card, blank=True, related_name="automations", verbose_name="Programas objetivo"
    )
    target_segments = models.JSONField(
        default=list, verbose_name="Segmentos objetivo"
    )  # List of segment names

    # Scheduling
    is_active = models.BooleanField(default=True, verbose_name="Activo")
    schedule_config = models.JSONField(
        default=dict, verbose_name="Configuración de horario"
    )  # For scheduled automations

    # Limits and throttling
    max_executions_per_day = models.PositiveIntegerField(
        null=True, blank=True, verbose_name="Ejecuciones máximas por día"
    )
    cooldown_hours = models.PositiveIntegerField(
        default=24,
        validators=[MinValueValidator(1)],
        verbose_name="Horas de enfriamiento",
    )

    # Analytics
    total_executions = models.PositiveIntegerField(
        default=0, verbose_name="Ejecuciones totales"
    )
    last_executed = models.DateTimeField(
        null=True, blank=True, verbose_name="Última ejecución"
    )

    class Meta:  # pyright: ignore[reportIncompatibleVariableOverride]
        db_table = "loyallia_automations"
        verbose_name = "Automatización"
        verbose_name_plural = "Automatizaciones"
        ordering = ["-created_at"]

    def __repr__(self) -> str:
        return f"<Automation: {self.name} - {self.trigger} → {self.action}>"

    def __str__(self) -> str:
        return f"{self.name} - {self.trigger} → {self.action}"

    def can_execute_for_customer(self, customer) -> bool:
        """Check if this automation can execute for a given customer.

        LYL-H-API-011: Uses per-customer cooldown instead of global cooldown.
        The cooldown is checked against the last execution for THIS customer,
        not the global last_executed timestamp.
        """
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

        # LYL-H-API-011: Per-customer cooldown (not global)
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
        LYL-H-API-016: Enforces max_executions_per_day limit.
        LYL-M-API-020: Uses F() expression to prevent lost updates on counter.
        """
        if not self.can_execute_for_customer(customer):
            return False

        # LYL-H-API-016: Enforce max_executions_per_day limit
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

            if success:
                # LYL-M-API-020: Use F() to prevent lost updates under concurrency
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

        LYL-SRS-009: Real implementation using EmailMultiAlternatives.
        Uses tenant branding (name, primary_color) for professional templates.
        """
        if not customer.email:
            return False

        from django.conf import settings
        from django.core.mail import EmailMultiAlternatives

        from apps.notifications.models import (
            Notification,
            NotificationChannel,
            NotificationType,
        )

        subject = self.action_config.get("title", "Notificación")
        body_text = self.action_config.get("message", "")
        from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@loyallia.com")
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

        html_content = f"""<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
body {{ margin:0; padding:0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background:#f4f4f8; color:#1e293b; }}
.container {{ max-width:560px; margin:40px auto; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08); }}
.header {{ background: linear-gradient(135deg, {primary_color} 0%, #312e81 100%); padding:32px 24px; text-align:center; color:#fff; }}
.header h1 {{ margin:0 0 4px; font-size:22px; font-weight:700; }}
.content {{ padding:28px 24px; }}
.content p {{ margin:0 0 16px; font-size:14px; line-height:1.65; color:#475569; }}
.footer {{ padding:20px 24px; text-align:center; background:#f8fafc; border-top:1px solid #f1f5f9; }}
.footer p {{ margin:0; font-size:11px; color:#94a3b8; }}
</style></head>
<body>
<div class="container">
<div class="header"><h1>{self.tenant.name}</h1></div>
<div class="content"><p>{body_text}</p></div>
<div class="footer"><p>Powered by Loyallia — Intelligent Rewards</p></div>
</div>
</body></html>"""

        try:
            msg = EmailMultiAlternatives(
                subject=subject, body=body_text, from_email=from_email, to=[customer.email]
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
        """Send SMS via Twilio to customer.

        LYL-SRS-009: Real implementation using apps.notifications.sms.client.
        """
        if not customer.phone:
            return False

        from apps.notifications.sms.client import is_sms_available, send_sms

        if not is_sms_available():
            import logging
            logging.getLogger(__name__).warning(
                "Twilio SMS not configured — cannot send automation SMS"
            )
            return False

        title = self.action_config.get("title", "")
        message = self.action_config.get("message", "")
        full_msg = f"{title}: {message}" if title else message

        result = send_sms(phone=customer.phone, message=full_msg)
        return result.get("success", False)

    def _execute_send_whatsapp(self, customer, context) -> bool:
        """Send WhatsApp message via Baileys bridge.

        LYL-SRS-009: Real implementation using the WhatsApp bridge client.
        """
        if not customer.phone:
            return False

        from apps.notifications.whatsapp.client import is_bridge_available, send_message

        if not is_bridge_available():
            import logging
            logging.getLogger(__name__).warning(
                "WhatsApp bridge not available — cannot send automation message"
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

        LYL-SRS-009: Sends push via Google Wallet API + Apple APNs.
        """
        from apps.customers.models import CustomerPass

        passes = CustomerPass.objects.filter(
            customer=customer, is_active=True
        ).select_related("card", "card__tenant")

        if not passes.exists():
            return False

        title = self.action_config.get("title", "Notificación")
        message = self.action_config.get("message", "")
        push_sent = False

        for pass_obj in passes:
            try:
                # Google Wallet push
                from apps.customers.pass_engine.google_pass import send_push_notification

                from django.conf import settings

                action_url = f"{settings.FRONTEND_URL}/enroll/{str(pass_obj.card.id)}"
                result = send_push_notification(
                    pass_obj, header=title, body=message, action_url=action_url
                )
                if result.get("success"):
                    push_sent = True
            except Exception as exc:
                import logging
                logging.getLogger(__name__).warning(
                    "Google wallet push failed for pass %s: %s", pass_obj.id, exc
                )

            try:
                # Apple Wallet push — trigger pass re-download
                from apps.customers.pass_engine.apple_push import notify_pass_updated

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


class AutomationExecution(models.Model):
    """
    Log of automation executions for audit and analytics.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    automation = models.ForeignKey(
        Automation,
        on_delete=models.CASCADE,
        related_name="executions",
        verbose_name="Automatización",
    )
    customer = models.ForeignKey(
        Customer,
        on_delete=models.CASCADE,
        related_name="automation_executions",
        verbose_name="Cliente",
    )

    # Execution details
    trigger_event = models.CharField(max_length=50, verbose_name="Evento disparador")
    execution_context = models.JSONField(
        default=dict, verbose_name="Contexto de ejecución"
    )
    success = models.BooleanField(verbose_name="Éxito")

    # Timestamps
    executed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
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
        return f"{self.automation.name} → {self.customer.full_name}"
