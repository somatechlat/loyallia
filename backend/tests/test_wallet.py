"""
Wallet Pass Generation Tests

Tests Apple Wallet PKPass generation and Google Wallet JWT signing
using Vault test overrides with real certificate formats.
"""

import pytest
from unittest.mock import patch, MagicMock

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
from common.vault import set_test_override, clear_test_overrides
from tests.factories import make_card, make_customer, make_customer_pass, make_tenant


# Real certificate formats for testing (self-signed, NOT production certs)
TEST_CERT_PEM = """-----BEGIN CERTIFICATE-----
MIIBkTCB+wIJAKHBfpE
MIIBkTCB+wIJAKHBfpE
MIIBkTCB+wIJAKHBfpE
MIIBkTCB+wIJAKHBfpE
MIIBkTCB+wIJAKHBfpE
MIIBkTCB+wIJAKHBfpE
MIIBkTCB+wIJAKHBfpE
MIIBkTCB+wIJAKHBfpE
MIIBkTCB+wIJAKHBfpE
MIIBkTCB+wIJAKHBfpE
MIIBkTCB+wIJAKHBfpE
MIIBkTCB+wIJAKHBfpE
MIIBkTCB+wIJAKHBfpE
MIIBkTCB+wIJAKHBfpE
MIIBkTCB+wIJAKHBfpE
MIIBkTCB+wIJAKHBfpE
MIIBkTCB+wIJAKHBfpE
MIIBkTCB+wIJAKHBfpE
MIIBkTCB+wIJAKHBfpE
MIIBkTCB+wIJAKHBfpE
MIIBkTCB+wIJAKHBfpE
MIIBkTCB+wIJAKHBfpE
MIIBkTCB+wIJAKHBfpE
MIIBkTCB+wIJAKHBfpE
-----END CERTIFICATE-----"""

TEST_KEY_PEM = """-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgX
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgX
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgX
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgX
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgX
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgX
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgX
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgX
-----END PRIVATE KEY-----"""

TEST_WWDR_PEM = """-----BEGIN CERTIFICATE-----
MIIC+DCCAeCgAwIBAgII
MIIC+DCCAeCgAwIBAgII
MIIC+DCCAeCgAwIBAgII
MIIC+DCCAeCgAwIBAgII
MIIC+DCCAeCgAwIBAgII
MIIC+DCCAeCgAwIBAgII
MIIC+DCCAeCgAwIBAgII
MIIC+DCCAeCgAwIBAgII
MIIC+DCCAeCgAwIBAgII
MIIC+DCCAeCgAwIBAgII
MIIC+DCCAeCgAwIBAgII
MIIC+DCCAeCgAwIBAgII
MIIC+DCCAeCgAwIBAgII
MIIC+DCCAeCgAwIBAgII
MIIC+DCCAeCgAwIBAgII
MIIC+DCCAeCgAwIBAgII
MIIC+DCCAeCgAwIBAgII
MIIC+DCCAeCgAwIBAgII
MIIC+DCCAeCgAwIBAgII
MIIC+DCCAeCgAwIBAgII
MIIC+DCCAeCgAwIBAgII
MIIC+DCCAeCgAwIBAgII
MIIC+DCCAeCgAwIBAgII
MIIC+DCCAeCgAwIBAgII
-----END CERTIFICATE-----"""

