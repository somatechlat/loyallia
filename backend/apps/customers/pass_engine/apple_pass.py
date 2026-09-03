"""
Loyallia Apple Wallet PKPass Generator
Generates real .pkpass files for Apple Wallet (iOS).

A .pkpass file is a signed ZIP archive containing:
- pass.json    Card layout, colors, barcode, fields
- manifest.json  SHA1 hashes of all included files
- signature    — PKCS#7 detached signature of manifest.json
- icon.png / icon@2x.png  Card icon (required)
- logo.png / logo@2x.png  Business logo (optional)

According to Apple PassKit docs:
https://developer.apple.com/documentation/walletpasses
"""

import hashlib
import io
import json
import logging
import zipfile
from typing import Any

from django.conf import settings

from apps.customers.pass_engine.apple_image_utils import (
    _generate_placeholder_icon,
    _generate_placeholder_logo,
    _hex_to_rgb,
    _resize_image,
)
from apps.customers.pass_engine.apple_pass_builders import (
    APPLE_PASS_STYLES,
    _build_fields_for_type,
    _build_locations,
)
from apps.customers.pass_engine.apple_v2_builders import _get_wallet_studio

logger = logging.getLogger(__name__)


def _get_apple_config() -> dict:
    """Return Apple configuration from Django settings."""
    return {
        "pass_type_id": getattr(settings, "APPLE_PASS_TYPE_IDENTIFIER", ""),
        "team_id": getattr(settings, "APPLE_TEAM_IDENTIFIER", ""),
    }


def _check_config_ready() -> bool:
    """Check that all required Apple PKPass configuration is set and parseable."""
    config = _get_apple_config()
    if not config["pass_type_id"] or not config["team_id"]:
        logger.warning("APPLE_PASS_TYPE_IDENTIFIER or APPLE_TEAM_IDENTIFIER not set")
        return False

    try:
        from OpenSSL import crypto

        from common.vault import get_secret

        cert_pem = get_secret("apple_cert_pem", strict=True)
        key_pem = get_secret("apple_cert_key_pem", strict=True)
        wwdr_pem = get_secret("apple_wwdr_cert_pem", strict=True)

        crypto.load_certificate(crypto.FILETYPE_PEM, cert_pem.encode("utf-8"))
        crypto.load_privatekey(crypto.FILETYPE_PEM, key_pem.encode("utf-8"))
        crypto.load_certificate(crypto.FILETYPE_PEM, wwdr_pem.encode("utf-8"))
    except Exception as exc:
        logger.warning("Apple Wallet PKPass signing material is not ready: %s", exc)
        return False

    return True


def get_apple_wallet_diagnostics() -> dict:
    """Return diagnostic info about Apple Wallet configuration (no secrets exposed)."""
    from common.vault import get_secret

    diagnostics: dict[str, Any] = {
        "enabled": False,
        "pass_type_id_present": False,
        "team_id_present": False,
        "cert_pem_present": False,
        "cert_key_pem_present": False,
        "wwdr_cert_pem_present": False,
        "certs_cryptographically_valid": False,
        "errors": [],
    }

    enabled = get_secret("apple_wallet_enabled", default="false")
    diagnostics["enabled"] = enabled.strip().lower() in {"1", "true", "yes", "on"}
    if not diagnostics["enabled"]:
        diagnostics["errors"].append("APPLE_WALLET_ENABLED is false in Vault")

    pass_type_id = get_secret("apple_pass_type_identifier", default="")
    diagnostics["pass_type_id_present"] = bool(pass_type_id and pass_type_id not in ("", "n/a"))
    if not diagnostics["pass_type_id_present"]:
        diagnostics["errors"].append("Missing APPLE_PASS_TYPE_IDENTIFIER in Vault")

    team_id = get_secret("apple_team_identifier", default="")
    diagnostics["team_id_present"] = bool(team_id and team_id not in ("", "n/a"))
    if not diagnostics["team_id_present"]:
        diagnostics["errors"].append("Missing APPLE_TEAM_IDENTIFIER in Vault")

    cert_pem = get_secret("apple_cert_pem", default="")
    diagnostics["cert_pem_present"] = bool(cert_pem and cert_pem not in ("", "n/a"))
    if not diagnostics["cert_pem_present"]:
        diagnostics["errors"].append("Missing APPLE_CERT_PEM in Vault")

    key_pem = get_secret("apple_cert_key_pem", default="")
    diagnostics["cert_key_pem_present"] = bool(key_pem and key_pem not in ("", "n/a"))
    if not diagnostics["cert_key_pem_present"]:
        diagnostics["errors"].append("Missing APPLE_CERT_KEY_PEM in Vault")

    wwdr_pem = get_secret("apple_wwdr_cert_pem", default="")
    diagnostics["wwdr_cert_pem_present"] = bool(wwdr_pem and wwdr_pem not in ("", "n/a"))
    if not diagnostics["wwdr_cert_pem_present"]:
        diagnostics["errors"].append("Missing APPLE_WWDR_CERT_PEM in Vault")

    # Only try crypto validation if all PEMs are present
    if all(
        [
            diagnostics["cert_pem_present"],
            diagnostics["cert_key_pem_present"],
            diagnostics["wwdr_cert_pem_present"],
        ]
    ):
        try:
            from OpenSSL import crypto

            crypto.load_certificate(crypto.FILETYPE_PEM, cert_pem.encode("utf-8"))
            crypto.load_privatekey(crypto.FILETYPE_PEM, key_pem.encode("utf-8"))
            crypto.load_certificate(crypto.FILETYPE_PEM, wwdr_pem.encode("utf-8"))
            diagnostics["certs_cryptographically_valid"] = True
        except Exception as exc:
            diagnostics["errors"].append(f"Apple certificates failed cryptographic validation: {exc}")

    return diagnostics


