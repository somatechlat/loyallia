"""
Basic tests for Loyallia models and APIs.
Run with: python manage.py test
"""
import json
from decimal import Decimal

from django.test import TestCase

from apps.authentication.models import User
from apps.authentication.tokens import create_access_token
from apps.cards.models import Card, CardType
from apps.customers.models import Customer, CustomerPass
from apps.tenants.models import Tenant
from common.messages import get_message


class ModelTests(TestCase):
    """Test basic model functionality."""

    def setUp(self):
        """Create test data."""
        self.tenant = Tenant.objects.create(
            name="Test Business",
            slug="test-business",
            plan="trial"
        )
        self.user = User.objects.create_user(
            email="owner@test.com",
            password="testpass123",
            tenant=self.tenant,
            role="OWNER",
            first_name="Test",
            last_name="Owner"
        )

    def test_card_creation(self):
        """Test creating a loyalty card."""
        card = Card.objects.create(
            tenant=self.tenant,
            card_type=CardType.STAMP,
            name="Test Stamp Card",
            description="Buy 9 get 1 free",
            metadata={
                "stamps_required": 10,
                "reward_description": "Free coffee"
            }
        )
        self.assertEqual(card.name, "Test Stamp Card")
        self.assertEqual(card.card_type, CardType.STAMP)
        self.assertTrue(card.is_active)

    def test_customer_creation(self):
        """Test creating a customer."""
        customer = Customer.objects.create(
            tenant=self.tenant,
            first_name="John",
            last_name="Doe",
            email="john@example.com",
            phone="+1234567890"
        )
        self.assertEqual(customer.full_name, "John Doe")
        self.assertEqual(customer.email, "john@example.com")
        self.assertTrue(customer.is_active)

    def test_customer_pass_creation(self):
        """Test creating a customer pass."""
        card = Card.objects.create(
            tenant=self.tenant,
            card_type=CardType.STAMP,
            name="Test Card",
            metadata={"stamps_required": 10, "reward_description": "Free coffee"}
        )
        customer = Customer.objects.create(
            tenant=self.tenant,
            first_name="Jane",
            last_name="Smith",
            email="jane@example.com"
        )
        pass_obj = CustomerPass.objects.create(
            customer=customer,
            card=card
        )
        self.assertEqual(pass_obj.customer, customer)
        self.assertEqual(pass_obj.card, card)
        self.assertTrue(pass_obj.is_active)
        self.assertIsNotNone(pass_obj.qr_code)

    def test_public_enrollment_stores_date_of_birth(self):
        """Test public enrollment preserves birthday on customer profile."""
        card = Card.objects.create(
            tenant=self.tenant,
            card_type=CardType.STAMP,
            name="Public Enrollment Card",
            metadata={"stamps_required": 5, "reward_description": "Free drink"}
        )

        response = self.client.post(
            f"/api/v1/customers/enroll/?card_id={card.id}",
            json.dumps({
                "first_name": "Ana",
                "last_name": "García",
                "email": "ana.garcia@example.com",
                "phone": "+593999999999",
                "date_of_birth": "1990-05-14"
            }),
            content_type="application/json"
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["card_name"], "Public Enrollment Card")

        customer = Customer.objects.get(email="ana.garcia@example.com", tenant=self.tenant)
        self.assertEqual(customer.date_of_birth.isoformat(), "1990-05-14")

    def test_stamp_card_logic(self):
        """Test stamp card transaction processing."""
        card = Card.objects.create(
            tenant=self.tenant,
            card_type=CardType.STAMP,
            name="Stamp Card",
            metadata={"stamps_required": 3, "reward_description": "Free Coffee"}
        )
        customer = Customer.objects.create(
            tenant=self.tenant,
            first_name="John",
            last_name="Doe",
            email="john@example.com"
        )
        pass_obj = CustomerPass.objects.create(
            customer=customer,
            card=card
        )

        # First transaction - earn 1 stamp
        result = pass_obj.process_transaction("", amount=Decimal("10.00"))
        self.assertEqual(result["transaction_type"], "stamp_earned")
        self.assertEqual(result["pass_updated"], True)
        self.assertEqual(result["new_stamp_count"], 1)
        self.assertFalse(result["reward_earned"])

        # Second transaction - earn 2 stamps
        result = pass_obj.process_transaction("", amount=Decimal("15.00"))
        self.assertEqual(result["new_stamp_count"], 2)
        self.assertFalse(result["reward_earned"])

        # Third transaction - earn reward
        result = pass_obj.process_transaction("", amount=Decimal("20.00"))
        self.assertEqual(result["new_stamp_count"], 0)  # Reset after reward
        self.assertTrue(result["reward_earned"])
        self.assertEqual(result["reward_description"], "Free Coffee")

    def test_cashback_card_logic(self):
        """Test cashback card transaction processing."""
        card = Card.objects.create(
            tenant=self.tenant,
            card_type=CardType.CASHBACK,
            name="Cashback Card",
            metadata={"cashback_percentage": 5, "minimum_purchase": 10}
        )
        customer = Customer.objects.create(
            tenant=self.tenant,
            first_name="Jane",
            last_name="Smith",
            email="jane@example.com"
        )
        pass_obj = CustomerPass.objects.create(
            customer=customer,
            card=card
        )

        # Transaction below minimum - no cashback
        result = pass_obj.process_transaction("", amount=Decimal("5.00"))
        self.assertEqual(result["pass_updated"], False)

        # Transaction above minimum - earn cashback
        result = pass_obj.process_transaction("", amount=Decimal("20.00"))
        self.assertEqual(result["pass_updated"], True)
        self.assertEqual(result["earned_amount"], Decimal("1.00"))  # 5% of 20
        self.assertEqual(result["new_balance"], Decimal("1.00"))

    def test_create_all_card_types(self):
        """Verify creation of every card category with valid metadata."""
        metadata_by_type = {
            CardType.STAMP: {"stamps_required": 10, "reward_description": "Free coffee"},
            CardType.CASHBACK: {"cashback_percentage": 5, "minimum_purchase": 10, "credit_expiry_days": 365},
            CardType.COUPON: {"discount_type": "percentage", "discount_value": 20, "usage_limit_per_customer": 1},
            CardType.AFFILIATE: {},
            CardType.DISCOUNT: {"tiers": [{"tier_name": "Bronze", "threshold": 100, "discount_percentage": 5}]},
            CardType.GIFT_CERTIFICATE: {"denominations": [10, 25, 50], "expiry_days": 365},
            CardType.VIP_MEMBERSHIP: {"membership_name": "VIP Gold", "monthly_fee": 20, "annual_fee": 200, "validity_period": "annual"},
            CardType.CORPORATE_DISCOUNT: {},
            CardType.REFERRAL_PASS: {"referrer_reward": "10% off", "referee_reward": "5% off", "max_referrals_per_customer": 10},
            CardType.MULTIPASS: {"bundle_size": 10, "bundle_price": 50},
        }

        created = []
        errors = []
        for card_type, metadata in metadata_by_type.items():
            try:
                card = Card.objects.create(
                    tenant=self.tenant,
                    card_type=card_type,
                    name=f"Test {card_type} Card",
                    metadata=metadata,
                )
                created.append(card.card_type)
            except Exception as exc:
                errors.append((card_type, str(exc)))

        self.assertFalse(errors, f"Card creation failed for types: {errors}")
        self.assertEqual(len(created), len(metadata_by_type))


