"""
Real WalletStudio V2 End-to-End Pass Generation Tests

This module exercises the *actual* production code paths using real Vault
secrets (Apple WWDR/pass certificates and Google service account). It creates
one card of every supported card type with V2 wallet_studio metadata, then:

1. Generates a real Apple Wallet .pkpass file using real PKCS#7 signing
2. Generates a real Google Wallet save URL using real RS256 JWT signing

Tests are skipped automatically when the development Vault does not contain
real credentials, so CI environments without Apple/Google secrets will not
fail.

NO mocks. NO test overrides. Real secrets from Vault only.
"""

import json
import zipfile
from io import BytesIO

import pytest

from apps.cards.models import CardType
from apps.customers.pass_engine.apple_pass import (
    generate_pkpass,
    is_apple_wallet_configured,
)
from apps.customers.pass_engine.google_pass import (
    generate_google_wallet_url,
    is_google_wallet_configured,
)
from common.vault import clear_test_overrides
from tests.factories import make_card, make_customer, make_customer_pass, make_tenant


def _has_real_credentials() -> bool:
    """Return True only when real Vault credentials are available."""
    # Clear any stray test overrides from previous tests in the same process
    clear_test_overrides()
    return is_apple_wallet_configured() and is_google_wallet_configured()


def _make_v2_wallet_studio(card_name: str, card_type: str) -> dict:
    """Build a realistic WalletStudio V2 metadata dict for real E2E testing."""
    return {
        "version": 2,
        "id": f"ws-real-{card_type}",
        "name": card_name,
        "cardType": card_type,
        "industry": "retail",
        "colors": {
            "background": "#123456",
            "foreground": "#FFFFFF",
            "label": "#CCCCCC",
            "accent": "#FF5733",
        },
        "images": {
            "logo": {"url": "https://placehold.co/160x160/png", "width": 160, "height": 160},
            "strip": {"url": "https://placehold.co/1125x432/png", "width": 1125, "height": 432},
            "icon": {"url": "https://placehold.co/90x90/png", "width": 90, "height": 90},
        },
        "fields": [
            {
                "id": "welcome",
                "label": "Bienvenido",
                "value": "{customer_name}",
                "fieldGroup": "primaryFields",
                "order": 0,
                "showOnApple": True,
                "showOnGoogle": True,
                "isDynamic": True,
                "dynamicTemplate": "{customer_name}",
            },
            {
                "id": "program",
                "label": "Programa",
                "value": "{program_name}",
                "fieldGroup": "secondaryFields",
                "order": 0,
                "showOnApple": True,
                "showOnGoogle": True,
                "isDynamic": True,
                "dynamicTemplate": "{program_name}",
            },
        ],
        "cardTypeConfig": {},
        "barcode": {"type": "qr_code", "altText": "Escanea para usar"},
        "backContent": {
            "header": "Información",
            "body": "Válido según las políticas del programa.",
            "fields": [
                {
                    "id": "terms",
                    "label": "Términos",
                    "value": "No acumulable con otras promociones.",
                    "isLink": False,
                },
                {
                    "id": "website",
                    "label": "Sitio web",
                    "value": "https://example.com/terms",
                    "isLink": True,
                },
            ],
        },
        "apple": {
            "passType": "storeCard",
            "nfc": {"enabled": False},
            "advanced": {},
        },
        "google": {
            "passType": "loyalty",
            "programName": card_name,
            "hexBackgroundColor": "#123456",
            "reviewStatus": "UNDER_REVIEW",
            "allowMultipleUsers": "ONE_USER_ALL_DEVICES",
            "messages": [],
            "notifyPreference": True,
        },
        "ui": {},
    }


# Skip the entire module when real credentials are not available
pytestmark = pytest.mark.skipif(
    not _has_real_credentials(),
    reason="Real Apple/Google Wallet credentials not present in Vault",
)


@pytest.fixture(autouse=True)
def vault_cleanup():
    """Ensure no test overrides leak into real E2E tests."""
    clear_test_overrides()
    yield
    clear_test_overrides()


