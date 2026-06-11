"""
Loyallia Tenant Enums
TextChoices used by Tenant, Location, and related models.
"""

from django.db import models


class Plan(models.TextChoices):
    """Subscription plan tiers."""

    TRIAL = "trial", "Trial Gratuito"
    FULL = "full", "FULL"
    SUSPENDED = "suspended", "Suspendido"


class IndustryType(models.TextChoices):
    """Business industry classifications."""

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
    """Ecuadorian provinces for address validation."""

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
    """Legal entity types for Ecuadorian businesses."""

    NATURAL = "natural", "Persona Natural"
    JURIDICA = "juridica", "Persona Jurídica (Empresa)"