# Mapping from Card.barcode_type to Apple PKBarcodeFormat constants.
# Per Apple docs: QR, Aztec, Code128, PDF417 are valid on iOS 9+.
# Code128 is NOT supported on watchOS Apple auto-falls back.
# DataMatrix has no Apple equivalent; we fall back to QR.
APPLE_BARCODE_FORMATS = {
    "qr_code": "PKBarcodeFormatQR",
    "aztec": "PKBarcodeFormatAztec",
    "code_128": "PKBarcodeFormatCode128",
    "pdf417": "PKBarcodeFormatPDF417",
    "data_matrix": "PKBarcodeFormatQR",  # No Apple DataMatrix fallback
}


def _build_nfc_payload(card, customer_pass, barcode_value: str, override_message: str = "") -> dict | None:
    """Build the optional Apple NFC payload from card metadata and Vault config."""
    metadata = card.metadata if isinstance(card.metadata, dict) else {}
    apple_config = metadata.get("apple_wallet", {})
    if not isinstance(apple_config, dict) or not apple_config.get("nfc_enabled"):
        return None

    from common.vault import get_secret

    nfc_public_key = get_secret("apple_nfc_encryption_public_key", default="")
    if not nfc_public_key:
        raise ValueError("Apple NFC is enabled but apple_nfc_encryption_public_key is missing")

    message = override_message or str(apple_config.get("nfc_message") or barcode_value)
    if len(message.encode("utf-8")) > settings.PASS_APPLE_NFC_MESSAGE_MAX_BYTES:
        raise ValueError("Apple NFC message must be 64 bytes or less")

    nfc_payload: dict[str, Any] = {
        "message": message,
        "encryptionPublicKey": nfc_public_key,
    }
    if apple_config.get("nfc_requires_authentication"):
        nfc_payload["requiresAuthentication"] = True
    return nfc_payload


