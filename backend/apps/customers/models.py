"""
Loyallia Customer Models
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

class CustomerPortalAccount(models.Model):
    """
    Global customer portal account for self-service access.
    Not tenant-scoped: one email = one portal account across all businesses.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True, verbose_name="Correo electrónico")
    password = models.CharField(max_length=128, blank=True, default="", verbose_name="Contraseña")
    is_active = models.BooleanField(default=True, verbose_name="Cuenta activa")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:  # pyright: ignore[reportIncompatibleVariableOverride]
        db_table = "loyallia_customer_portal_accounts"
        verbose_name = "Cuenta de Portal de Cliente"
        verbose_name_plural = "Cuentas de Portal de Clientes"

    def set_password(self, raw_password: str) -> None:
        """Hash and store the password using Django's hasher."""
        from django.contrib.auth.hashers import make_password

        self.password = make_password(raw_password)

    def check_password(self, raw_password: str) -> bool:
        """Verify a raw password against the stored hash."""
        from django.contrib.auth.hashers import check_password as django_check

        return django_check(raw_password, self.password)

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
    email = models.EmailField(validators=[EmailValidator()], verbose_name="Correo electrónico")
    phone = models.CharField(max_length=20, blank=True, default="", verbose_name="Teléfono")

    # Optional additional info
    date_of_birth = models.DateField(null=True, blank=True, verbose_name="Fecha de nacimiento")
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
    total_visits = models.PositiveIntegerField(default=0, verbose_name="Total de visitas")
    total_spent = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
        verbose_name="Total gastado",
    )
    last_visit = models.DateTimeField(null=True, blank=True, verbose_name="Última visita")

    class Meta:  # pyright: ignore[reportIncompatibleVariableOverride]
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

        if the code space is exhausted or there's a DB issue.
        """
        import logging
        import secrets
        import string

        logger = logging.getLogger(__name__)
        max_attempts = 20

        for _attempt in range(max_attempts):
            code = "".join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))
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
    card = models.ForeignKey(Card, on_delete=models.PROTECT, related_name="passes", verbose_name="Programa")

    # Pass state stored as JSONB (Legacy/Dynamic)
    pass_data = models.JSONField(default=dict, verbose_name="Datos del pase")

    # Core metrics (Typed columns for integrity and indexing)
    stamp_count = models.PositiveIntegerField(default=0, verbose_name="Contador de sellos")
    cashback_balance = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        verbose_name="Balance de cashback",
    )
    referral_count = models.PositiveIntegerField(default=0, verbose_name="Contador de referidos")
    multipass_remaining = models.PositiveIntegerField(default=0, verbose_name="Usos restantes multipase")
    gift_balance = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        verbose_name="Balance de certificado de regalo",
    )

    # Wallet pass identifiers
    apple_pass_id = models.CharField(max_length=100, blank=True, default="", verbose_name="Apple Pass ID")
    google_pass_id = models.CharField(max_length=100, blank=True, default="", verbose_name="Google Pass ID")

    # QR code for validation indexed for O(log N) scan lookups
    qr_code = models.CharField(
        max_length=100,
        unique=True,
        db_index=True,
        blank=True,
        default="",
        verbose_name="Código QR",
    )

    # Status
    is_active = models.BooleanField(default=True, verbose_name="Pase activo")
    enrolled_at = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de inscripción")
    last_updated = models.DateTimeField(auto_now=True, verbose_name="Última actualización")

    # NEW: Lifecycle state machine
    class LifecycleState(models.TextChoices):
        ACTIVE = "active", "Activo"
        REWARD_READY = "reward_ready", "Recompensa lista"
        EXPIRED = "expired", "Expirado"
        DEPLETED = "depleted", "Agotado"
        SUSPENDED = "suspended", "Suspendido"

    lifecycle_state = models.CharField(
        max_length=20,
        choices=LifecycleState.choices,
        default=LifecycleState.ACTIVE,
        verbose_name="Estado del ciclo de vida",
    )

    # NEW: Coupon usage counter (replaces boolean coupon_used)
    coupon_redemption_count = models.PositiveIntegerField(default=0, verbose_name="Contador de canjes de cupón")

    # NEW: Last redemption timestamp (for cooldown rules)
    last_redemption_at = models.DateTimeField(null=True, blank=True, verbose_name="Último canje")

    # NEW: Reward queue (JSON list of pending rewards)
    pending_rewards = models.JSONField(default=list, verbose_name="Recompensas pendientes")

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
        Collision probability: 1 in 1.8×10^19  effectively zero.
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

    @property
    def stamp_count_val(self) -> int:
        """Current stamp count for stamp cards (prefers typed column)."""
        return self.stamp_count if self.stamp_count > 0 else self.get_pass_field("stamp_count", 0)

    @property
    def cashback_balance_val(self) -> Decimal:
        """Current cashback balance (prefers typed column)."""
        return (
            self.cashback_balance
            if self.cashback_balance > 0
            else Decimal(str(self.get_pass_field("cashback_balance", "0")))
        )

    @property
    def coupon_used(self) -> bool:
        """Whether coupon has been used."""
        return self.get_pass_field("coupon_used", False)

    @property
    def discount_tier(self) -> str:
        """Current discount tier name."""
        return self.get_pass_field("discount_tier", "")

    @property
    def gift_balance_val(self) -> Decimal:
        """Current gift certificate balance (prefers typed column)."""
        return self.gift_balance if self.gift_balance > 0 else Decimal(str(self.get_pass_field("gift_balance", "0")))

    @property
    def membership_expiry(self) -> datetime | None:
        """Membership expiry date."""
        from django.utils.dateparse import parse_datetime

        expiry_str = self.get_pass_field("membership_expiry")
        return parse_datetime(expiry_str) if expiry_str else None

    @property
    def corporate_discount(self) -> Decimal:
        """Corporate discount percentage."""
        return Decimal(str(self.get_pass_field("corporate_discount", "0")))

    @property
    def referral_count_val(self) -> int:
        """Number of successful referrals (prefers typed column)."""
        return self.referral_count if self.referral_count > 0 else self.get_pass_field("referral_count", 0)

    @property
    def multipass_remaining_val(self) -> int:
        """Remaining prepaid stamps in multipass (prefers typed column)."""
        return (
            self.multipass_remaining if self.multipass_remaining > 0 else self.get_pass_field("multipass_remaining", 0)
        )

    def process_transaction(self, transaction_type: str, amount: Decimal = Decimal("0"), quantity: int = 1) -> dict:
        """
        Process a transaction for this pass based on card type.
        Delegates to the new Redemption Engine strategies.
        """
        if quantity < 1:
            raise ValueError("Quantity must be a positive integer")

        from django.utils import timezone

        from apps.redemption.context import RedemptionContext
        from apps.redemption.strategies.registry import get_strategy

        # Resolve intent (mirrors RedemptionGateway._resolve_intent)
        resolved_intent = "auto"
        if transaction_type in ("earn", "redeem", "validate"):
            resolved_intent = transaction_type
        elif self.card.card_type == "stamp":
            is_ready = self.lifecycle_state == self.LifecycleState.REWARD_READY or self.pass_data.get(
                "reward_ready", False
            )
            resolved_intent = "redeem" if is_ready else "earn"
        elif self.card.card_type == "cashback":
            resolved_intent = "earn"
        elif self.card.card_type in ("vip_membership", "corporate_discount", "affiliate"):
            resolved_intent = "validate"
        else:
            resolved_intent = "redeem"

        context = RedemptionContext(
            tenant=self.card.tenant,
            customer_pass=self,
            card=self.card,
            amount=amount,
            quantity=quantity,
            staff_id=None,
            location_id=None,
            scanned_at=timezone.now(),
            intent=resolved_intent,
        )

        # Capture old state for backward-compat mapping
        _old_stamp_count = self.stamp_count or self.pass_data.get("stamp_count", 0)

        strategy = get_strategy(self.card.card_type, resolved_intent)
        result = strategy.execute(context)

        if result.pass_updated:
            self.refresh_from_db()

        # Map RedemptionResult to legacy dict format for backward compatibility
        card_type = self.card.card_type
        legacy = {
            "transaction_type": result.transaction_type,
            "amount": amount,
            "quantity": quantity,
            "pass_updated": result.pass_updated,
            "reward_earned": result.reward_earned,
            "reward_description": result.reward_description,
            "success": result.success,
        }

        # Coupon omits reward_earned on denial
        if card_type == "coupon" and not result.pass_updated:
            legacy.pop("reward_earned", None)
            legacy.pop("reward_description", None)

        if card_type == "stamp":
            legacy["new_stamp_count"] = self.stamp_count
            # Compute reward count
            try:
                stamps_required = int(self.card.metadata.get("stamps_required", 10))
                if stamps_required <= 0:
                    stamps_required = 10
            except (TypeError, ValueError):
                stamps_required = 10
            total_stamps = _old_stamp_count + quantity
            legacy["reward_count"] = total_stamps // stamps_required
        elif card_type == "cashback":
            if result.new_balance:
                legacy["new_balance"] = Decimal(str(result.new_balance))
                legacy["earned_amount"] = legacy["new_balance"]
        elif card_type == "gift_certificate":
            if result.pass_updated:
                legacy["amount_redeemed"] = amount
            legacy["new_balance"] = result.new_balance
        elif card_type == "multipass":
            legacy["stamps_used"] = 1 if result.pass_updated else 0
            legacy["remaining_stamps"] = result.remaining_uses
        elif card_type == "referral_pass":
            legacy["new_referral_count"] = self.referral_count_val
            max_ref = int(self.card.metadata.get("max_referrals_per_customer", 0)) if self.card.metadata else 0
            legacy["limit_reached"] = not result.pass_updated and max_ref > 0 and self.referral_count_val >= max_ref
        elif card_type == "discount":
            legacy["discount_percentage"] = self.pass_data.get("current_discount_percentage", 0)
            legacy["tier_name"] = self.pass_data.get("current_tier_name", "")
        elif card_type in ("vip_membership", "affiliate"):
            legacy["membership_valid"] = result.success
            legacy["membership_expiry"] = self.pass_data.get("membership_expiry", "")
            legacy["reason"] = "" if result.success else "membership_expired"
        elif card_type == "corporate_discount":
            legacy["membership_valid"] = result.success

        return legacy

    def _process_stamp_transaction(self, amount: Decimal = Decimal("0"), quantity: int = 1) -> dict:
        return self.process_transaction("stamp", amount, quantity)

    def _process_coupon_transaction(self) -> dict:
        return self.process_transaction("coupon")

    def _process_referral_transaction(self) -> dict:
        return self.process_transaction("referral_pass")

    def _process_discount_transaction(self, amount: Decimal) -> dict:
        return self.process_transaction("discount", amount=amount)

class ApplePassRegistration(models.Model):
    """
    Device registration for Apple Wallet pass update push notifications.

    Per Apple PassKit docs: when a user adds a pass to Wallet, the device calls
    POST /v1/devices/{deviceLibraryIdentifier}/registrations/{passTypeIdentifier}/{serialNumber}
    providing a pushToken. We store this mapping to send empty APNs pushes
    when pass data changes, triggering the device to re-download the updated .pkpass.

    Reference: https://developer.apple.com/documentation/walletpasses/adding-a-web-service-to-update-passes
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # The unique device identifier provided by the Apple device
    device_library_id = models.CharField(
        max_length=255,
        db_index=True,
        verbose_name="Device Library Identifier",
    )

    # APNs push token used to send empty {} push to trigger pass re-download
    push_token = models.CharField(
        max_length=255,
        verbose_name="APNs Push Token",
    )

    # The customer pass this device is registered to receive updates for
    customer_pass = models.ForeignKey(
        CustomerPass,
        on_delete=models.CASCADE,
        related_name="apple_registrations",
        verbose_name="Customer Pass",
    )

    registered_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "loyallia_apple_pass_registrations"
        verbose_name = "Apple Pass Registration"
        verbose_name_plural = "Apple Pass Registrations"
        # One registration per device per pass (Apple spec)
        unique_together = ("device_library_id", "customer_pass")
        indexes = [
            models.Index(
                fields=["customer_pass"],
                name="idx_apple_reg_pass",
            ),
        ]

    def __str__(self) -> str:
        return f"Apple Registration: device {self.device_library_id[-8:]} → pass {self.customer_pass_id}"
