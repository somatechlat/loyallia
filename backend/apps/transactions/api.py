"""
Loyallia — Transactions API router.
Handles scanner validation + transaction recording (Phase 6).
Also sub-router for /transactions/ list endpoints.
"""
from decimal import Decimal

from django.db.models import Q
from django.shortcuts import get_object_or_404
from ninja import Router
from ninja.errors import HttpError
from pydantic import BaseModel

from apps.customers.models import Customer, CustomerPass
from apps.transactions.models import Transaction
from common.messages import get_message
from common.permissions import is_manager_or_owner, is_staff_or_above, jwt_auth

router = Router()


def _serialize_json_value(value):
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, dict):
        return {k: _serialize_json_value(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_serialize_json_value(v) for v in value]
    return value
# Scanner router for /scanner/ endpoints
scanner_router = Router()


class ScanValidateIn(BaseModel):
    qr_code: str


class ScanTransactIn(BaseModel):
    qr_code: str
    amount: float = 0
    notes: str = ""


# --- Scanner endpoints (/scanner/) ---
@scanner_router.post("/validate/", auth=jwt_auth, summary="Validar código QR del pase")
def validate_qr(request, data: ScanValidateIn):
    """Validates QR HMAC token. Returns pass state and customer info. STAFF+ only."""
    if not is_staff_or_above(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    if not data.qr_code:
        raise HttpError(400, get_message("PASS_QR_REQUIRED"))

    # Find pass by QR code
    try:
        pass_obj = CustomerPass.objects.select_related(
            "customer", "card", "card__tenant"
        ).get(qr_code=data.qr_code, is_active=True)
    except CustomerPass.DoesNotExist:
        raise HttpError(404, get_message("PASS_NOT_FOUND_INACTIVE"))

    # Check tenant access
    if pass_obj.card.tenant != request.tenant:
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))

    # Return pass information
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
def transact(request, data: ScanTransactIn):
    """Records transaction and updates pass balance. STAFF+ only."""
    if not is_staff_or_above(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    if not data.qr_code:
        raise HttpError(400, get_message("PASS_INVALID_QR"))

    # Find pass
    try:
        pass_obj = CustomerPass.objects.select_related(
            "customer", "card", "card__tenant"
        ).get(qr_code=data.qr_code, is_active=True)
    except CustomerPass.DoesNotExist:
        raise HttpError(404, get_message("PASS_NOT_FOUND"))

    # Check tenant access
    if pass_obj.card.tenant != request.tenant:
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))

    # Process transaction using pass business logic
    from decimal import Decimal
    amount_decimal = Decimal(str(data.amount))
    result = pass_obj.process_transaction(
        transaction_type="",  # Will be set by the method
        amount=amount_decimal,
        quantity=1
    )

    # Create transaction record
    transaction_data = _serialize_json_value({
        "qr_code": data.qr_code,
        "amount": data.amount,
        **result  # Include all result data
    })
    transaction = Transaction.objects.create(
        tenant=request.tenant,
        customer_pass=pass_obj,
        staff=request.user,
        location=getattr(request, "location", None),
        transaction_type=result["transaction_type"],
        amount=data.amount if data.amount > 0 else None,
        quantity=result.get("quantity", 1),
        notes=data.notes,
        transaction_data=transaction_data,
    )

    # Update customer stats — cast amount to Decimal to avoid float+Decimal precision loss
    pass_obj.customer.total_visits += 1
    pass_obj.customer.total_spent += amount_decimal
    pass_obj.customer.last_visit = transaction.created_at
    pass_obj.customer.save(update_fields=["total_visits", "total_spent", "last_visit"])

    # Fire automation trigger asynchronously — do not block the scanner response
    from apps.automation.engine import fire_trigger_async
    fire_trigger_async(
        trigger="transaction_completed",
        customer_id=str(pass_obj.customer.id),
        context={
            "transaction_id": str(transaction.id),
            "card_type": pass_obj.card.card_type,
            "amount": str(amount_decimal),
            "reward_earned": result.get("reward_earned", False),
        },
    )

    # Schedule QR image refresh if pass state changed (digest=True means wallet update needed)
    if result.get("pass_updated"):
        import logging

        from apps.customers.tasks import trigger_pass_update
        try:
            trigger_pass_update.delay(str(pass_obj.id))  # type: ignore[reportCallIssue]
        except Exception:
            logging.getLogger(__name__).warning(
                "Could not queue pass update task for pass %s; transaction completes.",
                str(pass_obj.id),
                exc_info=True
            )

    response_data = {
        "transaction_id": str(transaction.id),
        "success": True,
        "message": get_message("TRANSACTION_RECORDED"),
        "pass_updated": result["pass_updated"],
        "reward_earned": result.get("reward_earned", False),
        "reward_description": result.get("reward_description", ""),
        **result
    }
    return _serialize_json_value(response_data)


