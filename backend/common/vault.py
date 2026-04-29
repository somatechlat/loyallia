"""
Loyallia -- Vault Secret Client

Retrieves secrets from HashiCorp Vault KV v2 with environment variable fallback.
Used by Django settings and any service that needs runtime secrets.

Usage:
    from common.vault import get_secret
    db_password = get_secret("postgres_password", env_fallback="POSTGRES_PASSWORD")

Behavior:
    1. If VAULT_ADDR and VAULT_TOKEN are set, fetches from Vault.
    2. Falls back to the env_fallback environment variable.
    3. Returns default if both fail.

SECURITY (LYL-M-SEC-015): Cache has a configurable TTL (default 5 minutes)
so that secret rotation takes effect without requiring a process restart.
"""

import logging
import os
import time

logger = logging.getLogger(__name__)

# Vault connection parameters from environment
VAULT_ADDR = os.environ.get("VAULT_ADDR", "")
VAULT_TOKEN = os.environ.get("VAULT_TOKEN", "")
VAULT_SECRET_PATH = os.environ.get("VAULT_SECRET_PATH", "secret/data/loyallia")

# Cache TTL in seconds (default 300 = 5 minutes)
VAULT_CACHE_TTL = int(os.environ.get("VAULT_CACHE_TTL", "300"))

# Module-level cache state
_secrets_cache: dict = {}
_cache_fetched_at: float = 0.0


def _fetch_vault_secrets() -> dict:
    """
    Fetch all secrets from Vault KV v2 endpoint.
    Returns the 'data' dict from the Vault response, or empty dict on failure.
    Cached with a TTL to allow secret rotation without process restart.
    """
    global _secrets_cache, _cache_fetched_at

    now = time.monotonic()

    # Return cached secrets if still within TTL
    if _secrets_cache and (now - _cache_fetched_at) < VAULT_CACHE_TTL:
        return _secrets_cache

    if not VAULT_ADDR or not VAULT_TOKEN:
        logger.debug(
            "Vault not configured (VAULT_ADDR or VAULT_TOKEN missing). Using env fallback."
        )
        return {}

    import json
    import urllib.error
    import urllib.request

    url = f"{VAULT_ADDR}/v1/{VAULT_SECRET_PATH}"
    headers = {"X-Vault-Token": VAULT_TOKEN}

    try:
        req = urllib.request.Request(url, headers=headers, method="GET")
        with urllib.request.urlopen(req, timeout=5) as response:
            body = json.loads(response.read().decode("utf-8"))
            secrets = body.get("data", {}).get("data", {})
            logger.info(
                "Vault: loaded %d secrets from %s", len(secrets), VAULT_SECRET_PATH
            )
            _secrets_cache = secrets
            _cache_fetched_at = now
            return secrets
    except urllib.error.URLError as exc:
        logger.warning(
            "Vault: connection failed (%s). Falling back to env vars.", exc.reason
        )
        return _secrets_cache  # Return stale cache on connection failure
    except (json.JSONDecodeError, KeyError) as exc:
        logger.warning(
            "Vault: invalid response format (%s). Falling back to env vars.", exc
        )
        return _secrets_cache
    except Exception as exc:
        logger.warning("Vault: unexpected error (%s). Falling back to env vars.", exc)
        return _secrets_cache


def get_secret(
    vault_key: str, env_fallback: str = "", default: str = "", strict: bool = False
) -> str:
    """
    Retrieve a secret value with the following priority:
    1. HashiCorp Vault KV v2 (if configured)
    2. Environment variable (env_fallback) - SKIPPED IF strict=True
    3. Default value

    Args:
        vault_key: Key name in the Vault secret path (e.g., "postgres_password")
        env_fallback: Environment variable name to check if Vault is unavailable
        default: Default value if both Vault and env are empty
        strict: If True, skips env_fallback and returns default immediately on Vault miss.

    Returns:
        The secret value as a string.
    """
    # 1. Try Vault
    secrets = _fetch_vault_secrets()
    vault_value = secrets.get(vault_key, "")
    if vault_value:
        return str(vault_value)

    # 2. Try environment variable (only if not strict)
    if env_fallback and not strict:
        env_value = os.environ.get(env_fallback, "")
        if env_value:
            return env_value

    # 3. Default
    return default


def clear_cache() -> None:
    """Clear the cached Vault secrets. Call this to force a re-fetch."""
    global _secrets_cache, _cache_fetched_at
    _secrets_cache = {}
    _cache_fetched_at = 0.0
    logger.info("Vault: secret cache cleared")