def _build_pass_json(customer_pass, card, customer, tenant) -> dict:
    """Build the pass.json structure per Apple PassKit specification."""
    config = _get_apple_config()
    pass_style = APPLE_PASS_STYLES.get(card.card_type, "generic")
    fields = _build_fields_for_type(card, customer_pass)
    barcode_value = customer_pass.qr_code or str(customer_pass.id)
    barcode_format = APPLE_BARCODE_FORMATS.get(card.barcode_type, "PKBarcodeFormatQR")

    wallet_studio = _get_wallet_studio(card)
    v2_colors = wallet_studio.get("colors") or {}
    v2_barcode = wallet_studio.get("barcode") or {}
    v2_apple = wallet_studio.get("apple") or {}

    background_color = v2_colors.get("background") or card.background_color or "#1A1A2E"
    foreground_color = v2_colors.get("foreground") or card.text_color or "#FFFFFF"
    label_color = v2_colors.get("label") or foreground_color

    # V2 barcode configuration takes precedence
    if v2_barcode.get("format"):
        v2_format = v2_barcode["format"]
        barcode_format = APPLE_BARCODE_FORMATS.get(v2_format.lower(), barcode_format)
    if v2_barcode.get("message"):
        barcode_value = v2_barcode["message"]
    barcode_alt = v2_barcode.get("altText") or barcode_value
    barcode_encoding = v2_barcode.get("messageEncoding") or settings.PASS_APPLE_DEFAULT_BARCODE

    description = v2_apple.get("description") or card.name
    organization_name = v2_apple.get("organizationName") or tenant.name
    logo_text = tenant.name or card.name

    pass_json = {
        "formatVersion": 1,
        "passTypeIdentifier": config["pass_type_id"],
        "teamIdentifier": config["team_id"],
        "serialNumber": str(customer_pass.id),
        "organizationName": organization_name,
        "description": description,
        "logoText": logo_text,
        "foregroundColor": _hex_to_rgb(foreground_color),
        "backgroundColor": _hex_to_rgb(background_color),
        "labelColor": _hex_to_rgb(label_color),
        "barcodes": [
            {
                "format": barcode_format,
                "message": barcode_value,
                "messageEncoding": barcode_encoding,
                "altText": barcode_alt,
            }
        ],
        pass_style: fields,
    }

    locations = _build_locations(card)
    if locations:
        pass_json["locations"] = locations
        pass_json["maxDistance"] = settings.PASS_MAX_DISTANCE_METERS

    # Apply V2 Apple advanced settings
    nfc_override = ""
    if isinstance(v2_apple, dict):
        v2_nfc = v2_apple.get("nfc") or {}
        if isinstance(v2_nfc, dict) and v2_nfc.get("enabled"):
            nfc_override = v2_nfc.get("message", "")
        if v2_apple.get("suppressStripShine") is not None:
            pass_json["suppressStripShine"] = v2_apple["suppressStripShine"]
        if v2_apple.get("sharingProhibited") is not None:
            pass_json["sharingProhibited"] = v2_apple["sharingProhibited"]
        if v2_apple.get("voided") is not None:
            pass_json["voided"] = v2_apple["voided"]
        if v2_apple.get("expirationDate"):
            pass_json["expirationDate"] = v2_apple["expirationDate"]
        if v2_apple.get("appLaunchURL"):
            pass_json["appLaunchURL"] = v2_apple["appLaunchURL"]

    nfc_payload = _build_nfc_payload(card, customer_pass, barcode_value, nfc_override)
    if nfc_payload:
        pass_json["nfc"] = nfc_payload

    web_service_url = getattr(settings, "PASS_WEB_SERVICE_URL", "")
    if not web_service_url:
        from apps.tenants.models import PlatformSetting

        web_service_url = PlatformSetting.get("wallet_web_service_url", "")
    if web_service_url:
        pass_json["webServiceURL"] = web_service_url
        pass_json["authenticationToken"] = str(customer_pass.id).replace("-", "")

    return pass_json


