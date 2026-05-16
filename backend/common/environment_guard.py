"""
Runtime environment guardrails for Loyallia.

Development/testing share the development database. Production must never run
against development Vault/database state, and development tests must never point
at production.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from urllib.parse import urlparse

PRODUCTION_VAULT_MARKER = "loyallia/production"
DEVELOPMENT_VAULT_MARKER = "loyallia/development"
PRODUCTION_DB_NAME = "loyallia"
DEVELOPMENT_DB_NAME = "loyallia_dev"
E2E_EMAIL_PREFIX = "e2e-"
FORBIDDEN_PRODUCTION_VAULT_KEYS = {
    "test_owner_password",
    "test_manager_password",
    "test_staff_password",
    "test_superadmin_password",
}


@dataclass(frozen=True)
class GuardError:
    code: str
    message: str


class EnvironmentGuardError(RuntimeError):
    """Raised when a runtime environment violates the required separation."""


def _database_names(databases: dict) -> set[str]:
    names: set[str] = set()
    for config in databases.values():
        name = str(config.get("NAME") or "").strip()
        if name:
            names.add(name)
    for key in ("DATABASE_URL", "DATABASE_DIRECT_URL", "PGBOUNCER_URL"):
        parsed_name = _db_name_from_url(os.environ.get(key, ""))
        if parsed_name:
            names.add(parsed_name)
    return names


def _db_name_from_url(value: str) -> str:
    if not value:
        return ""
    parsed = urlparse(value)
    return parsed.path.lstrip("/")


def validate_settings_environment(*, mode: str, databases: dict | None = None) -> list[GuardError]:
    """Validate settings/Vault/DB consistency without touching the database."""
    errors: list[GuardError] = []
    vault_path = os.environ.get("VAULT_SECRET_PATH", "")
    db_names = _database_names(databases or {})

    if mode == "development":
        if PRODUCTION_VAULT_MARKER in vault_path:
            errors.append(
                GuardError(
                    "dev_uses_production_vault",
                    "Development/testing must not use the production Vault path.",
                )
            )
        if PRODUCTION_DB_NAME in db_names:
            errors.append(
                GuardError(
                    "dev_uses_production_db",
                    "Development/testing must use the development database.",
                )
            )
    elif mode == "production":
        if DEVELOPMENT_VAULT_MARKER in vault_path:
            errors.append(
                GuardError(
                    "prod_uses_development_vault",
                    "Production must not use the development Vault path.",
                )
            )
        if DEVELOPMENT_DB_NAME in db_names:
            errors.append(
                GuardError(
                    "prod_uses_development_db",
                    "Production must not use the development database.",
                )
            )

    return errors


def enforce_settings_environment(*, mode: str, databases: dict | None = None) -> None:
    errors = validate_settings_environment(mode=mode, databases=databases)
    if errors:
        details = "; ".join(error.message for error in errors)
        raise EnvironmentGuardError(details)


def validate_production_database_state() -> list[GuardError]:
    """Validate production does not contain development-only users or Vault keys."""
    errors: list[GuardError] = []

    from common.vault import fetch_vault_secrets

    secrets = fetch_vault_secrets()
    forbidden_keys = FORBIDDEN_PRODUCTION_VAULT_KEYS.intersection(secrets.keys())
    for key in sorted(forbidden_keys):
        errors.append(
            GuardError(
                "prod_contains_user_password_vault_key",
                f"Production Vault must not contain user password key '{key}'.",
            )
        )

    from apps.authentication.models import User

    if User.objects.filter(email__startswith=E2E_EMAIL_PREFIX).exists():
        errors.append(
            GuardError(
                "prod_contains_e2e_users",
                "Production database must not contain E2E test users.",
            )
        )

    return errors
