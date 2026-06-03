"""
Loyallia Apple Wallet Pass Web Service

Implements the 4 mandatory Apple PassKit web service endpoints required for
pass registration, unregistration, update checking, and pass re-download.

Apple calls these endpoints automatically when a user adds/removes a pass
from their Wallet, or when the device checks for updates after receiving
an empty APNs push notification.

Reference: https://developer.apple.com/documentation/walletpasses/adding-a-web-service-to-update-passes

Endpoints:
    POST   /v1/devices/{deviceId}/registrations/{passTypeId}/{serial}   Register device
    DELETE /v1/devices/{deviceId}/registrations/{passTypeId}/{serial}   Unregister device
    GET    /v1/devices/{deviceId}/registrations/{passTypeId}            List updated passes
    GET    /v1/passes/{passTypeId}/{serial}                            Download updated .pkpass

Authentication: Apple sends `Authorization: ApplePass <authenticationToken>`
where authenticationToken is the value we set in pass.json.
"""

import hmac
import logging
from datetime import UTC

from django.conf import settings
from django.http import HttpRequest, HttpResponse, JsonResponse
from ninja import Router

logger = logging.getLogger(__name__)

router = Router(tags=["Apple Wallet Web Service"])


# ---------------------------------------------------------------------------
# AUTH HELPERS
# ---------------------------------------------------------------------------


def _validate_apple_auth(request: HttpRequest, serial_number: str) -> bool:
    """
    Validate the ApplePass authorization header.

    Apple sends: Authorization: ApplePass <authenticationToken>
    We set authenticationToken = pass UUID without dashes in pass.json.
    """
    auth_header = request.META.get("HTTP_AUTHORIZATION", "")
    if not auth_header.startswith("ApplePass "):
        logger.warning("Apple Web Service: Missing or invalid Authorization header")
        return False

    provided_token = auth_header[len("ApplePass ") :].strip()
    expected_token = serial_number.replace("-", "")
    return hmac.compare_digest(provided_token, expected_token)


def _require_device_registered(device_library_id: str, serial_number: str) -> bool:
    """
    Verify the device is registered for the specific pass.
    """
    from apps.customers.models import ApplePassRegistration

    return ApplePassRegistration.objects.filter(
        device_library_id=device_library_id,
        customer_pass_id=serial_number,
    ).exists()


def _get_customer_pass(pass_type_id: str, serial_number: str):
    """
    Look up a CustomerPass by serial number (UUID) and validate pass type ID.
    Returns the CustomerPass or None.
    """
    from apps.customers.models import CustomerPass

    configured_pass_type = getattr(settings, "APPLE_PASS_TYPE_IDENTIFIER", "")
    if not configured_pass_type:
        logger.warning("Apple Web Service: Pass type identifier is not configured")
        return None
    if pass_type_id != configured_pass_type:
        logger.warning(
            "Apple Web Service: Pass type mismatch: expected %s, got %s",
            configured_pass_type,
            pass_type_id,
        )
        return None

    try:
        return CustomerPass.objects.select_related(
            "card", "card__tenant", "customer"
        ).get(id=serial_number)
    except CustomerPass.DoesNotExist:
        logger.warning("Apple Web Service: Pass not found: serial=%s", serial_number)
        return None
    except Exception as exc:
        logger.error(
            "Apple Web Service: Error looking up pass %s: %s", serial_number, exc
        )
        return None


# ---------------------------------------------------------------------------
# ENDPOINT 1: Register Device
# ---------------------------------------------------------------------------


@router.post(
    "/v1/devices/{device_library_id}/registrations/{pass_type_id}/{serial_number}",
    response={200: None, 201: None, 400: None, 401: None, 404: None, 410: None},
    summary="Register a device to receive push notifications for a pass",
)
def register_device(
    request: HttpRequest,
    device_library_id: str,
    pass_type_id: str,
    serial_number: str,
):
    """
    Called by Apple Wallet when a user adds a pass to their device.
    Stores the pushToken for sending update notifications later.

    Body: {"pushToken": "<hex string>"}
    Returns 201 (new registration) or 200 (already registered).
    """
    if not _validate_apple_auth(request, serial_number):
        return HttpResponse(status=401)

    customer_pass = _get_customer_pass(pass_type_id, serial_number)
    if customer_pass is None:
        return HttpResponse(status=404)

    if not customer_pass.is_active:
        logger.warning(
            "Apple Web Service: Cannot register inactive pass  serial=%s",
            serial_number,
        )
        return HttpResponse(status=410)

    import json

    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        logger.warning("Apple Web Service: Invalid JSON body in register request")
        return HttpResponse(status=400)

    push_token = body.get("pushToken", "")
    if not push_token:
        logger.warning("Apple Web Service: Missing pushToken in register request")
        return HttpResponse(status=400)

    from apps.customers.models import ApplePassRegistration

    registration, created = ApplePassRegistration.objects.update_or_create(
        device_library_id=device_library_id,
        customer_pass=customer_pass,
        defaults={"push_token": push_token},
    )

    if created:
        logger.info(
            "Apple Web Service: Device registered  device=%s, pass=%s",
            device_library_id[-8:],
            serial_number,
        )
        return HttpResponse(status=201)
    else:
        logger.debug(
            "Apple Web Service: Device re-registered (token updated)  device=%s",
            device_library_id[-8:],
        )
        return HttpResponse(status=200)


# ---------------------------------------------------------------------------
# ENDPOINT 2: Unregister Device
# ---------------------------------------------------------------------------


