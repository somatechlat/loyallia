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

    # Audit
    created_by = models.UUIDField(
        null=True,
        blank=True,
        verbose_name="Creado por",
        help_text="ID of the user who created this record.",
    )
    updated_by = models.UUIDField(
        null=True,
        blank=True,
        verbose_name="Actualizado por",
        help_text="ID of the user who last updated this record.",
    )

    class Meta:  # pyright: ignore[reportIncompatibleVariableOverride]
        """Model metadata and database configuration."""

        db_table = "loyallia_automations"
        verbose_name = "Automatización"
        verbose_name_plural = "Automatizaciones"
        ordering = ["-created_at"]

    def save(self, *args, **kwargs) -> None:
        from common.models import get_current_user_id

        user_id = get_current_user_id()
        if user_id and not self.created_by:
            self.created_by = user_id
        if user_id:
            self.updated_by = user_id
        super().save(*args, **kwargs)

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

            from apps.automation import engine

            success = engine.execute_automation_action(
                self, self.action, customer, context
            )

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
