"""
WalletStudio V2 End-to-End Pass Generation Tests

Creates one card of each of the 10 supported card types using WalletStudio V2
metadata (wallet_studio), generates real Apple .pkpass bytes and real Google
Wallet save URLs, and verifies the generated payloads reflect the V2 design.

Apple passes are signed with real test certificates (self-signed, OK for test).
Google Wallet URLs are signed with a real test service account JWT (no network
request to Google is made; the JWT is produced locally by the same code path
used in production).
"""

import json
import zipfile
from io import BytesIO

import pytest
from django.test import override_settings

from apps.cards.models import CardType
from apps.customers.pass_engine.apple_pass import generate_pkpass
from apps.customers.pass_engine.google_pass import generate_google_wallet_url
from common.vault import clear_test_overrides, set_test_override
from tests.factories import make_card, make_customer, make_customer_pass, make_tenant

# Real self-signed certificate for testing (same as test_wallet.py)
TEST_CERT_PEM = """-----BEGIN CERTIFICATE-----
MIIC/zCCAeegAwIBAgIUEZcRLn/yVjSX6M1wUd7BXe480L8wDQYJKoZIhvcNAQEL
BQAwDzENMAsGA1UEAwwEVGVzdDAeFw0yNjA2MDQxNTMxMTJaFw0yNjA2MDUxNTMx
MTJaMA8xDTALBgNVBAMMBFRlc3QwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEK
AoIBAQCn5rUIcRknZE5X4UeG5c3NlIADi5gMJ8YSk8KC/ab9IfmCiPJhfDjVnuVf
tRmzupwyf5OKRwMEf4v3PXMjCe8wUyTXpWZjbQmkd9nfVqfbmVZ2FN9IeUxXmRfm
Y2b3XEFdpvo0APzvAslE+m7X2VIcWkA8/yaKvPMtjM8Oh3X2hgEURwirtpGYwen8
n+d8WF4CutwsulYeymlAlH7qnUjJvoButbnnnC0Br+SOgmEtO/Pxv7HAAkAz1Wp1
5h21+7+Q1SXIv9t1YtOzKUrRKcnwEd4NIn34SpEz2Bf0OWCsOsW5TQJuwgEZjr+2
USu9O3oLEToyugaSlDOz4rEIgyEPAgMBAAGjUzBRMB0GA1UdDgQWBBSapo+9DFjX
5HT40evp8LQGoGUISTAfBgNVHSMEGDAWgBSapo+9DFjX5HT40evp8LQGoGUISTAP
BgNVHRMBAf8EBTADAQH/MA0GCSqGSIb3DQEBCwUAA4IBAQBbopyxMKRXjaQ0zUhn
0zyY3hdtFa7738943KoGnrdnTM6UeU87/HgZ9xYe2kE5oSbhcn1+s6sV+71tEqwu
HmQ+kkPvOtImDtUxDeAtCBB43mv2ZHzrHfhiKRtiqNQYBoVFOFdA9gyikzbpQk8s
hkmAUx+ARNIWQX9Lkaq3hn8pTswQjKd+r1Hv+ZWLlXkSnZS1GAB26QhUhlSRKkJp
K3Et+3fifAI5wiw4Lz50gCZjk6i5LPjIDlu7uRv1AFxEjZj68RHeCPZdnRDRjrfe
kNoAvgOsfbecuYDRsP/1CRgE4UtZmu9iD8zU5ywf+VN+40E7kBUSNkmaECsGNCTJ
WY6g
-----END CERTIFICATE-----"""