@router.delete(
    "/v1/devices/{device_library_id}/registrations/{pass_type_id}/{serial_number}",
    response={200: None, 401: None},
    summary="Unregister a device from receiving push notifications for a pass",
)
def unregister_device(
    request: HttpRequest,
    device_library_id: str,
    pass_type_id: str,
    serial_number: str,
):
    """
    Called by Apple Wallet when a user removes a pass from their device.
    Removes the device registration so we stop sending pushes.
    """
    if not _validate_apple_auth(request, serial_number):
        return HttpResponse(status=401)

    # Verify device is registered for this pass before allowing unregistration
    if not _require_device_registered(device_library_id, serial_number):
        logger.warning(
            "Apple Web Service: Device not registered for pass  device=%s, pass=%s",
            device_library_id[-8:],
            serial_number,
        )
        return HttpResponse(status=401)

    from apps.customers.models import ApplePassRegistration

    deleted_count, _ = ApplePassRegistration.objects.filter(
        device_library_id=device_library_id,
        customer_pass_id=serial_number,
    ).delete()

    if deleted_count > 0:
        logger.info(
            "Apple Web Service: Device unregistered  device=%s, pass=%s",
            device_library_id[-8:],
            serial_number,
        )
    else:
        logger.debug(
            "Apple Web Service: Unregister called but no registration found  device=%s",
            device_library_id[-8:],
        )

    return HttpResponse(status=200)


# ---------------------------------------------------------------------------
# ENDPOINT 3: List Updated Passes for Device
# ---------------------------------------------------------------------------


@router.get(
    "/v1/devices/{device_library_id}/registrations/{pass_type_id}",
    response={200: dict, 204: None, 401: None, 404: None},
    summary="List serial numbers of passes updated since a given tag",
)
def list_updated_passes(
    request: HttpRequest,
    device_library_id: str,
    pass_type_id: str,
):
    """
    Called by Apple Wallet to check which passes have been updated.
    Query param: ?passesUpdatedSince=<tag> (ISO timestamp)

    Returns: {"serialNumbers": ["uuid1", "uuid2"], "lastUpdated": "<tag>"}
    """
    from apps.customers.models import ApplePassRegistration

    # Verify the device is registered for at least one pass
    if not ApplePassRegistration.objects.filter(
        device_library_id=device_library_id
    ).exists():
        logger.warning(
            "Apple Web Service: Device not registered  device=%s",
            device_library_id[-8:],
        )
        return HttpResponse(status=404)

    configured_pass_type = getattr(settings, "APPLE_PASS_TYPE_IDENTIFIER", "")
    if not configured_pass_type:
        return HttpResponse(status=404)
    if pass_type_id != configured_pass_type:
        return HttpResponse(status=404)

    registrations = ApplePassRegistration.objects.filter(
        device_library_id=device_library_id,
    ).select_related("customer_pass")

    if not registrations.exists():
        return HttpResponse(status=204)

    # Parse the "passesUpdatedSince" query parameter
    updated_since_tag = request.GET.get("passesUpdatedSince", "")

    serial_numbers = []
    latest_update = None

    for reg in registrations:
        cp = reg.customer_pass
        if not cp.is_active:
            continue

        last_updated = cp.last_updated

        # Filter by update timestamp if tag provided
        if updated_since_tag:
            try:
                from django.utils.dateparse import parse_datetime

                since_dt = parse_datetime(updated_since_tag)
                if since_dt and last_updated and last_updated <= since_dt:
                    continue
            except (ValueError, TypeError):
                pass  # If parsing fails, include all passes

        serial_numbers.append(str(cp.id))

        if latest_update is None or (last_updated and last_updated > latest_update):
            latest_update = last_updated

    if not serial_numbers:
        return HttpResponse(status=204)

    # Format the lastUpdated tag as ISO timestamp
    last_updated_tag = ""
    if latest_update:
        last_updated_tag = latest_update.astimezone(UTC).isoformat()

    return JsonResponse(
        {
            "serialNumbers": serial_numbers,
            "lastUpdated": last_updated_tag,
        }
    )


# ---------------------------------------------------------------------------
# ENDPOINT 4: Download Updated Pass
# ---------------------------------------------------------------------------


@router.get(
    "/v1/passes/{pass_type_id}/{serial_number}",
    response={200: bytes, 401: None, 404: None, 410: None, 500: None},
    summary="Download the latest version of a pass",
)
def get_updated_pass(
    request: HttpRequest,
    pass_type_id: str,
    serial_number: str,
):
    """
    Called by Apple Wallet to download the latest .pkpass after receiving a push.
    Returns the regenerated .pkpass file with Content-Type: application/vnd.apple.pkpass.
    """
    if not _validate_apple_auth(request, serial_number):
        return HttpResponse(status=401)

    customer_pass = _get_customer_pass(pass_type_id, serial_number)
    if customer_pass is None:
        return HttpResponse(status=404)

    if not customer_pass.is_active:
        logger.info(
            "Apple Web Service: Pass is inactive (410 Gone)  serial=%s",
            serial_number,
        )
        return HttpResponse(status=410)

    from apps.customers.pass_engine.apple_pass import generate_pkpass

    pkpass_bytes = generate_pkpass(customer_pass)
    if pkpass_bytes is None:
        logger.error(
            "Apple Web Service: Failed to generate .pkpass for serial=%s",
            serial_number,
        )
        return HttpResponse(status=500)

    response = HttpResponse(
        pkpass_bytes,
        content_type="application/vnd.apple.pkpass",
        status=200,
    )
    response["Content-Disposition"] = (
        f'attachment; filename="pass-{serial_number}.pkpass"'
    )

    # Set Last-Modified header so Apple can use If-Modified-Since
    if customer_pass.last_updated:
        from django.utils.http import http_date

        response["Last-Modified"] = http_date(customer_pass.last_updated.timestamp())

    logger.info(
        "Apple Web Service: Pass downloaded  serial=%s, size=%d bytes",
        serial_number,
        len(pkpass_bytes),
    )
    return response
