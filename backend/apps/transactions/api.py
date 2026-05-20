"""
Loyallia  Transactions API Router (apps/transactions/api.py)

Handles the two highest-traffic operations in the system:
1. QR scanner validation and transaction recording (STAFF endpoints).
2. Transaction listing and detail views (MANAGER/OWNER endpoints).

Architecture:
    Two sub-routers:
    - scanner_router: mounted at /scanner/  used by POS staff to scan QR codes.
    - router: mounted at /transactions/  used by dashboard for transaction history.

Performance (Rule 12):
    - Scanner endpoints are the HOTTEST PATH (called on every customer scan).
    - select_related("customer", "card", "card__tenant") prevents N+1 on pass lookup.
    - Customer stats updated via F() expressions to prevent lost updates under
      concurrent scans from multiple POS terminals (no SELECT-then-UPDATE race).
    - Analytics recalculation and automation triggers are fired ASYNCHRONOUSLY
      via Celery  scanner response is never blocked by downstream processing.
    - Cache invalidation delegated to 5-min TTL (prevents thundering herd).
    - Transaction list uses select_related for 4 JOINs in a single query.

Security (SEC):
    - SEC: All pass lookups filtered by card__tenant=request.tenant (tenant isolation).
    - SEC: Scanner endpoints require STAFF+ role.
    - SEC: Transaction list/detail require MANAGER+ role.
    - SEC: Customer search scoped to request.tenant.

Called by: Scanner UI (React), Dashboard transaction page, Automation engine.
"""

from decimal import Decimal

from django.db.models import Q
from django.http import HttpRequest
from django.shortcuts import get_object_or_404
from ninja import Router
from ninja.errors import HttpError
from pydantic import BaseModel

from apps.audit.service import log_action
from apps.customers.models import Customer, CustomerPass
from apps.transactions.models import Transaction
from common.messages import get_message
from common.permissions import is_manager_or_owner, is_staff_or_above, jwt_auth

router = Router()