class ScannerAPITests(TestCase):
    """Test scanner API endpoints."""

    def setUp(self):
        """Create test data."""
        self.tenant = Tenant.objects.create(
            name="Test Business",
            slug="test-business",
            plan="trial"
        )
        self.user = User.objects.create_user(
            email="owner@test.com",
            password="testpass123",
            tenant=self.tenant,
            role="OWNER",
            first_name="Test",
            last_name="Owner"
        )
        self.card = Card.objects.create(
            tenant=self.tenant,
            card_type=CardType.STAMP,
            name="Test Stamp Card",
            metadata={"stamps_required": 3, "reward_description": "Free Coffee"}
        )
        self.customer = Customer.objects.create(
            tenant=self.tenant,
            first_name="John",
            last_name="Doe",
            email="john@example.com"
        )
        self.pass_obj = CustomerPass.objects.create(
            customer=self.customer,
            card=self.card
        )
        self.access_token = create_access_token(
            self.user.id,
            self.tenant.id,
            self.user.role
        )

    def _auth_headers(self):
        return {"HTTP_AUTHORIZATION": f"Bearer {self.access_token}"}

    def test_scanner_validation(self):
        """Test QR code validation for staff/owner roles."""
        response = self.client.post(
            "/api/v1/scanner/validate/",
            json.dumps({"qr_code": self.pass_obj.qr_code}),
            content_type="application/json",
            headers=self._auth_headers()
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["is_valid"])
        self.assertEqual(data["pass_id"], str(self.pass_obj.id))
        self.assertEqual(data["card"]["type"], CardType.STAMP)
        self.assertEqual(data["customer"]["email"], self.customer.email)

    def test_scanner_transact_creates_transaction_and_updates_pass(self):
        """Test scan transact endpoint updates stamp pass and customer totals."""
        response = self.client.post(
            "/api/v1/scanner/transact/",
            json.dumps({"qr_code": self.pass_obj.qr_code, "amount": 10, "notes": "Test scan"}),
            content_type="application/json",
            headers=self._auth_headers()
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertTrue(data["pass_updated"])
        self.assertEqual(data["transaction_type"], "stamp_earned")

        self.pass_obj.refresh_from_db()
        self.assertEqual(self.pass_obj.stamp_count, 1)

        self.customer.refresh_from_db()
        self.assertEqual(self.customer.total_visits, 1)
        self.assertEqual(self.customer.total_spent, Decimal("10.00"))

    def test_scanner_access_requires_staff_or_above(self):
        """Test scanner endpoints reject users without staff-level roles."""
        unauthorized_user = User.objects.create_user(
            email="superadmin@test.com",
            password="testpass123",
            role="SUPER_ADMIN"
        )
        token = create_access_token(unauthorized_user.id, None, unauthorized_user.role)

        response = self.client.post(
            "/api/v1/scanner/validate/",
            json.dumps({"qr_code": self.pass_obj.qr_code}),
            content_type="application/json",
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json()["error"], get_message("AUTH_PERMISSION_DENIED"))
