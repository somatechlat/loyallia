"""
Loyallia Wallet API (Public Endpoints)
Serves Apple Wallet .pkpass files and Google Wallet save URLs.
These endpoints are PUBLIC (no auth)  customers call them after enrollment.

Endpoints:
  GET /api/v1/wallet/apple/{pass_id}/  → Download .pkpass file
  GET /api/v1/wallet/google/{pass_id}/ → JSON with Google Wallet save URL
  GET /api/v1/wallet/status/{pass_id}/ → Check wallet availability
  GET /api/v1/cards/public/{card_id}/  → Public card info for enrollment page
"""

import logging
import uuid

from django.conf import settings
from django.http import HttpResponse
from ninja import Router, Schema
from ninja.errors import HttpError

from common.messages import get_message

logger = logging.getLogger(__name__)

router = Router(tags=["wallet"])


# SCHEMAS


class PublicCardOut(Schema):
    """Public card info for enrollment page  no sensitive data."""

    id: str
    name: str
    description: str
    card_type: str
    tenant_name: str
    background_color: str
    text_color: str
    logo_url: str
    strip_image_url: str
    metadata: dict


class WalletStatusOut(Schema):
    """Wallet configuration status."""

    pass_id: str
    apple_wallet_available: bool
    google_wallet_available: bool
    apple_url: str
    google_url: str


class GoogleWalletOut(Schema):
    """Google Wallet save URL response."""

    save_url: str


def _wallet_provider_mode(card) -> str:
    """Return the card wallet provider mode from metadata.

    Existing cards default to both providers to preserve current production behavior.
    New cards created by the wizard store either "apple" or "google".
    """
    metadata = card.metadata if isinstance(card.metadata, dict) else {}
    mode = metadata.get("wallet_provider") or metadata.get("wallet_platform") or "both"
    if mode not in {"apple", "google", "both"}:
        return "both"
    return mode


def _is_wallet_provider_enabled(card, provider: str) -> bool:
    """Return whether the requested wallet provider is enabled for this card."""
    mode = _wallet_provider_mode(card)
    return mode == "both" or mode == provider


def _validate_pass_is_accessible(customer_pass):
    """Verify the pass belongs to an active customer and an active tenant.

    SEC: Prevents random UUID probing from consuming CPU for .pkpass
    generation or Google JWT signing.
    """
    if not customer_pass.card.tenant.is_active:
        raise HttpError(404, get_message("PASS_NOT_FOUND_INACTIVE"))
    if not customer_pass.customer.is_active:
        raise HttpError(404, get_message("PASS_NOT_FOUND_INACTIVE"))
    if not customer_pass.is_active:
        raise HttpError(404, get_message("PASS_NOT_FOUND_INACTIVE"))


# PUBLIC CARD INFO


@router.get(
    "/cards/public/{card_id}/",
    response=PublicCardOut,
    summary="Información pública de tarjeta",
    auth=None,
)
def get_public_card(request, card_id: str):
    """
    Public endpoint  returns card info for the customer enrollment page.
    No authentication required.
    """
    from apps.cards.models import Card

    try:
        card = Card.objects.select_related("tenant").get(
            id=uuid.UUID(card_id),
            is_active=True,
            is_published=True,
        )
    except (Card.DoesNotExist, ValueError):
        raise HttpError(404, get_message("PROGRAM_NOT_FOUND"))

    return PublicCardOut(
        id=str(card.id),
        name=card.name,
        description=card.description,
        card_type=card.card_type,
        tenant_name=card.tenant.name,
        background_color=card.background_color or "#1A1A2E",
        text_color=card.text_color or "#FFFFFF",
        logo_url=card.logo_url or "",
        strip_image_url=card.strip_image_url or "",
        metadata=card.metadata if isinstance(card.metadata, dict) else {},
    )


# APPLE WALLET (PKPASS DOWNLOAD)


@router.get(
    "/wallet/apple/{pass_id}/",
    summary="Descargar pase de Apple Wallet (.pkpass)",
    auth=None,
)
def download_apple_pass(request, pass_id: str):
    """
    Generate and serve a .pkpass file for Apple Wallet.
    Content-Type: application/vnd.apple.pkpass
    The file auto-opens in iOS Wallet app when downloaded on an iPhone.
    """
    from apps.customers.models import CustomerPass
    from apps.customers.pass_engine.apple_pass import (
        generate_pkpass,
        is_apple_wallet_configured,
    )

    try:
        customer_pass = CustomerPass.objects.select_related(
            "customer", "card", "card__tenant"
        ).get(id=uuid.UUID(pass_id))
    except (CustomerPass.DoesNotExist, ValueError):
        raise HttpError(404, get_message("PASS_NOT_FOUND"))

    _validate_pass_is_accessible(customer_pass)

    if not is_apple_wallet_configured():
        raise HttpError(503, get_message("PASS_APPLE_NOT_CONFIGURED"))

    # Cache the heavily CPU/Network bound .pkpass generation
    from django.core.cache import cache

    cache_key = f"pkpass:{pass_id}:{customer_pass.last_updated.timestamp()}"
    pkpass_bytes = cache.get(cache_key)

    if not pkpass_bytes:
        pkpass_bytes = generate_pkpass(customer_pass)
        if pkpass_bytes is None:
            raise HttpError(500, get_message("PASS_APPLE_GEN_ERROR"))
        # Cache for 24 hours (it will auto-invalidate if last_updated changes)
        cache.set(cache_key, pkpass_bytes, timeout=86400)

    response = HttpResponse(
        pkpass_bytes,
        content_type="application/vnd.apple.pkpass",
    )
    response["Content-Disposition"] = (
        f'attachment; filename="{customer_pass.card.name}.pkpass"'
    )
    return response


