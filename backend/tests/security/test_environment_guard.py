"""
Environment guard tests — NO mocks, NO stubs, NO bypasses.
"""

import os

from common.environment_guard import (
    DEVELOPMENT_DB_NAME,
    DEVELOPMENT_VAULT_MARKER,
    PRODUCTION_DB_NAME,
    PRODUCTION_VAULT_MARKER,
    validate_settings_environment,
)


def _db(name: str) -> dict:
    return {"default": {"NAME": name}}


def _setenv(key: str, value: str):
    os.environ[key] = value


def _unsetenv(key: str):
    os.environ.pop(key, None)


def test_development_accepts_development_db_and_vault():
    original = os.environ.get("VAULT_SECRET_PATH")
    _setenv("VAULT_SECRET_PATH", f"secret/data/{DEVELOPMENT_VAULT_MARKER}")
    try:
        errors = validate_settings_environment(mode="development", databases=_db(DEVELOPMENT_DB_NAME))
        assert errors == []
    finally:
        if original is None:
            _unsetenv("VAULT_SECRET_PATH")
        else:
            _setenv("VAULT_SECRET_PATH", original)


def test_development_rejects_production_db_and_vault():
    original = os.environ.get("VAULT_SECRET_PATH")
    _setenv("VAULT_SECRET_PATH", f"secret/data/{PRODUCTION_VAULT_MARKER}")
    try:
        errors = validate_settings_environment(mode="development", databases=_db(PRODUCTION_DB_NAME))
        assert {error.code for error in errors} == {
            "dev_uses_production_vault",
            "dev_uses_production_db",
        }
    finally:
        if original is None:
            _unsetenv("VAULT_SECRET_PATH")
        else:
            _setenv("VAULT_SECRET_PATH", original)


def test_production_accepts_production_db_and_vault():
    originals = {
        k: os.environ.get(k)
        for k in (
            "VAULT_SECRET_PATH",
            "DATABASE_URL",
            "DATABASE_DIRECT_URL",
            "PGBOUNCER_URL",
        )
    }
    _setenv("VAULT_SECRET_PATH", f"secret/data/{PRODUCTION_VAULT_MARKER}")
    _setenv("DATABASE_URL", f"postgres://loyallia@postgres:5432/{PRODUCTION_DB_NAME}")
    _setenv(
        "DATABASE_DIRECT_URL",
        f"postgres://loyallia@postgres:5432/{PRODUCTION_DB_NAME}",
    )
    _setenv(
        "PGBOUNCER_URL",
        f"postgres://loyallia@pgbouncer:6432/{PRODUCTION_DB_NAME}",
    )
    try:
        errors = validate_settings_environment(mode="production", databases=_db(PRODUCTION_DB_NAME))
        assert errors == []
    finally:
        for k, v in originals.items():
            if v is None:
                _unsetenv(k)
            else:
                _setenv(k, v)


def test_production_rejects_development_db_and_vault():
    original = os.environ.get("VAULT_SECRET_PATH")
    _setenv("VAULT_SECRET_PATH", f"secret/data/{DEVELOPMENT_VAULT_MARKER}")
    try:
        errors = validate_settings_environment(mode="production", databases=_db(DEVELOPMENT_DB_NAME))
        assert {error.code for error in errors} == {
            "prod_uses_development_vault",
            "prod_uses_development_db",
        }
    finally:
        if original is None:
            _unsetenv("VAULT_SECRET_PATH")
        else:
            _setenv("VAULT_SECRET_PATH", original)


def _empty_secrets():
    return {}


def _e2e_exists():
    return True


def _password_secret():
    return {"test_owner_password": "not-allowed"}


def _no_e2e():
    return False


def test_production_database_state_rejects_e2e_users():
    from common import environment_guard

    errors = environment_guard.validate_production_database_state(
        secret_loader=_empty_secrets,
        e2e_user_exists=_e2e_exists,
    )
    assert any(error.code == "prod_contains_e2e_users" for error in errors)


def test_production_database_state_rejects_user_password_vault_keys():
    from common import environment_guard

    errors = environment_guard.validate_production_database_state(
        secret_loader=_password_secret,
        e2e_user_exists=_no_e2e,
    )
    assert any(error.code == "prod_contains_user_password_vault_key" for error in errors)