TEST_KEY_PEM = """-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCn5rUIcRknZE5X
4UeG5c3NlIADi5gMJ8YSk8KC/ab9IfmCiPJhfDjVnuVftRmzupwyf5OKRwMEf4v3
PXMjCe8wUyTXpWZjbQmkd9nfVqfbmVZ2FN9IeUxXmRfmY2b3XEFdpvo0APzvAslE
+m7X2VIcWkA8/yaKvPMtjM8Oh3X2hgEURwirtpGYwen8n+d8WF4CutwsulYeymlA
lH7qnUjJvoButbnnnC0Br+SOgmEtO/Pxv7HAAkAz1Wp15h21+7+Q1SXIv9t1YtOz
KUrRKcnwEd4NIn34SpEz2Bf0OWCsOsW5TQJuwgEZjr+2USu9O3oLEToyugaSlDOz
4rEIgyEPAgMBAAECggEASnkFgWoQ+yz9pvMws8AIqhAdO/VWCsY1kBXkKA/0WsEQ
F/tAb0cXOoGRQgNlFBhIogl+Ws4mo38jiRXDlR4Z7vhiFhiyMpWxujbC99JLABei
hxu48j+DQjOQq0sZ58wO3khrIFfz2NwGhEcElU86oYLSjXurD8zBnEmhqdMh2qdb
RjA6bMtWOfZoVMHwnOoE88HphGuA9CccI0Jk2UQcHWhDefswjDq5mIcbOQGYse9F
fENoQG3ucoE2XeAX8WeZjo/LFYw39S/rVXnPfKPHuKLc3GAbjnyNOchd7v2xIU8c
fR15RUyc4HIS3G9WIxTYufU9oiD1NR9Le7ayHZ0yyQKBgQDeGmSGDUIf6T13XQVX
fSmc85KOuhxDIBcah30tCEk2idgVApvh0PeY96lzX2zV3AhprENc4fthHyhQOVoh
w30Ngsz1J4MEp2dKs8er7SnMSyK53fxBox/MSfeX9fcpjfVCpjNksXk63zsMxZm+
3mxy7lYSFj0UrQYWd137psFSUwKBgQDBhqMEj4VaRmMTqzwksHRfKqlnxJAhSEU9
WmOBTU/ONrzjeN1dQjc4E/zzZdYqXn2nLcv5Yqu0y9ksCLB2fLXRCz76qOfS/x/p
J1p2EWMSL704kcZtzZjIwBWSPMV8ZCZopNdjC5FE257wrdrU6sJrGr221k2EqtY+
drhIGz+W1QKBgELCZiLRC2YyInKleDyS95YgtJXIJUSb+bXUsfB+RBtrlZLDJP3c
ZQAKuVlffoRNzg2NZPYfSwMnbWOnyYrKiuUrwtWRmdUlSGvw2/y2ndC1aOu7aN6F
3MH4Hb8EhNVtwSHWeS40Fj925/Xv00XG74wgTajEHHoBhAnuuUYyGnvXAoGAESOH
VGQRf0k0hQ1pKiamZ7czgYka6pen6iMTJORf6PdYCx0tHZE7qq+6eyPNr7rmjeO0
aMWgR0a2WPv8BMJOp9DDJxfGUB1gChn+HO61Q2sO6u+eDyNiIIVCY80WAEouTJ4s
pQzlNJ/ul4oOE0UnKq0XmBWqj9FBYA7Lizc+jnECgYBXsdBOsyutyFHh048v6y5b
SfkcBdmkKU8OOpaVGwM/YSsouBv7xKy6UV6OWbFm6vrsxH1IzE85OPNiiMG9SIWs
LgifjwnRjV6lOhXam8zc4CncblD/758p2zPa02uvRWhhHxTG819hxVCFjj+SQI9r
hVwp7AkTcqE5oWWIIpShPA==
-----END PRIVATE KEY-----"""

