"""
Loyallia Tenant & Location Models
Core multi-tenant entity. All business data ties to Tenant.
Ecuadorian business fields for SRI compliance.
"""

import re
from contextlib import suppress

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from common.models import TimestampedModel

# VALIDATORS Ecuadorian Identity Documents


def validate_ruc(value: str) -> None:
    """Validate Ecuadorian RUC (Registro Único de Contribuyentes).
    Rules: 13 digits. First 2 = province (01-24, or 30 for foreign).
    Last 3 digits must be '001' for natural persons.
    """
    if not re.match(r"^\d{13}$", value):
        raise ValidationError("El RUC debe tener exactamente 13 dígitos numéricos.")
    province = int(value[:2])
    if province < 1 or (province > 24 and province not in (30,)):
        raise ValidationError(
            f"Los primeros 2 dígitos del RUC ({value[:2]}) no corresponden a una provincia válida."
        )


def validate_cedula(value: str) -> None:
    """Validate Ecuadorian Cédula de Identidad.
    Rules: 10 digits. Province (01-24). Module 10 check.
    """
    if not re.match(r"^\d{10}$", value):
        raise ValidationError("La cédula debe tener exactamente 10 dígitos numéricos.")
    province = int(value[:2])
    if province < 1 or province > 24:
        raise ValidationError(
            f"Los primeros 2 dígitos ({value[:2]}) no corresponden a una provincia válida."
        )
    # Module-10 verification
    coefficients = [2, 1, 2, 1, 2, 1, 2, 1, 2]
    total = 0
    for i in range(9):
        product = int(value[i]) * coefficients[i]
        total += product - 9 if product > 9 else product
    check = (10 - (total % 10)) % 10
    if check != int(value[9]):
        raise ValidationError("El dígito verificador de la cédula no es válido.")


# ENUMS


class Plan(models.TextChoices):
    TRIAL = "trial", "Trial Gratuito"
    FULL = "full", "FULL"
    SUSPENDED = "suspended", "Suspendido"


class IndustryType(models.TextChoices):
    FOOD_BEVERAGE = "food_beverage", "Alimentos y Bebidas"
    RETAIL = "retail", "Comercio Minorista"
    FASHION = "fashion", "Moda y Textiles"
    HEALTH_BEAUTY = "health_beauty", "Salud y Belleza"
    ENTERTAINMENT = "entertainment", "Entretenimiento"
    SERVICES = "services", "Servicios Profesionales"
    EDUCATION = "education", "Educación"
    AUTOMOTIVE = "automotive", "Automotriz"
    HOSPITALITY = "hospitality", "Hotelería y Turismo"
    TECHNOLOGY = "technology", "Tecnología"
    OTHER = "other", "Otro"


class EcuadorProvince(models.TextChoices):
    AZUAY = "azuay", "Azuay"
    BOLIVAR = "bolivar", "Bolívar"
    CANAR = "canar", "Cañar"
    CARCHI = "carchi", "Carchi"
    CHIMBORAZO = "chimborazo", "Chimborazo"
    COTOPAXI = "cotopaxi", "Cotopaxi"
    EL_ORO = "el_oro", "El Oro"
    ESMERALDAS = "esmeraldas", "Esmeraldas"
    GALAPAGOS = "galapagos", "Galápagos"
    GUAYAS = "guayas", "Guayas"
    IMBABURA = "imbabura", "Imbabura"
    LOJA = "loja", "Loja"
    LOS_RIOS = "los_rios", "Los Ríos"
    MANABI = "manabi", "Manabí"
    MORONA_SANTIAGO = "morona_santiago", "Morona Santiago"
    NAPO = "napo", "Napo"
    ORELLANA = "orellana", "Orellana"
    PASTAZA = "pastaza", "Pastaza"
    PICHINCHA = "pichincha", "Pichincha"
    SANTA_ELENA = "santa_elena", "Santa Elena"
    SANTO_DOMINGO = "santo_domingo", "Santo Domingo de los Tsáchilas"
    SUCUMBIOS = "sucumbios", "Sucumbíos"
    TUNGURAHUA = "tungurahua", "Tungurahua"
    ZAMORA_CHINCHIPE = "zamora_chinchipe", "Zamora Chinchipe"


class EntityType(models.TextChoices):
    NATURAL = "natural", "Persona Natural"
    JURIDICA = "juridica", "Persona Jurídica (Empresa)"


# TENANT MODEL


