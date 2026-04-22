"""
Loyallia — Transaction Models
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


class Transaction(models.Model):
    """
    Base transaction record for all loyalty program activities.
    Every validation, reward issuance, or redemption is recorded here.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="transactions",
        verbose_name="Negocio"
    )
    customer_pass = models.ForeignKey(
        CustomerPass,
        on_delete=models.CASCADE,
        related_name="transactions",
        verbose_name="Pase del cliente"
    )

    # Who performed the transaction
    staff = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="transactions",
        verbose_name="Personal"
    )
    location = models.ForeignKey(
        Location,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="transactions",
        verbose_name="Ubicación"
    )

    # Transaction details
    transaction_type = models.CharField(
        max_length=30,
        choices=TransactionType.choices,
        verbose_name="Tipo de transacción"
    )
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
        verbose_name="Monto"
    )
    quantity = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name="Cantidad"
    )

    # Transaction metadata
    notes = models.TextField(blank=True, default="", verbose_name="Notas")
    transaction_data = models.JSONField(default=dict, verbose_name="Datos de transacción")

    # Remote transaction flag
    is_remote = models.BooleanField(default=False, verbose_name="Transacción remota")

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "loyallia_transactions"
        verbose_name = "Transacción"
        verbose_name_plural = "Transacciones"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["tenant", "created_at"]),
            models.Index(fields=["customer_pass", "created_at"]),
            models.Index(fields=["transaction_type"]),
        ]

    def __str__(self) -> str:
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
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="enrollments",
        verbose_name="Negocio"
    )
    customer = models.ForeignKey(
        Customer,
        on_delete=models.CASCADE,
        related_name="enrollments",
        verbose_name="Cliente"
    )
    card = models.ForeignKey(
        "cards.Card",
        on_delete=models.CASCADE,
        related_name="enrollments",
        verbose_name="Programa"
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
        verbose_name="Método de inscripción"
    )

    # Referral tracking
    referral_code_used = models.CharField(max_length=20, blank=True, default="")

    # Source location (if applicable)
    location = models.ForeignKey(
        Location,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="enrollments",
        verbose_name="Ubicación"
    )

    # Device info
    user_agent = models.TextField(blank=True, default="", verbose_name="User Agent")
    ip_address = models.GenericIPAddressField(null=True, blank=True, verbose_name="Dirección IP")

    # Timestamps
    enrolled_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "loyallia_enrollments"
        verbose_name = "Inscripción"
        verbose_name_plural = "Inscripciones"
        ordering = ["-enrolled_at"]
        indexes = [
            models.Index(fields=["tenant", "enrolled_at"]),
            models.Index(fields=["card", "enrolled_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.customer.full_name} enrolled in {self.card.name} via {self.enrollment_method}"