def _serialize_json_value(value):
    """Recursively convert Decimal values to strings for JSON serialization.

    Django's JSONField doesn't natively serialize Decimal. This ensures
    transaction_data stored in JSONField is valid JSON without precision loss.
    """
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, dict):
        return {k: _serialize_json_value(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_serialize_json_value(v) for v in value]
    return value


# Scanner sub-router for /scanner/ endpoints (POS terminal operations)
scanner_router = Router()


class ScanValidateIn(BaseModel):
    """Input schema for QR code validation (scan-to-check)."""

    qr_code: str


class ScanTransactIn(BaseModel):
    """Input schema for QR code transaction (scan-to-transact)."""

    qr_code: str
    amount: float = 0
    notes: str = ""
    idempotency_key: str = ""


@scanner_router.post("/validate/", auth=jwt_auth, summary="Validar código QR del pase")
def validate_qr(request: HttpRequest, data: ScanValidateIn):
    """Validate QR HMAC token and return pass state + customer info.

    This is a read-only operation  the pass state is not modified.
    Used by staff to preview a customer's pass before recording a transaction.

    SEC: Tenant-scoped lookup (card__tenant=request.tenant) prevents cross-tenant access.
    PERF: select_related loads Pass+Customer+Card+Tenant in a single JOIN query.
    """
    if not is_staff_or_above(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    if not data.qr_code:
        raise HttpError(400, get_message("PASS_QR_REQUIRED"))

    try:
        # PERF: single JOIN query for Pass + Customer + Card + Tenant
        # SEC: card__tenant=request.tenant ensures tenant isolation
        pass_obj = CustomerPass.objects.select_related("customer", "card", "card__tenant").get(
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
        "is_valid": True,
    }


@scanner_router.post("/transact/", auth=jwt_auth, summary="Registrar transacción")
def transact(request: HttpRequest, data: ScanTransactIn):
    """Record a transaction from a QR scan via the Redemption Engine.

    This is the HOTTEST endpoint in the system  called on every customer scan
    at every POS terminal. Latency directly impacts staff experience.

    SEC: Tenant-scoped pass lookup prevents cross-tenant transactions.
    PERF: Customer stats updated via F() expressions (atomic increment) to prevent
    lost updates under concurrent scans from multiple POS terminals.
    PERF: Analytics recalc + automation triggers fire ASYNC via Celery  scanner
    response is never blocked by downstream processing.
    """
    if not is_staff_or_above(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    if not data.qr_code:
        raise HttpError(400, get_message("PASS_INVALID_QR"))

    from decimal import Decimal

    from apps.redemption.command import RedemptionCommand
    from apps.redemption.gateway import RedemptionGateway

    tenant = request.tenant
    staff_id = str(request.user.id) if hasattr(request, "user") and request.user else None
    location_id = getattr(request, "location_id", None)

    command = RedemptionCommand(
        tenant_id=str(tenant.id),
        qr_code=data.qr_code,
        intent="auto",
        amount=Decimal(str(data.amount)),
        quantity=1,
        staff_id=staff_id,
        location_id=location_id,
        notes=data.notes,
        idempotency_key=data.idempotency_key,
    )

    gateway = RedemptionGateway()
    result = gateway.process(command, tenant)

    if not result.success:
        raise HttpError(
            422,
            {
                "success": False,
                "denial_reasons": result.denial_reasons,
                "rules_evaluated": result.rules_evaluated,
            },
        )

    # Async side effects
    from apps.analytics.tasks import update_tenant_analytics

    analytics_task = update_tenant_analytics
    analytics_task.apply_async(args=[str(tenant.id)], countdown=2)

    from apps.automation.engine import fire_trigger_async

    _customer_id = ""
    _card_type = ""
    if result.transaction_id:
        try:
            txn = Transaction.objects.select_related("customer_pass__customer", "customer_pass__card").get(
                id=result.transaction_id
            )
            _customer_id = str(txn.customer_pass.customer.id)
            _card_type = txn.customer_pass.card.card_type
        except Transaction.DoesNotExist:
            pass

    fire_trigger_async(
        trigger="transaction_completed",
        customer_id=_customer_id,
        context={
            "transaction_id": result.transaction_id,
            "card_type": _card_type,
            "amount": str(data.amount),
            "reward_earned": result.reward_earned,
        },
    )

    if result.pass_updated:
        import logging

        from apps.customers.tasks import trigger_pass_update

        try:
            if result.transaction_id:
                txn = Transaction.objects.select_related("customer_pass").get(id=result.transaction_id)
                trigger_pass_update.delay(str(txn.customer_pass.id))
        except Exception:
            logging.getLogger(__name__).warning(
                "Could not queue pass update task; transaction completes.",
                exc_info=True,
            )

    log_action(
        request=request,
        action="CREATE",
        resource_type="transaction",
        resource_id=result.transaction_id or "",
        details={
            "transaction_type": result.transaction_type,
            "amount": str(data.amount) if data.amount > 0 else None,
        },
    )

    response_data = {
        "transaction_id": result.transaction_id,
        "success": True,
        "message": get_message("TRANSACTION_RECORDED"),
        "pass_updated": result.pass_updated,
        "reward_earned": result.reward_earned,
        "reward_description": result.reward_description,
        "intent_resolved": result.intent_resolved,
        "new_balance": result.new_balance,
        "remaining_uses": result.remaining_uses,
    }
    return _serialize_json_value(response_data)


@scanner_router.get("/customer/search/", auth=jwt_auth, summary="Buscar cliente por email o teléfono")
def search_customer(request: HttpRequest, query: str):
    """Search customer by name/email/phone for remote stamp issuance.

    SEC: Scoped to request.tenant  staff cannot see other tenants' customers.
    PERF: prefetch_related("passes__card") prevents N+1 when serializing passes.
    Results capped at 10 to prevent unbounded memory usage on broad searches.
    """
    if not is_staff_or_above(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    if not query or len(query.strip()) < 2:
        raise HttpError(400, get_message("TRANSACTION_SEARCH_MIN_CHARS"))

    # PERF: prefetch_related loads all passes+cards in 2 queries total (not N+1)
    # SEC: tenant isolation via request.tenant filter
    customers = (
        Customer.objects.filter(tenant=request.tenant, is_active=True)
        .filter(
            Q(email__icontains=query)
            | Q(phone__icontains=query)
            | Q(first_name__icontains=query)
            | Q(last_name__icontains=query)
        )
        .prefetch_related("passes__card")[:10]
    )

    results = []
    for customer in customers:
        # PERF: uses prefetched passes no additional queries per customer
        results.append(
            {
                "id": str(customer.id),
                "name": customer.full_name,
                "email": customer.email,
                "phone": customer.phone,
                "passes": [
                    {
                        "id": str(p.id),
                        "card_name": p.card.name,
                        "card_type": p.card.card_type,
                        "qr_code": p.qr_code,
                    }
                    for p in customer.passes.all()
                    if p.is_active
                ],
            }
        )

    return {"results": results}


# Transaction list endpoints (/transactions/)
@router.get("/", auth=jwt_auth, summary="Listar transacciones")
def list_transactions(request: HttpRequest, limit: int = 50, offset: int = 0):
    """List transactions with pagination for the dashboard.

    SEC: Filtered by request.tenant  managers can only see their tenant's transactions.
    PERF: select_related with 4 JOINs loads all related objects in a single query.
    """
    if not is_manager_or_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    # PERF: 4-way JOIN in single query (pass → customer, pass → card → tenant, staff)
    transactions = (
        Transaction.objects.filter(tenant=request.tenant)
        .select_related(
            "customer_pass__customer",
            "customer_pass__card",
            "customer_pass__card__tenant",
            "staff",
        )
        .order_by("-created_at")[offset : offset + limit]
    )

    results = []
    for transaction in transactions:
        results.append(
            {
                "id": str(transaction.id),
                "transaction_type": transaction.transaction_type,
                "customer_name": transaction.customer.full_name,
                "card_name": transaction.customer_pass.card.name,
                "amount": str(transaction.amount) if transaction.amount else None,
                "quantity": transaction.quantity,
                "staff_name": (transaction.staff.get_full_name() if transaction.staff else None),
                "created_at": transaction.created_at.isoformat(),
            }
        )

    log_action(
        request=request,
        action="READ",
        resource_type="transaction",
        details={"limit": limit, "offset": offset, "count": len(results)},
    )
    return {"transactions": results}


@router.get("/{transaction_id}/", auth=jwt_auth, summary="Detalle de transacción")
def get_transaction(request: HttpRequest, transaction_id: str):
    """Transaction detail view with all related data.

    SEC: Tenant-scoped lookup prevents cross-tenant access.
    """
    if not is_manager_or_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    # SEC: tenant=request.tenant prevents cross-tenant access
    transaction = get_object_or_404(Transaction, id=transaction_id, tenant=request.tenant)

    log_action(
        request=request,
        action="READ",
        resource_type="transaction",
        resource_id=str(transaction.id),
        details={"transaction_type": transaction.transaction_type},
    )
    return {
        "id": str(transaction.id),
        "transaction_type": transaction.transaction_type,
        "customer": {
            "id": str(transaction.customer.id),
            "name": transaction.customer.full_name,
            "email": transaction.customer.email,
        },
        "card": {
            "id": str(transaction.customer_pass.card.id),
            "name": transaction.customer_pass.card.name,
            "type": transaction.customer_pass.card.card_type,
        },
        "staff": (
            {
                "id": str(transaction.staff.id),
                "name": transaction.staff.get_full_name(),
            }
            if transaction.staff
            else None
        ),
        "location": (
            {
                "id": str(transaction.location.id),
                "name": transaction.location.name,
            }
            if transaction.location
            else None
        ),
        "amount": str(transaction.amount) if transaction.amount else None,
        "quantity": transaction.quantity,
        "notes": transaction.notes,
        "transaction_data": transaction.transaction_data,
        "created_at": transaction.created_at.isoformat(),
    }


class RemoteIssueIn(BaseModel):
    """Input schema for remote stamp/reward issuance without QR scan."""

    customer_id: str
    card_id: str
    quantity: int = 1
    notes: str = ""


@router.post("/remote-issue/", auth=jwt_auth, summary="Emitir recompensa de forma remota")
def remote_issue(request: HttpRequest, data: RemoteIssueIn):
    """Issue stamps/rewards remotely without a QR scan.

    Used when staff finds a customer by search and manually applies rewards.
    Useful for phone orders, delivery reconciliation, or retroactive credits.

    SEC: Customer and pass lookups are both tenant-scoped.
    """
    if not is_staff_or_above(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    import uuid
    from decimal import Decimal

    from apps.customers.models import Customer
    from apps.redemption.command import RedemptionCommand
    from apps.redemption.gateway import RedemptionGateway

    # SEC: validate UUID format before DB lookup to prevent injection
    try:
        customer_uuid = uuid.UUID(data.customer_id)
        card_uuid = uuid.UUID(data.card_id)
    except ValueError:
        raise HttpError(400, get_message("NOT_FOUND"))

    # SEC: tenant-scoped customer lookup
    try:
        customer = Customer.objects.get(id=customer_uuid, tenant=request.tenant, is_active=True)
    except Customer.DoesNotExist:
        raise HttpError(404, get_message("NOT_FOUND"))

    # SEC: tenant-scoped pass lookup via customer ownership
    try:
        pass_obj = CustomerPass.objects.select_related("customer", "card", "card__tenant").get(
            customer=customer, card_id=card_uuid, is_active=True
        )
    except CustomerPass.DoesNotExist:
        raise HttpError(404, get_message("PASS_NOT_FOUND"))

    staff_id = str(request.user.id) if hasattr(request, "user") and request.user else None

    command = RedemptionCommand(
        tenant_id=str(request.tenant.id),
        qr_code=pass_obj.qr_code,
        intent="auto",
        amount=Decimal("0"),
        quantity=data.quantity,
        staff_id=staff_id,
        notes=data.notes,
    )

    gateway = RedemptionGateway()
    result = gateway.process(command, request.tenant)

    if not result.success:
        raise HttpError(
            422,
            {
                "success": False,
                "denial_reasons": result.denial_reasons,
                "rules_evaluated": result.rules_evaluated,
            },
        )

    log_action(
        request=request,
        action="CREATE",
        resource_type="transaction",
        resource_id=result.transaction_id or "",
        details={
            "transaction_type": result.transaction_type,
            "is_remote": True,
            "customer_id": str(customer.id),
        },
    )
    return {
        "transaction_id": result.transaction_id,
        "success": True,
        "message": get_message("TRANSACTION_REMOTE_ISSUED", customer_name=customer.full_name),
        "pass_updated": result.pass_updated,
        "reward_earned": result.reward_earned,
        "reward_description": result.reward_description,
    }
