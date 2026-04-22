"""
Loyallia — Billing Models
Subscription management via Claro Pay Ecuador payment processing.
All payment operations route through Claro Pay's gateway infrastructure.
"""
import uuid
from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone

from apps.tenants.models import Tenant


class BillingPlan(models.TextChoices):
    """Available billing plans. Loyallia uses a FULL flat-rate model."""
    TRIAL = "trial", "Trial Gratuito (14 días)"
    FULL = "full", "FULL ($75/mes + IVA)"


class SubscriptionPlan(models.Model):
    """
    Configurable SaaS pricing plan. Managed by SUPER_ADMIN.
    Allows dynamic creation of pricing tiers (Starter, Professional, Enterprise).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, verbose_name="Nombre del plan")
    slug = models.SlugField(max_length=50, unique=True)
    description = models.TextField(blank=True, default="", verbose_name="Descripción")

    # Pricing
    price_monthly = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal("0.00"),
        validators=[MinValueValidator(0)],
        verbose_name="Precio mensual (USD)"
    )
    price_annual = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal("0.00"),
        validators=[MinValueValidator(0)],
        verbose_name="Precio anual (USD)"
    )

    # Limits
    max_locations = models.PositiveIntegerField(default=1, verbose_name="Máx. sucursales")
    max_users = models.PositiveIntegerField(default=3, verbose_name="Máx. usuarios")
    max_customers = models.PositiveIntegerField(default=500, verbose_name="Máx. clientes")
    max_programs = models.PositiveIntegerField(default=1, verbose_name="Máx. programas")

    # Features (JSON array of feature strings)
    features = models.JSONField(
        default=list,
        verbose_name="Características incluidas",
        help_text='["Google Wallet", "Push Notifications", "Analytics"]'
    )

    # Status
    is_active = models.BooleanField(default=True, verbose_name="Activo")
    is_featured = models.BooleanField(default=False, verbose_name="Plan recomendado")
    trial_days = models.PositiveIntegerField(default=14, verbose_name="Días de prueba")
    sort_order = models.PositiveSmallIntegerField(default=0, verbose_name="Orden")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "loyallia_subscription_plans"
        verbose_name = "Plan de Suscripción"
        verbose_name_plural = "Planes de Suscripción"
        ordering = ["sort_order", "price_monthly"]

    def __str__(self) -> str:
        return f"{self.name} — ${self.price_monthly}/mes"

    @property
    def price_monthly_with_tax(self) -> Decimal:
        tax_rate = Decimal(str(getattr(settings, 'TAX_RATE_ECUADOR', '0.15')))
        return (self.price_monthly * (1 + tax_rate)).quantize(Decimal("0.01"))




class SubscriptionStatus(models.TextChoices):
    """Subscription lifecycle states."""
    TRIALING = "trialing", "Período de prueba"
    ACTIVE = "active", "Activo"
    PAST_DUE = "past_due", "Pago pendiente"
    SUSPENDED = "suspended", "Suspendido"
    CANCELED = "canceled", "Cancelado"


class Subscription(models.Model):
    """
    Tenant subscription to the Loyallia platform.
    Payment processing via Claro Pay Ecuador.
    One subscription per tenant (OneToOne).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.OneToOneField(
        Tenant,
        on_delete=models.CASCADE,
        related_name="subscription",
        verbose_name="Negocio"
    )

    # Plan
    plan = models.CharField(
        max_length=20,
        choices=BillingPlan.choices,
        default=BillingPlan.TRIAL,
        verbose_name="Plan"
    )
    billing_cycle = models.CharField(
        max_length=10,
        choices=[("monthly", "Mensual"), ("annual", "Anual")],
        default="monthly",
        verbose_name="Ciclo de facturación"
    )

    # Status
    status = models.CharField(
        max_length=20,
        choices=SubscriptionStatus.choices,
        default=SubscriptionStatus.TRIALING,
        verbose_name="Estado"
    )

    # Claro Pay identifiers
    claro_pay_subscription_id = models.CharField(
        max_length=100, blank=True, default="",
        verbose_name="ID de suscripción Claro Pay"
    )
    claro_pay_customer_id = models.CharField(
        max_length=100, blank=True, default="",
        verbose_name="ID de cliente Claro Pay"
    )

    # Dates
    trial_start = models.DateTimeField(
        null=True, blank=True, verbose_name="Inicio del trial"
    )
    trial_end = models.DateTimeField(
        null=True, blank=True, verbose_name="Fin del trial"
    )
    current_period_start = models.DateTimeField(
        null=True, blank=True, verbose_name="Inicio del período actual"
    )
    current_period_end = models.DateTimeField(
        null=True, blank=True, verbose_name="Fin del período actual"
    )
    cancel_at_period_end = models.BooleanField(
        default=False, verbose_name="Cancelar al final del período"
    )
    canceled_at = models.DateTimeField(
        null=True, blank=True, verbose_name="Cancelado en"
    )

    # Payment failure tracking
    failed_payment_count = models.SmallIntegerField(
        default=0, verbose_name="Intentos de pago fallidos"
    )
    last_payment_error = models.TextField(
        blank=True, default="", verbose_name="Último error de pago"
    )
    last_payment_at = models.DateTimeField(
        null=True, blank=True, verbose_name="Último pago exitoso"
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "loyallia_subscriptions"
        verbose_name = "Suscripción"
        verbose_name_plural = "Suscripciones"

    def __str__(self) -> str:
        return f"{self.tenant.name} — {self.get_plan_display()} ({self.status})"

    @property
    def is_trial_active(self) -> bool:
        if self.status != SubscriptionStatus.TRIALING:
            return False
        if not self.trial_end:
            return False
        return timezone.now() < self.trial_end

    @property
    def days_until_trial_end(self) -> int:
        if not self.trial_end:
            return 0
        delta = self.trial_end - timezone.now()
        return max(0, delta.days)

    @property
    def is_access_allowed(self) -> bool:
        """True if tenant may use the platform (trial active OR paid active)."""
        if self.status == SubscriptionStatus.TRIALING:
            return self.is_trial_active
        return self.status == SubscriptionStatus.ACTIVE

    @property
    def monthly_price(self) -> Decimal:
        """Returns the base monthly price for the current plan."""
        if self.plan == BillingPlan.TRIAL:
            return Decimal("0.00")
        return Decimal(settings.PLAN_FULL_PRICE_USD)

    @property
    def monthly_total_with_tax(self) -> Decimal:
        """Returns the total monthly charge including IVA."""
        tax_rate = Decimal(str(settings.TAX_RATE_ECUADOR))
        subtotal = self.monthly_price
        return (subtotal * (1 + tax_rate)).quantize(Decimal("0.01"))

    def activate_trial(self) -> None:
        """Set trial period. Called on tenant registration."""
        from datetime import timedelta
        self.plan = BillingPlan.TRIAL
        self.status = SubscriptionStatus.TRIALING
        self.trial_start = timezone.now()
        self.trial_end = timezone.now() + timedelta(days=settings.TRIAL_DAYS)
        self.save(update_fields=[
            "plan", "status", "trial_start", "trial_end", "updated_at"
        ])

    def activate_paid(self, claro_pay_subscription_id: str) -> None:
        """Transition from trial/suspended to active paid subscription."""
        self.plan = BillingPlan.FULL
        self.status = SubscriptionStatus.ACTIVE
        self.claro_pay_subscription_id = claro_pay_subscription_id
        self.current_period_start = timezone.now()
        from datetime import timedelta
        if self.billing_cycle == "annual":
            self.current_period_end = timezone.now() + timedelta(days=365)
        else:
            self.current_period_end = timezone.now() + timedelta(days=30)
        self.failed_payment_count = 0
        self.last_payment_error = ""
        self.last_payment_at = timezone.now()
        self.save()

    def record_payment_failure(self, error_message: str) -> None:
        """Record a failed payment attempt. Suspend after 3 failures."""
        self.failed_payment_count += 1
        self.last_payment_error = error_message
        if self.failed_payment_count >= 3:
            self.status = SubscriptionStatus.SUSPENDED
        else:
            self.status = SubscriptionStatus.PAST_DUE
        self.save(update_fields=[
            "failed_payment_count", "last_payment_error", "status", "updated_at"
        ])

    def cancel(self) -> None:
        """Mark subscription for cancellation at period end."""
        self.cancel_at_period_end = True
        self.save(update_fields=["cancel_at_period_end", "updated_at"])

    def execute_cancellation(self) -> None:
        """Actually cancel the subscription (called when period ends)."""
        self.status = SubscriptionStatus.CANCELED
        self.canceled_at = timezone.now()
        self.cancel_at_period_end = False
        self.save(update_fields=[
            "status", "canceled_at", "cancel_at_period_end", "updated_at"
        ])


class PaymentMethod(models.Model):
    """
    Stored payment method for a tenant.
    Tokenized card data stored by Claro Pay — we only keep last4 and brand.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="payment_methods",
        verbose_name="Negocio"
    )

    # Claro Pay token (PCI-compliant — we never store raw card data)
    claro_pay_token = models.CharField(
        max_length=200, verbose_name="Token Claro Pay"
    )

    # Display info only
    card_brand = models.CharField(
        max_length=20, blank=True, default="",
        verbose_name="Marca de tarjeta"
    )
    card_last_four = models.CharField(
        max_length=4, blank=True, default="",
        verbose_name="Últimos 4 dígitos"
    )
    card_exp_month = models.PositiveSmallIntegerField(
        null=True, blank=True, verbose_name="Mes de expiración"
    )
    card_exp_year = models.PositiveSmallIntegerField(
        null=True, blank=True, verbose_name="Año de expiración"
    )
    cardholder_name = models.CharField(
        max_length=200, blank=True, default="",
        verbose_name="Nombre del titular"
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
        verbose_name="Negocio"
    )
    subscription = models.ForeignKey(
        Subscription,
        on_delete=models.CASCADE,
        related_name="invoices",
        verbose_name="Suscripción"
    )

    # Invoice number (sequential per tenant)
    invoice_number = models.CharField(
        max_length=50, unique=True, verbose_name="Número de factura"
    )

    # Amounts
    subtotal = models.DecimalField(
        max_digits=10, decimal_places=2,
        validators=[MinValueValidator(0)],
        verbose_name="Subtotal"
    )
    tax_rate = models.DecimalField(
        max_digits=5, decimal_places=4,
        default=Decimal("0.1500"),
        verbose_name="Tasa IVA"
    )
    tax_amount = models.DecimalField(
        max_digits=10, decimal_places=2,
        validators=[MinValueValidator(0)],
        verbose_name="Monto IVA"
    )
    total = models.DecimalField(
        max_digits=10, decimal_places=2,
        validators=[MinValueValidator(0)],
        verbose_name="Total"
    )
    currency = models.CharField(
        max_length=3, default="USD", verbose_name="Moneda"
    )

    # Billing period
    period_start = models.DateTimeField(verbose_name="Inicio del período")
    period_end = models.DateTimeField(verbose_name="Fin del período")

    # Payment
    status = models.CharField(
        max_length=20,
        choices=InvoiceStatus.choices,
        default=InvoiceStatus.DRAFT,
        verbose_name="Estado"
    )
    claro_pay_charge_id = models.CharField(
        max_length=100, blank=True, default="",
        verbose_name="ID de cargo Claro Pay"
    )
    paid_at = models.DateTimeField(
        null=True, blank=True, verbose_name="Pagado en"
    )

    # SRI Ecuador electronic invoice fields
    sri_authorization_number = models.CharField(
        max_length=49, blank=True, default="",
        verbose_name="Número de autorización SRI"
    )
    sri_access_key = models.CharField(
        max_length=49, blank=True, default="",
        verbose_name="Clave de acceso SRI"
    )

    # Additional data
    invoice_data = models.JSONField(
        default=dict, verbose_name="Datos adicionales de factura"
    )
    pdf_url = models.URLField(
        blank=True, default="", verbose_name="URL del PDF"
    )

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

    def mark_paid(self, claro_pay_charge_id: str) -> None:
        """Mark invoice as paid."""
        self.status = self.InvoiceStatus.PAID
        self.claro_pay_charge_id = claro_pay_charge_id
        self.paid_at = timezone.now()
        self.save(update_fields=[
            "status", "claro_pay_charge_id", "paid_at", "updated_at"
        ])