def _sign_manifest(manifest_json: bytes) -> bytes | None:
    """Sign the manifest.json using PKCS#7 detached signature.

    Uses the `cryptography` library's PKCS7SignatureBuilder (stable API).
    The old pyOpenSSL _lib.PKCS7_sign was removed in pyOpenSSL 23.0+.

    PERF: Certificates are loaded from Vault (cached 5min)  no filesystem I/O.
    SEC: Private key never touches disk; loaded from Vault PEM string directly.
    """
    from common.vault import get_secret

    cert_pem = get_secret("apple_cert_pem", strict=True)
    key_pem = get_secret("apple_cert_key_pem", strict=True)
    wwdr_pem = get_secret("apple_wwdr_cert_pem", strict=True)

    if not all([cert_pem, key_pem, wwdr_pem]):
        logger.error("Missing Apple certificates in Vault")
        return None

    try:
        from cryptography import x509
        from cryptography.hazmat.primitives import hashes, serialization
        from cryptography.hazmat.primitives.serialization import Encoding
        from cryptography.hazmat.primitives.serialization import pkcs7 as pkcs7_module

        # Load the signing certificate
        cert = x509.load_pem_x509_certificate(cert_pem.encode("utf-8"))

        # Load the private key (no passphrase)
        key = serialization.load_pem_private_key(key_pem.encode("utf-8"), password=None)

        # Load the WWDR intermediate certificate
        wwdr = x509.load_pem_x509_certificate(wwdr_pem.encode("utf-8"))

        # Build the PKCS#7 detached signature using the stable API
        # Apple requires: SHA256 hash, DER encoding, detached + binary flags
        signature = (
            pkcs7_module.PKCS7SignatureBuilder()
            .set_data(manifest_json)
            .add_signer(cert, key, hashes.SHA256())  # type: ignore[arg-type]
            .add_certificate(wwdr)
            .sign(
                Encoding.DER,
                [
                    pkcs7_module.PKCS7Options.DetachedSignature,
                    pkcs7_module.PKCS7Options.Binary,
                ],
            )
        )
        return signature
    except ImportError:
        logger.error("cryptography library not installed  cannot sign Apple passes")
        return None
    except Exception as exc:
        logger.error("Failed to sign Apple pass manifest: %s", exc)
        return None


