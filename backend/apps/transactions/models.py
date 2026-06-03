"""
Loyallia Transaction Models
All loyalty program transactions, validations, and reward issuances.
"""

import uuid

from django.core.validators import MinValueValidator
from django.db import models

from apps.authentication.models import User
from apps.customers.models import Customer, CustomerPass
from apps.tenants.models import Location, Tenant


class TransactionType(models.TextChoices):
    """Types of transactions that can occur."""

    STAMP_EARNED = "stamp_earned", "Sello ganado"
    STAMP_REDEEMED = "stamp_redeemed", "Sello canjeado"
    CASHBACK_EARNED = "cashback_earned", "Cashback ganado"
    CASHBACK_REDEEMED = "cashback_redeemed", "Cashback canjeado"
    COUPON_REDEEMED = "coupon_redeemed", "Cupón canjeado"
    GIFT_REDEEMED = "gift_redeemed", "Regalo canjeado"
    MEMBERSHIP_VALIDATED = "membership_validated", "Membresía validada"
    CORPORATE_VALIDATED = "corporate_validated", "Corporativo validado"
    REFERRAL_REWARD = "referral_reward", "Recompensa por referido"
    MULTIPASS_USED = "multipass_used", "Multipase usado"
    REMOTE_REWARD = "remote_reward", "Recompensa remota"
    DENIED = "denied", "Denegado"


