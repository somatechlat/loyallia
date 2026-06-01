"""
Loyallia Apple Wallet Pass Builders
Internal builder functions for Apple PKPass field layouts.
Used by apple_pass.py  not imported directly from outside pass_engine.
"""

import logging

logger = logging.getLogger(__name__)


# PASS TYPE STYLE MAPPING


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


def _substitute_template_values(value: str, card, customer_pass) -> str:
    """Replace template placeholders with actual customer/card data."""
    if not isinstance(value, str):
        return value
    customer = customer_pass.customer
    customer_name = f"{customer.first_name} {customer.last_name}".strip()
    pass_data = customer_pass.pass_data or {}
    metadata = card.metadata or {}
    total_stamps = metadata.get("stamps_required", metadata.get("total_stamps", 6))
    current_stamps = customer_pass.stamp_count_val
    reward = metadata.get("reward_description", "Recompensa")
    stamps_display = "⬛" * current_stamps + "⬜" * (total_stamps - current_stamps)
    enrolled_date = ""
    if customer_pass.enrolled_at:
        enrolled_date = customer_pass.enrolled_at.strftime("%d/%m/%Y")
    replacements = {
        "{description}": card.description or "",
        "{customer_name}": customer_name,
        "{program_name}": card.name or "",
        "{qr_code}": customer_pass.qr_code or "",
        "{stamp_count}": str(current_stamps),
        "{stamps_required}": str(total_stamps),
        "{reward_description}": reward,
        "{stamp_display}": stamps_display,
        "{affiliate_code}": customer_pass.qr_code or str(pass_data.get("affiliate_code", "N/A")),
        "{enrolled_date}": enrolled_date or str(pass_data.get("enrolled_date", "")),
        "{benefits}": ", ".join(metadata.get("benefits", [])) if isinstance(metadata.get("benefits"), list) else str(metadata.get("benefits", "")),
        "{cashback_balance}": str(customer_pass.cashback_balance_val),
        "{cashback_percentage}": str(metadata.get("cashback_percentage", 10)),
    }
    for placeholder, replacement in replacements.items():
        value = value.replace(placeholder, replacement)
    return value


def _substitute_fields(fields: dict, card, customer_pass) -> dict:
    """Recursively substitute template placeholders in all field values."""
    result = {}
    for key, value in fields.items():
        if isinstance(value, list):
            result[key] = []
            for item in value:
                if isinstance(item, dict) and "value" in item:
                    new_item = dict(item)
                    new_item["value"] = _substitute_template_values(
                        str(item["value"]), card, customer_pass
                    )
                    result[key].append(new_item)
                else:
                    result[key].append(item)
        elif isinstance(value, dict):
            result[key] = _substitute_fields(value, card, customer_pass)
        elif isinstance(value, str):
            result[key] = _substitute_template_values(value, card, customer_pass)
        else:
            result[key] = value
    return result