class Tenant(TimestampedModel):
    """
    Represents a registered business account on Loyallia.
    Root entity for all multi-tenant data isolation.
    Expanded with Ecuadorian business fields (RUC, legal name, etc.)
    """

    name = models.CharField(max_length=200, verbose_name="Nombre comercial")
    slug = models.SlugField(max_length=100, unique=True, verbose_name="Slug único")
    #
    # Use effective_plan property or Subscription directly as the source of truth.
    # This field will be removed in a future migration once all reads are migrated.
    plan = models.CharField(max_length=20, choices=Plan.choices, default=Plan.TRIAL)
    is_active = models.BooleanField(default=True)

    # Entity classification (Ecuador: natural vs jurídica)
    entity_type = models.CharField(
        max_length=10,
        choices=EntityType.choices,
        default=EntityType.JURIDICA,
        verbose_name="Tipo de entidad",
        help_text="Persona Natural (cédula) o Jurídica (RUC)",
    )
    cedula = models.CharField(
        max_length=10,
        blank=True,
        default="",
        verbose_name="Cédula de identidad",
        validators=[validate_cedula],
        help_text="Cédula del propietario (solo persona natural, 10 dígitos)",
    )

    # Ecuadorian Legal Entity
    legal_name = models.CharField(
        max_length=300,
        blank=True,
        default="",
        verbose_name="Razón social",
        help_text="Nombre legal registrado en SRI",
    )
    ruc = models.CharField(
        max_length=13,
        blank=True,
        default="",
        verbose_name="RUC",
        validators=[validate_ruc],
        help_text="Registro Único de Contribuyentes (13 dígitos)",
    )
    industry = models.CharField(
        max_length=30,
        choices=IndustryType.choices,
        default=IndustryType.OTHER,
        verbose_name="Industria",
    )

    # Legal Representative
    legal_rep_name = models.CharField(
        max_length=200, blank=True, default="", verbose_name="Representante legal"
    )
    legal_rep_cedula = models.CharField(
        max_length=10,
        blank=True,
        default="",
        verbose_name="Cédula del representante",
        validators=[validate_cedula],
    )

    # Trial
    trial_end = models.DateTimeField(null=True, blank=True)

    # Branding
    logo_url = models.URLField(blank=True, default="", max_length=2000)
    primary_color = models.CharField(max_length=7, default="#1a1a2e")  # HEX
    secondary_color = models.CharField(max_length=7, default="#16213e")

    # Business info
    country = models.CharField(max_length=2, default="EC")  # ISO 3166-1 alpha-2
    province = models.CharField(
        max_length=30,
        choices=EcuadorProvince.choices,
        blank=True,
        default="",
        verbose_name="Provincia",
    )
    city = models.CharField(
        max_length=100, blank=True, default="", verbose_name="Ciudad"
    )
    timezone = models.CharField(max_length=50, default="America/Guayaquil")
    phone = models.CharField(max_length=20, blank=True, default="")
    email = models.EmailField(blank=True, default="", verbose_name="Email corporativo")
    website = models.URLField(blank=True, default="")
    address = models.TextField(blank=True, default="")

    # i18n tenant default language (REQ-I18N-001)
    default_language = models.CharField(
        max_length=5,
        default="es",
        verbose_name="Idioma predeterminado",
        help_text="ISO 639-1: es, en, fr, de. Set at tenant registration.",
    )

    # LOPDP Art. 18 Scheduled account deletion
    scheduled_deletion_at = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
        verbose_name="Eliminación programada",
        help_text="When set, Celery will hard-delete all tenant data after this timestamp.",
    )

    class Meta:  # pyright: ignore[reportIncompatibleVariableOverride]
        db_table = "loyallia_tenants"
        verbose_name = "Negocio"
        verbose_name_plural = "Negocios"
        ordering = ["-created_at"]

    def __repr__(self) -> str:
        return f"<Tenant: {self.name} ({self.effective_plan})>"

    def __str__(self) -> str:
        return f"{self.name} ({self.effective_plan})"

    def clean(self) -> None:
        """Validate tenant data."""
        super().clean()
        if self.entity_type == EntityType.NATURAL and not self.cedula:
            raise ValidationError(
                {"cedula": "La cédula es obligatoria para persona natural."}
            )
        if self.entity_type == EntityType.JURIDICA and not self.ruc:
            raise ValidationError(
                {"ruc": "El RUC es obligatorio para persona jurídica."}
            )

    @property
    def effective_plan(self) -> str:
        """Canonical plan status derived from Subscription.

        Returns the Subscription status mapped to the legacy Plan choices.
        Falls back to the denormalized Tenant.plan field if no Subscription exists.
        """
        from apps.billing.models import Subscription, SubscriptionStatus

        subscription = getattr(self, "subscription", None)
        if subscription is None:
            with suppress(Exception):
                subscription = Subscription.objects.filter(tenant=self).first()

        if subscription is not None:
            status_map = {
                SubscriptionStatus.TRIALING: Plan.TRIAL,
                SubscriptionStatus.ACTIVE: Plan.FULL,
                SubscriptionStatus.PAST_DUE: Plan.FULL,
                SubscriptionStatus.SUSPENDED: Plan.SUSPENDED,
                SubscriptionStatus.CANCELED: Plan.SUSPENDED,
            }
            return status_map.get(subscription.status, self.plan)

        return self.plan  # type: ignore[return-value]

    @property
    def is_trial_active(self) -> bool:
        """True if tenant is in active trial period."""
        from apps.billing.models import Subscription

        subscription = getattr(self, "subscription", None)
        if subscription is None:
            with suppress(Exception):
                subscription = Subscription.objects.filter(tenant=self).first()

        if subscription is not None:
            return subscription.is_trial_active

        # Fallback to denormalized field
        if self.plan != Plan.TRIAL:
            return False
        if self.trial_end is None:
            return False
        return timezone.now() < self.trial_end

    @property
    def trial_days_remaining(self) -> int:
        """Days remaining in trial. Returns 0 if expired."""
        if not self.is_trial_active:
            return 0

        from apps.billing.models import Subscription

        subscription = getattr(self, "subscription", None)
        if subscription is None:
            with suppress(Exception):
                subscription = Subscription.objects.filter(tenant=self).first()

        if subscription and subscription.trial_end:
            delta = subscription.trial_end - timezone.now()
            return max(0, delta.days)

        if self.trial_end:
            delta = self.trial_end - timezone.now()
            return max(0, delta.days)
        return 0

    @property
    def has_active_subscription(self) -> bool:
        """True if tenant has paid subscription OR active trial."""
        from apps.billing.models import Subscription

        subscription = getattr(self, "subscription", None)
        if subscription is None:
            with suppress(Exception):
                subscription = Subscription.objects.filter(tenant=self).first()

        if subscription is not None:
            return subscription.is_access_allowed

        # Fallback
        return self.plan == Plan.FULL or self.is_trial_active

    def activate_trial(self) -> None:
        """Set trial_end to now + TRIAL_DAYS. Called on registration.

        Also syncs the denormalized Tenant.plan field for backward compatibility.
        """
        from datetime import timedelta

        from apps.billing.models import Subscription, SubscriptionStatus

        trial_end = timezone.now() + timedelta(
            days=PlatformSetting.get_int(
                "TRIAL_DAYS", getattr(settings, "TRIAL_DAYS", 5)
            )
        )

        # Sync denormalized field (backward compat)
        self.trial_end = trial_end
        self.plan = Plan.TRIAL
        self.save(update_fields=["trial_end", "plan", "updated_at"])

        # Update authoritative Subscription
        subscription = Subscription.objects.filter(tenant=self).first()
        if subscription:
            subscription.trial_end = trial_end
            subscription.status = SubscriptionStatus.TRIALING
            subscription.plan = "trial"
            subscription.save(
                update_fields=["trial_end", "status", "plan", "updated_at"]
            )


