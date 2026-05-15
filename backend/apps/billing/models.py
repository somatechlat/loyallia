"""
Loyallia — Billing Models (REQ-PAY-001, REQ-PLAN-001)
Subscription management with pluggable payment gateway.
All payment operations route through the generic gateway abstraction.
"""


from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone

from apps.tenants.models import PlatformSetting, Tenant
from common.models import TimestampedModel

# =============================================================================
# PLAN FEATURE FLAGS (REQ-PLAN-003)
# =============================================================================


class PlanFeature:
    """
    Feature flags for plan-based gating.
    Stored in SubscriptionPlan.features JSONField as a list of strings.
    """

    GEO_FENCING = "geo_fencing"
    AUTOMATION = "automation"
    ADVANCED_ANALYTICS = "advanced_analytics"
    AI_ASSISTANT = "ai_assistant"
    AGENT_API = "agent_api"
    PRIORITY_SUPPORT = "priority_support"
    CUSTOM_BRANDING = "custom_branding"
    DATA_EXPORT = "data_export"
    WHATSAPP_CAMPAIGNS = "whatsapp_campaigns"
    EMAIL_CAMPAIGNS = "email_campaigns"
    WALLET_CAMPAIGNS = "wallet_campaigns"
    SMS_CAMPAIGNS = "sms_campaigns"

    ALL_FEATURES = [
        GEO_FENCING,
        AUTOMATION,
        ADVANCED_ANALYTICS,
        AI_ASSISTANT,
        AGENT_API,
        PRIORITY_SUPPORT,
        CUSTOM_BRANDING,
        DATA_EXPORT,
        WHATSAPP_CAMPAIGNS,
        EMAIL_CAMPAIGNS,
        WALLET_CAMPAIGNS,
        SMS_CAMPAIGNS,
    ]


# =============================================================================
# SUBSCRIPTION PLAN (DB-driven, managed by SUPER_ADMIN)
# =============================================================================


