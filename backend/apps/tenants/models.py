"""
Loyallia — Tenant & Location Models
Core multi-tenant entity. All business data ties to Tenant.
Ecuadorian business fields for SRI compliance.
"""

import re
import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

# =============================================================================
# VALIDATORS — Ecuadorian Identity Documents
# =============================================================================


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


# =============================================================================
# ENUMS
# =============================================================================


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


# =============================================================================
# TENANT MODEL
# =============================================================================


class Tenant(models.Model):
    """
    Represents a registered business account on Loyallia.
    Root entity for all multi-tenant data isolation.
    Expanded with Ecuadorian business fields (RUC, legal name, etc.)
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200, verbose_name="Nombre comercial")
    slug = models.SlugField(max_length=100, unique=True, verbose_name="Slug único")
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
    logo_url = models.URLField(blank=True, default="")
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

    # i18n — tenant default language (REQ-I18N-001)
    default_language = models.CharField(
        max_length=5,
        default="es",
        verbose_name="Idioma predeterminado",
        help_text="ISO 639-1: es, en, fr, de. Set at tenant registration.",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "loyallia_tenants"
        verbose_name = "Negocio"
        verbose_name_plural = "Negocios"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.name} ({self.plan})"

    @property
    def is_trial_active(self) -> bool:
        """True if tenant is in active trial period."""
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
        delta = self.trial_end - timezone.now()
        return max(0, delta.days)

    @property
    def has_active_subscription(self) -> bool:
        """True if tenant has paid subscription OR active trial."""
        return self.plan == Plan.FULL or self.is_trial_active

    def activate_trial(self) -> None:
        """Set trial_end to now + TRIAL_DAYS. Called on registration."""
        from datetime import timedelta

        self.trial_end = timezone.now() + timedelta(days=settings.TRIAL_DAYS)
        self.plan = Plan.TRIAL
        self.save(update_fields=["trial_end", "plan", "updated_at"])


class Location(models.Model):
    """Physical business location. Each tenant can have multiple."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
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

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "loyallia_locations"
        verbose_name = "Ubicación"
        verbose_name_plural = "Ubicaciones"
        ordering = ["-is_primary", "name"]

    def __str__(self) -> str:
        return f"{self.tenant.name} — {self.name}"

    @property
    def has_coordinates(self) -> bool:
        return self.latitude is not None and self.longitude is not None