def generate_pkpass(customer_pass) -> bytes | None:
    """Generate a real .pkpass file (signed ZIP) for Apple Wallet."""
    if not _check_config_ready():
        logger.warning("Apple Wallet configuration missing. Provide: APPLE_PASS_TYPE_IDENTIFIER, APPLE_TEAM_IDENTIFIER")
        return None

    card = customer_pass.card
    customer = customer_pass.customer
    tenant = card.tenant
    pass_style = APPLE_PASS_STYLES.get(card.card_type, "generic")

    try:
        pass_json = _build_pass_json(customer_pass, card, customer, tenant)
    except ValueError as exc:
        logger.error("Invalid Apple pass configuration for pass %s: %s", customer_pass.id, exc)
        return None
    pass_json_bytes = json.dumps(pass_json, ensure_ascii=False).encode("utf-8")

    wallet_studio = _get_wallet_studio(card)
    v2_colors = wallet_studio.get("colors") or {}
    bg_color = v2_colors.get("background") or card.background_color or "#1A1A2E"

    def _fetch_image_from_storage(url: str) -> bytes | None:
        """Fetch image bytes directly from MinIO/S3 storage.

        Handles three URL formats:
        1. Relative /assets/... paths → reads directly from MinIO bucket
        2. Absolute MinIO/S3 URLs → reads directly from bucket
        3. External HTTPS URLs → falls back to HTTP fetch
        """
        if not url:
            return None

        s3_key = None
        if url.startswith("/assets/"):
            s3_key = url[len("/assets/") :]
        elif url.startswith("http"):
            # Extract S3 key from absolute MinIO URL if it matches our endpoint
            from urllib.parse import urlparse

            parsed = urlparse(url)
            minio_host = urlparse(settings.MINIO_ENDPOINT).hostname or ""
            if parsed.hostname == minio_host or (
                minio_host in ("localhost", "127.0.0.1") and parsed.port == urlparse(settings.MINIO_ENDPOINT).port
            ):
                # Strip bucket prefix from path: /assets/uploads/... → uploads/...
                path = parsed.path.lstrip("/")
                bucket = settings.MINIO_BUCKET_ASSETS
                if path.startswith(f"{bucket}/"):
                    s3_key = path[len(f"{bucket}/") :]
                else:
                    s3_key = path

        if s3_key:
            try:
                import boto3

                client = boto3.client(
                    "s3",
                    endpoint_url=settings.MINIO_ENDPOINT,
                    aws_access_key_id=settings.MINIO_ACCESS_KEY,
                    aws_secret_access_key=settings.MINIO_SECRET_KEY,
                    region_name=getattr(settings, "MINIO_REGION_NAME", "us-east-1"),
                )
                response = client.get_object(Bucket=settings.MINIO_BUCKET_ASSETS, Key=s3_key)
                content = response["Body"].read()
                if len(content) > settings.PASS_IMAGE_MAX_DOWNLOAD_BYTES:
                    logger.warning("Image too large (%d bytes): %s", len(content), url)
                    return None
                return content
            except Exception as exc:
                logger.warning("Failed to fetch image from storage (key=%s): %s", s3_key, exc)

        # Fallback: fetch external HTTPS URL via HTTP (non-relative, non-MinIO)
        if url.startswith("https://"):
            try:
                from common.url_validator import SSRFError, validate_external_url

                validate_external_url(url, allow_http=False)

                import httpx

                resp = httpx.get(
                    url,
                    timeout=settings.HTTP_TIMEOUT_APPLE_WALLET,
                    follow_redirects=False,
                )
                if resp.status_code == 200:
                    content = resp.content
                    if len(content) > settings.PASS_IMAGE_MAX_DOWNLOAD_BYTES:
                        logger.warning("Image too large (%d bytes): %s", len(content), url)
                        return None
                    return content
            except SSRFError as exc:
                logger.warning("SSRF blocked for image URL %s: %s", url, exc)
            except Exception as exc:
                logger.warning("Failed to fetch image from %s: %s", url, exc)

        return None

    v2_images = wallet_studio.get("images") or {}

    def _image_url(asset) -> str:
        if isinstance(asset, dict):
            return asset.get("url") or ""
        if isinstance(asset, str):
            return asset
        return ""

    logo_url = _image_url(v2_images.get("logo")) or card.logo_url
    logo_2x_url = _image_url(v2_images.get("logo2x"))
    logo_3x_url = _image_url(v2_images.get("logo3x"))
    icon_url = _image_url(v2_images.get("icon")) or card.icon_url
    icon_2x_url = _image_url(v2_images.get("icon2x"))
    strip_url = _image_url(v2_images.get("strip")) or card.strip_image_url
    strip_2x_url = _image_url(v2_images.get("strip2x"))
    strip_3x_url = _image_url(v2_images.get("strip3x"))
    thumbnail_url = _image_url(v2_images.get("thumbnail")) or card.strip_image_url
    thumbnail_2x_url = _image_url(v2_images.get("thumbnail2x"))

    if pass_style in ("storeCard", "coupon"):
        strip_url = strip_url or card.strip_image_url
        strip_2x_url = strip_2x_url or strip_3x_url
    elif pass_style == "generic":
        strip_url = thumbnail_url or card.strip_image_url
        strip_2x_url = thumbnail_2x_url
    else:
        strip_url = None
        strip_2x_url = None

    # Fetch all images directly from MinIO storage (synchronous — no HTTP round-trip)
    logo_bytes = _fetch_image_from_storage(logo_url)
    logo_2x_bytes = _fetch_image_from_storage(logo_2x_url or logo_3x_url)
    icon_bytes = _fetch_image_from_storage(icon_url)
    icon_2x_bytes = _fetch_image_from_storage(icon_2x_url)
    strip_bytes = _fetch_image_from_storage(strip_url or "")
    strip_2x_bytes = _fetch_image_from_storage(strip_2x_url or "")

    from PIL import Image

    # Default fallbacks
    icon_29 = _generate_placeholder_icon(card.name, bg_color, settings.PASS_APPLE_ICON_SMALL)
    icon_58 = _generate_placeholder_icon(card.name, bg_color, settings.PASS_APPLE_ICON_MEDIUM)
    # Apple logo spec: 160x50 pt (@1x) and 320x100 pt (@2x) — wide, not square
    logo_160x50 = _generate_placeholder_logo(
        card.name,
        bg_color,
        settings.PASS_APPLE_LOGO_WIDTH,
        settings.PASS_APPLE_LOGO_HEIGHT,
    )
    logo_320x100 = _generate_placeholder_logo(
        card.name,
        bg_color,
        settings.PASS_APPLE_LOGO_2X_WIDTH,
        settings.PASS_APPLE_LOGO_2X_HEIGHT,
    )

    if logo_bytes:
        try:
            img = Image.open(io.BytesIO(logo_bytes)).convert("RGBA")
            logo_160x50 = _resize_image(img, settings.PASS_APPLE_LOGO_WIDTH, settings.PASS_APPLE_LOGO_HEIGHT)
        except Exception as exc:
            logger.warning("Failed to process logo image: %s", exc)

    if logo_2x_bytes:
        try:
            img = Image.open(io.BytesIO(logo_2x_bytes)).convert("RGBA")
            logo_320x100 = _resize_image(
                img,
                settings.PASS_APPLE_LOGO_2X_WIDTH,
                settings.PASS_APPLE_LOGO_2X_HEIGHT,
            )
        except Exception as exc:
            logger.warning("Failed to process logo@2x image: %s", exc)
    elif logo_bytes:
        try:
            img = Image.open(io.BytesIO(logo_bytes)).convert("RGBA")
            logo_320x100 = _resize_image(
                img,
                settings.PASS_APPLE_LOGO_2X_WIDTH,
                settings.PASS_APPLE_LOGO_2X_HEIGHT,
            )
        except Exception as exc:
            logger.warning("Failed to process logo image: %s", exc)

    if icon_bytes:
        try:
            img = Image.open(io.BytesIO(icon_bytes)).convert("RGBA")
            icon_29 = _resize_image(img, settings.PASS_APPLE_ICON_SMALL, settings.PASS_APPLE_ICON_SMALL)
        except Exception as exc:
            logger.warning("Failed to process icon image: %s", exc)

    if icon_2x_bytes:
        try:
            img = Image.open(io.BytesIO(icon_2x_bytes)).convert("RGBA")
            icon_58 = _resize_image(img, settings.PASS_APPLE_ICON_MEDIUM, settings.PASS_APPLE_ICON_MEDIUM)
        except Exception as exc:
            logger.warning("Failed to process icon@2x image: %s", exc)
    elif icon_bytes:
        try:
            img = Image.open(io.BytesIO(icon_bytes)).convert("RGBA")
            icon_58 = _resize_image(img, settings.PASS_APPLE_ICON_MEDIUM, settings.PASS_APPLE_ICON_MEDIUM)
        except Exception as exc:
            logger.warning("Failed to process icon image: %s", exc)

    files = {
        "pass.json": pass_json_bytes,
        "icon.png": icon_29,
        "icon@2x.png": icon_58,
        "logo.png": logo_160x50,
        "logo@2x.png": logo_320x100,
    }

    if strip_bytes:
        try:
            img = Image.open(io.BytesIO(strip_bytes)).convert("RGBA")
            # Per Apple docs: strip.png is only valid for storeCard and coupon.
            # generic passes use thumbnail.png instead (90×90pt, up to 3:2 aspect).
            if pass_style in ("storeCard", "coupon"):
                # Apple Wallet strip recommended sizes: 375x123 (@1x) and 750x246 (@2x)
                files["strip.png"] = _resize_image(
                    img,
                    settings.PASS_APPLE_STRIP_WIDTH,
                    settings.PASS_APPLE_STRIP_HEIGHT,
                )
                if strip_2x_bytes:
                    img_2x = Image.open(io.BytesIO(strip_2x_bytes)).convert("RGBA")
                    files["strip@2x.png"] = _resize_image(
                        img_2x,
                        settings.PASS_APPLE_STRIP_2X_WIDTH,
                        settings.PASS_APPLE_STRIP_2X_HEIGHT,
                    )
                else:
                    files["strip@2x.png"] = _resize_image(img, 750, 246)
            elif pass_style == "generic":
                # Apple Wallet thumbnail: 90x90 (@1x), 180x180 (@2x)
                files["thumbnail.png"] = _resize_image(img, 90, 90)
                if strip_2x_bytes:
                    img_2x = Image.open(io.BytesIO(strip_2x_bytes)).convert("RGBA")
                    files["thumbnail@2x.png"] = _resize_image(img_2x, 180, 180)
                else:
                    files["thumbnail@2x.png"] = _resize_image(img, 180, 180)
        except Exception as exc:
            logger.warning("Failed to process strip/thumbnail image: %s", exc)

    manifest = {}
    for filename, data in files.items():
        manifest[filename] = hashlib.sha1(data).hexdigest()

    manifest_bytes = json.dumps(manifest).encode("utf-8")
    signature = _sign_manifest(manifest_bytes)
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
    """Check if Apple Wallet is properly configured.

    Uses Vault certificate presence as the single source of truth.
    The APPLE_WALLET_ENABLED Django setting is intentionally NOT checked
    here to avoid inconsistency with generate_pkpass() which only checks
    _check_config_ready(). Vault certs being present means Apple Wallet
    is ready to use.
    """
    return _check_config_ready()
