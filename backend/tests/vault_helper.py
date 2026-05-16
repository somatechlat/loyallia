"""
Loyallia — Test Vault Credential Helper
All test secrets come from HashiCorp Vault. No env fallbacks. No hardcoded passwords.
"""
import pytest
from common.vault import get_secret


def get_test_password() -> str:
    """Fetch test user password from Vault. Fail fast if missing."""
    pwd = get_secret("test_owner_password", strict=True)
    if not pwd:
        raise RuntimeError(
            "Required test credential missing from Vault: 'test_owner_password'. "
            "Ensure Vault contains test credentials."
        )
    return pwd


@pytest.fixture(scope="session")
def vault_test_credentials():
    """Fixture providing all test role credentials from Vault."""
    try:
        return {
            "owner": {
                "email": get_secret("test_owner_email", strict=True),
                "password": get_secret("test_owner_password", strict=True),
            },
            "manager": {
                "email": get_secret("test_manager_email", strict=True),
                "password": get_secret("test_manager_password", strict=True),
            },
            "staff": {
                "email": get_secret("test_staff_email", strict=True),
                "password": get_secret("test_staff_password", strict=True),
            },
            "superadmin": {
                "email": get_secret("test_superadmin_email", strict=True),
                "password": get_secret("test_superadmin_password", strict=True),
            },
        }
    except RuntimeError as exc:
        raise RuntimeError(
            "Vault test credentials unavailable. "
            "Ensure VAULT_TOKEN and VAULT_ADDR are set, and test_* keys exist in Vault."
        ) from exc
