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
    monkeypatch.setenv("DATABASE_URL", f"postgres://loyallia@postgres:5432/{PRODUCTION_DB_NAME}")
    monkeypatch.setenv(
        "DATABASE_DIRECT_URL",
        f"postgres://loyallia@postgres:5432/{PRODUCTION_DB_NAME}",
    )
    monkeypatch.setenv(
        "PGBOUNCER_URL",
        f"postgres://loyallia@pgbouncer:6432/{PRODUCTION_DB_NAME}",
    )

    errors = validate_settings_environment(mode="production", databases=_db(PRODUCTION_DB_NAME))

    assert errors == []


def test_production_rejects_development_db_and_vault(monkeypatch):
    monkeypatch.setenv("VAULT_SECRET_PATH", f"secret/data/{DEVELOPMENT_VAULT_MARKER}")

    errors = validate_settings_environment(mode="production", databases=_db(DEVELOPMENT_DB_NAME))

    assert {error.code for error in errors} == {
        "prod_uses_development_vault",
        "prod_uses_development_db",
    }


def test_production_database_state_rejects_e2e_users():
    from common import environment_guard

    errors = environment_guard.validate_production_database_state(
        secret_loader=lambda: {},
        e2e_user_exists=lambda: True,
    )

    assert any(error.code == "prod_contains_e2e_users" for error in errors)


def test_production_database_state_rejects_user_password_vault_keys():
    from common import environment_guard

    errors = environment_guard.validate_production_database_state(
        secret_loader=lambda: {"test_owner_password": "not-allowed"},
        e2e_user_exists=lambda: False,
    )

    assert any(error.code == "prod_contains_user_password_vault_key" for error in errors)