def _build_fields_for_type(card, customer_pass) -> dict:
    """Build Apple PassKit field layout based on card type."""
    pass_data = customer_pass.pass_data or {}
    metadata = card.metadata or {}
    customer = customer_pass.customer
    customer_name = f"{customer.first_name} {customer.last_name}"

    wallet_design = (
        metadata.get("wallet_design", {}) if isinstance(metadata, dict) else {}
    )
    apple_fields = (
        wallet_design.get("apple_fields") if isinstance(wallet_design, dict) else None
    )
    if apple_fields and isinstance(apple_fields, dict):
        # Substitute template placeholders like {description}, {customer_name}, {program_name}
        return _substitute_fields(apple_fields, card, customer_pass)

    if card.card_type == "stamp":
        total = metadata.get("total_stamps", 6)
        current = customer_pass.stamp_count_val
        reward = metadata.get("reward_description", "Recompensa")
        stamps_display = "\u2b1b" * current + "\u2b1c" * (total - current)
        return {
            "headerFields": [
                {"key": "stamps", "label": "SELLOS", "value": f"{current}/{total}", "changeMessage": "¡Nuevo sello! Ahora tienes %@"}
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
                    "changeMessage": "Términos actualizados",
                },
            ],
        }

    elif card.card_type == "cashback":
        balance = str(customer_pass.cashback_balance_val)
        pct = metadata.get("cashback_percentage", 10)
        return {
            "headerFields": [
                {
                    "key": "balance",
                    "label": "CREDITO",
                    "value": f"${balance}",
                    "currencyCode": metadata.get("currency", "USD"),
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
                {"key": "desc", "label": "Descripcion", "value": card.description or "", "changeMessage": "Detalles actualizados"}
            ],
        }

    elif card.card_type == "vip_membership":
        tier = pass_data.get("membership_tier", "VIP")
        return {
            "headerFields": [
                {"key": "tier", "label": "MEMBRESIA", "value": tier.upper(), "changeMessage": "Membresía actualizada: %@"}
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
                    "changeMessage": "Beneficios actualizados: %@",
                }
            ],
        }

    elif card.card_type == "coupon":
        return {
            "headerFields": [{"key": "offer", "label": "OFERTA", "value": card.name, "changeMessage": "¡Nueva oferta! %@"}],
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
        referrals = customer_pass.referral_count_val
        ref_code = customer.referral_code or customer_pass.qr_code or "N/A"
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
                    "changeMessage": "Información actualizada",
                }
            ],
        }

    elif card.card_type == "discount":
        # Discount cards use tiered progression from card.metadata["tiers"]
        # pass_data stores "discount_tier" (current tier name) and "total_spent"
        tiers = metadata.get("tiers", [])
        current_tier = customer_pass.discount_tier or pass_data.get("discount_tier", "")
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
                    "changeMessage": "Niveles actualizados",
                },
                {
                    "key": "desc",
                    "label": "Descripcion",
                    "value": card.description or "",
                },
            ],
        }

    elif card.card_type == "affiliate":
        # Affiliate/membership card generic Apple style with member info
        member_since = ""
        if customer_pass.enrolled_at:
            member_since = customer_pass.enrolled_at.strftime("%d/%m/%Y")
        affiliate_code = customer_pass.qr_code or pass_data.get("affiliate_code", "N/A")
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
                    "value": member_since or "",
                },
            ],
            "backFields": [
                {
                    "key": "benefits",
                    "label": "Beneficios",
                    "value": ", ".join(metadata.get("benefits", []))
                    or card.description
                    or "",
                    "changeMessage": "Beneficios actualizados: %@",
                },
            ],
        }

    elif card.card_type == "gift_certificate":
        # Gift certificate storeCard style showing balance
        # Prefers typed column gift_balance, falls back to pass_data
        balance = str(customer_pass.gift_balance_val)
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
                    "changeMessage": "Vigencia actualizada: %@",
                },
                {
                    "key": "desc",
                    "label": "Descripcion",
                    "value": card.description or "",
                },
            ],
        }

    elif card.card_type == "corporate_discount":
        # Corporate discount generic Apple style
        # pass_data stores "corporate_discount" percentage and "company_name"
        discount_pct = str(customer_pass.corporate_discount)
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
                    "changeMessage": "Condiciones actualizadas",
                },
            ],
        }

    elif card.card_type == "multipass":
        # Multipass storeCard style showing remaining uses
        # Prefers typed column multipass_remaining, falls back to pass_data
        bundle_size = metadata.get("bundle_size", 10)
        remaining = customer_pass.multipass_remaining_val or bundle_size
        return {
            "headerFields": [
                {
                    "key": "remaining",
                    "label": "USOS RESTANTES",
                    "value": f"{remaining}/{bundle_size}",
                    "changeMessage": "Usos restantes: %@",
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
                    "value": f"${metadata.get('bundle_price', '')}",
                    "changeMessage": "Precio actualizado: %@",
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
                {"key": "desc", "label": "Descripcion", "value": card.description or "", "changeMessage": "Detalles actualizados"}
            ],
        }


def _build_locations(card) -> list:
    """Build location array from tenant locations for geo-push."""
    locations = []

    if not hasattr(card.tenant, 'locations'):
        return locations

    try:
        tenant_locations = card.tenant.locations.filter(is_active=True)[:10]
    except Exception:
        return locations

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
    """Convert hex color (#RRGGBB or #RGB) to Apple's rgb(R, G, B) format."""
    if not hex_color:
        return "rgb(26, 26, 46)"
    hex_color = hex_color.strip()
    if hex_color.lower().startswith("rgb("):
        return hex_color
    hex_color = hex_color.lstrip("#")
    if len(hex_color) == 3:
        hex_color = "".join(c * 2 for c in hex_color)
    if len(hex_color) != 6:
        return "rgb(26, 26, 46)"
    try:
        r, g, b = int(hex_color[0:2], 16), int(hex_color[2:4], 16), int(hex_color[4:6], 16)
    except ValueError:
        return "rgb(26, 26, 46)"
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
        logger.warning("Pillow not installed  returning minimal 1x1 PNG for icon")
        return _minimal_png()


def _generate_placeholder_logo(
    name: str, bg_color: str = "#5660ff", width: int = 160, height: int = 50
) -> bytes:
    """Generate a wide logo PNG using a solid background with the first letter.

    Apple PassKit specifies logo.png as 160 x 50 points (320 x 100 @2x).
    This creates a wide rectangular placeholder matching that aspect ratio.
    """
    try:
        from PIL import Image, ImageDraw, ImageFont

        img = Image.new("RGBA", (width, height), bg_color)
        draw = ImageDraw.Draw(img)
        letter = name[0].upper() if name else "L"
        font_size = min(width, height) // 2
        try:
            font = ImageFont.truetype(
                "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", font_size
            )
        except OSError:
            font = ImageFont.load_default()
        bbox = draw.textbbox((0, 0), letter, font=font)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        x = (width - tw) // 2
        y = (height - th) // 2
        draw.text((x, y), letter, font=font, fill="#FFFFFF")
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        return buf.getvalue()
    except ImportError:
        logger.warning("Pillow not installed  returning minimal 1x1 PNG for logo")
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
