"""
Loyallia — Automation Service Layer
Extracted business logic from automation API views and engine.
"""

import logging
from datetime import timedelta

from django.utils import timezone

from apps.automation.models import (
    Automation,
    AutomationAction,
    AutomationExecution,
    AutomationTrigger,
)
from apps.cards.models import Card

logger = logging.getLogger(__name__)


class AutomationService:
    """Service class encapsulating automation business logic."""

    @staticmethod
    def fire_trigger(tenant, trigger_type, customer, context=None):
        """
        Fire all active automations matching a trigger for a customer.

        Args:
            tenant: Tenant instance
            trigger_type: AutomationTrigger value (e.g. "customer_enrolled")
            customer: Customer instance
            context: Optional dict of event context

        Returns:
            Number of automations successfully executed
        """
        matching = Automation.objects.filter(
            tenant=tenant,
            trigger=trigger_type,
            is_active=True,
        ).prefetch_related("target_programs")

        executed = 0
        ctx = context or {}

        for automation in matching:
            if not automation.can_execute_for_customer(customer):
                continue

            success = automation.execute(customer, ctx)

            AutomationExecution.objects.create(
                automation=automation,
                customer=customer,
                trigger_event=trigger_type,
                execution_context=ctx,
                success=success,
            )

            if success:
                executed += 1

        logger.debug(
            "fire_trigger: trigger=%s customer=%s tenant=%s → %d/%d executed",
            trigger_type,
            customer.id,
            tenant.id,
            executed,
            matching.count(),
        )
        return executed

    @staticmethod
    def evaluate_rules(tenant, trigger_type, customer):
        """
        Evaluate which automation rules match for a trigger + customer.

        Args:
            tenant: Tenant instance
            trigger_type: AutomationTrigger value
            customer: Customer instance

        Returns:
            list of Automation instances that can execute for this customer
        """
        matching = Automation.objects.filter(
            tenant=tenant,
            trigger=trigger_type,
            is_active=True,
        ).prefetch_related("target_programs")

        eligible = []
        for automation in matching:
            if automation.can_execute_for_customer(customer):
                eligible.append(automation)

        return eligible

    @staticmethod
    def create_automation(tenant, data):
        """
        Create a new automation with validation.

        Args:
            tenant: Tenant instance
            data: dict with automation configuration

        Returns:
            Automation instance

        Raises:
            ValueError: If trigger or action is invalid
        """
        if data.get("trigger") not in [c[0] for c in AutomationTrigger.choices]:
            raise ValueError(f"Invalid trigger: {data.get('trigger')}")
        if data.get("action") not in [c[0] for c in AutomationAction.choices]:
            raise ValueError(f"Invalid action: {data.get('action')}")

        automation = Automation.objects.create(
            tenant=tenant,
            name=data["name"],
            description=data.get("description", ""),
            trigger=data["trigger"],
            trigger_config=data.get("trigger_config", {}),
            action=data["action"],
            action_config=data.get("action_config", {}),
            schedule_config=data.get("schedule_config", {}),
            max_executions_per_day=data.get("max_executions_per_day"),
            cooldown_hours=data.get("cooldown_hours", 24),
        )

        # Set target programs
        program_ids = data.get("target_program_ids", [])
        if program_ids:
            programs = Card.objects.filter(id__in=program_ids, tenant=tenant)
            automation.target_programs.set(programs)

        # Set target segments
        segments = data.get("target_segments", [])
        if segments:
            automation.target_segments = segments
            automation.save()

        return automation

    @staticmethod
    def update_automation(automation, data):
        """
        Update automation fields safely.

        Args:
            automation: Automation instance
            data: dict with fields to update

        Returns:
            Updated Automation instance
        """
        update_fields = []
        field_map = {
            "name": "name",
            "description": "description",
            "trigger_config": "trigger_config",
            "action_config": "action_config",
            "schedule_config": "schedule_config",
            "max_executions_per_day": "max_executions_per_day",
            "cooldown_hours": "cooldown_hours",
            "is_active": "is_active",
            "target_segments": "target_segments",
        }

        for field, attr in field_map.items():
            if field in data and data[field] is not None:
                setattr(automation, attr, data[field])
                update_fields.append(attr)

        # Handle target programs separately (M2M)
        if "target_program_ids" in data and data["target_program_ids"] is not None:
            programs = Card.objects.filter(
                id__in=data["target_program_ids"], tenant=automation.tenant
            )
            automation.target_programs.set(programs)

        if update_fields:
            automation.save(update_fields=update_fields)

        return automation

    @staticmethod
    def execute_manually(automation, customer, context=None):
        """
        Manually execute an automation for a specific customer.

        Args:
            automation: Automation instance
            customer: Customer instance
            context: Optional execution context

        Returns:
            dict with success status
        """
        ctx = context or {"manual": True}
        success = automation.execute(customer, ctx)

        AutomationExecution.objects.create(
            automation=automation,
            customer=customer,
            trigger_event="manual_execution",
            execution_context=ctx,
            success=success,
        )

        return {"success": success}

    @staticmethod
    def get_stats(tenant):
        """
        Get overall automation statistics for a tenant.

        Args:
            tenant: Tenant instance

        Returns:
            dict with automation statistics
        """
        from django.db.models import Count

        automations = Automation.objects.filter(tenant=tenant)

        total_automations = automations.count()
        active_automations = automations.filter(is_active=True).count()

        executions = AutomationExecution.objects.filter(
            automation__tenant=tenant
        )

        total_executions = executions.count()
        successful_executions = executions.filter(success=True).count()
        success_rate = (
            (successful_executions / total_executions * 100)
            if total_executions > 0
            else 0
        )

        trigger_stats = executions.values("automation__trigger").annotate(
            count=Count("id")
        )
        action_stats = executions.values("automation__action").annotate(
            count=Count("id")
        )

        return {
            "total_automations": total_automations,
            "active_automations": active_automations,
            "total_executions": total_executions,
            "successful_executions": successful_executions,
            "success_rate": success_rate,
            "trigger_breakdown": {
                item["automation__trigger"]: item["count"]
                for item in trigger_stats
            },
            "action_breakdown": {
                item["automation__action"]: item["count"]
                for item in action_stats
            },
        }
