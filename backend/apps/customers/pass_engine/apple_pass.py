"""
Loyallia — Apple Wallet PKPass Generator
Generates real .pkpass files for Apple Wallet (iOS).

A .pkpass file is a signed ZIP archive containing:
- pass.json   — Card layout, colors, barcode, fields
- manifest.json — SHA1 hashes of all included files
- signature    — PKCS#7 detached signature of manifest.json
- icon.png / icon@2x.png — Card icon (required)
- logo.png / logo@2x.png — Business logo (optional)

According to Apple PassKit docs:
https://developer.apple.com/documentation/walletpasses

Requires:
- Apple Developer Pass Type Certificate (.pem + .key)
- Apple WWDR Intermediate Certificate (.pem)
"""

import hashlib
import io
import json
import logging
import zipfile
from pathlib import Path

from django.conf import settings

logger = logging.getLogger(__name__)


# =============================================================================
# PASS TYPE STYLE MAPPING
# =============================================================================

_APPLE_PASS_STYLES = {
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


def _get_apple_config() -> dict:
    """Return Apple certificate configuration from Django settings."""
    return {
        "pass_type_id": getattr(settings, "APPLE_PASS_TYPE_IDENTIFIER", ""),
        "team_id": getattr(settings, "APPLE_TEAM_IDENTIFIER", ""),
        "cert_path": Path(getattr(settings, "APPLE_CERT_PATH", "")),
        "key_path": Path(getattr(settings, "APPLE_CERT_KEY_PATH", "")),
        "wwdr_path": Path(getattr(settings, "APPLE_WWDR_CERT_PATH", "")),
    }


def _check_certs_exist() -> bool:
    """Check that all required Apple certificate files exist."""
    config = _get_apple_config()
    for key in ("cert_path", "key_path", "wwdr_path"):
        path = config[key]
        if not path.exists():
            logger.warning("Apple cert file not found: %s → %s", key, path)
            return False
    if not config["pass_type_id"] or not config["team_id"]:
        logger.warning("APPLE_PASS_TYPE_IDENTIFIER or APPLE_TEAM_IDENTIFIER not set")
        return False
    return True


def _build_pass_json(customer_pass, card, customer, tenant) -> dict:
    """
    Build the pass.json structure per Apple PassKit specification.
    """
    config = _get_apple_config()
    pass_style = _APPLE_PASS_STYLES.get(card.card_type, "generic")

    # Build fields based on card type
    fields = _build_fields_for_type(card, customer_pass)

    barcode_value = customer_pass.qr_code or str(customer_pass.id)

    pass_json = {
        "formatVersion": 1,
        "passTypeIdentifier": config["pass_type_id"],
        "teamIdentifier": config["team_id"],
        "serialNumber": str(customer_pass.id),
        "organizationName": tenant.name,
        "description": card.name,
        "foregroundColor": card.text_color or "rgb(255, 255, 255)",
        "backgroundColor": _hex_to_rgb(card.background_color or "#1A1A2E"),
        "labelColor": _hex_to_rgb(card.text_color or "#FFFFFF"),
        # Barcode (scannable by Scanner App)
        "barcode": {
            "format": "PKBarcodeFormatQR",
            "message": barcode_value,
            "messageEncoding": "iso-8859-1",
            "altText": barcode_value,
        },
        # Also add barcodes array (iOS 9+)
        "barcodes": [
            {
                "format": "PKBarcodeFormatQR",
                "message": barcode_value,
                "messageEncoding": "iso-8859-1",
                "altText": barcode_value,
            }
        ],
        # Card type specific layout
        pass_style: fields,
    }

    # Add locations for geo-push notifications
    locations = _build_locations(card)
    if locations:
        pass_json["locations"] = locations
        pass_json["maxDistance"] = 100  # meters — triggers geo-notification

    # Add NFC Dictionary for Smart Tap / Apple VAS (only if key is configured)
    nfc_public_key = getattr(settings, "APPLE_NFC_ENCRYPTION_PUBLIC_KEY", "")
    if nfc_public_key:
        pass_json["nfc"] = {
            "message": barcode_value,
            "encryptionPublicKey": nfc_public_key,
        }

    # Web service URL for live pass updates (if configured)
    web_service_url = getattr(settings, "PASS_WEB_SERVICE_URL", "")
    if web_service_url:
        pass_json["webServiceURL"] = web_service_url
        pass_json["authenticationToken"] = str(customer_pass.id).replace("-", "")

    return pass_json


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
        stamps_display = "⬛" * current + "⬜" * (total - current)
        return {
            "headerFields": [
                {"key": "stamps", "label": "SELLOS", "value": f"{current}/{total}"},
            ],
            "primaryFields": [
                {"key": "reward", "label": "RECOMPENSA", "value": reward},
            ],
            "secondaryFields": [
                {"key": "progress", "label": "PROGRESO", "value": stamps_display},
            ],
            "backFields": [
                {"key": "name", "label": "Cliente", "value": customer_name},
                {"key": "program", "label": "Programa", "value": card.name},
                {
                    "key": "desc",
                    "label": "Descripción",
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
                    "label": "CRÉDITO",
                    "value": f"${balance}",
                    "currencyCode": "USD",
                },
            ],
            "primaryFields": [
                {"key": "program", "label": "PROGRAMA", "value": card.name},
            ],
            "secondaryFields": [
                {"key": "rate", "label": "% CASHBACK", "value": f"{pct}%"},
                {"key": "customer", "label": "CLIENTE", "value": customer_name},
            ],
            "backFields": [
                {
                    "key": "desc",
                    "label": "Descripción",
                    "value": card.description or "",
                },
            ],
        }

    elif card.card_type == "vip_membership":
        tier = pass_data.get("membership_tier", "VIP")
        return {
            "headerFields": [
                {"key": "tier", "label": "MEMBRESÍA", "value": tier.upper()},
            ],
            "primaryFields": [
                {"key": "name", "label": "MIEMBRO", "value": customer_name},
            ],
            "secondaryFields": [
                {"key": "program", "label": "CLUB", "value": card.name},
            ],
            "backFields": [
                {
                    "key": "perks",
                    "label": "Beneficios",
                    "value": ", ".join(metadata.get("perks", [])),
                },
            ],
        }

    elif card.card_type == "coupon":
        return {
            "headerFields": [
                {"key": "offer", "label": "OFERTA", "value": card.name},
            ],
            "primaryFields": [
                {
                    "key": "discount",
                    "label": "DESCUENTO",
                    "value": card.description or "Descuento especial",
                },
            ],
            "secondaryFields": [
                {"key": "customer", "label": "CLIENTE", "value": customer_name},
            ],
            "backFields": [],
        }

    elif card.card_type == "referral_pass":
        referrals = pass_data.get("referrals_made", 0)
        ref_code = pass_data.get("referral_code", "N/A")
        return {
            "headerFields": [
                {"key": "refs", "label": "REFERIDOS", "value": str(referrals)},
            ],
            "primaryFields": [
                {"key": "code", "label": "TU CÓDIGO", "value": ref_code},
            ],
            "secondaryFields": [
                {"key": "customer", "label": "EMBAJADOR", "value": customer_name},
            ],
            "backFields": [
                {
                    "key": "desc",
                    "label": "Cómo funciona",
                    "value": card.description or "",
                },
            ],
        }

    else:
        # Generic fallback for all other types
        return {
            "headerFields": [
                {"key": "program", "label": "PROGRAMA", "value": card.name},
            ],
            "primaryFields": [
                {"key": "customer", "label": "CLIENTE", "value": customer_name},
            ],
            "secondaryFields": [],
            "backFields": [
                {
                    "key": "desc",
                    "label": "Descripción",
                    "value": card.description or "",
                },
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
                        "relevantText": f"¡Estás cerca de {text}!",
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
    size: int = 58, color: str = "#5660ff", letter: str = "L"
) -> bytes:
    """Generate a simple square icon PNG with a letter using Pillow."""
    from PIL import Image, ImageDraw, ImageFont

    img = Image.new("RGBA", (size, size), color)
    draw = ImageDraw.Draw(img)

    # Draw letter centered
    try:
        font = ImageFont.truetype(
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", int(size * 0.5)
        )
    except OSError:
        font = ImageFont.load_default()

    bbox = draw.textbbox((0, 0), letter, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    x = (size - text_width) // 2
    y = (size - text_height) // 2 - bbox[1]

    draw.text((x, y), letter, fill="white", font=font)

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _sign_manifest(manifest_json: bytes, config: dict) -> bytes | None:
    """
    Sign the manifest.json using PKCS#7 detached signature.
    Uses pyOpenSSL with the Apple Pass Type Certificate + WWDR cert.
    """
    try:
        from OpenSSL import crypto

        # Load certificates
        with open(config["cert_path"], "rb") as f:
            cert = crypto.load_certificate(crypto.FILETYPE_PEM, f.read())
        with open(config["key_path"], "rb") as f:
            key = crypto.load_privatekey(crypto.FILETYPE_PEM, f.read())
        with open(config["wwdr_path"], "rb") as f:
            wwdr = crypto.load_certificate(crypto.FILETYPE_PEM, f.read())

        # Create PKCS#7 signature
        bio_in = crypto._new_mem_buf(manifest_json)
        pkcs7 = crypto._lib.PKCS7_sign(
            cert._x509,
            key._pkey,
            crypto._ffi.NULL,  # No extra certs in the chain
            bio_in,
            crypto._lib.PKCS7_BINARY | crypto._lib.PKCS7_DETACHED,
        )

        # Add WWDR intermediate cert
        crypto._lib.PKCS7_add_certificate(pkcs7, wwdr._x509)

        # Write DER-encoded signature
        bio_out = crypto._new_mem_buf()
        crypto._lib.i2d_PKCS7_bio(bio_out, pkcs7)
        return crypto._read_mem_buf(bio_out)

    except ImportError:
        logger.error("pyOpenSSL not installed — cannot sign Apple passes")
        return None
    except Exception as exc:
        logger.error("Failed to sign Apple pass manifest: %s", exc)
        return None


def generate_pkpass(customer_pass) -> bytes | None:
    """
    Generate a real .pkpass file (signed ZIP) for Apple Wallet.

    Args:
        customer_pass: CustomerPass model instance (with card, customer, card.tenant loaded)

    Returns:
        Bytes of the .pkpass ZIP file, or None if certificates are not configured
    """
    config = _get_apple_config()

    if not _check_certs_exist():
        logger.warning(
            "Apple Wallet certificates not configured. "
            "Cannot generate real .pkpass file. "
            "Provide: APPLE_CERT_PATH, APPLE_CERT_KEY_PATH, APPLE_WWDR_CERT_PATH, "
            "APPLE_PASS_TYPE_IDENTIFIER, APPLE_TEAM_IDENTIFIER"
        )
        return None

    card = customer_pass.card
    customer = customer_pass.customer
    tenant = card.tenant

    # Build pass.json
    pass_json = _build_pass_json(customer_pass, card, customer, tenant)
    pass_json_bytes = json.dumps(pass_json, ensure_ascii=False).encode("utf-8")

    # Generate icon images - use card logo if available, otherwise generate placeholder
    bg_color = card.background_color or "#5660ff"
    letter = card.name[0].upper() if card.name else "L"

    # Try to fetch logo from card.logo_url if available
    logo_bytes = None
    if card.logo_url:
        try:
            import requests

            resp = requests.get(card.logo_url, timeout=10)
            if resp.status_code == 200:
                logo_bytes = resp.content
                logger.info(f"Using card logo from URL: {card.logo_url}")
        except Exception as exc:
            logger.warning(f"Failed to fetch logo from {card.logo_url}: {exc}")

    # Generate icons - use logo for logo files if available
    icon_29 = _generate_placeholder_icon(29, bg_color, letter)
    icon_58 = _generate_placeholder_icon(58, bg_color, letter)

    if logo_bytes:
        # Resize logo to appropriate sizes for Apple Wallet
        import io

        from PIL import Image

        try:
            logo_img = Image.open(io.BytesIO(logo_bytes)).convert("RGBA")
            # Generate 87x87 logo
            logo_87 = _resize_image(logo_img, 87, 87)
            # Generate 174x174 logo@2x
            logo_174 = _resize_image(logo_img, 174, 174)
        except Exception as exc:
            logger.warning(f"Failed to process logo image: {exc}, using placeholder")
            logo_87 = _generate_placeholder_icon(87, bg_color, letter)
            logo_174 = _generate_placeholder_icon(174, bg_color, letter)
    else:
        logo_87 = _generate_placeholder_icon(87, bg_color, letter)
        logo_174 = _generate_placeholder_icon(174, bg_color, letter)

    # Collect all files for the .pkpass
    files = {
        "pass.json": pass_json_bytes,
        "icon.png": icon_29,
        "icon@2x.png": icon_58,
        "logo.png": logo_87,
        "logo@2x.png": logo_174,
    }

    # Build manifest.json (SHA1 hash of each file)
    manifest = {}
    for filename, data in files.items():
        manifest[filename] = hashlib.sha1(data).hexdigest()

    manifest_bytes = json.dumps(manifest).encode("utf-8")

    # Sign the manifest with Apple certificates
    signature = _sign_manifest(manifest_bytes, config)
    if signature is None:
        logger.error("Failed to produce Apple pass signature")
        return None

    # Build the ZIP (.pkpass)
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for filename, data in files.items():
            zf.writestr(filename, data)
        zf.writestr("manifest.json", manifest_bytes)
        zf.writestr("signature", signature)

    pkpass_bytes = buf.getvalue()
    logger.info(
        "PKPass generated for pass %s (size: %d bytes, customer: %s)",
        customer_pass.id,
        len(pkpass_bytes),
        customer.email,
    )
    return pkpass_bytes


def _resize_image(img, width: int, height: int) -> bytes:
    """Resize an image to the specified dimensions and return as PNG bytes."""
    import io

    from PIL import Image

    resized = img.resize((width, height), Image.Resampling.LANCZOS)
    buf = io.BytesIO()
    resized.save(buf, format="PNG")
    return buf.getvalue()


def is_apple_wallet_configured() -> bool:
    """Check if Apple Wallet certificates are properly configured."""
    return _check_certs_exist()
