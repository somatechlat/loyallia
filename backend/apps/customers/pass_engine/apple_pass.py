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
"""

import hashlib
import io
import json
import logging
import zipfile
from pathlib import Path

from django.conf import settings

from apps.customers.pass_engine.apple_pass_builders import (
    APPLE_PASS_STYLES,
    _build_fields_for_type,
    _build_locations,
    _generate_placeholder_icon,
    _hex_to_rgb,
    _resize_image,
)

logger = logging.getLogger(__name__)


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
            logger.warning("Apple cert file not found: %s -> %s", key, path)
            return False
    if not config["pass_type_id"] or not config["team_id"]:
        logger.warning("APPLE_PASS_TYPE_IDENTIFIER or APPLE_TEAM_IDENTIFIER not set")
        return False
    return True


# Mapping from Card.barcode_type to Apple PKBarcodeFormat constants.
# Per Apple docs: QR, Aztec, Code128, PDF417 are valid on iOS 9+.
# Code128 is NOT supported on watchOS — Apple auto-falls back.
# DataMatrix has no Apple equivalent; we fall back to QR.
APPLE_BARCODE_FORMATS = {
    "qr_code": "PKBarcodeFormatQR",
    "aztec": "PKBarcodeFormatAztec",
    "code_128": "PKBarcodeFormatCode128",
    "pdf417": "PKBarcodeFormatPDF417",
    "data_matrix": "PKBarcodeFormatQR",  # No Apple DataMatrix — fallback
}


def _build_pass_json(customer_pass, card, customer, tenant) -> dict:
    """Build the pass.json structure per Apple PassKit specification."""
    config = _get_apple_config()
    pass_style = APPLE_PASS_STYLES.get(card.card_type, "generic")
    fields = _build_fields_for_type(card, customer_pass)
    barcode_value = customer_pass.qr_code or str(customer_pass.id)
    barcode_format = APPLE_BARCODE_FORMATS.get(
        card.barcode_type, "PKBarcodeFormatQR"
    )

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
        "barcode": {
            "format": barcode_format,
            "message": barcode_value,
            "messageEncoding": "iso-8859-1",
            "altText": barcode_value,
        },
        "barcodes": [
            {
                "format": barcode_format,
                "message": barcode_value,
                "messageEncoding": "iso-8859-1",
                "altText": barcode_value,
            }
        ],
        pass_style: fields,
    }

    locations = _build_locations(card)
    if locations:
        pass_json["locations"] = locations
        pass_json["maxDistance"] = 100

    nfc_public_key = getattr(settings, "APPLE_NFC_ENCRYPTION_PUBLIC_KEY", "")
    if nfc_public_key:
        pass_json["nfc"] = {
            "message": barcode_value,
            "encryptionPublicKey": nfc_public_key,
        }

    web_service_url = getattr(settings, "PASS_WEB_SERVICE_URL", "")
    if web_service_url:
        pass_json["webServiceURL"] = web_service_url
        pass_json["authenticationToken"] = str(customer_pass.id).replace("-", "")

    return pass_json


def _sign_manifest(manifest_json: bytes, config: dict) -> bytes | None:
    """Sign the manifest.json using PKCS#7 detached signature."""
    try:
        from OpenSSL import crypto

        with open(config["cert_path"], "rb") as f:
            cert = crypto.load_certificate(crypto.FILETYPE_PEM, f.read())
        with open(config["key_path"], "rb") as f:
            key = crypto.load_privatekey(crypto.FILETYPE_PEM, f.read())
        with open(config["wwdr_path"], "rb") as f:
            wwdr = crypto.load_certificate(crypto.FILETYPE_PEM, f.read())

        bio_in = crypto._new_mem_buf(manifest_json)
        pkcs7 = crypto._lib.PKCS7_sign(
            cert._x509,
            key._pkey,
            crypto._ffi.NULL,
            bio_in,
            crypto._lib.PKCS7_BINARY | crypto._lib.PKCS7_DETACHED,
        )
        crypto._lib.PKCS7_add_certificate(pkcs7, wwdr._x509)
        bio_out = crypto._new_mem_buf()
        crypto._lib.i2d_PKCS7_bio(bio_out, pkcs7)
        return crypto._read_mem_buf(bio_out)
    except ImportError:
        logger.error("pyOpenSSL not installed -- cannot sign Apple passes")
        return None
    except Exception as exc:
        logger.error("Failed to sign Apple pass manifest: %s", exc)
        return None


