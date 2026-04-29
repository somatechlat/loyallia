"""
Loyallia — Card Models (Loyalty Programs)
Core models for all 10 card types with shared base properties and type-specific metadata.
"""

import uuid
from decimal import Decimal

from django.db import models

from apps.tenants.models import Tenant
from common.models import TimestampedModel


class CardType(models.TextChoices):
    """The 10 supported loyalty card types."""

    STAMP = "stamp", "Tarjeta de Sellos"
    CASHBACK = "cashback", "Tarjeta de Cashback"
    COUPON = "coupon", "Tarjeta de Cupón"
    AFFILIATE = "affiliate", "Tarjeta de Afiliación"
    DISCOUNT = "discount", "Tarjeta de Descuento"
    GIFT_CERTIFICATE = "gift_certificate", "Certificado de Regalo"
    VIP_MEMBERSHIP = "vip_membership", "Membresía VIP"
    CORPORATE_DISCOUNT = "corporate_discount", "Descuento Corporativo"
    REFERRAL_PASS = "referral_pass", "Programa de Referidos"
    MULTIPASS = "multipass", "Multipase"


class BarcodeType(models.TextChoices):
    """Barcode types supported by Apple Wallet and Google Wallet passes."""

    QR_CODE = "qr_code", "Código QR"
    AZTEC = "aztec", "Aztec"
    CODE_128 = "code_128", "Code 128"
    PDF_417 = "pdf417", "PDF417"
    DATA_MATRIX = "data_matrix", "Data Matrix"


