"""
Loyallia — QR Code Generator
Generates HMAC-SHA256-signed QR codes for customer wallet passes.

QR token format (URL-safe):  {serial}:{timestamp}:{hex_hmac}
- serial:     CustomerPass.qr_code  (already a unique 12-char code)
- timestamp:  UNIX seconds (UTC) at generation time
- hex_hmac:   HMAC-SHA256({serial}:{timestamp}, PASS_HMAC_SECRET)[:16]  (first 8 bytes, hex)

The scanner validates: recomputes HMAC, checks timestamp age (≤ 24h by default).
The QR image itself is uploaded to MinIO under assets/qr/{pass_id}.png.
"""

import hashlib
import hmac
import io
import logging
import time

logger = logging.getLogger(__name__)


def generate_qr_token(serial: str, secret: str, timestamp: int | None = None) -> str:
    """
    Generate a signed QR token string.

    Args:
        serial:    The unique pass serial code (CustomerPass.qr_code)
        secret:    PASS_HMAC_SECRET from settings
        timestamp: UNIX timestamp (UTC). Defaults to now.

    Returns:
        Signed token: "{serial}:{timestamp}:{hmac_hex}"
    """
    if timestamp is None:
        timestamp = int(time.time())

    payload = f"{serial}:{timestamp}"
    sig = hmac.new(
        secret.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()[
        :16
    ]  # 8 bytes → 16 hex chars — compact but secure enough for pass validation

    return f"{payload}:{sig}"


def verify_qr_token(
    token: str, secret: str, max_age_seconds: int = 86400
) -> tuple[bool, str | None]:
    """
    Verify a QR token.

    Args:
        token:           Token string from the scanned QR code
        secret:          PASS_HMAC_SECRET from settings
        max_age_seconds: Maximum age of the token in seconds (default 24h)

    Returns:
        (is_valid, serial) — serial is the CustomerPass.qr_code if valid, else None
    """
    try:
        parts = token.split(":")
        if len(parts) != 3:
            return False, None

        serial, timestamp_str, provided_sig = parts
        timestamp = int(timestamp_str)

        # Age check
        age = int(time.time()) - timestamp
        if age > max_age_seconds or age < -300:  # Allow 5-min clock skew
            return False, None

        # HMAC check (constant-time comparison)
        payload = f"{serial}:{timestamp}"
        expected_sig = hmac.new(
            secret.encode("utf-8"),
            payload.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()[:16]

        if not hmac.compare_digest(expected_sig, provided_sig):
            return False, None

        return True, serial

    except (ValueError, AttributeError, Exception) as exc:
        logger.warning("QR token verification failed: %s", exc)
        return False, None


def generate_qr_image(token: str) -> bytes:
    """
    Generate a QR code PNG image for the given token.

    Returns:
        PNG image bytes
    """
    import qrcode
    from qrcode.image.pure import PyPNGImage

    qr = qrcode.QRCode(
        version=None,  # Auto-size
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=4,
    )
    qr.add_data(token)
    qr.make(fit=True)

    img = qr.make_image(image_factory=PyPNGImage)
    buf = io.BytesIO()
    img.save(buf)
    buf.seek(0)
    return buf.read()


def generate_and_store_qr(pass_obj) -> str:
    """
    Generate a signed QR token, render it as a PNG, and upload to MinIO.
    Updates pass_obj.qr_code in the database.

    Args:
        pass_obj: CustomerPass model instance

    Returns:
        Public URL of the stored QR image
    """
    from django.conf import settings

    secret = getattr(settings, "PASS_HMAC_SECRET", "change-me-hmac-secret")
    token = generate_qr_token(serial=pass_obj.qr_code, secret=secret)

    # Render PNG
    try:
        png_bytes = generate_qr_image(token)
    except Exception as exc:
        logger.error("QR image generation failed for pass %s: %s", pass_obj.id, exc)
        raise

    # Upload to MinIO / S3-compatible storage
    object_key = f"qr/{pass_obj.id}.png"
    url = _upload_to_storage(object_key, png_bytes, content_type="image/png")

    return url


def _upload_to_storage(object_key: str, data: bytes, content_type: str) -> str:
    """
    Upload raw bytes to the configured S3-compatible storage (MinIO).

    Returns:
        Public URL for the uploaded object
    """
    import boto3
    from botocore.exceptions import ClientError
    from django.conf import settings

    endpoint = getattr(settings, "MINIO_ENDPOINT", "http://localhost:9000")
    access_key = getattr(settings, "MINIO_ACCESS_KEY", "")
    secret_key = getattr(settings, "MINIO_SECRET_KEY", "")
    bucket = getattr(settings, "MINIO_BUCKET_ASSETS", "assets")

    client = boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=access_key,
        aws_secret_access_key=secret_key,
        region_name="us-east-1",  # MinIO ignores region but boto3 requires one
    )

    try:
        client.put_object(
            Bucket=bucket,
            Key=object_key,
            Body=data,
            ContentType=content_type,
            ACL="public-read",
        )
    except ClientError as exc:
        logger.error("MinIO upload failed for key '%s': %s", object_key, exc)
        raise

    return f"{endpoint}/{bucket}/{object_key}"
