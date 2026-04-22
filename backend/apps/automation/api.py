"""
Loyallia — Automation API router
Campaign automation and workflow management.
"""
from ninja import Router
from ninja.errors import HttpError
from pydantic import BaseModel
from typing import List, Optional
from django.shortcuts import get_object_or_404
from django.db.models import Count

from common.permissions import jwt_auth, is_owner
from common.messages import get_message
from apps.automation.models import Automation, AutomationTrigger, AutomationAction, AutomationExecution
from apps.cards.models import Card

router = Router()


# ============ Pydantic Schemas ============
class AutomationSchema(BaseModel):
    id: str
    name: str
    description: str
    trigger: str
    action: str
    is_active: bool
    total_executions: int
    last_executed: Optional[str]
    created_at: str


class CreateAutomationSchema(BaseModel):
    name: str
    description: Optional[str] = ""
    trigger: str
    trigger_config: dict = {}
    action: str
    action_config: dict = {}
    target_program_ids: List[str] = []
    target_segments: List[str] = []
    schedule_config: dict = {}
    max_executions_per_day: Optional[int] = None
    cooldown_hours: int = 24


class UpdateAutomationSchema(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    trigger_config: Optional[dict] = None
    action_config: Optional[dict] = None
    target_program_ids: Optional[List[str]] = None
    target_segments: Optional[List[str]] = None
    schedule_config: Optional[dict] = None
    max_executions_per_day: Optional[int] = None
    cooldown_hours: Optional[int] = None
    is_active: Optional[bool] = None

# ============ Automation Analytics ============
@router.get("/stats/", auth=jwt_auth, summary="Get automation statistics")
def get_automation_stats(request):
    """Get overall automation statistics."""
    automations = Automation.objects.filter(tenant=request.tenant)

    total_automations = automations.count()
    active_automations = automations.filter(is_active=True).count()

    # Execution stats
    executions = AutomationExecution.objects.filter(
        automation__tenant=request.tenant
    )

    total_executions = executions.count()
    successful_executions = executions.filter(success=True).count()
    success_rate = (successful_executions / total_executions * 100) if total_executions > 0 else 0

    # By trigger type
    trigger_stats = executions.values("automation__trigger").annotate(
        count=Count("id")
    )

    # By action type
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

# ============ Automation Management ============
@router.get("/", auth=jwt_auth, summary="List automations")
def list_automations(request, active_only: bool = False):
    """List all automations for the tenant."""
    query = Automation.objects.filter(tenant=request.tenant)

    if active_only:
        query = query.filter(is_active=True)

    automations = query.order_by("-created_at")

    return [
        {
            "id": str(a.id),
            "name": a.name,
            "description": a.description,
            "trigger": a.trigger,
            "action": a.action,
            "is_active": a.is_active,
            "total_executions": a.total_executions,
            "last_executed": a.last_executed.isoformat() if a.last_executed else None,
            "created_at": a.created_at.isoformat(),
        }
        for a in automations
    ]


@router.post("/", auth=jwt_auth, summary="Create automation")
def create_automation(request, data: CreateAutomationSchema):
    """Create a new automation. OWNER only."""
    if not is_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    # Validate trigger and action
    if data.trigger not in [choice[0] for choice in AutomationTrigger.choices]:
        raise HttpError(400, get_message("AUTOMATION_INVALID_TRIGGER", trigger=data.trigger))

    if data.action not in [choice[0] for choice in AutomationAction.choices]:
        raise HttpError(400, get_message("AUTOMATION_INVALID_ACTION", action=data.action))

    # Create automation
    automation = Automation.objects.create(
        tenant=request.tenant,
        name=data.name,
        description=data.description,
        trigger=data.trigger,
        trigger_config=data.trigger_config,
        action=data.action,
        action_config=data.action_config,
        schedule_config=data.schedule_config,
        max_executions_per_day=data.max_executions_per_day,
        cooldown_hours=data.cooldown_hours,
    )

    # Set target programs
    if data.target_program_ids:
        programs = Card.objects.filter(
            id__in=data.target_program_ids,
            tenant=request.tenant
        )
        automation.target_programs.set(programs)

    # Set target segments
    automation.target_segments = data.target_segments
    automation.save()

    return {
        "id": str(automation.id),
        "message": get_message("AUTOMATION_CREATED", name=automation.name),
    }


# Moved to the bottom to avoid matching /stats/ as an automation_id


@router.put("/{automation_id}/", auth=jwt_auth, summary="Update automation")
def update_automation(request, automation_id: str, data: UpdateAutomationSchema):
    """Update an automation. OWNER only."""
    if not is_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    automation = get_object_or_404(
        Automation,
        id=automation_id,
        tenant=request.tenant
    )

    # Update fields
    update_fields = []
    if data.name is not None:
        automation.name = data.name
        update_fields.append("name")

    if data.description is not None:
        automation.description = data.description
        update_fields.append("description")

    if data.trigger_config is not None:
        automation.trigger_config = data.trigger_config
        update_fields.append("trigger_config")

    if data.action_config is not None:
        automation.action_config = data.action_config
        update_fields.append("action_config")

    if data.schedule_config is not None:
        automation.schedule_config = data.schedule_config
        update_fields.append("schedule_config")

    if data.max_executions_per_day is not None:
        automation.max_executions_per_day = data.max_executions_per_day
        update_fields.append("max_executions_per_day")

    if data.cooldown_hours is not None:
        automation.cooldown_hours = data.cooldown_hours
        update_fields.append("cooldown_hours")

    if data.is_active is not None:
        automation.is_active = data.is_active
        update_fields.append("is_active")

    # Update target programs
    if data.target_program_ids is not None:
        programs = Card.objects.filter(
            id__in=data.target_program_ids,
            tenant=request.tenant
        )
        automation.target_programs.set(programs)

    # Update target segments
    if data.target_segments is not None:
        automation.target_segments = data.target_segments
        update_fields.append("target_segments")

    if update_fields:
        automation.save(update_fields=update_fields)

    return {"message": get_message("AUTOMATION_UPDATED")}


@router.delete("/{automation_id}/", auth=jwt_auth, summary="Delete automation")
def delete_automation(request, automation_id: str):
    """Delete an automation. OWNER only."""
    if not is_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    automation = get_object_or_404(
        Automation,
        id=automation_id,
        tenant=request.tenant
    )

    automation.delete()

    return {"message": get_message("AUTOMATION_DELETED")}


@router.post("/{automation_id}/toggle/", auth=jwt_auth, summary="Toggle automation active status")
def toggle_automation(request, automation_id: str):
    """Enable or disable an automation. OWNER only."""
    if not is_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    automation = get_object_or_404(
        Automation,
        id=automation_id,
        tenant=request.tenant
    )

    automation.is_active = not automation.is_active
    automation.save(update_fields=["is_active"])

    status_key = "AUTOMATION_ENABLED" if automation.is_active else "AUTOMATION_DISABLED"
    return {"message": get_message(status_key, name=automation.name)}





# ============ Manual Execution ============
@router.post("/{automation_id}/execute/", auth=jwt_auth, summary="Execute automation manually")
def execute_automation_manually(request, automation_id: str, customer_id: str):
    """Manually execute an automation for a specific customer. OWNER only."""
    if not is_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    automation = get_object_or_404(
        Automation,
        id=automation_id,
        tenant=request.tenant
    )

    from apps.customers.models import Customer
    customer = get_object_or_404(Customer, id=customer_id, tenant=request.tenant)

    # Execute automation
    success = automation.execute(customer, {"manual": True})

    # Log execution
    AutomationExecution.objects.create(
        automation=automation,
        customer=customer,
        trigger_event="manual_execution",
        execution_context={"manual": True},
        success=success,
    )

    return {
        "success": success,
        "message": get_message("AUTOMATION_EXECUTED") if success else get_message("AUTOMATION_FAILED"),
    }

@router.get("/{automation_id}/", auth=jwt_auth, summary="Get automation details")
def get_automation(request, automation_id: str):
    """Get detailed information about an automation."""
    automation = get_object_or_404(
        Automation,
        id=automation_id,
        tenant=request.tenant
    )

    return {
        "id": str(automation.id),
        "name": automation.name,
        "description": automation.description,
        "trigger": automation.trigger,
        "trigger_config": automation.trigger_config,
        "action": automation.action,
        "action_config": automation.action_config,
        "target_programs": [
            {"id": str(p.id), "name": p.name}
            for p in automation.target_programs.all()
        ],
        "target_segments": automation.target_segments,
        "schedule_config": automation.schedule_config,
        "is_active": automation.is_active,
        "max_executions_per_day": automation.max_executions_per_day,
        "cooldown_hours": automation.cooldown_hours,
        "total_executions": automation.total_executions,
        "last_executed": automation.last_executed.isoformat() if automation.last_executed else None,
        "created_at": automation.created_at.isoformat(),
        "updated_at": automation.updated_at.isoformat(),
    }