class Card(TimestampedModel):
    """
    Base loyalty program configuration.
    Every card type shares these properties.
    """

    tenant = models.ForeignKey(
        Tenant, on_delete=models.CASCADE, related_name="cards", verbose_name="Negocio"
    )
    card_type = models.CharField(
        max_length=20, choices=CardType.choices, verbose_name="Tipo de tarjeta"
    )
    name = models.CharField(max_length=100, verbose_name="Nombre del programa")
    description = models.TextField(blank=True, default="", verbose_name="Descripción")

    # Branding
    logo_url = models.URLField(blank=True, default="", verbose_name="URL del logo")
    background_color = models.CharField(
        max_length=7, default="#1a1a2e", verbose_name="Color de fondo (HEX)"
    )
    text_color = models.CharField(
        max_length=7, default="#ffffff", verbose_name="Color del texto (HEX)"
    )
    strip_image_url = models.URLField(
        blank=True, default="", verbose_name="Imagen de tira"
    )
    icon_url = models.URLField(blank=True, default="", verbose_name="URL del ícono")
    barcode_type = models.CharField(
        max_length=20,
        choices=BarcodeType.choices,
        default=BarcodeType.QR_CODE,
        verbose_name="Tipo de código de barras",
    )

    # Status
    is_active = models.BooleanField(default=True, verbose_name="Programa activo")

    # Type-specific configuration stored as JSONB
    metadata = models.JSONField(default=dict, verbose_name="Configuración específica")

    # Geofencing Locations (Array of dicts: {"lat": float, "lng": float, "name": str})
    locations = models.JSONField(
        default=list, blank=True, verbose_name="Ubicaciones (Geofencing)"
    )

    class Meta:
        db_table = "loyallia_cards"
        verbose_name = "Programa de fidelización"
        verbose_name_plural = "Programas de fidelización"
        ordering = ["-created_at"]
        unique_together = [
            "tenant",
            "name",
        ]  # Prevent duplicate program names per tenant

    def __repr__(self) -> str:
        return f"<Card: {self.name} ({self.get_card_type_display()}) - {self.tenant.name}>"

    def __str__(self) -> str:
        return f"{self.name} ({self.get_card_type_display()}) - {self.tenant.name}"

    def get_metadata_field(self, key: str, default=None):
        """Helper to safely get metadata fields."""
        return self.metadata.get(key, default)

    def set_metadata_field(self, key: str, value) -> None:
        """Helper to safely set metadata fields."""
        self.metadata[key] = value
        self.save(update_fields=["metadata", "updated_at"])

    # Card-type specific validation and helpers
    def validate_stamp_config(self) -> None:
        """Validate stamp card configuration."""
        stamps_required = self.get_metadata_field("stamps_required", 10)
        if (
            not isinstance(stamps_required, int)
            or stamps_required < 1
            or stamps_required > 99
        ):
            raise ValueError("stamps_required must be integer 1-99")

        reward_description = self.get_metadata_field("reward_description", "")
        if not reward_description:
            raise ValueError("reward_description is required for stamp cards")

    def validate_cashback_config(self) -> None:
        """Validate cashback card configuration."""
        percentage = self.get_metadata_field("cashback_percentage", 0)
        if (
            not isinstance(percentage, (int, float, Decimal))
            or percentage <= 0
            or percentage > 99.99
        ):
            raise ValueError("cashback_percentage must be decimal 0.01-99.99")

        min_purchase = self.get_metadata_field("minimum_purchase", 0)
        if not isinstance(min_purchase, (int, float, Decimal)) or min_purchase < 0:
            raise ValueError("minimum_purchase must be non-negative decimal")

        expiry_days = self.get_metadata_field("credit_expiry_days", 365)
        if not isinstance(expiry_days, int) or expiry_days < 1:
            raise ValueError("credit_expiry_days must be positive integer")

    def validate_coupon_config(self) -> None:
        """Validate coupon card configuration."""
        discount_type = self.get_metadata_field("discount_type")
        if discount_type not in ["percentage", "fixed_amount", "special_promo"]:
            raise ValueError(
                "discount_type must be 'percentage', 'fixed_amount', or 'special_promo'"
            )

        if discount_type == "special_promo":
            promo_text = self.get_metadata_field("promo_text", "")
            if not promo_text or len(str(promo_text)) > 100:
                raise ValueError(
                    "special_promo requires promo_text (max 100 characters)"
                )
        else:
            discount_value = self.get_metadata_field("discount_value", 0)
            if (
                not isinstance(discount_value, (int, float, Decimal))
                or discount_value <= 0
            ):
                raise ValueError("discount_value must be positive")

            if discount_type == "percentage" and discount_value > 100:
                raise ValueError("percentage discount cannot exceed 100%")

        usage_limit = self.get_metadata_field("usage_limit_per_customer", 1)
        if not isinstance(usage_limit, int) or usage_limit < 1:
            raise ValueError("usage_limit_per_customer must be positive integer")

        # Date validation: end_date must be after start_date when provided
        coupon_start = self.get_metadata_field("coupon_start_date")
        coupon_end = self.get_metadata_field("coupon_end_date")
        if coupon_start and coupon_end:
            if str(coupon_end) <= str(coupon_start):
                raise ValueError(
                    "coupon_end_date must be after coupon_start_date"
                )

    def validate_discount_config(self) -> None:
        """Validate discount card configuration."""
        tiers = self.get_metadata_field("tiers", [])
        if not isinstance(tiers, list) or len(tiers) == 0 or len(tiers) > 5:
            raise ValueError("tiers must be list of 1-5 tier objects")

        for i, tier in enumerate(tiers):
            if not isinstance(tier, dict):
                raise ValueError(f"tier {i} must be a dictionary")
            required_fields = ["tier_name", "threshold", "discount_percentage"]
            for field in required_fields:
                if field not in tier:
                    raise ValueError(f"tier {i} missing required field: {field}")

            if not isinstance(tier["discount_percentage"], (int, float, Decimal)):
                raise ValueError(f"tier {i} discount_percentage must be numeric")

    def validate_gift_certificate_config(self) -> None:
        """Validate gift certificate configuration."""
        denominations = self.get_metadata_field("denominations", [])
        if not isinstance(denominations, list) or len(denominations) == 0:
            raise ValueError("denominations must be non-empty list of amounts")

        for amount in denominations:
            if not isinstance(amount, (int, float, Decimal)) or amount <= 0:
                raise ValueError("all denomination amounts must be positive")

        expiry_days = self.get_metadata_field("expiry_days", 365)
        if not isinstance(expiry_days, int) or expiry_days < 1:
            raise ValueError("expiry_days must be positive integer")

    def validate_vip_membership_config(self) -> None:
        """Validate VIP membership configuration."""
        membership_name = self.get_metadata_field("membership_name", "")
        if not membership_name:
            raise ValueError("membership_name is required")

        monthly_fee = self.get_metadata_field("monthly_fee", 0)
        annual_fee = self.get_metadata_field("annual_fee", 0)
        if monthly_fee <= 0 and annual_fee <= 0:
            raise ValueError(
                "at least one of monthly_fee or annual_fee must be positive"
            )

        validity_period = self.get_metadata_field("validity_period", "monthly")
        if validity_period not in ["monthly", "quarterly", "annual", "lifetime"]:
            raise ValueError(
                "validity_period must be one of: monthly, quarterly, annual, lifetime"
            )

    def validate_corporate_discount_config(self) -> None:
        """Validate corporate discount configuration."""
        # Corporate discounts are managed per customer, not per card config
        # This method exists for consistency but has no validation
        pass

    def validate_referral_config(self) -> None:
        """Validate referral program configuration."""
        referrer_reward = self.get_metadata_field("referrer_reward")
        referee_reward = self.get_metadata_field("referee_reward")
        if not referrer_reward or not referee_reward:
            raise ValueError("both referrer_reward and referee_reward are required")

        max_referrals = self.get_metadata_field("max_referrals_per_customer", 0)
        if not isinstance(max_referrals, int) or max_referrals < 0:
            raise ValueError("max_referrals_per_customer must be non-negative integer")

    def validate_multipass_config(self) -> None:
        """Validate multipass configuration."""
        bundle_size = self.get_metadata_field("bundle_size", 10)
        if not isinstance(bundle_size, int) or bundle_size < 1:
            raise ValueError("bundle_size must be positive integer")

        bundle_price = self.get_metadata_field("bundle_price", 0)
        if not isinstance(bundle_price, (int, float, Decimal)) or bundle_price <= 0:
            raise ValueError("bundle_price must be positive")

    def clean(self) -> None:
        """Validate card configuration based on type."""
        if self.card_type == CardType.STAMP:
            self.validate_stamp_config()
        elif self.card_type == CardType.CASHBACK:
            self.validate_cashback_config()
        elif self.card_type == CardType.COUPON:
            self.validate_coupon_config()
        elif self.card_type == CardType.DISCOUNT:
            self.validate_discount_config()
        elif self.card_type == CardType.GIFT_CERTIFICATE:
            self.validate_gift_certificate_config()
        elif self.card_type == CardType.VIP_MEMBERSHIP:
            self.validate_vip_membership_config()
        elif self.card_type == CardType.CORPORATE_DISCOUNT:
            self.validate_corporate_discount_config()
        elif self.card_type == CardType.REFERRAL_PASS:
            self.validate_referral_config()
        elif self.card_type == CardType.MULTIPASS:
            self.validate_multipass_config()

    def save(self, *args, **kwargs) -> None:
        """Override save to validate configuration.

        Validation only runs on full saves (user-driven creation/update).
        Internal saves with update_fields (e.g., set_metadata_field) skip
        validation to avoid rejecting partial configurations during editing.
        """
        if not kwargs.get("update_fields"):
            self.clean()
        super().save(*args, **kwargs)
