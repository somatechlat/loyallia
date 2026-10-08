"""
Loyallia Apple Wallet Field Builders (apps/customers/pass_engine/apple_field_builders.py)

Per-card-type Apple PassKit field layout dispatcher.
Layout implementations live in ``apple_field_layouts`` to stay under the
project file-size limit. Used by apple_pass_builders.py — not imported
directly from outside pass_engine.
"""

from .apple_field_layouts import (
    _build_cashback_fields,
    _build_coupon_fields,
    _build_discount_fields,
    _build_referral_fields,
    _build_stamp_fields,
    _build_vip_fields,
)
from .apple_field_layouts_ext import (
    _build_affiliate_fields,
    _build_corporate_discount_fields,
    _build_fallback_fields,
    _build_gift_certificate_fields,
    _build_multipass_fields,
)
from .apple_v2_builders import _build_v2_apple_fields


def _build_fields_for_type(card, customer_pass) -> dict:
    """Build Apple PassKit field layout based on card type."""
    # V2 Wallet Pass Studio fields take precedence
    v2_fields = _build_v2_apple_fields(card, customer_pass)
    if v2_fields:
        return v2_fields

    builders = {
        "stamp": _build_stamp_fields,
        "cashback": _build_cashback_fields,
        "vip_membership": _build_vip_fields,
        "coupon": _build_coupon_fields,
        "referral_pass": _build_referral_fields,
        "discount": _build_discount_fields,
        "affiliate": _build_affiliate_fields,
        "gift_certificate": _build_gift_certificate_fields,
        "corporate_discount": _build_corporate_discount_fields,
        "multipass": _build_multipass_fields,
    }
    builder = builders.get(card.card_type, _build_fallback_fields)
    return builder(card, customer_pass)
