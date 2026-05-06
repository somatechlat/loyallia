"""
Loyallia — Apple Wallet Pass Builders
Internal builder functions for Apple PKPass field layouts.
Used by apple_pass.py — not imported directly from outside pass_engine.
"""

import logging

logger = logging.getLogger(__name__)


# =============================================================================
# PASS TYPE STYLE MAPPING
# =============================================================================

APPLE_PASS_STYLES = {
    "stamp": "storeCard",
    "cashback": "storeCard",
    "coupon": "coupon",
    "discount": "storeCard",
    "affiliate": "generic",
    "gift_certificate": "storeCard",
    "vip_membership": "generic",
    "corporate_discount": "generic",
    "referral_pass": "generic",
    "multipass": "storeCard",
}


def _build_fields_for_type(card, customer_pass) -> dict:
    """Build Apple PassKit field layout based on card type."""
    pass_data = customer_pass.pass_data or {}
    metadata = card.metadata or {}
    customer = customer_pass.customer
    customer_name = f"{customer.first_name} {customer.last_name}"

    if card.card_type == "stamp":
        total = metadata.get("total_stamps", 6)
        current = pass_data.get("stamp_count", 0)
        reward = metadata.get("reward_description", "Recompensa")
        stamps_display = "\u2b1b" * current + "\u2b1c" * (total - current)
        return {
            "headerFields": [
                {"key": "stamps", "label": "SELLOS", "value": f"{current}/{total}"}
            ],
            "primaryFields": [
                {"key": "reward", "label": "RECOMPENSA", "value": reward}
            ],
            "secondaryFields": [
                {"key": "progress", "label": "PROGRESO", "value": stamps_display}
            ],
            "backFields": [
                {"key": "name", "label": "Cliente", "value": customer_name},
                {"key": "program", "label": "Programa", "value": card.name},
                {
                    "key": "desc",
                    "label": "Descripcion",
                    "value": card.description or "",
                },
            ],
        }

    elif card.card_type == "cashback":
        balance = pass_data.get("cashback_balance", "0")
        pct = metadata.get("cashback_percentage", 10)
        return {
            "headerFields": [
                {
                    "key": "balance",
                    "label": "CREDITO",
                    "value": f"${balance}",
                    "currencyCode": "USD",
                }
            ],
            "primaryFields": [
                {"key": "program", "label": "PROGRAMA", "value": card.name}
            ],
            "secondaryFields": [
                {"key": "rate", "label": "% CASHBACK", "value": f"{pct}%"},
                {"key": "customer", "label": "CLIENTE", "value": customer_name},
            ],
            "backFields": [
                {"key": "desc", "label": "Descripcion", "value": card.description or ""}
            ],
        }

    elif card.card_type == "vip_membership":
        tier = pass_data.get("membership_tier", "VIP")
        return {
            "headerFields": [
                {"key": "tier", "label": "MEMBRESIA", "value": tier.upper()}
            ],
            "primaryFields": [
                {"key": "name", "label": "MIEMBRO", "value": customer_name}
            ],
            "secondaryFields": [
                {"key": "program", "label": "CLUB", "value": card.name}
            ],
            "backFields": [
                {
                    "key": "perks",
                    "label": "Beneficios",
                    "value": ", ".join(metadata.get("perks", [])),
                }
            ],
        }

    elif card.card_type == "coupon":
        return {
            "headerFields": [{"key": "offer", "label": "OFERTA", "value": card.name}],
            "primaryFields": [
                {
                    "key": "discount",
                    "label": "DESCUENTO",
                    "value": card.description or "Descuento especial",
                }
            ],
            "secondaryFields": [
                {"key": "customer", "label": "CLIENTE", "value": customer_name}
            ],
            "backFields": [],
        }

    elif card.card_type == "referral_pass":
        referrals = pass_data.get("referrals_made", 0)
        ref_code = pass_data.get("referral_code", "N/A")
        return {
            "headerFields": [
                {"key": "refs", "label": "REFERIDOS", "value": str(referrals)}
            ],
            "primaryFields": [{"key": "code", "label": "TU CODIGO", "value": ref_code}],
            "secondaryFields": [
                {"key": "customer", "label": "EMBAJADOR", "value": customer_name}
            ],
            "backFields": [
                {
                    "key": "desc",
                    "label": "Como funciona",
                    "value": card.description or "",
                }
            ],
        }

    elif card.card_type == "discount":
        # Discount cards use tiered progression from card.metadata["tiers"]
        # pass_data stores "discount_tier" (current tier name) and "total_spent"
        tiers = metadata.get("tiers", [])
        current_tier = pass_data.get("discount_tier", "")
        current_discount = 0
        for tier in tiers:
            if tier.get("tier_name") == current_tier:
                current_discount = tier.get("discount_percentage", 0)
                break
        if not current_tier and tiers:
            current_tier = tiers[0].get("tier_name", "Básico")
            current_discount = tiers[0].get("discount_percentage", 0)

        return {
            "headerFields": [
                {
                    "key": "tier",
                    "label": "NIVEL",
                    "value": current_tier.upper() or "BÁSICO",
                }
            ],
            "primaryFields": [
                {
                    "key": "discount",
                    "label": "DESCUENTO",
                    "value": f"{current_discount}%",
                }
            ],
            "secondaryFields": [
                {"key": "customer", "label": "CLIENTE", "value": customer_name},
                {"key": "program", "label": "PROGRAMA", "value": card.name},
            ],
            "backFields": [
                {
                    "key": "tiers_info",
                    "label": "Niveles de descuento",
                    "value": "\n".join(
                        f"{t.get('tier_name', '?')}: {t.get('discount_percentage', 0)}% "
                        f"(umbral: ${t.get('threshold', 0)})"
                        for t in tiers
                    )
                    or "Sin niveles configurados",
                },
                {
                    "key": "desc",
                    "label": "Descripcion",
                    "value": card.description or "",
                },
            ],
        }

    elif card.card_type == "affiliate":
        # Affiliate/membership card — generic Apple style with member info
        member_since = pass_data.get("enrolled_date", "")
        affiliate_code = pass_data.get("affiliate_code", "N/A")
        return {
            "headerFields": [
                {"key": "program", "label": "PROGRAMA", "value": card.name}
            ],
            "primaryFields": [
                {"key": "member", "label": "AFILIADO", "value": customer_name}
            ],
            "secondaryFields": [
                {"key": "code", "label": "CÓDIGO", "value": affiliate_code},
                {
                    "key": "since",
                    "label": "MIEMBRO DESDE",
                    "value": member_since or "—",
                },
            ],
            "backFields": [
                {
                    "key": "benefits",
                    "label": "Beneficios",
                    "value": ", ".join(metadata.get("benefits", []))
                    or card.description
                    or "",
                },
            ],
        }

    elif card.card_type == "gift_certificate":
        # Gift certificate — storeCard style showing balance
        # Prefers typed column gift_balance, falls back to pass_data
        balance = pass_data.get("gift_balance", "0")
        currency = metadata.get("currency", "USD")
        return {
            "headerFields": [
                {
                    "key": "balance",
                    "label": "SALDO",
                    "value": f"${balance}",
                    "currencyCode": currency,
                }
            ],
            "primaryFields": [
                {"key": "program", "label": "CERTIFICADO", "value": card.name}
            ],
            "secondaryFields": [
                {"key": "recipient", "label": "BENEFICIARIO", "value": customer_name},
            ],
            "backFields": [
                {
                    "key": "expiry",
                    "label": "Expira en",
                    "value": f"{metadata.get('expiry_days', 365)} días desde la emisión",
                },
                {
                    "key": "desc",
                    "label": "Descripcion",
                    "value": card.description or "",
                },
            ],
        }

    elif card.card_type == "corporate_discount":
        # Corporate discount — generic Apple style
        # pass_data stores "corporate_discount" percentage and "company_name"
        discount_pct = pass_data.get("corporate_discount", "0")
        company = pass_data.get("company_name", metadata.get("company_name", card.name))
        return {
            "headerFields": [
                {"key": "discount", "label": "DESCUENTO", "value": f"{discount_pct}%"}
            ],
            "primaryFields": [{"key": "company", "label": "EMPRESA", "value": company}],
            "secondaryFields": [
                {"key": "employee", "label": "EMPLEADO", "value": customer_name},
            ],
            "backFields": [
                {
                    "key": "desc",
                    "label": "Condiciones",
                    "value": card.description or "",
                },
            ],
        }

    elif card.card_type == "multipass":
        # Multipass — storeCard style showing remaining uses
        # Prefers typed column multipass_remaining, falls back to pass_data
        bundle_size = metadata.get("bundle_size", 10)
        remaining = pass_data.get("multipass_remaining", bundle_size)
        return {
            "headerFields": [
                {
                    "key": "remaining",
                    "label": "USOS RESTANTES",
                    "value": f"{remaining}/{bundle_size}",
                }
            ],
            "primaryFields": [
                {"key": "bundle", "label": "MULTIPASE", "value": card.name}
            ],
            "secondaryFields": [
                {"key": "customer", "label": "CLIENTE", "value": customer_name},
            ],
            "backFields": [
                {
                    "key": "price",
                    "label": "Precio del paquete",
                    "value": f"${metadata.get('bundle_price', '—')}",
                },
                {
                    "key": "desc",
                    "label": "Descripcion",
                    "value": card.description or "",
                },
            ],
        }

    else:
        # Fallback for any future/unknown card types
        return {
            "headerFields": [
                {"key": "program", "label": "PROGRAMA", "value": card.name}
            ],
            "primaryFields": [
                {"key": "customer", "label": "CLIENTE", "value": customer_name}
            ],
            "secondaryFields": [],
            "backFields": [
                {"key": "desc", "label": "Descripcion", "value": card.description or ""}
            ],
        }