def generate_pkpass(customer_pass) -> bytes | None:
    """Generate a real .pkpass file (signed ZIP) for Apple Wallet."""
    config = _get_apple_config()

    if not _check_certs_exist():
        logger.warning(
            "Apple Wallet certificates not configured. "
            "Provide: APPLE_CERT_PATH, APPLE_CERT_KEY_PATH, APPLE_WWDR_CERT_PATH, "
            "APPLE_PASS_TYPE_IDENTIFIER, APPLE_TEAM_IDENTIFIER"
        )
        return None

    card = customer_pass.card
    customer = customer_pass.customer
    tenant = card.tenant

    pass_json = _build_pass_json(customer_pass, card, customer, tenant)
    pass_json_bytes = json.dumps(pass_json, ensure_ascii=False).encode("utf-8")

    bg_color = card.background_color or "#5660ff"

    def fetch_image_bytes(url):
        if not url: return None
        try:
            import requests
            resp = requests.get(url, timeout=10)
            if resp.status_code == 200:
                return resp.content
        except Exception as exc:
            logger.warning("Failed to fetch image from %s: %s", url, exc)
        return None

    logo_bytes = fetch_image_bytes(card.logo_url)
    icon_bytes = fetch_image_bytes(card.icon_url)
    strip_bytes = fetch_image_bytes(card.strip_image_url)

    from PIL import Image

    # Default fallbacks
    icon_29 = _generate_placeholder_icon(card.name, bg_color, 29)
    icon_58 = _generate_placeholder_icon(card.name, bg_color, 58)
    logo_87 = _generate_placeholder_icon(card.name, bg_color, 87)
    logo_174 = _generate_placeholder_icon(card.name, bg_color, 174)

    if logo_bytes:
        try:
            img = Image.open(io.BytesIO(logo_bytes)).convert("RGBA")
            logo_87 = _resize_image(img, 87, 87)
            logo_174 = _resize_image(img, 174, 174)
        except Exception as exc:
            logger.warning("Failed to process logo image: %s", exc)

    if icon_bytes:
        try:
            img = Image.open(io.BytesIO(icon_bytes)).convert("RGBA")
            icon_29 = _resize_image(img, 29, 29)
            icon_58 = _resize_image(img, 58, 58)
        except Exception as exc:
            logger.warning("Failed to process icon image: %s", exc)

    files = {
        "pass.json": pass_json_bytes,
        "icon.png": icon_29,
        "icon@2x.png": icon_58,
        "logo.png": logo_87,
        "logo@2x.png": logo_174,
    }

    if strip_bytes:
        try:
            img = Image.open(io.BytesIO(strip_bytes)).convert("RGBA")
            # Apple Wallet strip recommended sizes: 375x123 (@1x) and 750x246 (@2x)
            files["strip.png"] = _resize_image(img, 375, 123)
            files["strip@2x.png"] = _resize_image(img, 750, 246)
        except Exception as exc:
            logger.warning("Failed to process strip image: %s", exc)

    manifest = {}
    for filename, data in files.items():
        manifest[filename] = hashlib.sha1(data).hexdigest()

    manifest_bytes = json.dumps(manifest).encode("utf-8")
    signature = _sign_manifest(manifest_bytes, config)
    if signature is None:
        logger.error("Failed to produce Apple pass signature")
        return None

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


def is_apple_wallet_configured() -> bool:
    """Check if Apple Wallet certificates are properly configured."""
    return _check_certs_exist()