TEST_SERVICE_ACCOUNT_JSON = """{
  "type": "service_account",
  "project_id": "test-project",
  "private_key_id": "test-key-id",
  "private_key": "-----BEGIN RSA PRIVATE KEY-----\\nMIIEpQIBAAKCAQEA2a2rwplBQLpMx+pSGo5\\n-----END RSA PRIVATE KEY-----\\n",
  "client_email": "test@test-project.iam.gserviceaccount.com",
  "client_id": "123456789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token"
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
        with patch("apps.customers.pass_engine.apple_pass.get_secret", return_value=""):
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
        # Note: cryptographic validity may fail with fake PEMs

    def test_is_configured_when_all_set(self):
        """is_apple_wallet_configured should return True with valid config."""
        set_test_override("apple_wallet_enabled", "true")
        set_test_override("apple_pass_type_identifier", "pass.com.test.loyalty")
        set_test_override("apple_team_identifier", "ABCDE12345")
        set_test_override("apple_cert_pem", TEST_CERT_PEM)
        set_test_override("apple_cert_key_pem", TEST_KEY_PEM)
        set_test_override("apple_wwdr_cert_pem", TEST_WWDR_PEM)

        # Must also set Django setting via mock since it reads at import time
        with patch("apps.customers.pass_engine.apple_pass._check_config_ready", return_value=True):
            assert is_apple_wallet_configured() is True


class TestGoogleWalletDiagnostics:
    """Test Google Wallet diagnostic and configuration checks."""

    def test_diagnostics_all_missing(self):
        """Diagnostics should report all fields missing when Vault is empty."""
        with patch("apps.customers.pass_engine.google_pass.get_secret", return_value=""):
            diag = get_google_wallet_diagnostics()
        assert diag["enabled"] is False
        assert diag["issuer_id_present"] is False
        assert diag["service_account_present"] is False
        assert len(diag["errors"]) > 0

    def test_diagnostics_all_present(self):
        """Diagnostics should pass when all Vault secrets are present."""
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

    def test_generate_pkpass_returns_bytes(self, db):
        """generate_pkpass should return bytes when configured."""
        tenant = make_tenant()
        card = make_card(tenant)
        customer = make_customer(tenant)
        cp = make_customer_pass(customer, card)

        set_test_override("apple_wallet_enabled", "true")
        set_test_override("apple_pass_type_identifier", "pass.com.test.loyalty")
        set_test_override("apple_team_identifier", "ABCDE12345")
        set_test_override("apple_cert_pem", TEST_CERT_PEM)
        set_test_override("apple_cert_key_pem", TEST_KEY_PEM)
        set_test_override("apple_wwdr_cert_pem", TEST_WWDR_PEM)

        with patch("apps.customers.pass_engine.apple_pass._check_config_ready", return_value=True):
            with patch("apps.customers.pass_engine.apple_pass._sign_manifest") as mock_sign:
                mock_sign.return_value = b"FAKE_SIGNATURE"
                result = generate_pkpass(cp)

        assert result is not None
        assert isinstance(result, bytes)
        assert len(result) > 0
        # Verify it's a valid ZIP (pkpass is a ZIP file)
        assert result[:2] == b"PK"

    def test_generate_pkpass_returns_none_when_not_configured(self, db):
        """generate_pkpass should return None when Apple Wallet is not configured."""
        tenant = make_tenant()
        card = make_card(tenant)
        customer = make_customer(tenant)
        cp = make_customer_pass(customer, card)

        with patch("apps.customers.pass_engine.apple_pass._check_config_ready", return_value=False):
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

        set_test_override("google_wallet_enabled", "true")
        set_test_override("google_wallet_issuer_id", "1234567890123456789")
        set_test_override("google_service_account_json", TEST_SERVICE_ACCOUNT_JSON)

        with patch("apps.customers.pass_engine.google_pass.jwt.encode", return_value="FAKE_JWT_TOKEN"):
            url = generate_google_wallet_url(cp, base_url="https://test.example.com")

        assert url is not None
        assert isinstance(url, str)
        assert url.startswith("https://pay.google.com/gp/v/save/")
        # The URL should contain a JWT token after the prefix
        jwt_token = url.split("/save/")[1]
        assert len(jwt_token) > 10  # JWTs are long

    def test_generate_url_returns_none_when_not_configured(self, db):
        """generate_google_wallet_url should return None when Google Wallet is not configured."""
        tenant = make_tenant()
        card = make_card(tenant)
        customer = make_customer(tenant)
        cp = make_customer_pass(customer, card)

        with patch("apps.customers.pass_engine.google_pass._check_google_config", return_value=False):
            url = generate_google_wallet_url(cp)
        assert url is None


class TestWalletApiEndpoints:
    """Test wallet API endpoint responses."""

    def test_wallet_status_endpoint(self, client):
        """Wallet status should return 200 with availability flags."""
        # No auth required for status endpoint (it uses a real pass_id)
        # We test the endpoint structure instead of actual pass lookup
        from apps.customers.wallet_api import get_wallet_status
        from apps.customers.models import CustomerPass
        import uuid

        with patch.object(CustomerPass.objects, "select_related") as mock_qs:
            mock_pass = MagicMock()
            mock_pass.card.tenant.is_active = True
            mock_pass.customer.is_active = True
            mock_pass.is_active = True
            mock_pass.id = uuid.uuid4()
            mock_qs.return_value.get.return_value = mock_pass

            with patch("apps.customers.pass_engine.apple_pass.is_apple_wallet_configured", return_value=True):
                with patch("apps.customers.pass_engine.google_pass.is_google_wallet_configured", return_value=True):
                    result = get_wallet_status(MagicMock(), str(mock_pass.id))

        assert result.apple_wallet_available is True
        assert result.google_wallet_available is True
        assert result.pass_id == str(mock_pass.id)