# GOOGLE WALLET (SAVE URL)


@router.get(
    "/wallet/google/{pass_id}/",
    response={200: GoogleWalletOut, 302: None},
    summary="URL para agregar a Google Wallet",
    auth=None,
)
def get_google_wallet_url(request, pass_id: str, redirect: bool = False):
    """
    Generate a Google Wallet "Save to Google Pay" URL.
    - If redirect=False: Returns JSON with save_url.
    - If redirect=True: Issues a 302 redirect to Google.
    """
    from django.shortcuts import redirect as django_redirect

    from apps.customers.models import CustomerPass
    from apps.customers.pass_engine.google_pass import (
        generate_google_wallet_url,
        is_google_wallet_configured,
    )

    try:
        customer_pass = CustomerPass.objects.select_related(
            "customer", "card", "card__tenant"
        ).get(id=uuid.UUID(pass_id))
    except (CustomerPass.DoesNotExist, ValueError):
        raise HttpError(404, get_message("PASS_NOT_FOUND"))

    _validate_pass_is_accessible(customer_pass)

    if not is_google_wallet_configured():
        raise HttpError(503, get_message("PASS_GOOGLE_NOT_CONFIGURED"))

    base_url = getattr(settings, "PUBLIC_BASE_URL", "") or request.build_absolute_uri(
        "/"
    ).rstrip("/")
    save_url = generate_google_wallet_url(customer_pass, base_url=base_url)
    if save_url is None:
        raise HttpError(500, get_message("PASS_GOOGLE_GEN_ERROR"))

    if redirect:
        return django_redirect(save_url)

    return GoogleWalletOut(save_url=save_url)


# WALLET STATUS (CHECK AVAILABILITY)


@router.get(
    "/wallet/status/{pass_id}/",
    response=WalletStatusOut,
    summary="Estado de disponibilidad de wallet",
    auth=None,
)
def get_wallet_status(request, pass_id: str):
    """
    Check which wallet providers are available for a given pass.
    Used by the enrollment success page to decide which buttons to show.
    """
    from apps.customers.models import CustomerPass
    from apps.customers.pass_engine.apple_pass import is_apple_wallet_configured
    from apps.customers.pass_engine.google_pass import is_google_wallet_configured

    try:
        customer_pass = CustomerPass.objects.select_related(
            "customer", "card", "card__tenant"
        ).get(id=uuid.UUID(pass_id))
    except (CustomerPass.DoesNotExist, ValueError):
        raise HttpError(404, get_message("PASS_NOT_FOUND"))

    _validate_pass_is_accessible(customer_pass)

    # Public enrollment: always show both wallets if system is configured.
    # Device-specific button filtering happens on the frontend.
    apple_available = is_apple_wallet_configured()
    google_available = is_google_wallet_configured()

    getattr(request, "build_absolute_uri", lambda p: p)

    return WalletStatusOut(
        pass_id=str(customer_pass.id),
        apple_wallet_available=apple_available,
        google_wallet_available=google_available,
        apple_url=f"/api/v1/wallet/apple/{pass_id}/" if apple_available else "",
        google_url=f"/api/v1/wallet/google/{pass_id}/" if google_available else "",
    )


class PublicPassOut(Schema):
    """Public pass info for existing members to view/add to wallet."""

    pass_id: str
    program_name: str
    tenant_name: str
    card_type: str
    background_color: str
    text_color: str
    logo_url: str
    strip_image_url: str
    qr_code: str
    member_name: str
    wallet_urls: dict


@router.get(
    "/pass/public/{pass_id}/",
    response=PublicPassOut,
    summary="Información pública del pase",
    auth=None,
)
def get_public_pass(request, pass_id: str):
    """
    Public endpoint for existing members to retrieve their pass info.
    Used to re-display QR code and add to wallet after enrollment.
    No authentication required  pass_id is a UUID.
    """
    from apps.customers.models import CustomerPass
    from apps.customers.pass_engine.apple_pass import is_apple_wallet_configured
    from apps.customers.pass_engine.google_pass import is_google_wallet_configured

    try:
        customer_pass = CustomerPass.objects.select_related(
            "customer", "card", "card__tenant"
        ).get(id=uuid.UUID(pass_id))
    except (CustomerPass.DoesNotExist, ValueError):
        raise HttpError(404, get_message("PASS_NOT_FOUND"))

    _validate_pass_is_accessible(customer_pass)

    card = customer_pass.card
    customer = customer_pass.customer

    # Public enrollment: always show both wallets if system is configured.
    # Device-specific button filtering happens on the frontend.
    apple_available = is_apple_wallet_configured()
    google_available = is_google_wallet_configured()

    return PublicPassOut(
        pass_id=str(customer_pass.id),
        program_name=card.name,
        tenant_name=card.tenant.name,
        card_type=card.card_type,
        background_color=card.background_color or "#1A1A2E",
        text_color=card.text_color or "#FFFFFF",
        logo_url=card.logo_url or "",
        strip_image_url=card.strip_image_url or "",
        qr_code=customer_pass.qr_code,
        member_name=f"{customer.first_name} {customer.last_name}".strip(),
        wallet_urls={
            "apple": f"/api/v1/wallet/apple/{pass_id}/" if apple_available else "",
            "google": f"/api/v1/wallet/google/{pass_id}/" if google_available else "",
            "status": f"/api/v1/wallet/status/{pass_id}/",
        },
    )
