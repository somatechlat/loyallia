"""
Loyallia — Wallet API (Public Endpoints)
Serves Apple Wallet .pkpass files and Google Wallet save URLs.
These endpoints are PUBLIC (no auth) — customers call them after enrollment.

Endpoints:
  GET /api/v1/wallet/apple/{pass_id}/  → Download .pkpass file
  GET /api/v1/wallet/google/{pass_id}/ → JSON with Google Wallet save URL
  GET /api/v1/wallet/status/{pass_id}/ → Check wallet availability
  GET /api/v1/cards/public/{card_id}/  → Public card info for enrollment page
"""

import logging
import uuid

from django.http import HttpResponse
from ninja import Router, Schema
from ninja.errors import HttpError

from common.messages import get_message

logger = logging.getLogger(__name__)

router = Router(tags=["wallet"])


# =============================================================================
# SCHEMAS
# =============================================================================


class PublicCardOut(Schema):
    """Public card info for enrollment page — no sensitive data."""

    id: str
    name: str
    description: str
    card_type: str
    tenant_name: str
    background_color: str
    text_color: str
    logo_url: str


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


# =============================================================================
# PUBLIC CARD INFO
# =============================================================================


@router.get(
    "/cards/public/{card_id}/",
    response=PublicCardOut,
    summary="Información pública de tarjeta",
    auth=None,
)
def get_public_card(request, card_id: str):
    """
    Public endpoint — returns card info for the customer enrollment page.
    No authentication required.
    """
    from apps.cards.models import Card

    try:
        card = Card.objects.select_related("tenant").get(
            id=uuid.UUID(card_id),
            is_active=True,
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
    )


# =============================================================================
# APPLE WALLET (PKPASS DOWNLOAD)
# =============================================================================


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

    if not is_apple_wallet_configured():
        raise HttpError(
            503,
            "Apple Wallet no está configurado. Se requieren los certificados de Apple Developer.",
        )

    try:
        customer_pass = CustomerPass.objects.select_related(
            "customer", "card", "card__tenant"
        ).get(id=uuid.UUID(pass_id))
    except (CustomerPass.DoesNotExist, ValueError):
        raise HttpError(404, get_message("PASS_NOT_FOUND"))

    pkpass_bytes = generate_pkpass(customer_pass)
    if pkpass_bytes is None:
        raise HttpError(500, get_message("PASS_APPLE_GEN_ERROR"))

    response = HttpResponse(
        pkpass_bytes,
        content_type="application/vnd.apple.pkpass",
    )
    response["Content-Disposition"] = (
        f'attachment; filename="{customer_pass.card.name}.pkpass"'
    )
    return response


# =============================================================================
# GOOGLE WALLET (SAVE URL)
# =============================================================================


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

    if not is_google_wallet_configured():
        raise HttpError(
            503,
            "Google Wallet no está configurado. Se requiere una cuenta de servicio de Google Cloud.",
        )

    try:
        customer_pass = CustomerPass.objects.select_related(
            "customer", "card", "card__tenant"
        ).get(id=uuid.UUID(pass_id))
    except (CustomerPass.DoesNotExist, ValueError):
        raise HttpError(404, get_message("PASS_NOT_FOUND"))

    save_url = generate_google_wallet_url(customer_pass)
    if save_url is None:
        raise HttpError(500, get_message("PASS_GOOGLE_GEN_ERROR"))

    if redirect:
        return django_redirect(save_url)

    return GoogleWalletOut(save_url=save_url)


# =============================================================================
# WALLET STATUS (CHECK AVAILABILITY)
# =============================================================================


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
        customer_pass = CustomerPass.objects.get(id=uuid.UUID(pass_id))
    except (CustomerPass.DoesNotExist, ValueError):
        raise HttpError(404, get_message("PASS_NOT_FOUND"))

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
