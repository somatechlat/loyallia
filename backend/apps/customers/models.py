"""
Loyallia — Customer Models
Customer profiles, passes, and enrollment management.
"""

import uuid
from datetime import datetime
from decimal import Decimal

from django.core.validators import EmailValidator, MinValueValidator
from django.db import models

from apps.cards.models import Card
from apps.tenants.models import Tenant
from common.models import TimestampedModel


class Customer(TimestampedModel):
    """
    Customer profile with contact information.
    Customers can enroll in multiple programs (passes).
    """

    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="customers",
        verbose_name="Negocio",
    )

    # Contact Information
    first_name = models.CharField(max_length=100, verbose_name="Nombre")
    last_name = models.CharField(max_length=100, verbose_name="Apellido")
    email = models.EmailField(
        validators=[EmailValidator()], verbose_name="Correo electrónico"
    )
    phone = models.CharField(
        max_length=20, blank=True, default="", verbose_name="Teléfono"
    )

    # Optional additional info
    date_of_birth = models.DateField(
        null=True, blank=True, verbose_name="Fecha de nacimiento"
    )
    gender = models.CharField(
        max_length=1,
        choices=[("M", "Masculino"), ("F", "Femenino"), ("O", "Otro")],
        blank=True,
        default="",
        verbose_name="Género",
    )

    # Referral system
    referral_code = models.CharField(max_length=20, unique=True, blank=True, default="")
    referred_by = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="referrals",
        verbose_name="Referido por",
    )

    # Status
    is_active = models.BooleanField(default=True, verbose_name="Cliente activo")
    notes = models.TextField(blank=True, default="", verbose_name="Notas")

    # Analytics
    total_visits = models.PositiveIntegerField(
        default=0, verbose_name="Total de visitas"
    )
    total_spent = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
        verbose_name="Total gastado",
    )
    last_visit = models.DateTimeField(
        null=True, blank=True, verbose_name="Última visita"
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "loyallia_customers"
        verbose_name = "Cliente"
        verbose_name_plural = "Clientes"
        ordering = ["-created_at"]
        unique_together = ["tenant", "email"]  # One account per email per tenant
        indexes = [
            # Tenant-scoped time-series queries (analytics, sorting)
            models.Index(
                fields=["tenant", "created_at"],
                name="idx_cust_tenant_created",
            ),
            # Tenant-scoped active customer lookups
            models.Index(
                fields=["tenant", "is_active", "created_at"],
                name="idx_cust_tenant_active_date",
            ),
            # Demographics: SQL-based age aggregation
            models.Index(
                fields=["tenant", "date_of_birth"],
                name="idx_cust_tenant_dob",
            ),
            # Customer search by name (icontains uses sequential scan,
            # but this index helps with exact prefix matches)
            models.Index(
                fields=["tenant", "last_name", "first_name"],
                name="idx_cust_tenant_name",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.first_name} {self.last_name} - {self.email}"

    @property
    def full_name(self) -> str:
        """Return customer's full name."""
        return f"{self.first_name} {self.last_name}".strip()

    def generate_referral_code(self) -> str:
        """Generate a unique referral code for this customer."""
        import secrets
        import string

        while True:
            code = "".join(
                secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8)
            )
            if not Customer.objects.filter(referral_code=code).exists():
                return code

    def save(self, *args, **kwargs) -> None:
        """Override save to generate referral code if needed."""
        if not self.referral_code:
            self.referral_code = self.generate_referral_code()
        super().save(*args, **kwargs)


class CustomerPass(models.Model):
    """
    A customer's enrollment in a specific loyalty program.
    Contains the pass data and current state.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.ForeignKey(
        Customer,
        on_delete=models.CASCADE,
        related_name="passes",
        verbose_name="Cliente",
    )
    card = models.ForeignKey(
        Card, on_delete=models.CASCADE, related_name="passes", verbose_name="Programa"
    )

    # Pass state stored as JSONB (balances, counters, etc.)
    pass_data = models.JSONField(default=dict, verbose_name="Datos del pase")

    # Wallet pass identifiers
    apple_pass_id = models.CharField(
        max_length=100, blank=True, default="", verbose_name="Apple Pass ID"
    )
    google_pass_id = models.CharField(
        max_length=100, blank=True, default="", verbose_name="Google Pass ID"
    )

    # QR code for validation — indexed for O(log N) scan lookups
    qr_code = models.CharField(
        max_length=100, unique=True, db_index=True, blank=True, default="",
        verbose_name="Código QR",
    )

    # Status
    is_active = models.BooleanField(default=True, verbose_name="Pase activo")
    enrolled_at = models.DateTimeField(
        auto_now_add=True, verbose_name="Fecha de inscripción"
    )
    last_updated = models.DateTimeField(
        auto_now=True, verbose_name="Última actualización"
    )

    class Meta:
        db_table = "loyallia_customer_passes"
        verbose_name = "Pase del cliente"
        verbose_name_plural = "Pases de clientes"
        ordering = ["-enrolled_at"]
        unique_together = ["customer", "card"]  # One pass per customer per program

    def __str__(self) -> str:
        return f"{self.customer.full_name} - {self.card.name}"

    def generate_qr_code(self) -> str:
        """Generate a unique QR code for this pass.

        Uses UUID4 (128-bit random) truncated to 16 hex chars.
        Collision probability: 1 in 1.8×10^19 — effectively zero.
        No database query needed, unlike the previous exists()-loop approach.
        """
        return uuid.uuid4().hex[:16].upper()

    def get_pass_field(self, key: str, default=None):
        """Helper to safely get pass data fields."""
        return self.pass_data.get(key, default)

    def set_pass_field(self, key: str, value) -> None:
        """Atomically set a single pass data field. Use update_pass_data for multiple fields."""
        self.update_pass_data({key: value})

    def update_pass_data(self, updates: dict) -> None:
        """Atomically update multiple pass data fields in a single transaction.

        Prevents race conditions and minimizes database round-trips when
        concurrent scans modify the same pass.
        """
        if not updates:
            return

        from django.db import transaction

        with transaction.atomic():
            locked = CustomerPass.objects.select_for_update().get(pk=self.pk)
            for k, v in updates.items():
                locked.pass_data[k] = v
            locked.save(update_fields=["pass_data", "last_updated"])
        # Refresh in-memory instance to reflect the committed state
        self.refresh_from_db(fields=["pass_data", "last_updated"])

    def save(self, *args, **kwargs) -> None:
        """Override save to generate QR code if needed."""
        if not self.qr_code:
            self.qr_code = self.generate_qr_code()
        super().save(*args, **kwargs)

    # Card-type specific helpers
    @property
    def stamp_count(self) -> int:
        """Current stamp count for stamp cards."""
        return self.get_pass_field("stamp_count", 0)

    @property
    def cashback_balance(self) -> Decimal:
        """Current cashback balance."""
        return Decimal(str(self.get_pass_field("cashback_balance", "0")))

    @property
    def coupon_used(self) -> bool:
        """Whether coupon has been used."""
        return self.get_pass_field("coupon_used", False)

    @property
    def discount_tier(self) -> str:
        """Current discount tier name."""
        return self.get_pass_field("discount_tier", "")

    @property
    def gift_balance(self) -> Decimal:
        """Current gift certificate balance."""
        return Decimal(str(self.get_pass_field("gift_balance", "0")))

    @property
    def membership_expiry(self) -> datetime:
        """Membership expiry date."""
        from django.utils.dateparse import parse_datetime

        expiry_str = self.get_pass_field("membership_expiry")
        return parse_datetime(expiry_str) if expiry_str else None

    @property
    def corporate_discount(self) -> Decimal:
        """Corporate discount percentage."""
        return Decimal(str(self.get_pass_field("corporate_discount", "0")))

    @property
    def referral_count(self) -> int:
        """Number of successful referrals."""
        return self.get_pass_field("referral_count", 0)

    @property
    def multipass_remaining(self) -> int:
        """Remaining prepaid stamps in multipass."""
        return self.get_pass_field("multipass_remaining", 0)

    def process_transaction(
        self, transaction_type: str, amount: Decimal = 0, quantity: int = 1
    ) -> dict:
        """
        Process a transaction for this pass based on card type.
        Card type values match CardType TextChoices in cards/models.py:
          stamp | cashback | coupon | affiliate | discount |
          gift_certificate | vip_membership | corporate_discount |
          referral_pass | multipass
        Returns dict with transaction details and updated pass data.
        """

        if quantity < 1:
            raise ValueError("Quantity must be a positive integer")

        result = {
            "transaction_type": transaction_type,
            "amount": amount,
            "quantity": quantity,
            "pass_updated": False,
            "reward_earned": False,
            "reward_description": "",
        }

        card_type = self.card.card_type  # e.g. "stamp", "cashback", etc.

        if card_type == "stamp":
            result.update(self._process_stamp_transaction(amount, quantity))
        elif card_type == "cashback":
            result.update(self._process_cashback_transaction(amount))
        elif card_type == "coupon":
            result.update(self._process_coupon_transaction())
        elif card_type == "affiliate":
            # Affiliate card: validate membership, no balance change
            result.update(self._process_membership_transaction())
        elif card_type == "discount":
            # Discount tiers: validate and log visit
            result.update(self._process_discount_transaction(amount))
        elif card_type == "gift_certificate":
            result.update(self._process_gift_transaction(amount))
        elif card_type == "vip_membership":
            result.update(self._process_membership_transaction())
        elif card_type == "corporate_discount":
            result.update(self._process_corporate_transaction())
        elif card_type == "referral_pass":
            result.update(self._process_referral_transaction())
        elif card_type == "multipass":
            result.update(self._process_multipass_transaction())
        else:
            # Unknown card type — log but do not crash
            import logging

            logging.getLogger(__name__).warning(
                "Unknown card type '%s' in process_transaction for pass %s",
                card_type,
                self.id,
            )

        return result

    def _process_stamp_transaction(self, amount: Decimal, quantity: int) -> dict:
        """Process stamp card transaction.

        Correctly handles multiple reward cycles when quantity exceeds
        stamps_required. Uses integer division and modulo to calculate
        how many full reward cycles were completed and remaining stamps.
        """
        from apps.transactions.models import TransactionType
        from django.db import transaction as db_transaction

        stamps_required = self.card.get_metadata_field("stamps_required", 10)
        reward_description = self.card.get_metadata_field(
            "reward_description", "Free item"
        )

        with db_transaction.atomic():
            locked = CustomerPass.objects.select_for_update().get(pk=self.pk)
            current_stamps = locked.pass_data.get("stamp_count", 0)
            new_stamps = current_stamps + quantity

            reward_count = new_stamps // stamps_required
            remaining_stamps = new_stamps % stamps_required

            updates = {}
            if reward_count > 0:
                updates["reward_ready"] = True
            updates["stamp_count"] = remaining_stamps
            locked.pass_data.update(updates)
            locked.save(update_fields=["pass_data", "last_updated"])

        self.refresh_from_db(fields=["pass_data", "last_updated"])
        return {
            "transaction_type": TransactionType.STAMP_EARNED,
            "pass_updated": True,
            "reward_earned": reward_count > 0,
            "reward_description": reward_description if reward_count > 0 else "",
            "new_stamp_count": remaining_stamps,
            "reward_count": reward_count,
        }

    def _process_cashback_transaction(self, amount: Decimal) -> dict:
        """Process cashback card transaction."""
        from decimal import Decimal as D
        from apps.transactions.models import TransactionType
        from django.db import transaction as db_transaction

        percentage = D(str(self.card.get_metadata_field("cashback_percentage", 0)))
        min_purchase = D(str(self.card.get_metadata_field("minimum_purchase", 0)))

        if amount >= min_purchase:
            earned = (amount * percentage) / D("100")

            with db_transaction.atomic():
                locked = CustomerPass.objects.select_for_update().get(pk=self.pk)
                current_balance = Decimal(str(locked.pass_data.get("cashback_balance", "0")))
                new_balance = current_balance + earned
                locked.pass_data["cashback_balance"] = str(new_balance)
                locked.save(update_fields=["pass_data", "last_updated"])

            self.refresh_from_db(fields=["pass_data", "last_updated"])
            return {
                "transaction_type": TransactionType.CASHBACK_EARNED,
                "pass_updated": True,
                "earned_amount": earned,
                "new_balance": new_balance,
            }

        return {
            "transaction_type": TransactionType.CASHBACK_EARNED,
            "pass_updated": False,
        }

    def _process_coupon_transaction(self) -> dict:
        """Process coupon redemption.

        Uses select_for_update to prevent double-redemption race conditions.
        The coupon_used check is performed INSIDE the lock so two concurrent
        scans cannot both see ``False`` and redeem the same coupon.
        """
        from apps.transactions.models import TransactionType
        from django.db import transaction as db_transaction

        with db_transaction.atomic():
            locked = CustomerPass.objects.select_for_update().get(pk=self.pk)
            if locked.pass_data.get("coupon_used", False):
                return {
                    "transaction_type": TransactionType.COUPON_REDEEMED,
                    "pass_updated": False,
                }
            locked.pass_data["coupon_used"] = True
            locked.save(update_fields=["pass_data", "last_updated"])

        self.refresh_from_db(fields=["pass_data", "last_updated"])
        reward_description = self.card.get_metadata_field(
            "coupon_description", "Coupon redeemed"
        )
        return {
            "transaction_type": TransactionType.COUPON_REDEEMED,
            "pass_updated": True,
            "reward_earned": True,
            "reward_description": reward_description,
        }

    def _process_discount_transaction(self, amount: Decimal) -> dict:
        """
        Process discount card visit.
        Reads tier config from card metadata to return applicable discount %.
        Tiers: [{"tier_name": "Silver", "threshold": 0, "discount_percentage": 5}, ...]
        Sorted by threshold ascending; highest qualifying tier wins.
        """
        from apps.transactions.models import TransactionType

        tiers = self.card.get_metadata_field("tiers", [])

        # Atomically read and update total_spent_at_business inside select_for_update
        # to prevent race conditions under concurrent scans.
        # Uses Decimal to avoid floating-point precision errors with currency.
        from django.db import transaction as db_transaction

        with db_transaction.atomic():
            locked = CustomerPass.objects.select_for_update().get(pk=self.pk)
            total_spent = locked.pass_data.get("total_spent_at_business", 0)
            new_total = Decimal(str(total_spent)) + Decimal(str(amount))

            # Determine current discount tier
            applicable_tier = None
            for tier in sorted(tiers, key=lambda t: t.get("threshold", 0)):
                if new_total >= Decimal(str(tier.get("threshold", 0))):
                    applicable_tier = tier

            discount_pct = applicable_tier["discount_percentage"] if applicable_tier else 0
            tier_name = applicable_tier["tier_name"] if applicable_tier else ""

            locked.pass_data["total_spent_at_business"] = str(new_total)
            locked.pass_data["current_discount_percentage"] = discount_pct
            locked.pass_data["current_tier_name"] = tier_name
            locked.save(update_fields=["pass_data", "last_updated"])

        self.refresh_from_db(fields=["pass_data", "last_updated"])

        return {
            "transaction_type": TransactionType.MEMBERSHIP_VALIDATED,
            "pass_updated": True,
            "discount_percentage": discount_pct,
            "tier_name": tier_name,
        }

    def _process_referral_transaction(self) -> dict:
        """Process referral_pass card — increment successful referral count.

        Enforces max_referrals_per_customer from card metadata.
        If the customer has already reached the maximum, the count is not incremented.
        """
        from apps.transactions.models import TransactionType
        from django.db import transaction as db_transaction

        max_referrals = self.card.get_metadata_field("max_referrals_per_customer", 0)

        with db_transaction.atomic():
            locked = CustomerPass.objects.select_for_update().get(pk=self.pk)
            current_count = locked.pass_data.get("referral_count", 0)

            # If a max is set (>0) and already reached, don't increment
            if max_referrals > 0 and current_count >= max_referrals:
                return {
                    "transaction_type": TransactionType.REFERRAL_REWARD,
                    "pass_updated": False,
                    "new_referral_count": current_count,
                    "limit_reached": True,
                }

            new_count = current_count + 1
            locked.pass_data["referral_count"] = new_count
            locked.save(update_fields=["pass_data", "last_updated"])

        self.refresh_from_db(fields=["pass_data", "last_updated"])
        return {
            "transaction_type": TransactionType.REFERRAL_REWARD,
            "pass_updated": True,
            "new_referral_count": new_count,
        }

    def _process_membership_transaction(self) -> dict:
        """Process VIP membership validation."""
        from apps.transactions.models import TransactionType

        return {
            "transaction_type": TransactionType.MEMBERSHIP_VALIDATED,
            "pass_updated": False,
        }

    def _process_corporate_transaction(self) -> dict:
        """Process corporate discount validation."""
        from apps.transactions.models import TransactionType

        return {
            "transaction_type": TransactionType.CORPORATE_VALIDATED,
            "pass_updated": False,
        }

    def _process_gift_transaction(self, amount: Decimal) -> dict:
        """Process gift certificate redemption."""
        from apps.transactions.models import TransactionType
        from django.db import transaction as db_transaction

        with db_transaction.atomic():
            locked = CustomerPass.objects.select_for_update().get(pk=self.pk)
            current_balance = Decimal(str(locked.pass_data.get("gift_balance", "0")))
            if current_balance >= amount:
                new_balance = current_balance - amount
                locked.pass_data["gift_balance"] = str(new_balance)
                locked.save(update_fields=["pass_data", "last_updated"])

                self.refresh_from_db(fields=["pass_data", "last_updated"])
                return {
                    "transaction_type": TransactionType.GIFT_REDEEMED,
                    "pass_updated": True,
                    "amount_redeemed": amount,
                    "new_balance": new_balance,
                }

        return {
            "transaction_type": TransactionType.GIFT_REDEEMED,
            "pass_updated": False,
        }

    def _process_multipass_transaction(self) -> dict:
        """Process multipass stamp usage."""
        from apps.transactions.models import TransactionType
        from django.db import transaction as db_transaction

        with db_transaction.atomic():
            locked = CustomerPass.objects.select_for_update().get(pk=self.pk)
            remaining = locked.pass_data.get("multipass_remaining", 0)
            if remaining > 0:
                new_remaining = remaining - 1
                locked.pass_data["multipass_remaining"] = new_remaining
                locked.save(update_fields=["pass_data", "last_updated"])

                self.refresh_from_db(fields=["pass_data", "last_updated"])
                return {
                    "transaction_type": TransactionType.MULTIPASS_USED,
                    "pass_updated": True,
                    "stamps_used": 1,
                    "remaining_stamps": new_remaining,
                }

        return {
            "transaction_type": TransactionType.MULTIPASS_USED,
            "pass_updated": False,
        }