TEST_WWDR_PEM = """-----BEGIN CERTIFICATE-----
MIIC/zCCAeegAwIBAgIUfszuFs3q9+1Fdx5f8mT0/qwlzOswDQYJKoZIhvcNAQEL
BQAwDzENMAsGA1UEAwwEV1dEUjAeFw0yNjA2MDQxNTMxMTJaFw0yNjA2MDUxNTMx
MTJaMA8xDTALBgNVBAMMBFdXRFIwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEK
AoIBAQCxnoENpumJlJsZXLoaja+mh7i58CzP6wFxTU1Gg9JQIxDVXLbw2/KtZBAf
tLqFsxtyslL9x08r87H99qCSgPp6bm/rLhqdlOJMhLilc4Kajysh9kWwg6NluOrl
JIM+7RDRYlcfl8H11Eqc7OyMB290uVJECbzBLVvnZO8uVvSu2FveFxfNmsiG83wn
QGJvBFRoTDn2TvZC2pcWNwKkMbgNjteLvybuJCq+nUhIOeX57+UabVKVXRcexqed
z4LVb9hhjgSwVNaMpGoLL/CoyT64eG26yiUnzwtDr5q/Ntls42tdKDoDC5v18YSV
Csd+Dilbp5rN2ZS/XqtpefYLSfQVAgMBAAGjUzBRMB0GA1UdDgQWBBRjXgCyZzRZ
d9ydPKtFpvRn5LtKczAfBgNVHSMEGDAWgBRjXgCyZzRZd9ydPKtFpvRn5LtKczAP
BgNVHRMBAf8EBTADAQH/MA0GCSqGSIb3DQEBCwUAA4IBAQCggaL3RvPSwf2jHf72
/G0Qt/ns6WTjG5HAwPaFobYivkHTQpwtzYJTfwFQ5/NS/bxliEDZypCQHA/X7D7T
LuTKrbV5/njLJ2zb2IO3A07DdyntoCIaC+1NZktsSBBBefLEjYkra1lv6qbji/bC
D1+mksBO53hdRpSAv89uxfhimNfY6HN7XeAvRU6pz25t7Bp1Ze6ClQebPR49yTw8
nwea455vDPwYL+4llBGrSYxp6aGYIhKV81AuHJJRBYo0cM/1E12UAOMHSP6M2nld
Af3oeBowQV1bT2lCT2xq/ukG95T15k/9VMo8nQIS8163UCRS42ZH3v2MqslTcynu
Hx+i
-----END CERTIFICATE-----"""

TEST_SERVICE_ACCOUNT_JSON = """{
  \"type\": \"service_account\",
  \"project_id\": \"test-project\",
  \"private_key_id\": \"test-key-id\",
  \"private_key\": \"-----BEGIN PRIVATE KEY-----\\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDFLO7yPUT5Nt0E\\nNujxo3mhKmf2dmlERngHiMs0D0PT0vYsywla1+CzJ4p0XatvWQ4uG/Sr6DYnSQe/\\nE6WXh19dgncZp07va5QQ7Yq1czvGfNObpSF0P6qzqCDWPKFyKxRx+QtZgvE8kHqv\\nuGMo7jf+3kaVqRH8zvKHUhuewXfEfVBoA10/QEARLzVXvYvRKvIZsfNr7lNkHMnn\\ntLgxpM/XvYvUNtydARAJdYpFhR9op0NobyyucqYyhSPivU8IDxfTEHd3gxaN/a6j\\n7mbld3agSzvivNnMe+xizwyjLmNKH9jMl5QY4bLqeKTDNrIMkKHAJr+lhIzd5QLM\\nj3qYx7OLAgMBAAECggEAFwcFjEaJ4MhpV9MpMa3uXVtMU0qGm7cr0HFyOI0UgPoR\\nJFpn/XMwe6vWrdASCUnaGpogNoLC7vlGotL4ErIizz3BNr6akjflox54MHMZ8YyQ\\nKAwefpWVlDAX+afmEPp6rkmFa6RGaSopxzjeYnWDwPZo7D9CabHU6DyMxjsrshze\\nBQ99Yi9WY0Sd7KAV/tlMuZODG+eD6X8w+1ZDfNeYl/QsgaWc5vmqy3OsJEZNUFkh\\n1AF1k/ndVidmYkvMCRzA/9YA52DcpyCePXMH2n+N60Sm1fCBf8DLXhSV4KXBH04x\\nU1z6z6bY9zWJDlbMifyRYkhMclpgnPtMA9sfGOpoaQKBgQDjR13xoKdkUnUErcGO\\n4zXVRaRLmvNkfoSGQviz3aXJ0vnsWiyqIxx0E9W0tN4soBR3z7gIuJnoQKcFmKIo\\nPH7Aipp5oME3iK46JgXKNqBv8fBiUsVIjWTqu8lDz+PFOH0URI2j970X2Gpy1W5d\\nJJWqkpLbpFZ66fDb53qMwx64KQKBgQDeF7RLj12ZNv9/Yp/KxZwzoHbQLcll+APk\\ni9uxGLgeDezjGK6SfqsGuCCFAk7UGgqricynyhgMGAGh65mqfcibUUHn9nZHfPbu\\nGS27XUPcXAWiQoIohRc/aVYSDlUqqDGfTX2CYQFanDFW2nApwVQSzhAW6XGfpss3\\n14lfLNLUkwKBgQDYk6JW5YN9mwG9gqImuicLY4CrNy3mPpWkp179byJTz4KvEkLr\\noee0SU5lE9F/bs/yV/OEA/1Nj4ZZU9h6RSN38NxBOMnGVK3J5X+w8RszcbZiy4MJ\\nnwtij627u/fNcQXn8WeTrzj25xiQ8wdnJLymPWRKfzCVkiYeN1fVmP3F+QKBgEWW\\n2dh/MI3MjNwmU/leV+ZZVkE+x4da4iVfqVPhcfeA14QE/NZMOFyfnxjuMzMEgelk\\nAStmCIjpkMFiqECirxPzrxn2wPL/dgP/AbResd+/Ociw3EXEBhfJcr2vngICt6G5\\nzyTmLl1s6YzUXybGPAi0Zpg3R3IF+lEiCRo4WktfAoGAcggx6ySq0ZeJDgELDLNW\\nwPm2BvnwSCQncmuyEmWxL+tjxX4Q1vLDjz2YRER5r07yNo3x2s5Q17pnPcaFZY1Q\\nfbaKmem2L5m94QVYfYf5fb7mG/mOnhFxmk3ihYeP9aX1Ld3zq564Kn+vuhJodxHO\\n65sKx8n7Ic4G2Fb1begEsmk=\\n-----END PRIVATE KEY-----\\n\",
  \"client_email\": \"test@test-project.iam.gserviceaccount.com\",
  \"client_id\": \"123456789\",
  \"auth_uri\": \"https://accounts.google.com/o/oauth2/auth\",
  \"token_uri\": \"https://oauth2.googleapis.com/token\"
}"""


