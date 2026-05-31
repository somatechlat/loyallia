"""
Environment Variable Validation
Validates required environment variables on startup.
Fails fast with clear error messages instead of cryptic runtime errors.
"""

import logging
import os
import sys
from dataclasses import dataclass

from common.vault import fetch_vault_secrets, get_secret

logger = logging.getLogger(__name__)


def _truthy(value: object) -> bool:
    return str(value or "").strip().lower() in {"1", "true", "yes", "on", "enabled"}


@dataclass
class EnvVar:
    """Definition of a required/optional environment variable."""

    name: str
    required: bool = True
    description: str = ""
    default: str | None = None
    min_length: int = 0
    sensitive: bool = False  # Don't log the value


# Required Environment Variables

REQUIRED_VARS = [
    EnvVar(
        name="SECRET_KEY",
        description="Django secret key for cryptographic signing",
        min_length=32,
        sensitive=True,
    ),
    EnvVar(
        name="POSTGRES_PASSWORD",
        description="PostgreSQL database password",
        min_length=8,
        sensitive=True,
    ),
    EnvVar(
        name="REDIS_PASSWORD",
        description="Redis authentication password",
        min_length=8,
        sensitive=True,
    ),
]

PRODUCTION_EXTRA_VARS = [
    EnvVar(
        name="MINIO_ROOT_USER",
        description="MinIO root access key",
        min_length=3,
        sensitive=True,
    ),
    EnvVar(
        name="MINIO_ROOT_PASSWORD",
        description="MinIO root secret key",
        min_length=8,
        sensitive=True,
    ),
    EnvVar(
        name="ALLOWED_HOSTS",
        description="Comma-separated list of allowed hostnames",
    ),
    EnvVar(
        name="JWT_SECRET_KEY",
        description="Secret key for JWT token signing",
        min_length=16,
        sensitive=True,
    ),
]

OPTIONAL_VARS = [
    EnvVar(
        name="SENTRY_DSN",
        required=False,
        description="Sentry error tracking DSN",
    ),
    EnvVar(
        name="VAULT_ADDR",
        required=False,
        default="http://vault:8200",
        description="HashiCorp Vault address",
    ),
    EnvVar(
        name="VAULT_TOKEN",
        required=False,
        description="Vault authentication token",
        sensitive=True,
    ),
    EnvVar(
        name="EMAIL_HOST",
        required=False,
        default="in-v3.mailjet.com",
        description="SMTP server hostname",
    ),
]

PRODUCTION_REQUIRED_VAULT_KEYS = [
    "secret_key",
    "postgres_password",
    "redis_url",
    "celery_broker_url",
    "celery_result_backend",
    "minio_access_key",
    "minio_secret_key",
    "jwt_secret_key",
    "pass_hmac_secret",
    "google_oauth_client_id",
    "google_oauth_client_secret",
    "google_wallet_issuer_id",
    "google_service_account_json",
    "google_wallet_enabled",
    "payment_gateway_enabled",
    "payment_gateway_provider",
]

APPLE_REQUIRED_VAULT_KEYS = [
    "apple_pass_type_identifier",
    "apple_team_identifier",
    "apple_cert_pem",
    "apple_cert_key_pem",
    "apple_wwdr_cert_pem",
]

PAYMENT_REQUIRED_VAULT_KEYS = [
    "payment_gateway_login",
    "payment_gateway_tran_key",
    "payment_gateway_webhook_secret",
]

EMAIL_REQUIRED_VAULT_KEYS = [
    "mailjet_api_key",
    "mailjet_secret_key",
]


@dataclass
class ValidationError:
    var_name: str
    message: str


