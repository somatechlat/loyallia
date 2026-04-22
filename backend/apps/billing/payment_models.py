"""
Loyallia — Payment & Invoice Models (REQ-PAY-001)
Split from billing/models.py per 500-line architectural limit.
Contains PaymentMethod and Invoice models.
"""

import uuid
from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone

from apps.billing.models import Subscription
from apps.tenants.models import Tenant


# =============================================================================
# PAYMENT METHOD
# =============================================================================


class PaymentMethod(models.Model):
    """
    Stored payment method for a tenant.
    Tokenized card data stored by payment gateway — we only keep last4 and brand.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="payment_methods",
        verbose_name="Negocio",
    )

    # Payment gateway token (PCI-compliant — we never store raw card data)
    gateway_token = models.CharField(
        max_length=200, verbose_name="Token de pago (gateway)"
    )

    # Display info only
    card_brand = models.CharField(
        max_length=20, blank=True, default="", verbose_name="Marca de tarjeta"
    )
    card_last_four = models.CharField(
        max_length=4, blank=True, default="", verbose_name="Últimos 4 dígitos"
    )
    card_exp_month = models.PositiveSmallIntegerField(
        null=True, blank=True, verbose_name="Mes de expiración"
    )
    card_exp_year = models.PositiveSmallIntegerField(
        null=True, blank=True, verbose_name="Año de expiración"
    )
    cardholder_name = models.CharField(
        max_length=200, blank=True, default="", verbose_name="Nombre del titular"
    )

    # Status
    is_default = models.BooleanField(
        default=False, verbose_name="Método predeterminado"
    )
    is_active = models.BooleanField(default=True, verbose_name="Activo")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "loyallia_payment_methods"
        verbose_name = "Método de pago"
        verbose_name_plural = "Métodos de pago"
        ordering = ["-is_default", "-created_at"]

    def __str__(self) -> str:
        return f"{self.card_brand} ****{self.card_last_four} — {self.tenant.name}"

    @property
    def display_name(self) -> str:
        return f"{self.card_brand} terminada en {self.card_last_four}"


# =============================================================================
# INVOICE
# =============================================================================


class Invoice(models.Model):
    """
    Billing invoice for subscription payments.
    Includes IVA breakdown for Ecuador SRI compliance.
    """

    class InvoiceStatus(models.TextChoices):
        DRAFT = "draft", "Borrador"
        OPEN = "open", "Abierta"
        PAID = "paid", "Pagada"
        VOID = "void", "Anulada"
        UNCOLLECTIBLE = "uncollectible", "Incobrable"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="invoices",
        verbose_name="Negocio",
    )
    subscription = models.ForeignKey(
        Subscription,
        on_delete=models.CASCADE,
        related_name="invoices",
        verbose_name="Suscripción",
    )

    # Invoice number (sequential per tenant)
    invoice_number = models.CharField(
        max_length=50, unique=True, verbose_name="Número de factura"
    )

    # Amounts
    subtotal = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        verbose_name="Subtotal",
    )
    tax_rate = models.DecimalField(
        max_digits=5,
        decimal_places=4,
        default=Decimal("0.1500"),
        verbose_name="Tasa IVA",
    )
    tax_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        verbose_name="Monto IVA",
    )
    total = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        verbose_name="Total",
    )
    currency = models.CharField(max_length=3, default="USD", verbose_name="Moneda")

    # Billing period
    period_start = models.DateTimeField(verbose_name="Inicio del período")
    period_end = models.DateTimeField(verbose_name="Fin del período")

    # Payment
    status = models.CharField(
        max_length=20,
        choices=InvoiceStatus.choices,
        default=InvoiceStatus.DRAFT,
        verbose_name="Estado",
    )
    gateway_charge_id = models.CharField(
        max_length=100,
        blank=True,
        default="",
        verbose_name="ID de cargo (gateway)",
    )
    paid_at = models.DateTimeField(null=True, blank=True, verbose_name="Pagado en")

    # SRI Ecuador electronic invoice fields
    sri_authorization_number = models.CharField(
        max_length=49, blank=True, default="",
        verbose_name="Número de autorización SRI",
    )
    sri_access_key = models.CharField(
        max_length=49, blank=True, default="",
        verbose_name="Clave de acceso SRI",
    )

    # Additional data
    invoice_data = models.JSONField(
        default=dict, verbose_name="Datos adicionales de factura"
    )
    pdf_url = models.URLField(blank=True, default="", verbose_name="URL del PDF")

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "loyallia_invoices"
        verbose_name = "Factura"
        verbose_name_plural = "Facturas"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["tenant", "created_at"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self) -> str:
        return f"Factura {self.invoice_number} — {self.tenant.name} — ${self.total}"

    @classmethod
    def generate_invoice_number(cls, tenant: Tenant) -> str:
        """Generate sequential invoice number: LYL-{tenant_slug}-{seq}."""
        count = cls.objects.filter(tenant=tenant).count() + 1
        slug = tenant.slug[:10].upper().replace("-", "")
        return f"LYL-{slug}-{count:05d}"

    def calculate_amounts(self) -> None:
        """Calculate tax and total from subtotal and tax_rate."""
        self.tax_amount = (self.subtotal * self.tax_rate).quantize(Decimal("0.01"))
        self.total = self.subtotal + self.tax_amount

    def mark_paid(self, gateway_charge_id: str = "") -> None:
        """Mark invoice as paid."""
        self.status = self.InvoiceStatus.PAID
        self.gateway_charge_id = gateway_charge_id
        self.paid_at = timezone.now()
        self.save(
            update_fields=["status", "gateway_charge_id", "paid_at", "updated_at"]
        )
