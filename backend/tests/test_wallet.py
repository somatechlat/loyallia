"""
Wallet Pass Generation Tests

Tests Apple Wallet PKPass generation and Google Wallet JWT signing
using Vault test overrides with real certificate formats.
NO mocks — all tests use real objects and real code paths.
"""

import uuid

import pytest
from django.test import override_settings

from apps.customers.models import CustomerPass
from apps.customers.pass_engine.apple_pass import (
    generate_pkpass,
    get_apple_wallet_diagnostics,
    is_apple_wallet_configured,
)
from apps.customers.pass_engine.google_pass import (
    generate_google_wallet_url,
    get_google_wallet_diagnostics,
    is_google_wallet_configured,
)
from apps.customers.wallet_api import get_wallet_status
from common.vault import clear_test_overrides, set_test_override
from tests.factories import make_card, make_customer, make_customer_pass, make_tenant

# Real self-signed certificate for testing (generated via OpenSSL)
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

# Real RSA private key for Google Wallet JWT signing tests
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


@pytest.fixture(autouse=True)
def vault_cleanup():
    """Clear Vault test overrides after each test."""
    yield
    clear_test_overrides()


class TestAppleWalletDiagnostics:
    """Test Apple Wallet diagnostic and configuration checks."""

    def test_diagnostics_all_missing(self):
        """Diagnostics should report all fields missing when Vault is empty."""
        clear_test_overrides()
        set_test_override("apple_wallet_enabled", "")
        set_test_override("apple_pass_type_identifier", "")
        set_test_override("apple_team_identifier", "")
        set_test_override("apple_cert_pem", "")
        set_test_override("apple_cert_key_pem", "")
        set_test_override("apple_wwdr_cert_pem", "")
        diag = get_apple_wallet_diagnostics()
        assert diag["enabled"] is False
        assert diag["pass_type_id_present"] is False
        assert diag["team_id_present"] is False
        assert diag["cert_pem_present"] is False
        assert diag["cert_key_pem_present"] is False
        assert diag["wwdr_cert_pem_present"] is False
        assert diag["certs_cryptographically_valid"] is False
        assert len(diag["errors"]) > 0

    def test_diagnostics_all_present(self):
        """Diagnostics should pass when all Vault secrets are present."""
        clear_test_overrides()
        set_test_override("apple_wallet_enabled", "true")
        set_test_override("apple_pass_type_identifier", "pass.com.test.loyalty")
        set_test_override("apple_team_identifier", "ABCDE12345")
        set_test_override("apple_cert_pem", TEST_CERT_PEM)
        set_test_override("apple_cert_key_pem", TEST_KEY_PEM)
        set_test_override("apple_wwdr_cert_pem", TEST_WWDR_PEM)

        diag = get_apple_wallet_diagnostics()
        assert diag["enabled"] is True
        assert diag["pass_type_id_present"] is True
        assert diag["team_id_present"] is True
        assert diag["cert_pem_present"] is True
        assert diag["cert_key_pem_present"] is True
        assert diag["wwdr_cert_pem_present"] is True
        assert diag["certs_cryptographically_valid"] is True

    @override_settings(
        APPLE_PASS_TYPE_IDENTIFIER="pass.com.test.loyalty",
        APPLE_TEAM_IDENTIFIER="ABCDE12345",
    )
    def test_is_configured_when_all_set(self):
        """is_apple_wallet_configured should return True with valid config."""
        clear_test_overrides()
        set_test_override("apple_wallet_enabled", "true")
        set_test_override("apple_cert_pem", TEST_CERT_PEM)
        set_test_override("apple_cert_key_pem", TEST_KEY_PEM)
        set_test_override("apple_wwdr_cert_pem", TEST_WWDR_PEM)
        assert is_apple_wallet_configured() is True


class TestGoogleWalletDiagnostics:
    """Test Google Wallet diagnostic and configuration checks."""

    def test_diagnostics_all_missing(self):
        """Diagnostics should report all fields missing when Vault is empty."""
        clear_test_overrides()
        set_test_override("google_wallet_enabled", "")
        set_test_override("google_wallet_issuer_id", "")
        set_test_override("google_service_account_json", "")
        diag = get_google_wallet_diagnostics()
        assert diag["enabled"] is False
        assert diag["issuer_id_present"] is False
        assert diag["service_account_present"] is False
        assert len(diag["errors"]) > 0

    def test_diagnostics_all_present(self):
        """Diagnostics should pass when all Vault secrets are present."""
        clear_test_overrides()
        set_test_override("google_wallet_enabled", "true")
        set_test_override("google_wallet_issuer_id", "1234567890123456789")
        set_test_override("google_service_account_json", TEST_SERVICE_ACCOUNT_JSON)

        diag = get_google_wallet_diagnostics()
        assert diag["enabled"] is True
        assert diag["issuer_id_present"] is True
        assert diag["service_account_present"] is True
        assert diag["service_account_valid_json"] is True
        assert diag["service_account_has_required_fields"] is True
        assert len(diag["errors"]) == 0