class Location(TimestampedModel):
    """Physical business location. Each tenant can have multiple."""

    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.CASCADE,
        related_name="locations",
    )
    name = models.CharField(max_length=200)
    address = models.TextField(blank=True, default="")
    city = models.CharField(max_length=100, blank=True, default="")
    country = models.CharField(max_length=2, default="EC")

    # Geo-coordinates for geo-fencing push notifications
    latitude = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True
    )
    longitude = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True
    )

    phone = models.CharField(max_length=20, blank=True, default="")
    is_active = models.BooleanField(default=True)
    is_primary = models.BooleanField(default=False)

    class Meta:  # pyright: ignore[reportIncompatibleVariableOverride]
        db_table = "loyallia_locations"
        verbose_name = "Ubicación"
        verbose_name_plural = "Ubicaciones"
        ordering = ["-is_primary", "name"]

    def __repr__(self) -> str:
        return f"<Location: {self.tenant.name}  {self.name}>"

    def __str__(self) -> str:
        return f"{self.tenant.name}  {self.name}"

    def clean(self) -> None:
        """Validate location data."""
        super().clean()
        if self.latitude is not None and self.longitude is None:
            raise ValidationError(
                {"longitude": "La longitud es requerida si se proporciona latitud."}
            )
        if self.longitude is not None and self.latitude is None:
            raise ValidationError(
                {"latitude": "La latitud es requerida si se proporciona longitud."}
            )

    @property
    def has_coordinates(self) -> bool:
        return self.latitude is not None and self.longitude is not None


