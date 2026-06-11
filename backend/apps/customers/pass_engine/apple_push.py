"""
Loyallia Apple Wallet Pass Update Push (APNs)

Sends empty APNs pushes to devices registered for pass updates.
This is DIFFERENT from apps.notifications.push.apns_client which sends
alert-type pushes for the Loyallia iOS app.

Apple Wallet pass update pushes:
  - Payload MUST be an empty JSON dictionary: {}
  - apns-push-type MUST be "background" (not "alert")
  - apns-topic MUST be the configured Pass Type Identifier from Vault/settings
  - Authentication uses the Pass Type Certificate (PEM from Vault), NOT the APNs Auth Key (.p8)
  - Upon receiving this push, the device calls our web service to download the updated .pkpass

Reference: https://developer.apple.com/documentation/walletpasses/adding-a-web-service-to-update-passes
"""

import contextlib
import logging

import httpx
from django.conf import settings

logger = logging.getLogger(__name__)

APNS_PRODUCTION_HOST = "https://api.push.apple.com"
APNS_SANDBOX_HOST = "https://api.sandbox.push.apple.com"


def _get_pass_apns_auth() -> tuple[str | None, str | None]:
    """
    Load the Pass Type Certificate and private key from Vault for APNs auth.

    Apple Wallet pass update pushes use certificate-based authentication
    (NOT the token-based JWT used for app pushes). The signing certificate
    used for pass creation doubles as the APNs client certificate.

    Returns:
        (cert_pem, key_pem) or (None, None) if not configured.
    """
    try:
        from common.vault import get_secret

        cert_pem = get_secret("apple_cert_pem", strict=True)
        key_pem = get_secret("apple_cert_key_pem", strict=True)

        if not cert_pem or not key_pem:
            logger.warning("Apple pass push: cert_pem or key_pem not found in Vault")
            return None, None

        return cert_pem, key_pem

    except Exception as exc:
        logger.error("Apple pass push: Failed to load certificates from Vault: %s", exc)
        return None, None


_WWDR_G4_URL = "https://www.apple.com/certificateauthority/AppleWWDRCAG4.cer"
_WWDR_G4_PEM = None  # Cached


def _get_wwdr_g4_cert() -> str | None:
    """Return the Apple WWDR G4 intermediate certificate in PEM format.

    APNs requires the full client certificate chain. The Pass Type ID
    certificate from Vault is only the leaf; we must append the issuer.
    """
    global _WWDR_G4_PEM
    if _WWDR_G4_PEM is not None:
        return _WWDR_G4_PEM

    import subprocess
    import urllib.request

    try:
        with urllib.request.urlopen(
            _WWDR_G4_URL, timeout=settings.HTTP_TIMEOUT_WWDR_DOWNLOAD
        ) as resp:
            der_data = resp.read()

        # Convert DER to PEM via openssl
        result = subprocess.run(
            ["openssl", "x509", "-inform", "der", "-outform", "pem"],
            input=der_data,
            capture_output=True,
        )
        if result.returncode == 0:
            _WWDR_G4_PEM = result.stdout.decode("utf-8")
            logger.debug("Loaded Apple WWDR G4 intermediate certificate")
            return _WWDR_G4_PEM
        else:
            logger.warning(
                "Failed to convert WWDR G4 cert: %s",
                result.stderr.decode("utf-8")[:200],
            )
    except Exception as exc:
        logger.warning("Could not fetch Apple WWDR G4 certificate: %s", exc)

    _WWDR_G4_PEM = ""
    return None