def _build_locations(card) -> list:
    """Build location array from tenant locations for geo-push."""
    locations = []
    
    # Locations belong to the Tenant, not the Card
    tenant_locations = card.tenant.locations.filter(is_active=True)[:10]
    
    if not tenant_locations:
        return locations
        
    for loc in tenant_locations:  # Apple max: 10
        try:
            if loc.latitude and loc.longitude:
                locations.append(
                    {
                        "latitude": float(loc.latitude),
                        "longitude": float(loc.longitude),
                        "relevantText": f"Estas cerca de {loc.name}!",
                    }
                )
        except (ValueError, TypeError):
            continue
    return locations


def _hex_to_rgb(hex_color: str) -> str:
    """Convert hex color (#RRGGBB) to Apple's rgb(R, G, B) format."""
    hex_color = hex_color.lstrip("#")
    if len(hex_color) != 6:
        return "rgb(26, 26, 46)"
    r, g, b = int(hex_color[0:2], 16), int(hex_color[2:4], 16), int(hex_color[4:6], 16)
    return f"rgb({r}, {g}, {b})"


def _generate_placeholder_icon(
    name: str, bg_color: str = "#5660ff", size: int = 87
) -> bytes:
    """Generate a simple icon PNG using a solid background with the first letter."""
    try:
        from PIL import Image, ImageDraw, ImageFont

        img = Image.new("RGBA", (size, size), bg_color)
        draw = ImageDraw.Draw(img)
        letter = name[0].upper() if name else "L"
        try:
            font = ImageFont.truetype(
                "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", size // 2
            )
        except OSError:
            font = ImageFont.load_default()
        bbox = draw.textbbox((0, 0), letter, font=font)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        x = (size - tw) // 2
        y = (size - th) // 2
        draw.text((x, y), letter, font=font, fill="#FFFFFF")
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        return buf.getvalue()
    except ImportError:
        logger.warning("Pillow not installed — returning minimal 1x1 PNG for icon")
        return _minimal_png()


def _minimal_png() -> bytes:
    """Return a minimal valid 1x1 transparent PNG (67 bytes)."""
    import struct
    import zlib

    def _chunk(chunk_type: bytes, data: bytes) -> bytes:
        raw = chunk_type + data
        return (
            struct.pack(">I", len(data))
            + raw
            + struct.pack(">I", zlib.crc32(raw) & 0xFFFFFFFF)
        )

    signature = b"\x89PNG\r\n\x1a\n"
    ihdr = _chunk(b"IHDR", struct.pack(">IIBBBBB", 1, 1, 8, 6, 0, 0, 0))
    raw_data = zlib.compress(b"\x00\x00\x00\x00\x00")
    idat = _chunk(b"IDAT", raw_data)
    iend = _chunk(b"IEND", b"")
    return signature + ihdr + idat + iend


def _resize_image(img, width: int, height: int) -> bytes:
    """Resize a PIL Image and return PNG bytes."""
    from PIL import Image as PILImage

    buf = io.BytesIO()
    resample = getattr(PILImage, "LANCZOS", 3)
    img_resized = img.resize((width, height), resample)
    img_resized.save(buf, format="PNG")
    return buf.getvalue()


# Need io for image operations
import io  # noqa: E402