class TestApplePassGeneration:
    """Test Apple Wallet .pkpass file generation."""

    @override_settings(
        APPLE_PASS_TYPE_IDENTIFIER="pass.com.test.loyalty",
        APPLE_TEAM_IDENTIFIER="ABCDE12345",
    )
    def test_generate_pkpass_returns_bytes(self, db):
        """generate_pkpass should return bytes when configured."""
        tenant = make_tenant()
        card = make_card(tenant)
        customer = make_customer(tenant)
        cp = make_customer_pass(customer, card)

        clear_test_overrides()
        set_test_override("apple_wallet_enabled", "true")
        set_test_override("apple_cert_pem", TEST_CERT_PEM)
        set_test_override("apple_cert_key_pem", TEST_KEY_PEM)
        set_test_override("apple_wwdr_cert_pem", TEST_WWDR_PEM)

        result = generate_pkpass(cp)

        assert result is not None
        assert isinstance(result, bytes)
        assert len(result) > 0
        # Verify it's a valid ZIP (pkpass is a ZIP file)
        assert result[:2] == b"PK"

    def test_generate_pkpass_returns_none_when_not_configured(self, db):
        """generate_pkpass should return None when Apple Wallet is not configured."""
        clear_test_overrides()
        set_test_override("apple_cert_pem", "")
        set_test_override("apple_cert_key_pem", "")
        set_test_override("apple_wwdr_cert_pem", "")
        tenant = make_tenant()
        card = make_card(tenant)
        customer = make_customer(tenant)
        cp = make_customer_pass(customer, card)

        result = generate_pkpass(cp)
        assert result is None


class TestGoogleWalletUrlGeneration:
    """Test Google Wallet save URL generation."""

    def test_generate_url_returns_string(self, db):
        """generate_google_wallet_url should return a save URL string."""
        tenant = make_tenant()
        card = make_card(tenant)
        customer = make_customer(tenant)
        cp = make_customer_pass(customer, card)

        clear_test_overrides()
        set_test_override("google_wallet_enabled", "true")
        set_test_override("google_wallet_issuer_id", "1234567890123456789")
        set_test_override("google_service_account_json", TEST_SERVICE_ACCOUNT_JSON)

        url = generate_google_wallet_url(cp, base_url="https://test.example.com")

        assert url is not None
        assert isinstance(url, str)
        assert url.startswith("https://pay.google.com/gp/v/save/")
        # The URL should contain a JWT token after the prefix
        jwt_token = url.split("/save/")[1]
        assert len(jwt_token) > 10  # JWTs are long

    def test_generate_url_returns_none_when_not_configured(self, db):
        """generate_google_wallet_url should return None when Google Wallet is not configured."""
        clear_test_overrides()
        set_test_override("google_service_account_json", "")
        set_test_override("google_wallet_issuer_id", "")
        tenant = make_tenant()
        card = make_card(tenant)
        customer = make_customer(tenant)
        cp = make_customer_pass(customer, card)

        url = generate_google_wallet_url(cp)
        assert url is None


class TestWalletApiEndpoints:
    """Test wallet API endpoint responses."""

    @override_settings(
        APPLE_PASS_TYPE_IDENTIFIER="pass.com.test.loyalty",
        APPLE_TEAM_IDENTIFIER="ABCDE12345",
    )
    def test_wallet_status_endpoint(self, client, db):
        """Wallet status should return 200 with availability flags."""
        tenant = make_tenant()
        card = make_card(tenant)
        customer = make_customer(tenant)
        cp = make_customer_pass(customer, card)

        clear_test_overrides()
        set_test_override("apple_wallet_enabled", "true")
        set_test_override("apple_cert_pem", TEST_CERT_PEM)
        set_test_override("apple_cert_key_pem", TEST_KEY_PEM)
        set_test_override("apple_wwdr_cert_pem", TEST_WWDR_PEM)
        set_test_override("google_wallet_enabled", "true")
        set_test_override("google_service_account_json", TEST_SERVICE_ACCOUNT_JSON)

        result = get_wallet_status(client, str(cp.id))

        assert result.apple_wallet_available is True
        assert result.google_wallet_available is True
        assert result.pass_id == str(cp.id)
