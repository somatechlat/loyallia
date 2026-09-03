"""
Integration tests for RedemptionGateway + Idempotency.

Runs against real PostgreSQL + Redis. No mocks.
"""

from decimal import Decimal

from django.test import TestCase
from django.utils import timezone

from apps.cards.models import Card
from apps.customers.models import Customer, CustomerPass
from apps.redemption.command import RedemptionCommand
from apps.redemption.gateway import RedemptionGateway
from apps.redemption.idempotency import clear as clear_idempotency
from apps.tenants.models import Tenant
from apps.transactions.models import Transaction, TransactionType


class GatewayTestCase(TestCase):
    def setUp(self):
        self.tenant = Tenant.objects.create(name="Test Cafe", email="test@cafe.com", phone="1234567890")
        self.customer = Customer.objects.create(
            tenant=self.tenant,
            first_name="Test",
            last_name="Customer",
            email="customer@test.com",
        )
        self.gateway = RedemptionGateway()

    def make_card(self, card_type: str, **kwargs):
        metadata_defaults = {
            "stamp": {"stamps_required": 5, "reward_description": "Free coffee"},
            "cashback": {
                "cashback_percentage": 10,
                "minimum_purchase": 0,
                "credit_expiry_days": 365,
            },
            "coupon": {
                "discount_type": "percentage",
                "discount_value": 10,
                "usage_limit_per_customer": 1,
            },
            "gift_certificate": {"denominations": [25, 50, 100], "expiry_days": 365},
            "vip_membership": {
                "membership_name": "Gold",
                "monthly_fee": 10,
                "validity_period": "monthly",
            },
            "multipass": {"bundle_size": 10, "bundle_price": 50},
            "discount": {"tiers": [{"tier_name": "Bronze", "threshold": 0, "discount_percentage": 5}]},
            "referral_pass": {
                "referrer_reward": "10",
                "referee_reward": "10",
                "max_referrals_per_customer": 5,
            },
            "corporate_discount": {},
            "affiliate": {},
        }
        meta = metadata_defaults.get(card_type, {})
        meta.update(kwargs.pop("metadata", {}))
        return Card.objects.create(
            tenant=self.tenant,
            card_type=card_type,
            name=f"Test {card_type}",
            is_active=True,
            is_published=True,
            metadata=meta,
            **kwargs,
        )

    def make_pass(self, card):
        return CustomerPass.objects.create(customer=self.customer, card=card, is_active=True)

    def make_command(self, qr_code, intent="auto", amount=Decimal("0"), idempotency_key=""):
        return RedemptionCommand(
            tenant_id=str(self.tenant.id),
            qr_code=qr_code,
            intent=intent,  # type: ignore[reportArgumentType]
            amount=amount,
            idempotency_key=idempotency_key,
            scanned_at=timezone.now(),
        )

    def test_gateway_stamp_auto_earn(self):
        card = self.make_card("stamp", metadata={"stamps_required": 5})
        cp = self.make_pass(card)
        cmd = self.make_command(cp.qr_code, intent="auto")
        result = self.gateway.process(cmd, self.tenant)
        self.assertTrue(result.success)
        self.assertEqual(result.intent_resolved, "earn")
        cp.refresh_from_db()
        self.assertEqual(cp.stamp_count, 1)

    def test_gateway_stamp_auto_redeem(self):
        card = self.make_card("stamp", metadata={"stamps_required": 5})
        cp = self.make_pass(card)
        cp.lifecycle_state = CustomerPass.LifecycleState.REWARD_READY
        cp.save()
        cmd = self.make_command(cp.qr_code, intent="auto")
        result = self.gateway.process(cmd, self.tenant)
        self.assertTrue(result.success)
        self.assertEqual(result.intent_resolved, "redeem")

    def test_gateway_denied_records_audit(self):
        card = self.make_card("coupon", redemption_rules={"usage_limit_per_customer": 0})
        cp = self.make_pass(card)
        cmd = self.make_command(cp.qr_code, intent="redeem")
        result = self.gateway.process(cmd, self.tenant)
        self.assertFalse(result.success)
        # Audit transaction should exist
        txn = Transaction.objects.filter(
            tenant=self.tenant,
            customer_pass=cp,
            transaction_type=TransactionType.DENIED,
        ).first()
        self.assertIsNotNone(txn)
        self.assertEqual(txn.denial_reason, "usage_limit_exceeded")  # type: ignore[reportOptionalMemberAccess]

    def test_idempotency_blocks_duplicate(self):
        card = self.make_card("stamp", metadata={"stamps_required": 5})
        cp = self.make_pass(card)
        key = "test-idempotency-123"
        clear_idempotency(str(self.tenant.id), key)
        cmd = self.make_command(cp.qr_code, intent="earn", idempotency_key=key)
        result1 = self.gateway.process(cmd, self.tenant)
        self.assertTrue(result1.success)
        # Second identical command should be deduplicated
        result2 = self.gateway.process(cmd, self.tenant)
        self.assertTrue(result2.success)
        # Only one transaction should exist
        txn_count = Transaction.objects.filter(
            tenant=self.tenant,
            customer_pass=cp,
            transaction_type=TransactionType.STAMP_EARNED,
        ).count()
        self.assertEqual(txn_count, 1)
        clear_idempotency(str(self.tenant.id), key)

    def test_invalid_qr_returns_denial(self):
        cmd = self.make_command("INVALID-QR-999", intent="redeem")
        result = self.gateway.process(cmd, self.tenant)
        self.assertFalse(result.success)
