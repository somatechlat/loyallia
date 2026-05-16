from common.environment_guard import (
    DEVELOPMENT_DB_NAME,
    DEVELOPMENT_VAULT_MARKER,
    PRODUCTION_DB_NAME,
    PRODUCTION_VAULT_MARKER,
    validate_settings_environment,
)


def _db(name: str) -> dict:
    return {"default": {"NAME": name}}


def test_development_accepts_development_db_and_vault(monkeypatch):
    monkeypatch.setenv("VAULT_SECRET_PATH", f"secret/data/{DEVELOPMENT_VAULT_MARKER}")

    errors = validate_settings_environment(mode="development", databases=_db(DEVELOPMENT_DB_NAME))

    assert errors == []


def test_development_rejects_production_db_and_vault(monkeypatch):
    monkeypatch.setenv("VAULT_SECRET_PATH", f"secret/data/{PRODUCTION_VAULT_MARKER}")

    errors = validate_settings_environment(mode="development", databases=_db(PRODUCTION_DB_NAME))

    assert {error.code for error in errors} == {
        "dev_uses_production_vault",
        "dev_uses_production_db",
    }


def test_production_accepts_production_db_and_vault(monkeypatch):
    monkeypatch.setenv("VAULT_SECRET_PATH", f"secret/data/{PRODUCTION_VAULT_MARKER}")

    errors = validate_settings_environment(mode="production", databases=_db(PRODUCTION_DB_NAME))

    assert errors == []


def test_production_rejects_development_db_and_vault(monkeypatch):
    monkeypatch.setenv("VAULT_SECRET_PATH", f"secret/data/{DEVELOPMENT_VAULT_MARKER}")

    errors = validate_settings_environment(mode="production", databases=_db(DEVELOPMENT_DB_NAME))

    assert {error.code for error in errors} == {
        "prod_uses_development_vault",
        "prod_uses_development_db",
    }


def test_production_database_state_rejects_e2e_users(monkeypatch, db):
    from apps.authentication.models import User
    import common.vault
    from common import environment_guard

    monkeypatch.setattr(common.vault, "fetch_vault_secrets", lambda: {})
    User.objects.create_user(
        email="e2e-owner@loyallia.test",
        password="[REDACTED]",
        role="OWNER",
        is_active=True,
    )

    errors = environment_guard.validate_production_database_state()

    assert any(error.code == "prod_contains_e2e_users" for error in errors)


def test_production_database_state_rejects_user_password_vault_keys(monkeypatch, db):
    import common.vault
    from common import environment_guard

    monkeypatch.setattr(
        common.vault,
        "fetch_vault_secrets",
        lambda: {"test_owner_password": "not-allowed"},
    )

    errors = environment_guard.validate_production_database_state()

    assert any(error.code == "prod_contains_user_password_vault_key" for error in errors)
