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

    else:
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
    """Build location array from card.locations for geo-push."""
    locations = []
    if not card.locations:
        return locations
    for loc in card.locations[:10]:  # Apple max: 10
        try:
            lat = float(loc.get("lat", 0))
            lng = float(loc.get("lng", 0))
            text = loc.get("name", card.name)
            if lat and lng:
                locations.append(
                    {
                        "latitude": lat,
                        "longitude": lng,
                        "relevantText": f"Estas cerca de {text}!",
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
    img_resized = img.resize((width, height), PILImage.LANCZOS)
    img_resized.save(buf, format="PNG")
    return buf.getvalue()


# Need io for image operations
import io  # noqa: E402