class Transaction(models.Model):
    """
    Base transaction record for all loyalty program activities.
    Every validation, reward issuance, or redemption is recorded here.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier for this record.",
    )
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="transactions",
        verbose_name="Negocio",
        help_text="The business this record belongs to.",
    )
    #
    customer_pass = models.ForeignKey(
        CustomerPass,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="transactions",
        verbose_name="Pase del cliente",
        help_text="The customer loyalty pass.",
    )

    # Who performed the transaction
    staff = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="transactions",
        verbose_name="Personal",
        help_text="The staff member who performed this action.",
    )
    location = models.ForeignKey(
        Location,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="transactions",
        verbose_name="Ubicación",
        help_text="Physical location where the action took place.",
    )

    # Transaction details
    transaction_type = models.CharField(
        max_length=30,
        choices=TransactionType.choices,
        verbose_name="Tipo de transacción",
        help_text="Transaction type.",
    )
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
        verbose_name="Monto",
        help_text="Monetary amount.",
    )
    quantity = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name="Cantidad",
        help_text="Quantity or count.",
    )

    # Transaction metadata
    notes = models.TextField(
        blank=True,
        default="",
        verbose_name="Notas",
        help_text="Additional notes or comments.",
    )
    transaction_data = models.JSONField(
        default=dict,
        verbose_name="Datos de transacción",
        help_text="Transaction metadata stored as JSON.",
    )

    # Remote transaction flag
    is_remote = models.BooleanField(
        default=False,
        verbose_name="Transacción remota",
        help_text="Whether this transaction was performed remotely.",
    )

    # NEW: Idempotency key for exactly-once semantics
    idempotency_key = models.CharField(
        max_length=64,
        db_index=True,
        blank=True,
        default="",
        verbose_name="Clave de idempotencia",
        help_text="Key for ensuring exactly-once semantics.",
    )

    # NEW: Denial audit trail (when redemption is blocked)
    denial_reason = models.CharField(
        max_length=50,
        blank=True,
        default="",
        choices=[
            ("", "N/A"),
            ("usage_limit_exceeded", "Límite de usos excedido"),
            ("time_window_invalid", "Fuera de período válido"),
            ("location_invalid", "Ubicación no autorizada"),
            ("min_purchase_not_met", "Compra mínima no alcanzada"),
            ("cooldown_active", "En período de enfriamiento"),
            ("insufficient_balance", "Saldo insuficiente"),
            ("reward_not_ready", "Recompensa no disponible"),
            ("staff_role_denied", "Rol de personal no autorizado"),
            ("card_not_published", "Programa no publicado"),
            ("pass_expired", "Pase expirado"),
            ("pass_inactive", "Pase inactivo"),
        ],
        verbose_name="Motivo de denegación",
        help_text="Reason why the transaction was denied.",
    )

    # NEW: Which rules were evaluated (for audit)
    rules_evaluated = models.JSONField(
        default=list,
        verbose_name="Reglas evaluadas",
        help_text="Rules that were evaluated for this transaction.",
    )

    # Audit
    created_by = models.UUIDField(
        null=True,
        blank=True,
        verbose_name="Creado por",
        help_text="ID of the user who created this record.",
    )
    updated_by = models.UUIDField(
        null=True,
        blank=True,
        verbose_name="Actualizado por",
        help_text="ID of the user who last updated this record.",
    )

    # Timestamps
    created_at = models.DateTimeField(
        auto_now_add=True, help_text="Timestamp for created."
    )

    class Meta:
        """Model metadata and database configuration."""

        db_table = "loyallia_transactions"
        verbose_name = "Transacción"
        verbose_name_plural = "Transacciones"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["tenant", "created_at"]),
            models.Index(fields=["customer_pass", "created_at"]),
            models.Index(fields=["transaction_type"]),
            # Compound indexes for production query patterns
            models.Index(
                fields=["tenant", "customer_pass", "created_at"],
                name="idx_txn_tenant_pass_date",
            ),
            models.Index(
                fields=["transaction_type", "created_at"],
                name="idx_txn_type_date",
            ),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(amount__gte=0) | models.Q(amount__isnull=True),
                name="check_transaction_amount_non_negative",
            ),
        ]

    def save(self, *args, **kwargs) -> None:
        from common.models import get_current_user_id

        user_id = get_current_user_id()
        if user_id and not self.created_by:
            self.created_by = user_id
        if user_id:
            self.updated_by = user_id
        super().save(*args, **kwargs)

    def __repr__(self) -> str:
        return f"<Transaction: {self.transaction_type} - {self.customer_pass} - {self.created_at}>"

    def __str__(self) -> str:
        """Return a human-readable string representation."""
        return f"{self.transaction_type} - {self.customer_pass.customer.full_name} - {self.created_at}"

    @property
    def customer(self) -> Customer:
        """Convenience property to access customer."""
        return self.customer_pass.customer

    @property
    def card(self):
        """Convenience property to access card."""
        return self.customer_pass.card


class Enrollment(models.Model):
    """
    Customer enrollment events.
    Separate from transactions for analytics and tracking.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier for this record.",
    )
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="enrollments",
        verbose_name="Negocio",
        help_text="The business this record belongs to.",
    )
    customer = models.ForeignKey(
        Customer,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="enrollments",
        verbose_name="Cliente",
        help_text="The customer associated with this record.",
    )
    card = models.ForeignKey(
        "cards.Card",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="enrollments",
        verbose_name="Programa",
        help_text="The loyalty program associated with this record.",
    )

    # Enrollment method
    enrollment_method = models.CharField(
        max_length=20,
        choices=[
            ("qr_scan", "Escaneo QR"),
            ("direct_link", "Enlace directo"),
            ("referral", "Referido"),
            ("manual", "Manual"),
        ],
        default="qr_scan",
        verbose_name="Método de inscripción",
        help_text="How the customer enrolled.",
    )

    # Referral tracking
    referral_code_used = models.CharField(
        max_length=20,
        blank=True,
        default="",
        help_text="Referral code used during enrollment.",
    )

    # Source location (if applicable)
    location = models.ForeignKey(
        Location,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="enrollments",
        verbose_name="Ubicación",
        help_text="Physical location where the action took place.",
    )

    # Device info
    user_agent = models.TextField(
        blank=True,
        default="",
        verbose_name="User Agent",
        help_text="Client user agent string.",
    )
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        verbose_name="Dirección IP",
        help_text="IP address of the client.",
    )

    # Timestamps
    enrolled_at = models.DateTimeField(
        auto_now_add=True, help_text="Timestamp for enrolled."
    )

    class Meta:
        """Model metadata and database configuration."""

        db_table = "loyallia_enrollments"
        verbose_name = "Inscripción"
        verbose_name_plural = "Inscripciones"
        ordering = ["-enrolled_at"]
        indexes = [
            models.Index(fields=["tenant", "enrolled_at"]),
            models.Index(fields=["card", "enrolled_at"]),
            # Compound index for tenant-scoped enrollment lookups
            models.Index(
                fields=["tenant", "customer", "card"],
                name="idx_enroll_tnt_cust_card",
            ),
        ]

    def __repr__(self) -> str:
        return f"<Enrollment: {self.customer.full_name} in {self.card.name} via {self.enrollment_method}>"

    def __str__(self) -> str:
        """Return a human-readable string representation."""
        return f"{self.customer.full_name} enrolled in {self.card.name} via {self.enrollment_method}"
