"""
Loyallia Transaction Service Layer
Extracted business logic from API views for testability and reuse.
"""

import logging
from decimal import Decimal
from typing import Any

from django.db import transaction

from apps.customers.models import CustomerPass
from apps.transactions.models import Enrollment, Transaction

logger = logging.getLogger(__name__)


class TransactionService:
    """Service class encapsulating transaction business logic."""

    @staticmethod
    def scan_qr(
        tenant,
        qr_code,
        amount: Decimal | float | int = 0,
        quantity=1,
        staff=None,
        notes="",
        location=None,
    ):
        """
        Process a QR scan transaction via the Redemption Engine.

        Args:
            tenant: Tenant instance (for isolation)
            qr_code: QR code string from scanned pass
            amount: Transaction amount (Decimal or float)
            quantity: Number of stamps/units
            staff: User who performed the scan
            notes: Optional transaction notes
            location: Optional Location instance

        Returns:
            dict with transaction result data

        Raises:
            CustomerPass.DoesNotExist: If pass not found or inactive
            ValueError: If QR code is empty
        """
        if not qr_code:
            raise ValueError("QR code is required")

        import uuid

        from apps.redemption.command import RedemptionCommand
        from apps.redemption.gateway import RedemptionGateway

        amount_decimal = Decimal(str(amount))
        staff_id = str(staff.id) if staff else None
        location_id = str(location.id) if location else None

        # Use a UUID idempotency key so every service call is treated as distinct
        command = RedemptionCommand(
            tenant_id=str(tenant.id),
            qr_code=qr_code,
            intent="auto",
            amount=amount_decimal,
            quantity=quantity,
            staff_id=staff_id,
            location_id=location_id,
            notes=notes,
            idempotency_key=str(uuid.uuid4()),
        )

        gateway = RedemptionGateway()
        result = gateway.process(command, tenant)

        if not result.success:
            if result.denial_reasons and result.denial_reasons[0] == "pass_not_found":
                raise CustomerPass.DoesNotExist("Pass not found or inactive")
            return {
                "success": False,
                "pass_updated": False,
                "denial_reasons": result.denial_reasons,
            }

        return {
            "transaction_id": result.transaction_id,
            "success": True,
            "pass_updated": result.pass_updated,
            "reward_earned": result.reward_earned,
            "reward_description": result.reward_description,
            "intent_resolved": result.intent_resolved,
            "new_balance": result.new_balance,
            "remaining_uses": result.remaining_uses,
        }

    @staticmethod
    def enroll_customer(tenant, customer, card, enrollment_method="manual"):
        """
        Enroll a customer in a loyalty program.

        Args:
            tenant: Tenant instance
            customer: Customer instance
            card: Card instance
            enrollment_method: How enrollment happened (qr_scan, manual, etc.)

        Returns:
            CustomerPass instance

        Raises:
            ValueError: If already enrolled or card inactive
        """
        if not card.is_active:
            raise ValueError("Card is not active")

        if CustomerPass.objects.filter(customer=customer, card=card).exists():
            raise ValueError(
                f"Customer {customer.email} is already enrolled in {card.name}"
            )

        with transaction.atomic():
            pass_obj = CustomerPass.objects.create(customer=customer, card=card)

            Enrollment.objects.create(
                tenant=tenant,
                customer=customer,
                card=card,
                enrollment_method=enrollment_method,
            )

        return pass_obj

    @staticmethod
    def remote_issue(tenant, customer, card, quantity=1, staff=None, notes=""):
        """
        Issue stamps/rewards remotely without QR scan via the Redemption Engine.

        Args:
            tenant: Tenant instance
            customer: Customer instance
            card: Card instance
            quantity: Number of stamps/units to issue
            staff: User who issued remotely
            notes: Optional notes

        Returns:
            dict with transaction result

        Raises:
            CustomerPass.DoesNotExist: If pass not found
        """
        from apps.redemption.command import RedemptionCommand
        from apps.redemption.gateway import RedemptionGateway

        pass_obj = CustomerPass.objects.select_related(
            "customer", "card", "card__tenant"
        ).get(
            customer=customer,
            card=card,
            is_active=True,
        )

        staff_id = str(staff.id) if staff else None

        command = RedemptionCommand(
            tenant_id=str(tenant.id),
            qr_code=pass_obj.qr_code,
            intent="auto",
            amount=Decimal("0"),
            quantity=quantity,
            staff_id=staff_id,
            notes=notes,
            is_remote=True,
        )

        gateway = RedemptionGateway()
        result = gateway.process(command, tenant)

        return {
            "transaction_id": result.transaction_id,
            "success": result.success,
            "pass_updated": result.pass_updated,
            "reward_earned": result.reward_earned,
            "reward_description": result.reward_description,
        }

    @staticmethod
    def list_transactions(tenant, limit=50, offset=0):
        """
        List transactions for a tenant with optimized queries.

        Args:
            tenant: Tenant instance
            limit: Max results
            offset: Pagination offset

        Returns:
            list of transaction dicts
        """
        transactions = (
            Transaction.objects.filter(tenant=tenant)
            .select_related("customer_pass__customer", "customer_pass__card", "staff")
            .order_by("-created_at")[offset : offset + limit]
        )

        return [
            {
                "id": str(txn.id),
                "transaction_type": txn.transaction_type,
                "customer_name": txn.customer.full_name,
                "card_name": txn.customer_pass.card.name,
                "amount": str(txn.amount) if txn.amount else None,
                "quantity": txn.quantity,
                "staff_name": txn.staff.get_full_name() if txn.staff else None,
                "created_at": txn.created_at.isoformat(),
            }
            for txn in transactions
        ]

    @staticmethod
    def _serialize_result(result: dict[str, Any]) -> Any:
        """Serialize transaction result for JSON storage, handling Decimal types."""

        def _serialize_value(value):
            if isinstance(value, Decimal):
                return str(value)
            if isinstance(value, dict):
                return {k: _serialize_value(v) for k, v in value.items()}
            if isinstance(value, list):
                return [_serialize_value(v) for v in value]
            return value

        return _serialize_value(result)