def send_pass_update_push(push_token: str, sandbox: bool | None = None) -> bool:
    """
    Send an empty APNs push notification to trigger a pass update on the device.

    Per Apple docs, the payload MUST be an empty JSON dict {} and the
    push type MUST be "background". The device will then call our
    web service endpoints to check for and download updated passes.

    Args:
        push_token: The APNs push token stored during device registration.
        sandbox: Force sandbox mode. None = auto-detect from Django DEBUG.

    Returns:
        True if APNs accepted the push (HTTP 200), False otherwise.
    """
    cert_pem, key_pem = _get_pass_apns_auth()
    if not cert_pem or not key_pem:
        logger.warning(
            "Apple pass push: Not configured  skipping push to %s", push_token[-8:]
        )
        return False

    topic = getattr(settings, "APPLE_PASS_TYPE_IDENTIFIER", "")
    if not topic:
        logger.warning("Apple pass push: Pass type identifier is not configured")
        return False

    # Auto-detect sandbox from Django DEBUG setting
    use_sandbox = (
        sandbox
        if sandbox is not None
        else getattr(settings, "APPLE_PASS_PUSH_SANDBOX", False)
    )
    host = APNS_SANDBOX_HOST if use_sandbox else APNS_PRODUCTION_HOST

    url = f"{host}/3/device/{push_token}"

    headers = {
        "apns-topic": topic,
        "apns-push-type": "background",
        "apns-priority": "5",  # Background pushes require priority 5
    }

    # Write cert and key to temp files for httpx SSL context
    import ssl
    import tempfile

    cert_path = ""
    key_path = ""

    try:
        # APNs requires the full certificate chain including the intermediate.
        # The leaf cert from Vault is issued by Apple WWDR G4.
        wwdr_g4_pem = _get_wwdr_g4_cert()
        full_chain = cert_pem + "\n" + wwdr_g4_pem if wwdr_g4_pem else cert_pem

        # Create temporary PEM files for the SSL context
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".pem", delete=False
        ) as cert_file:
            cert_file.write(full_chain)
            cert_path = cert_file.name

        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".pem", delete=False
        ) as key_file:
            key_file.write(key_pem)
            key_path = key_file.name

        # Build SSL context with client certificate
        ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
        ssl_context.load_cert_chain(certfile=cert_path, keyfile=key_path)
        ssl_context.load_default_certs()

        # httpx HTTP/2 required for APNs
        with httpx.Client(
            http2=True,
            verify=ssl_context,
            timeout=settings.HTTP_TIMEOUT_APPLE_PUSH,
        ) as client:
            response = client.post(
                url,
                json={},  # MUST be empty dict per Apple spec
                headers=headers,
            )

        if response.status_code == 200:
            logger.debug("Apple pass push sent successfully to %s", push_token[-8:])
            return True

        # Parse error reason
        try:
            reason = response.json().get("reason", "Unknown")
        except (ValueError, TypeError):
            reason = response.text[:200]

        if reason in ("BadDeviceToken", "Unregistered"):
            logger.warning(
                "Apple pass push: Token invalid/unregistered (%s): %s",
                push_token[-8:],
                reason,
            )
            #
            try:
                from apps.customers.models import ApplePassRegistration

                deleted, _ = ApplePassRegistration.objects.filter(
                    push_token=push_token
                ).delete()
                if deleted:
                    logger.info(
                        "Apple pass push: Deleted stale registration for token %s",
                        push_token[-8:],
                    )
            except Exception as cleanup_exc:
                logger.warning(
                    "Apple pass push: Failed to delete stale registration: %s",
                    cleanup_exc,
                )
        else:
            logger.error(
                "Apple pass push HTTP %s for %s: %s",
                response.status_code,
                push_token[-8:],
                reason,
            )
        return False

    except httpx.TimeoutException:
        logger.error("Apple pass push: Timed out for %s", push_token[-8:])
        return False
    except Exception as exc:
        logger.error("Apple pass push error for %s: %s", push_token[-8:], exc)
        return False
    finally:
        # Clean up temp files
        import os

        for path in (cert_path, key_path):
            with contextlib.suppress(OSError):
                os.unlink(path)


def notify_pass_updated(customer_pass) -> int:
    """
    Send empty APNs pushes to ALL devices registered for a specific pass.
    Call this whenever pass data changes (stamp added, balance updated, etc.).

    Args:
        customer_pass: CustomerPass instance whose data has changed.

    Returns:
        Number of devices successfully notified.
    """
    from apps.customers.models import ApplePassRegistration

    registrations = ApplePassRegistration.objects.filter(
        customer_pass=customer_pass,
    )

    if not registrations.exists():
        logger.debug(
            "Apple pass push: No registered devices for pass %s", customer_pass.id
        )
        return 0

    notified = 0
    for reg in registrations:
        success = send_pass_update_push(reg.push_token)
        if success:
            notified += 1
        else:
            # Track failures deactivate after repeated failures
            # (Similar to apns_client.py stale token handling)
            logger.debug(
                "Apple pass push: Failed for device %s", reg.device_library_id[-8:]
            )

    logger.info(
        "Apple pass push: Notified %d/%d devices for pass %s",
        notified,
        registrations.count(),
        customer_pass.id,
    )
    return notified


def notify_card_updated(card) -> int:
    """
    Send empty APNs pushes to ALL devices holding passes for a specific card.
    Call this when the card configuration changes (colors, images, etc.).

    Args:
        card: Card instance that has been updated.

    Returns:
        Total number of devices successfully notified.
    """
    from apps.customers.models import ApplePassRegistration, CustomerPass

    pass_ids = CustomerPass.objects.filter(card=card, is_active=True).values_list(
        "id", flat=True
    )

    registrations = ApplePassRegistration.objects.filter(
        customer_pass_id__in=pass_ids,
    )

    if not registrations.exists():
        logger.debug("Apple pass push: No registered devices for card %s", card.id)
        return 0

    notified = 0
    for reg in registrations:
        if send_pass_update_push(reg.push_token):
            notified += 1

    logger.info(
        "Apple pass push: Notified %d/%d devices for card %s (%s)",
        notified,
        registrations.count(),
        card.name,
        card.id,
    )
    return notified
