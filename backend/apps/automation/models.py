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
    """Actions that can be automated."""

    SEND_NOTIFICATION = "send_notification", "Send Notification"
    SEND_EMAIL = "send_email", "Send Email"
    SEND_SMS = "send_sms", "Send SMS"
    ISSUE_REWARD = "issue_reward", "Issue Reward"
    UPDATE_SEGMENT = "update_segment", "Update Segment"
    CREATE_CAMPAIGN = "create_campaign", "Create Campaign"


class Automation(models.Model):
    """
    Automated workflow for customer engagement.
    Triggers actions based on events or schedules.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
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

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "loyallia_automations"
        verbose_name = "Automatización"
        verbose_name_plural = "Automatizaciones"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.name} - {self.trigger} → {self.action}"

    def can_execute_for_customer(self, customer) -> bool:
        """Check if this automation can execute for a given customer."""
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

        # Check cooldown
        if self.last_executed and self.cooldown_hours > 0:
            from datetime import timedelta

            from django.utils import timezone

            cooldown_end = self.last_executed + timedelta(hours=self.cooldown_hours)
            if timezone.now() < cooldown_end:
                return False

        return True

    def execute(self, customer, context=None) -> bool:
        """
        Execute the automation for a customer.
        Returns True if successful.
        Enforces max_executions_per_day limit if configured.
        """
        if not self.can_execute_for_customer(customer):
            return False

        # Enforce max_executions_per_day limit
        if self.max_executions_per_day is not None and self.max_executions_per_day > 0:
            from datetime import timedelta
            from django.utils import timezone

            today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
            executions_today = self.executions.filter(
                executed_at__gte=today_start
            ).count()
            if executions_today >= self.max_executions_per_day:
                return False

        try:
            success = False

            if self.action == AutomationAction.SEND_NOTIFICATION:
                success = self._execute_send_notification(customer, context)
            elif self.action == AutomationAction.SEND_EMAIL:
                success = self._execute_send_email(customer, context)
            elif self.action == AutomationAction.SEND_SMS:
                success = self._execute_send_sms(customer, context)
            elif self.action == AutomationAction.ISSUE_REWARD:
                success = self._execute_issue_reward(customer, context)
            elif self.action == AutomationAction.UPDATE_SEGMENT:
                success = self._execute_update_segment(customer, context)

            if success:
                self.total_executions += 1
                from django.utils import timezone

                self.last_executed = timezone.now()
                self.save(update_fields=["total_executions", "last_executed"])

            return success
        except Exception as e:
            # Log error but don't crash
            import logging

            logger = logging.getLogger(__name__)
            logger.error("Automation execution failed: %s", e)
            return False

    def _execute_send_notification(self, customer, context) -> bool:
        """Send notification to customer."""
        from apps.notifications.models import Notification, NotificationChannel, NotificationType
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
        """Send email to customer."""
        # Implementation would use email service
        return True

    def _execute_send_sms(self, customer, context) -> bool:
        """Send SMS to customer."""
        # Implementation would use SMS service
        return True

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

    def __str__(self) -> str:
        return f"{self.automation.name} → {self.customer.full_name}"