class SubscriptionPlan(TimestampedModel):
    """
    Configurable SaaS pricing plan. Managed by SUPER_ADMIN.
    Supports Starter, Professional, Enterprise, and custom tiers.
    Plans are created via the Super Admin wizard with selectable features.
    """

    name = models.CharField(max_length=100, verbose_name="Nombre del plan")
    slug = models.SlugField(max_length=50, unique=True)
    description = models.TextField(blank=True, default="", verbose_name="Descripción")

    # Pricing (monthly AND annual — REQ-PLAN-001)
    price_monthly = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(0)],
        verbose_name="Precio mensual (USD)",
    )
    price_annual = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(0)],
        verbose_name="Precio anual (USD)",
    )

    # Usage Limits (enforced by plan_enforcement.py)
    max_locations = models.PositiveIntegerField(
        default=1, verbose_name="Máx. sucursales"
    )
    max_users = models.PositiveIntegerField(default=3, verbose_name="Máx. usuarios")
    max_customers = models.PositiveIntegerField(
        default=500, verbose_name="Máx. clientes"
    )
    max_programs = models.PositiveIntegerField(default=1, verbose_name="Máx. programas")
    max_notifications_month = models.PositiveIntegerField(
        default=1000, verbose_name="Máx. notificaciones/mes"
    )
    max_transactions_month = models.PositiveIntegerField(
        default=5000, verbose_name="Máx. transacciones/mes"
    )

    # Messaging channel quotas (LYL-SRS-008)
    # 0 = disabled (channel not available for this plan)
    max_whatsapp_day = models.PositiveIntegerField(
        default=0,
        verbose_name="Máx. WhatsApp/día",
        help_text="Daily WhatsApp message limit. 0=disabled. Safe ceiling: 200 (Baileys anti-ban).",
    )
    max_emails_month = models.PositiveIntegerField(
        default=0,
        verbose_name="Máx. emails/mes",
        help_text="Monthly email campaign quota via Mailjet. 0=disabled.",
    )
    max_sms_day = models.PositiveIntegerField(
        default=0,
        verbose_name="Máx. SMS/día",
        help_text="Daily SMS quota via Twilio. 0=disabled.",
    )
    max_wallet_pushes_month = models.PositiveIntegerField(
        default=0,
        verbose_name="Máx. wallet pushes/mes",
        help_text="Monthly Google/Apple Wallet push notifications. 0=disabled. Protects shared issuer quota.",
    )

    # Feature-specific rate limits
    # These cap the USAGE of features that have real cost drivers or abuse vectors.
    max_automations = models.PositiveIntegerField(
        default=3,
        verbose_name="Máx. automatizaciones",
        help_text="Max automation rules a tenant can create.",
    )
    max_automation_executions_day = models.PositiveIntegerField(
        default=100,
        verbose_name="Máx. ejecuciones automatización/día",
        help_text="Global daily cap for all automation rule executions per tenant.",
    )
    max_ai_queries_month = models.PositiveIntegerField(
        default=0,
        verbose_name="Máx. consultas IA/mes",
        help_text="Monthly AI assistant query quota. 0=disabled. Highest cost feature (LLM tokens).",
    )
    max_api_calls_day = models.PositiveIntegerField(
        default=0,
        verbose_name="Máx. llamadas API/día",
        help_text="Daily Agent API call quota. 0=disabled. Enterprise feature.",
    )
    max_exports_month = models.PositiveIntegerField(
        default=5,
        verbose_name="Máx. exportaciones/mes",
        help_text="Monthly data export quota. CPU-intensive Celery task.",
    )

    # Feature Flags (selectable in admin — REQ-PLAN-003)
    features = models.JSONField(
        default=list,
        verbose_name="Características incluidas",
        help_text="List of PlanFeature flags: geo_fencing, automation, ai_assistant, etc.",
    )

    # Status workflow
    class Status(models.TextChoices):
        DRAFT = "draft", "Borrador"
        PUBLISHED = "published", "Publicado"
        ARCHIVED = "archived", "Archivado"

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PUBLISHED,
        verbose_name="Estado",
        help_text="draft=Borrador (solo visible en SuperAdmin), published=Publicado (visible para todos), archived=Archivado (oculto)",
    )
    is_active = models.BooleanField(default=True, verbose_name="Activo")
    is_featured = models.BooleanField(default=False, verbose_name="Plan recomendado")
    trial_days = models.PositiveIntegerField(default=5, verbose_name="Días de prueba")
    sort_order = models.PositiveSmallIntegerField(default=0, verbose_name="Orden")

    class Meta:  # pyright: ignore[reportIncompatibleVariableOverride]
        db_table = "loyallia_subscription_plans"
        verbose_name = "Plan de Suscripción"
        verbose_name_plural = "Planes de Suscripción"
        ordering = ["sort_order", "price_monthly"]

    def __repr__(self) -> str:
        return f"<SubscriptionPlan: {self.name} ${self.price_monthly}/mes>"

    def __str__(self) -> str:
        return f"{self.name} — ${self.price_monthly}/mes"

    def clean(self) -> None:
        """Validate subscription plan data."""
        super().clean()
        if self.price_monthly < 0:
            raise ValueError("price_monthly must be non-negative")
        if self.price_annual < 0:
            raise ValueError("price_annual must be non-negative")

    @property
    def price_monthly_with_tax(self) -> Decimal:
        """Monthly price including Ecuador IVA tax."""
        tax_rate = Decimal(
            str(
                PlatformSetting.get_float(
                    "TAX_RATE_ECUADOR", getattr(settings, "TAX_RATE_ECUADOR", 0.15)
                )
            )
        )
        return (self.price_monthly * (1 + tax_rate)).quantize(Decimal("0.01"))

    @property
    def price_annual_with_tax(self) -> Decimal:
        """Annual price including Ecuador IVA tax."""
        tax_rate = Decimal(
            str(
                PlatformSetting.get_float(
                    "TAX_RATE_ECUADOR", getattr(settings, "TAX_RATE_ECUADOR", 0.15)
                )
            )
        )
        return (self.price_annual * (1 + tax_rate)).quantize(Decimal("0.01"))

    def has_feature(self, feature: str) -> bool:
        """Check if this plan includes a specific feature."""
        return feature in (self.features or [])


