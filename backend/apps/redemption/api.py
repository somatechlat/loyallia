"""
Loyallia Redemption Engine — API Router (Django Ninja)

Scanner endpoints that use the RedemptionGateway directly.
Mounted at /scanner/v2/ as the canonical scanner API.
"""

from decimal import Decimal
from typing import Literal

from django.http import HttpRequest
from ninja import Router
from ninja.errors import HttpError
from pydantic import BaseModel, Field

from apps.customers.models import CustomerPass
from apps.tenants.models import Tenant
from common.messages import get_message
from common.permissions import is_staff_or_above, jwt_auth

from .command import RedemptionCommand
from .gateway import RedemptionGateway

router = Router()

# ------------------------------------------------------------------
# Schemas
# ------------------------------------------------------------------


class ScanValidateIn(BaseModel):
    """Input schema for the QR validation endpoint."""

    qr_code: str


class ScanTransactIn(BaseModel):
    """Input schema for the transaction endpoint."""

    qr_code: str
    amount: float = 0
    quantity: int = 1
    notes: str = ""
    intent: Literal["earn", "redeem", "auto"] = "auto"
    idempotency_key: str = Field(
        default="", description="UUIDv4 for exactly-once semantics"
    )


class RedemptionOut(BaseModel):
    """Output schema for redemption results."""

    success: bool
    transaction_id: str | None = None
    transaction_type: str = ""
    pass_updated: bool = False
    reward_earned: bool = False
    reward_description: str = ""
    intent_resolved: str = ""
    denial_reasons: list[str] = []
    rules_evaluated: list[dict] = []
    new_balance: str | None = None
    remaining_uses: int | None = None
    new_state: dict = {}


# ------------------------------------------------------------------
# Endpoints
# ------------------------------------------------------------------


@router.post("/validate/", auth=jwt_auth, summary="Validar código QR (v2)")
def validate_qr_v2(request: HttpRequest, data: ScanValidateIn):
    """Validate a QR code and return pass state (read-only, v2 engine).

    SEC: Tenant-scoped lookup prevents cross-tenant access.
    """
    if not is_staff_or_above(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    if not data.qr_code:
        raise HttpError(400, get_message("PASS_QR_REQUIRED"))

    try:
        pass_obj = CustomerPass.objects.select_related("customer", "card").get(
            qr_code=data.qr_code, is_active=True, card__tenant=request.tenant
        )
    except CustomerPass.DoesNotExist:
        raise HttpError(404, get_message("PASS_NOT_FOUND_INACTIVE"))

    return {
        "pass_id": str(pass_obj.id),
        "customer": {
            "id": str(pass_obj.customer.id),
            "name": pass_obj.customer.full_name,
            "email": pass_obj.customer.email,
        },
        "card": {
            "id": str(pass_obj.card.id),
            "name": pass_obj.card.name,
            "type": pass_obj.card.card_type,
        },
        "pass_data": pass_obj.pass_data,
        "lifecycle_state": pass_obj.lifecycle_state,
        "is_valid": True,
    }


@router.post("/transact/", auth=jwt_auth, summary="Registrar transacción (v2)")
def transact_v2(request: HttpRequest, data: ScanTransactIn):
    """Record a transaction via the new RedemptionGateway.

    This is the v2 scanner endpoint. It supports explicit intents
    (earn/redeem/auto) and idempotency keys for exactly-once semantics.

    SEC: Tenant-scoped. STAFF+ required.
    """
    if not is_staff_or_above(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    if not data.qr_code:
        raise HttpError(400, get_message("PASS_INVALID_QR"))

    tenant: Tenant = request.tenant
    staff_id = (
        str(request.user.id) if hasattr(request, "user") and request.user else None
    )
    location_id = getattr(request, "location_id", None)

    command = RedemptionCommand(
        tenant_id=str(tenant.id),
        qr_code=data.qr_code,
        intent=data.intent,
        amount=Decimal(str(data.amount)),
        quantity=data.quantity,
        staff_id=staff_id,
        location_id=location_id,
        notes=data.notes,
        idempotency_key=data.idempotency_key,
    )

    gateway = RedemptionGateway()
    result = gateway.process(command, tenant)

    if not result.success:
        # Return 422 with denial details so the scanner UI can show reasons
        raise HttpError(
            422,
            {
                "success": False,
                "denial_reasons": result.denial_reasons,
                "rules_evaluated": result.rules_evaluated,
            },
        )

    return {
        "success": True,
        "transaction_id": result.transaction_id,
        "transaction_type": result.transaction_type,
        "pass_updated": result.pass_updated,
        "reward_earned": result.reward_earned,
        "reward_description": result.reward_description,
        "intent_resolved": result.intent_resolved,
        "new_balance": result.new_balance,
        "remaining_uses": result.remaining_uses,
        "new_state": result.new_state,
    }