@pytest.mark.parametrize("card_type", list(CardType))
def test_real_v2_wallet_studio_apple_and_google(db, card_type):
    """Real end-to-end: create a V2 card and generate Apple + Google passes."""
    tenant = make_tenant(name=f"Real E2E {card_type.label}")
    customer = make_customer(
        tenant, first_name="Jane", last_name="Doe", email="jane.doe@example.com"
    )
    card_name = f"V2 {card_type.label}"
    v2_studio = _make_v2_wallet_studio(card_name, card_type.value)
    card = make_card(
        tenant, card_type=card_type, metadata={"wallet_studio": v2_studio}
    )
    cp = make_customer_pass(customer, card)

    # --- Apple Wallet: real PKCS#7 signing with Vault certificates ---
    pkpass = generate_pkpass(cp)
    assert pkpass is not None, f"Apple pass generation failed for {card_type.value}"
    assert isinstance(pkpass, bytes)
    assert pkpass[:2] == b"PK"

    with zipfile.ZipFile(BytesIO(pkpass)) as zf:
        pass_json = json.loads(zf.read("pass.json").decode("utf-8"))

    # Locate the pass-style dict (storeCard, coupon, generic, ...)
    known_keys = {
        "formatVersion",
        "passTypeIdentifier",
        "teamIdentifier",
        "serialNumber",
        "organizationName",
        "description",
        "logoText",
        "foregroundColor",
        "backgroundColor",
        "labelColor",
        "barcodes",
        "locations",
        "maxDistance",
        "nfc",
        "webServiceURL",
        "authenticationToken",
        "sharingProhibited",
        "voided",
        "relevantDate",
        "expirationDate",
        "appLaunchURL",
        "associatedStoreIdentifiers",
        "userInfo",
        "beacons",
        "passType",
    }
    style_key = next(
        (
            k
            for k in pass_json
            if k not in known_keys and isinstance(pass_json[k], dict)
        ),
        None,
    )
    assert style_key is not None, f"No pass style dict found for {card_type.value}"
    style_dict = pass_json[style_key]

    field_groups = {
        "headerFields",
        "primaryFields",
        "secondaryFields",
        "auxiliaryFields",
        "backFields",
    }
    present_groups = {k for k in style_dict if k in field_groups}
    assert present_groups, f"No V2 field groups for {card_type.value}"

    all_values = str(pass_json)
    assert "Jane Doe" in all_values, (
        f"Dynamic customer_name not resolved for {card_type.value}"
    )

    back_fields = style_dict.get("backFields", [])
    link_field = next(
        (f for f in back_fields if f.get("key") == "website"), None
    )
    assert link_field is not None, f"V2 back link missing for {card_type.value}"
    assert "https://example.com/terms" in link_field.get("attributedValue", "")

    # V2 colors must override legacy defaults
    assert pass_json["backgroundColor"] in ("#123456", "rgb(18, 52, 86)")
    assert pass_json["foregroundColor"] in ("#FFFFFF", "rgb(255, 255, 255)")

    # --- Google Wallet: real RS256 JWT with Vault service account ---
    url = generate_google_wallet_url(cp, base_url="https://test.example.com")
    assert url is not None, f"Google URL generation failed for {card_type.value}"
    assert url.startswith("https://pay.google.com/gp/v/save/")

    jwt_token = url.split("/save/")[1]
    payload_b64 = jwt_token.split(".")[1]
    payload_b64 += "=" * (4 - len(payload_b64) % 4)
    payload = json.loads(
        __import__("base64").urlsafe_b64decode(payload_b64).decode("utf-8")
    )

    wallet_payload = payload.get("payload", {})
    class_key = next((k for k in wallet_payload if "Classes" in k), None)
    object_key = next((k for k in wallet_payload if "Objects" in k), None)
    assert class_key is not None, f"No Google class in JWT for {card_type.value}"
    assert object_key is not None, f"No Google object in JWT for {card_type.value}"

    google_class = wallet_payload[class_key][0]
    google_object = wallet_payload[object_key][0]

    assert google_class.get("hexBackgroundColor") == "#123456", (
        f"V2 color missing in Google class for {card_type.value}"
    )

    text_modules = google_object.get("textModulesData", [])
    module_bodies = {m.get("body", "") for m in text_modules}
    assert "Jane Doe" in module_bodies, (
        f"Dynamic customer_name missing in Google modules for {card_type.value}"
    )

    link_uris = {
        link.get("uri", "")
        for link in google_object.get("linksModuleData", {}).get("uris", [])
    }
    assert "https://example.com/terms" in link_uris, (
        f"V2 back link missing in Google links for {card_type.value}"
    )
