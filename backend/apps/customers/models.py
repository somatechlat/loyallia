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

    def __repr__(self) -> str:
        return f"<Customer: {self.first_name} {self.last_name} - {self.email}>"

    def __str__(self) -> str:
        return f"{self.first_name} {self.last_name} - {self.email}"

    def clean(self) -> None:
        """Validate customer data."""
        super().clean()
        if not self.first_name.strip():
            raise ValueError("first_name is required")
        if not self.last_name.strip():
            raise ValueError("last_name is required")

    @property
    def full_name(self) -> str:
        """Return customer's full name."""
        return f"{self.first_name} {self.last_name}".strip()

    def generate_referral_code(self) -> str:
        """Generate a unique referral code for this customer.

        LYL-M-API-018: Includes a max-attempts guard to prevent infinite loops
        if the code space is exhausted or there's a DB issue.
        """
        import logging
        import secrets
        import string

        logger = logging.getLogger(__name__)
        max_attempts = 20

        for attempt in range(max_attempts):
            code = "".join(
                secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8)
            )
            if not Customer.objects.filter(referral_code=code).exists():
                return code

        # Fallback: use UUID-based code (guaranteed unique)
        fallback = uuid.uuid4().hex[:12].upper()
        logger.warning(
            "Referral code generation: exhausted %d random attempts, using UUID fallback",
            max_attempts,
        )
        return fallback

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

    def __repr__(self) -> str:
        return f"<CustomerPass: {self.customer.full_name} - {self.card.name}>"

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
        Delegates to apps.customers.services.PassProcessor.
        """
        from apps.customers.services import PassProcessor

        processor = PassProcessor(self)
        result = processor.process_transaction(transaction_type, amount, quantity)

        if result.get("pass_updated"):
            self.refresh_from_db(fields=["pass_data", "last_updated"])

        return result