@scanner_router.get("/customer/search/", auth=jwt_auth, summary="Buscar cliente por email o teléfono")
def search_customer(request, query: str):
    """Search customer for remote issue. STAFF+ only."""
    if not is_staff_or_above(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    if not query or len(query.strip()) < 2:
        raise HttpError(400, get_message("TRANSACTION_SEARCH_MIN_CHARS"))

    customers = Customer.objects.filter(
        tenant=request.tenant,
        is_active=True
    ).filter(
        Q(email__icontains=query) |
        Q(phone__icontains=query) |
        Q(first_name__icontains=query) |
        Q(last_name__icontains=query)
    )[:10]  # Limit results

    results = []
    for customer in customers:
        passes = CustomerPass.objects.filter(
            customer=customer,
            is_active=True
        ).select_related("card")

        results.append({
            "id": str(customer.id),
            "name": customer.full_name,
            "email": customer.email,
            "phone": customer.phone,
            "passes": [
                {
                    "id": str(pass_obj.id),
                    "card_name": pass_obj.card.name,
                    "card_type": pass_obj.card.card_type,
                    "qr_code": pass_obj.qr_code,
                }
                for pass_obj in passes
            ]
        })

    return {"results": results}


# --- Transaction list endpoints (/transactions/) ---
@router.get("/", auth=jwt_auth, summary="Listar transacciones")
def list_transactions(request, limit: int = 50, offset: int = 0):
    """List transactions with filtering. MANAGER+ only."""
    if not is_manager_or_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    transactions = Transaction.objects.filter(
        tenant=request.tenant
    ).select_related(
        "customer_pass__customer",
        "customer_pass__card",
        "staff"
    ).order_by("-created_at")[offset:offset + limit]

    results = []
    for transaction in transactions:
        results.append({
            "id": str(transaction.id),
            "transaction_type": transaction.transaction_type,
            "customer_name": transaction.customer.full_name,
            "card_name": transaction.customer_pass.card.name,
            "amount": str(transaction.amount) if transaction.amount else None,
            "quantity": transaction.quantity,
            "staff_name": transaction.staff.get_full_name() if transaction.staff else None,
            "created_at": transaction.created_at.isoformat(),
        })

    return {"transactions": results}


@router.get("/{transaction_id}/", auth=jwt_auth, summary="Detalle de transacción")
def get_transaction(request, transaction_id: str):
    """Transaction details. MANAGER+ only."""
    if not is_manager_or_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    transaction = get_object_or_404(
        Transaction,
        id=transaction_id,
        tenant=request.tenant
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
        "staff": {
            "id": str(transaction.staff.id),
            "name": transaction.staff.get_full_name(),
        } if transaction.staff else None,
        "location": {
            "id": str(transaction.location.id),
            "name": transaction.location.name,
        } if transaction.location else None,
        "amount": str(transaction.amount) if transaction.amount else None,
        "quantity": transaction.quantity,
        "notes": transaction.notes,
        "transaction_data": transaction.transaction_data,
        "created_at": transaction.created_at.isoformat(),
    }


class RemoteIssueIn(BaseModel):
    customer_id: str
    card_id: str
    quantity: int = 1
    notes: str = ""


@router.post("/remote-issue/", auth=jwt_auth, summary="Emitir recompensa de forma remota")
def remote_issue(request, data: RemoteIssueIn):
    """
    Remote stamp/reward issuance without QR scan. STAFF+ only.
    Staff finds customer by ID and manually issues stamps/rewards.
    """
    if not is_staff_or_above(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    import uuid

    from apps.customers.models import Customer

    # Validate UUID format
    try:
        customer_uuid = uuid.UUID(data.customer_id)
        card_uuid = uuid.UUID(data.card_id)
    except ValueError:
        raise HttpError(400, get_message("NOT_FOUND"))

    # Tenant-scoped customer lookup
    try:
        customer = Customer.objects.get(id=customer_uuid, tenant=request.tenant, is_active=True)
    except Customer.DoesNotExist:
        raise HttpError(404, get_message("NOT_FOUND"))

    # Tenant-scoped pass lookup
    try:
        pass_obj = CustomerPass.objects.select_related(
            "customer", "card", "card__tenant"
        ).get(customer=customer, card_id=card_uuid, is_active=True)
    except CustomerPass.DoesNotExist:
        raise HttpError(404, get_message("PASS_NOT_FOUND"))

    # Process transaction
    from decimal import Decimal
    result = pass_obj.process_transaction(
        transaction_type="",
        amount=Decimal("0"),
        quantity=data.quantity,
    )

    transaction = Transaction.objects.create(
        tenant=request.tenant,
        customer_pass=pass_obj,
        staff=request.user,
        location=None,
        transaction_type=result["transaction_type"],
        amount=None,
        quantity=data.quantity,
        notes=data.notes,
        is_remote=True,
        transaction_data=result,
    )

    return {
        "transaction_id": str(transaction.id),
        "success": True,
        "message": get_message("TRANSACTION_REMOTE_ISSUED", customer_name=customer.full_name),
        "pass_updated": result["pass_updated"],
        "reward_earned": result.get("reward_earned", False),
        "reward_description": result.get("reward_description", ""),
    }
