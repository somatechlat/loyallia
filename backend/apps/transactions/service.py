"""
Loyallia — Transaction Service Layer
Extracted business logic from API views for testability and reuse.
"""

import logging
from decimal import Decimal

from django.db import transaction as db_transaction

from apps.customers.models import Customer, CustomerPass
from apps.transactions.models import Enrollment, Transaction, TransactionType

logger = logging.getLogger(__name__)


class TransactionService:
    """Service class encapsulating transaction business logic."""

    @staticmethod
    def scan_qr(tenant, qr_code, amount=0, quantity=1, staff=None, notes="", location=None):
        """
        Process a QR scan transaction.

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

        # Find pass by QR code with tenant isolation
        pass_obj = CustomerPass.objects.select_related(
            "customer", "card", "card__tenant"
        ).get(
            qr_code=qr_code,
            is_active=True,
            card__tenant=tenant,
        )

        amount_decimal = Decimal(str(amount))

        with db_transaction.atomic():
            result = pass_obj.process_transaction(
                transaction_type="",
                amount=amount_decimal,
                quantity=quantity,
            )

            # Serialize transaction data
            transaction_data = TransactionService._serialize_result(result)
            transaction_data["qr_code"] = qr_code
            transaction_data["amount"] = float(amount)

            txn = Transaction.objects.create(
                tenant=tenant,
                customer_pass=pass_obj,
                staff=staff,
                location=location,
                transaction_type=result["transaction_type"],
                amount=amount if amount > 0 else None,
                quantity=result.get("quantity", quantity),
                notes=notes,
                transaction_data=transaction_data,
            )

            # Update customer stats atomically
            from django.db.models import F

            Customer.objects.filter(pk=pass_obj.customer.pk).update(
                total_visits=F("total_visits") + 1,
                total_spent=F("total_spent") + amount_decimal,
                last_visit=txn.created_at,
            )

        return {
            "transaction_id": str(txn.id),
            "success": True,
            "pass_updated": result["pass_updated"],
            "reward_earned": result.get("reward_earned", False),
            "reward_description": result.get("reward_description", ""),
            **result,
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
            raise ValueError(f"Customer {customer.email} is already enrolled in {card.name}")

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
        Issue stamps/rewards remotely without QR scan.

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
        pass_obj = CustomerPass.objects.select_related(
            "customer", "card", "card__tenant"
        ).get(
            customer=customer,
            card=card,
            is_active=True,
        )

        result = pass_obj.process_transaction(
            transaction_type="",
            amount=Decimal("0"),
            quantity=quantity,
        )

        txn = Transaction.objects.create(
            tenant=tenant,
            customer_pass=pass_obj,
            staff=staff,
            location=None,
            transaction_type=result["transaction_type"],
            amount=None,
            quantity=quantity,
            notes=notes,
            is_remote=True,
            transaction_data=TransactionService._serialize_result(result),
        )

        return {
            "transaction_id": str(txn.id),
            "success": True,
            "pass_updated": result["pass_updated"],
            "reward_earned": result.get("reward_earned", False),
            "reward_description": result.get("reward_description", ""),
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
    def _serialize_result(result):
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