# PLATFORM SETTINGS Runtime-configurable without restart

from django.core.cache import cache

_PLATFORM_SETTING_CACHE_PREFIX = "platform_setting"
_PLATFORM_SETTING_CACHE_TTL = 300  # 5 minutes


class PlatformSetting(models.Model):
    """A single runtime-configurable platform setting.

    These values can be changed via the SuperAdmin UI and take effect
    immediately (no container restart required).

    SEC: Only SUPER_ADMIN can modify these via the admin API.
    PERF: Values are cached in Redis for 60s to avoid DB hits.
    """

    key = models.CharField(max_length=100, unique=True, db_index=True)
    value = models.TextField()
    description = models.CharField(max_length=255, blank=True)
    category = models.CharField(
        max_length=50,
        default="general",
        help_text="UI grouping category (e.g., billing, system, email)",
    )
    requires_restart = models.BooleanField(
        default=False,
        help_text="If True, a container restart is needed for full effect",
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "loyallia_platform_settings"
        ordering = ["category", "key"]

    def __str__(self) -> str:
        return self.key

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        cache.set(
            f"{_PLATFORM_SETTING_CACHE_PREFIX}:{self.key}",
            self.value,
            _PLATFORM_SETTING_CACHE_TTL,
        )

    @classmethod
    def set(
        cls, key: str, value: str, description: str = "", category: str = "general"
    ) -> "PlatformSetting":
        """Set a setting value, updating both DB and cache.

        Returns the created or updated PlatformSetting instance.
        """
        setting, created = cls.objects.update_or_create(
            key=key,
            defaults={
                "value": value,
                "description": description,
                "category": category,
            },
        )
        cache.set(
            f"{_PLATFORM_SETTING_CACHE_PREFIX}:{key}",
            value,
            _PLATFORM_SETTING_CACHE_TTL,
        )
        return setting

    @classmethod
    def invalidate_cache(cls, key: str) -> None:
        """Invalidate the Redis cache entry for a single setting key."""
        cache.delete(f"{_PLATFORM_SETTING_CACHE_PREFIX}:{key}")

    @classmethod
    def refresh_cache(cls) -> dict:
        """Invalidate and refresh the entire settings cache from the database.

        Returns a dict with counts of refreshed and failed keys.
        """
        # Clear all cached setting keys
        keys = cls.objects.values_list("key", flat=True)
        cache.delete_many([f"{_PLATFORM_SETTING_CACHE_PREFIX}:{k}" for k in keys])

        # Re-populate cache
        refreshed = 0
        failed = 0
        for setting in cls.objects.all():
            try:
                cache.set(
                    f"{_PLATFORM_SETTING_CACHE_PREFIX}:{setting.key}",
                    setting.value,
                    _PLATFORM_SETTING_CACHE_TTL,
                )
                refreshed += 1
            except Exception:
                failed += 1

        return {"refreshed": refreshed, "failed": failed, "total": refreshed + failed}

    @classmethod
    def get(cls, key: str, default: str = "") -> str:
        """Read a setting value, using Redis cache first."""
        cached = cache.get(f"{_PLATFORM_SETTING_CACHE_PREFIX}:{key}")
        if cached is not None:
            return cached
        try:
            value = cls.objects.values_list("value", flat=True).get(key=key)
        except cls.DoesNotExist:
            return default
        cache.set(
            f"{_PLATFORM_SETTING_CACHE_PREFIX}:{key}",
            value,
            _PLATFORM_SETTING_CACHE_TTL,
        )
        return value

    @classmethod
    def get_int(cls, key: str, default: int = 0) -> int:
        try:
            return int(cls.get(key, str(default)))
        except ValueError:
            return default

    @classmethod
    def get_float(cls, key: str, default: float = 0.0) -> float:
        try:
            return float(cls.get(key, str(default)))
        except ValueError:
            return default

    @classmethod
    def get_bool(cls, key: str, default: bool = False) -> bool:
        val = cls.get(key, str(default)).lower().strip()
        return val in ("true", "1", "yes", "on")
