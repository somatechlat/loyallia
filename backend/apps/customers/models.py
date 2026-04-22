"""
Loyallia — Customer Models
Customer profiles, passes, and enrollment management.
"""
import uuid
from datetime import datetime
from decimal import Decimal
from django.db import models
from django.core.validators import EmailValidator, MinValueValidator
from apps.tenants.models import Tenant
from apps.cards.models import Card


class Customer(models.Model):
    """
    Customer profile with contact information.
    Customers can enroll in multiple programs (passes).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="customers",
        verbose_name="Negocio"
    )

    # Contact Information
    first_name = models.CharField(max_length=100, verbose_name="Nombre")
    last_name = models.CharField(max_length=100, verbose_name="Apellido")
    email = models.EmailField(
        validators=[EmailValidator()],
        verbose_name="Correo electrónico"
    )
    phone = models.CharField(max_length=20, blank=True, default="", verbose_name="Teléfono")

    # Optional additional info
    date_of_birth = models.DateField(null=True, blank=True, verbose_name="Fecha de nacimiento")
    gender = models.CharField(
        max_length=1,
        choices=[("M", "Masculino"), ("F", "Femenino"), ("O", "Otro")],
        blank=True,
        default="",
        verbose_name="Género"
    )

    # Referral system
    referral_code = models.CharField(max_length=20, unique=True, blank=True, default="")
    referred_by = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="referrals",
        verbose_name="Referido por"
    )

    # Status
    is_active = models.BooleanField(default=True, verbose_name="Cliente activo")
    notes = models.TextField(blank=True, default="", verbose_name="Notas")

    # Analytics
    total_visits = models.PositiveIntegerField(default=0, verbose_name="Total de visitas")
    total_spent = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
        verbose_name="Total gastado"
    )
    last_visit = models.DateTimeField(null=True, blank=True, verbose_name="Última visita")

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "loyallia_customers"
        verbose_name = "Cliente"
        verbose_name_plural = "Clientes"
        ordering = ["-created_at"]
        unique_together = ["tenant", "email"]  # One account per email per tenant

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
            code = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))
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
        verbose_name="Cliente"
    )
    card = models.ForeignKey(
        Card,
        on_delete=models.CASCADE,
        related_name="passes",
        verbose_name="Programa"
    )

    # Pass state stored as JSONB (balances, counters, etc.)
    pass_data = models.JSONField(default=dict, verbose_name="Datos del pase")

    # Wallet pass identifiers
    apple_pass_id = models.CharField(max_length=100, blank=True, default="", verbose_name="Apple Pass ID")
    google_pass_id = models.CharField(max_length=100, blank=True, default="", verbose_name="Google Pass ID")

    # QR code for validation
    qr_code = models.CharField(max_length=100, unique=True, blank=True, default="", verbose_name="Código QR")

    # Status
    is_active = models.BooleanField(default=True, verbose_name="Pase activo")
    enrolled_at = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de inscripción")
    last_updated = models.DateTimeField(auto_now=True, verbose_name="Última actualización")

    class Meta:
        db_table = "loyallia_customer_passes"
        verbose_name = "Pase del cliente"
        verbose_name_plural = "Pases de clientes"
        ordering = ["-enrolled_at"]
        unique_together = ["customer", "card"]  # One pass per customer per program

    def __str__(self) -> str:
        return f"{self.customer.full_name} - {self.card.name}"

    def generate_qr_code(self) -> str:
        """Generate a unique QR code for this pass."""
        import secrets
        import string

        while True:
            code = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(12))
            if not CustomerPass.objects.filter(qr_code=code).exists():
                return code

    def get_pass_field(self, key: str, default=None):
        """Helper to safely get pass data fields."""
        return self.pass_data.get(key, default)

    def set_pass_field(self, key: str, value) -> None:
        """Helper to safely set pass data fields."""
        self.pass_data[key] = value
        self.save(update_fields=["pass_data", "last_updated"])

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

    def process_transaction(self, transaction_type: str, amount: Decimal = 0, quantity: int = 1) -> dict:
        """
        Process a transaction for this pass based on card type.
        Card type values match CardType TextChoices in cards/models.py:
          stamp | cashback | coupon | affiliate | discount |
          gift_certificate | vip_membership | corporate_discount |
          referral_pass | multipass
        Returns dict with transaction details and updated pass data.
        """
        from apps.transactions.models import TransactionType
        from decimal import Decimal

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
                card_type, self.id,
            )

        return result

    def _process_stamp_transaction(self, amount: Decimal, quantity: int) -> dict:
        """Process stamp card transaction."""
        from apps.transactions.models import TransactionType

        stamps_required = self.card.get_metadata_field("stamps_required", 10)
        reward_description = self.card.get_metadata_field("reward_description", "Free item")

        current_stamps = self.stamp_count
        new_stamps = current_stamps + quantity

        # Check if reward is earned
        reward_earned = new_stamps >= stamps_required
        if reward_earned:
            # Reset stamps after reward
            new_stamps = new_stamps - stamps_required
            self.set_pass_field("reward_ready", True)

        self.set_pass_field("stamp_count", new_stamps)

        return {
            "transaction_type": TransactionType.STAMP_EARNED,
            "pass_updated": True,
            "reward_earned": reward_earned,
            "reward_description": reward_description if reward_earned else "",
            "new_stamp_count": new_stamps,
        }

    def _process_cashback_transaction(self, amount: Decimal) -> dict:
        """Process cashback card transaction."""
        from apps.transactions.models import TransactionType

        percentage = self.card.get_metadata_field("cashback_percentage", 0)
        min_purchase = self.card.get_metadata_field("minimum_purchase", 0)

        if amount >= min_purchase:
            earned = (amount * percentage) / 100
            current_balance = self.cashback_balance
            new_balance = current_balance + earned
            self.set_pass_field("cashback_balance", str(new_balance))

            return {
                "transaction_type": TransactionType.CASHBACK_EARNED,
                "pass_updated": True,
                "earned_amount": earned,
                "new_balance": new_balance,
            }

        return {"transaction_type": TransactionType.CASHBACK_EARNED, "pass_updated": False}

    def _process_coupon_transaction(self) -> dict:
        """Process coupon redemption."""
        from apps.transactions.models import TransactionType

        if not self.coupon_used:
            self.set_pass_field("coupon_used", True)
            reward_description = self.card.get_metadata_field("coupon_description", "Coupon redeemed")

            return {
                "transaction_type": TransactionType.COUPON_REDEEMED,
                "pass_updated": True,
                "reward_earned": True,
                "reward_description": reward_description,
            }

        return {"transaction_type": TransactionType.COUPON_REDEEMED, "pass_updated": False}

    def _process_discount_transaction(self, amount: Decimal) -> dict:
        """
        Process discount card visit.
        Reads tier config from card metadata to return applicable discount %.
        Tiers: [{"tier_name": "Silver", "threshold": 0, "discount_percentage": 5}, ...]
        Sorted by threshold ascending; highest qualifying tier wins.
        """
        from apps.transactions.models import TransactionType
        tiers = self.card.get_metadata_field("tiers", [])
        total_spent = self.get_pass_field("total_spent_at_business", 0)

        # Accumulate spend
        new_total = float(total_spent) + float(amount)
        self.set_pass_field("total_spent_at_business", new_total)

        # Determine current discount tier
        applicable_tier = None
        for tier in sorted(tiers, key=lambda t: t.get("threshold", 0)):
            if new_total >= tier.get("threshold", 0):
                applicable_tier = tier

        discount_pct = applicable_tier["discount_percentage"] if applicable_tier else 0
        tier_name = applicable_tier["tier_name"] if applicable_tier else ""

        self.set_pass_field("current_discount_percentage", discount_pct)
        self.set_pass_field("current_tier_name", tier_name)

        return {
            "transaction_type": TransactionType.MEMBERSHIP_VALIDATED,
            "pass_updated": True,
            "discount_percentage": discount_pct,
            "tier_name": tier_name,
        }

    def _process_referral_transaction(self) -> dict:
        """Process referral_pass card — increment successful referral count."""
        from apps.transactions.models import TransactionType

        current_count = self.referral_count
        new_count = current_count + 1
        self.set_pass_field("referral_count", new_count)

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

        current_balance = self.gift_balance
        if current_balance >= amount:
            new_balance = current_balance - amount
            self.set_pass_field("gift_balance", str(new_balance))

            return {
                "transaction_type": TransactionType.GIFT_REDEEMED,
                "pass_updated": True,
                "amount_redeemed": amount,
                "new_balance": new_balance,
            }

        return {"transaction_type": TransactionType.GIFT_REDEEMED, "pass_updated": False}

    def _process_multipass_transaction(self) -> dict:
        """Process multipass stamp usage."""
        from apps.transactions.models import TransactionType

        remaining = self.multipass_remaining
        if remaining > 0:
            new_remaining = remaining - 1
            self.set_pass_field("multipass_remaining", new_remaining)

            return {
                "transaction_type": TransactionType.MULTIPASS_USED,
                "pass_updated": True,
                "stamps_used": 1,
                "remaining_stamps": new_remaining,
            }

        return {"transaction_type": TransactionType.MULTIPASS_USED, "pass_updated": False}