def _make_v2_wallet_studio(card_name: str, card_type: str) -> dict:
    """Build a realistic WalletStudio V2 metadata dict for testing."""
    return {
        "version": 2,
        "id": f"ws-test-{card_type}",
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
            "logo": {
                "url": "https://example.com/logo.png",
                "width": 160,
                "height": 160,
            },
            "strip": {
                "url": "https://example.com/strip.png",
                "width": 1125,
                "height": 432,
            },
            "icon": {"url": "https://example.com/icon.png", "width": 90, "height": 90},
        },
        "fields": [
            {
                "id": "header_tier",
                "label": "Nivel",
                "value": "Oro",
                "fieldGroup": "headerFields",
                "order": 0,
                "showOnApple": True,
                "showOnGoogle": True,
                "isDynamic": False,
            },
            {
                "id": "primary_welcome",
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
                "id": "secondary_program",
                "label": "Programa",
                "value": "{program_name}",
                "fieldGroup": "secondaryFields",
                "order": 0,
                "showOnApple": True,
                "showOnGoogle": True,
                "isDynamic": True,
                "dynamicTemplate": "{program_name}",
            },
            {
                "id": "auxiliary_balance",
                "label": "Saldo",
                "value": "{balance}",
                "fieldGroup": "auxiliaryFields",
                "order": 0,
                "showOnApple": True,
                "showOnGoogle": True,
                "isDynamic": True,
                "dynamicTemplate": "{balance}",
            },
        ],
        "cardTypeConfig": {},
        "barcode": {
            "type": "qr_code",
            "altText": "Escanea para usar",
        },
        "backContent": {
            "header": "Términos y condiciones",
            "body": "Válido según las políticas del programa.",
            "fields": [
                {
                    "id": "back_terms",
                    "label": "Términos",
                    "value": "No acumulable con otras promociones.",
                    "isLink": False,
                },
                {
                    "id": "back_website",
                    "label": "Sitio web",
                    "value": "https://example.com/terms",
                    "isLink": True,
                },
            ],
        },
        "apple": {
            "passType": "storeCard",
            "nfc": {
                "enabled": True,
                "requiresAuthentication": False,
                "message": "Paga con tu tarjeta",
            },
            "advanced": {
                "sharingProhibited": False,
                "voided": False,
            },
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


@pytest.fixture(autouse=True)
def vault_cleanup():
    """Clear Vault test overrides after each test."""
    yield
    clear_test_overrides()


def _configure_apple():
    clear_test_overrides()
    set_test_override("apple_wallet_enabled", "true")
    set_test_override("apple_pass_type_identifier", "pass.com.test.loyalty")
    set_test_override("apple_team_identifier", "ABCDE12345")
    set_test_override("apple_cert_pem", TEST_CERT_PEM)
    set_test_override("apple_cert_key_pem", TEST_KEY_PEM)
    set_test_override("apple_wwdr_cert_pem", TEST_WWDR_PEM)


def _configure_google():
    set_test_override("google_wallet_enabled", "true")
    set_test_override("google_wallet_issuer_id", "1234567890123456789")
    set_test_override("google_service_account_json", TEST_SERVICE_ACCOUNT_JSON)


@override_settings(
    APPLE_PASS_TYPE_IDENTIFIER="pass.com.test.loyalty",
    APPLE_TEAM_IDENTIFIER="ABCDE12345",
)
@pytest.mark.parametrize(
    "card_type",
    [
        CardType.STAMP,
        CardType.CASHBACK,
        CardType.COUPON,
        CardType.AFFILIATE,
        CardType.DISCOUNT,
        CardType.GIFT_CERTIFICATE,
        CardType.VIP_MEMBERSHIP,
        CardType.CORPORATE_DISCOUNT,
        CardType.REFERRAL_PASS,
        CardType.MULTIPASS,
    ],
)
def test_v2_wallet_studio_generates_apple_pkpass(db, card_type):
    """For every card type, a WalletStudio V2 card produces a valid .pkpass."""
    tenant = make_tenant()
    card_name = f"V2 {card_type.label}"
    v2_studio = _make_v2_wallet_studio(card_name, card_type.value)
    card = make_card(tenant, card_type=card_type, metadata={"wallet_studio": v2_studio})
    customer = make_customer(tenant, first_name="Jane", last_name="Doe")
    cp = make_customer_pass(customer, card)

    _configure_apple()

    pkpass = generate_pkpass(cp)

    assert (
        pkpass is not None
    ), f"Apple pass generation returned None for {card_type.value}"
    assert isinstance(pkpass, bytes)
    assert len(pkpass) > 0
    assert pkpass[:2] == b"PK"

    # Parse the pass JSON inside the ZIP to verify V2 data made it through
    with zipfile.ZipFile(BytesIO(pkpass)) as zf:
        pass_json = json.loads(zf.read("pass.json").decode("utf-8"))

    # V2 colors must override legacy card colors
    # Apple PassKit represents colors as CSS rgb(...) strings
    assert pass_json["backgroundColor"] in (
        "#123456",
        "rgb(18, 52, 86)",
    ), f"Expected V2 background color for {card_type.value}, got {pass_json['backgroundColor']}"
    assert pass_json["foregroundColor"] in ("#FFFFFF", "rgb(255, 255, 255)")
    assert pass_json["labelColor"] in ("#CCCCCC", "rgb(204, 204, 204)")

    # At least one V2 field group must be present inside the pass-style dict
    field_groups = {
        "headerFields",
        "primaryFields",
        "secondaryFields",
        "auxiliaryFields",
        "backFields",
    }
    # Apple pass groups live under the pass style key (storeCard, coupon, generic, ...)
    pass_style_key = next(
        (
            k
            for k in pass_json
            if k
            not in {
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
            and isinstance(pass_json[k], dict)
        ),
        None,
    )
    assert pass_style_key is not None, f"No pass style dict found for {card_type.value}"
    style_dict = pass_json[pass_style_key]
    present_groups = {k for k in style_dict if k in field_groups}
    assert (
        present_groups
    ), f"No V2 field groups found for {card_type.value} in {pass_style_key}: {style_dict.keys()}"

    # Dynamic token {customer_name} should be resolved
    all_fields = []
    for g in field_groups:
        all_fields.extend(style_dict.get(g, []))
    values = {f.get("value", "") for f in all_fields}
    assert (
        "Jane Doe" in values
    ), f"Dynamic token customer_name not resolved for {card_type.value}; values={values}"

    # V2 back content link must appear as backField with attributedValue
    back_fields = style_dict.get("backFields", [])
    link_field = next((f for f in back_fields if f.get("key") == "back_website"), None)
    assert link_field is not None, f"V2 back link missing for {card_type.value}"
    assert "https://example.com/terms" in link_field.get("attributedValue", "")


@pytest.mark.parametrize(
    "card_type",
    [
        CardType.STAMP,
        CardType.CASHBACK,
        CardType.COUPON,
        CardType.AFFILIATE,
        CardType.DISCOUNT,
        CardType.GIFT_CERTIFICATE,
        CardType.VIP_MEMBERSHIP,
        CardType.CORPORATE_DISCOUNT,
        CardType.REFERRAL_PASS,
        CardType.MULTIPASS,
    ],
)
def test_v2_wallet_studio_generates_google_url(db, card_type):
    """For every card type, a WalletStudio V2 card produces a valid Google save URL."""
    tenant = make_tenant()
    card_name = f"V2 {card_type.label}"
    v2_studio = _make_v2_wallet_studio(card_name, card_type.value)
    card = make_card(tenant, card_type=card_type, metadata={"wallet_studio": v2_studio})
    customer = make_customer(tenant, first_name="Jane", last_name="Doe")
    cp = make_customer_pass(customer, card)

    _configure_google()

    url = generate_google_wallet_url(cp, base_url="https://test.example.com")

    assert url is not None, f"Google URL generation returned None for {card_type.value}"
    assert isinstance(url, str)
    assert url.startswith("https://pay.google.com/gp/v/save/")

    jwt_token = url.split("/save/")[1]
    assert len(jwt_token) > 10

    # Decode the JWT payload (no signature verification needed here; we're checking content)
    import base64

    payload_b64 = jwt_token.split(".")[1]
    # Add padding if needed
    payload_b64 += "=" * (4 - len(payload_b64) % 4)
    payload = json.loads(base64.urlsafe_b64decode(payload_b64).decode("utf-8"))

    # The JWT wraps the Wallet payloads in a "payload" claim
    wallet_payload = payload.get("payload", {})

    # Verify V2 color made it into the class
    class_payload = (
        wallet_payload.get("loyaltyClasses", [{}])[0]
        or wallet_payload.get("offerClasses", [{}])[0]
        or wallet_payload.get("giftCardClasses", [{}])[0]
        or {}
    )
    if not class_payload:
        for key in wallet_payload:
            if "Classes" in key and wallet_payload[key]:
                class_payload = wallet_payload[key][0]
                break

    assert (
        class_payload.get("hexBackgroundColor") == "#123456"
    ), f"V2 hex color missing in Google class for {card_type.value}: {class_payload}"

    # Verify V2 text module data appears in the object
    object_key = None
    for key in wallet_payload:
        if "Objects" in key and wallet_payload[key]:
            object_key = key
            break
    assert object_key is not None, f"No Google object found for {card_type.value}"
    obj_payload = wallet_payload[object_key][0]

    text_modules = obj_payload.get("textModulesData", [])
    module_values = {m.get("body", "") for m in text_modules}
    assert (
        "Jane Doe" in module_values
    ), f"Dynamic token customer_name not in Google text modules for {card_type.value}; {text_modules}"

    # Verify V2 link appears in linksModuleData
    links = obj_payload.get("linksModuleData", {}).get("uris", [])
    link_uris = {link.get("uri", "") for link in links}
    assert (
        "https://example.com/terms" in link_uris
    ), f"V2 back link missing in Google links for {card_type.value}; {links}"