def validate_environment(is_production: bool = False) -> list[ValidationError]:
    """
    Validate all required environment variables.

    Args:
        is_production: If True, also validate production-specific variables.

    Returns:
        List of validation errors (empty if all valid).
    """
    errors: list[ValidationError] = []
    if is_production:
        # SEC-006: Production MUST use VAULT_TOKEN_FILE, not raw VAULT_TOKEN env var.
        # Raw VAULT_TOKEN is the dev-mode root token unacceptable in production.
        if os.environ.get("VAULT_TOKEN") and not os.environ.get("VAULT_TOKEN_FILE"):
            errors.append(
                ValidationError(
                    var_name="VAULT_TOKEN",
                    message=(
                        "Production must use VAULT_TOKEN_FILE (scoped app token), "
                        "not VAULT_TOKEN (dev root token). "
                        "Remove VAULT_TOKEN from environment."
                    ),
                )
            )
            return errors

        secrets = fetch_vault_secrets()
        if not secrets:
            return [
                ValidationError(
                    var_name="VAULT",
                    message="Production requires Vault to be reachable and populated.",
                )
            ]

        required_keys = list(PRODUCTION_REQUIRED_VAULT_KEYS)
        if _truthy(secrets.get("apple_wallet_enabled")):
            required_keys.extend(APPLE_REQUIRED_VAULT_KEYS)
        if _truthy(secrets.get("payment_gateway_enabled")):
            required_keys.extend(PAYMENT_REQUIRED_VAULT_KEYS)
        # Only require Mailjet credentials if email is actively configured.
        # An empty mailjet_api_key means "no mass-email provider configured" valid state.
        if str(secrets.get("mailjet_api_key", "")).strip():
            required_keys.extend(EMAIL_REQUIRED_VAULT_KEYS)

        for key in required_keys:
            if not str(secrets.get(key, "")).strip():
                errors.append(
                    ValidationError(
                        var_name=key,
                        message=f"Missing required Vault key: {key}",
                    )
                )
        return errors

    vars_to_check = REQUIRED_VARS.copy()

    for var in vars_to_check:
        # Secrets are validated from Vault only. Environment variables may carry
        # non-secret routing/configuration, but not credential material.
        value = get_secret(var.name.lower())

        if value is None:
            if var.default is not None:
                continue
            errors.append(
                ValidationError(
                    var_name=var.name,
                    message=f"Missing required env var: {var.name}  {var.description}",
                )
            )
            continue

        if var.min_length and len(value) < var.min_length:
            errors.append(
                ValidationError(
                    var_name=var.name,
                    message=f"{var.name} must be at least {var.min_length} characters (got {len(value)})",
                )
            )

        # Check for obviously weak/default values
        weak_values = {
            "SECRET_KEY": ["secret", "changeme", "django-insecure", "test"],
            "POSTGRES_PASSWORD": ["password", "postgres", "admin", "123456"],
            "REDIS_PASSWORD": ["password", "redis", "admin", "123456"],
            "MINIO_ROOT_PASSWORD": ["minioadmin", "password", "admin"],
        }

        if var.name in weak_values and value.lower() in weak_values[var.name]:
            errors.append(
                ValidationError(
                    var_name=var.name,
                    message=f"{var.name} uses a weak/default value  change before deployment",
                )
            )

    return errors


def check_or_die(is_production: bool = False) -> None:
    """
    Validate environment and exit with clear errors if validation fails.
    Call this early in Django startup (e.g., in settings or wsgi.py).
    """
    errors = validate_environment(is_production=is_production)

    if not errors:
        logger.info(
            "Environment validation passed (%d vars checked)", len(REQUIRED_VARS)
        )
        return

    # In DEBUG mode, just warn
    if not is_production and os.environ.get("DEBUG", "").lower() in (
        "true",
        "1",
        "yes",
    ):
        for err in errors:
            logger.warning("ENV WARNING: %s", err.message)
        return

    # In production, fail fast
    for err in errors:
        logger.error("ENV ERROR: %s", err.message)

    print("\n Environment validation failed:", file=sys.stderr)
    for err in errors:
        print(f"   {err.message}", file=sys.stderr)
    print("\nFix the above errors and restart.", file=sys.stderr)
    sys.exit(1)