# =============================================================================
# SUBSCRIPTION STATUS
# =============================================================================


class SubscriptionStatus(models.TextChoices):
    """Subscription lifecycle states."""

    TRIALING = "trialing", "Período de prueba"
    ACTIVE = "active", "Activo"
    PAST_DUE = "past_due", "Pago pendiente"
    SUSPENDED = "suspended", "Suspendido"
    CANCELED = "canceled", "Cancelado"


# =============================================================================
# SUBSCRIPTION
# =============================================================================


class Subscription(TimestampedModel):
    """
    Tenant subscription to the Loyallia platform.
    Linked to a SubscriptionPlan for dynamic limits and pricing.
    Payment processing via pluggable gateway (settings.PAYMENT_GATEWAY_PROVIDER).
    """

    tenant = models.OneToOneField(
        Tenant,
        on_delete=models.CASCADE,
        related_name="subscription",
        verbose_name="Negocio",
    )

    # Plan reference (FK to SubscriptionPlan for dynamic limits)
    subscription_plan = models.ForeignKey(
        SubscriptionPlan,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="subscriptions",
        verbose_name="Plan de suscripción",
    )

    # Legacy plan field (kept for migration compatibility)
    plan = models.CharField(
        max_length=20,
        default="trial",
        verbose_name="Plan (legacy)",
    )
    billing_cycle = models.CharField(
        max_length=10,
        choices=[("monthly", "Mensual"), ("annual", "Anual")],
        default="monthly",
        verbose_name="Ciclo de facturación",
    )

    # Status
    status = models.CharField(
        max_length=20,
        choices=SubscriptionStatus.choices,
        default=SubscriptionStatus.TRIALING,
        verbose_name="Estado",
    )

    # Payment gateway identifiers (generic — REQ-PAY-001)
    gateway_subscription_id = models.CharField(
        max_length=100,
        blank=True,
        default="",
        verbose_name="ID de suscripción (gateway)",
    )
    gateway_customer_id = models.CharField(
        max_length=100,
        blank=True,
        default="",
        verbose_name="ID de cliente (gateway)",
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
    trial_extended_count = models.SmallIntegerField(
        default=0, verbose_name="Extensiones de trial"
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

    class Meta:  # pyright: ignore[reportIncompatibleVariableOverride]
        db_table = "loyallia_subscriptions"
        verbose_name = "Suscripción"
        verbose_name_plural = "Suscripciones"
        ordering = ["-created_at"]

    def __repr__(self) -> str:
        plan_name = self.subscription_plan.name if self.subscription_plan else self.plan
        return f"<Subscription: {self.tenant.name} — {plan_name} ({self.status})>"

    def __str__(self) -> str:
        plan_name = self.subscription_plan.name if self.subscription_plan else self.plan
        return f"{self.tenant.name} — {plan_name} ({self.status})"

    @property
    def is_trial_active(self) -> bool:
        """Check if the subscription is in an active trial period."""
        if self.status != SubscriptionStatus.TRIALING:
            return False
        if not self.trial_end:
            return False
        return timezone.now() < self.trial_end

    @property
    def days_until_trial_end(self) -> int:
        """Number of days remaining in the trial period. Returns 0 if expired."""
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
    def effective_plan(self) -> SubscriptionPlan | None:
        """Return the SubscriptionPlan object for this subscription."""
        return self.subscription_plan

    def get_limit(self, resource: str) -> int:
        """
        Get the plan limit for a resource.
        Trial plan = unlimited (returns very high number) during trial period.
        Paid plans = from SubscriptionPlan model, even during trial.
        """
        plan = self.subscription_plan
        is_trial_plan = (plan.slug == "trial") if plan else (self.plan == "trial")

        if self.status == SubscriptionStatus.TRIALING and self.is_trial_active and is_trial_plan:
            return 999999  # Only the 'trial' plan gets unlimited during trial

        if not plan:
            return 0  # No plan = no access

        limit_map = {
            "customers": plan.max_customers,
            "programs": plan.max_programs,
            "locations": plan.max_locations,
            "users": plan.max_users,
            "notifications_month": plan.max_notifications_month,
            "transactions_month": plan.max_transactions_month,
            "whatsapp_day": plan.max_whatsapp_day,
            "emails_month": plan.max_emails_month,
            "sms_day": plan.max_sms_day,
            "wallet_pushes_month": plan.max_wallet_pushes_month,
            "automations": plan.max_automations,
            "automation_executions_day": plan.max_automation_executions_day,
            "ai_queries_month": plan.max_ai_queries_month,
            "api_calls_day": plan.max_api_calls_day,
            "exports_month": plan.max_exports_month,
        }
        return limit_map.get(resource, 0)

    def has_feature(self, feature: str) -> bool:
        """Check if current plan includes a feature."""
        plan = self.subscription_plan
        is_trial_plan = (plan.slug == "trial") if plan else (self.plan == "trial")

        if self.status == SubscriptionStatus.TRIALING and self.is_trial_active and is_trial_plan:
            return True  # Only the 'trial' plan gets all features during trial

        if not plan:
            return False
        return plan.has_feature(feature)

    def activate_trial(self) -> None:
        """Set trial period. Called on tenant registration."""
        from datetime import timedelta

        trial_days = PlatformSetting.get_int(
            "TRIAL_DAYS", getattr(settings, "TRIAL_DAYS", 5)
        )

        # Enforce trial extension limits (LYL-H-API-013)
        if self.trial_start is not None:
            if self.trial_extended_count >= 1:
                raise ValueError("Trial cannot be extended more than once.")
            self.trial_extended_count += 1

            # Extend from current trial_end or from now if already expired
            base_date = (
                self.trial_end
                if (self.trial_end and self.trial_end > timezone.now())
                else timezone.now()
            )
            self.trial_end = base_date + timedelta(days=trial_days)
            self.status = SubscriptionStatus.TRIALING
            self.save(
                update_fields=[
                    "status",
                    "trial_end",
                    "trial_extended_count",
                    "updated_at",
                ]
            )
            return

        self.plan = "trial"
        self.status = SubscriptionStatus.TRIALING
        self.trial_start = timezone.now()
        self.trial_end = timezone.now() + timedelta(days=trial_days)
        self.save(
            update_fields=[
                "plan",
                "status",
                "trial_start",
                "trial_end",
                "updated_at",
            ]
        )

    def activate_paid(self, gateway_subscription_id: str = "") -> None:
        """Transition from trial/suspended to active paid subscription."""
        from datetime import timedelta

        self.plan = self.subscription_plan.slug if self.subscription_plan else "paid"
        self.status = SubscriptionStatus.ACTIVE
        self.gateway_subscription_id = gateway_subscription_id
        self.current_period_start = timezone.now()
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
        self.save(
            update_fields=[
                "failed_payment_count",
                "last_payment_error",
                "status",
                "updated_at",
            ]
        )

    def cancel(self) -> None:
        """Mark subscription for cancellation at period end."""
        self.cancel_at_period_end = True
        self.save(update_fields=["cancel_at_period_end", "updated_at"])

    def execute_cancellation(self) -> None:
        """Actually cancel the subscription (called when period ends)."""
        self.status = SubscriptionStatus.CANCELED
        self.canceled_at = timezone.now()
        self.cancel_at_period_end = False
        self.save(
            update_fields=[
                "status",
                "canceled_at",
                "cancel_at_period_end",
                "updated_at",
            ]
        )


# =============================================================================
# RE-EXPORTS (split per 600-line limit — see payment_models.py)
# =============================================================================

from apps.billing.payment_models import Invoice, PaymentMethod  # noqa: E402, F401
