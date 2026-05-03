"""
Loyallia -- Vault Secret Client.

Production callers must use strict Vault reads without env fallbacks. Development
and test callers may pass env_fallback/default explicitly when a local workbench
requires it.

SECURITY (LYL-M-SEC-015): Cache has a configurable TTL (default 5 minutes) so
secret rotation takes effect without requiring a process restart.
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
        logger.debug("Vault not configured (VAULT_ADDR or VAULT_TOKEN missing).")
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
        logger.warning("Vault: connection failed (%s).", exc.reason)
        return _secrets_cache  # Return stale cache on connection failure
    except (json.JSONDecodeError, KeyError) as exc:
        logger.warning("Vault: invalid response format (%s).", exc)
        return _secrets_cache
    except Exception as exc:
        logger.warning("Vault: unexpected error (%s).", exc)
        return _secrets_cache


def fetch_vault_secrets() -> dict:
    """Return the cached Vault secret mapping without exposing values."""
    return _fetch_vault_secrets().copy()


def get_secret(
    vault_key: str, env_fallback: str = "", default: str = "", strict: bool = False
) -> str:
    """
    Retrieve a secret value.

    Priority:
    1. HashiCorp Vault KV v2.
    2. Optional env_fallback only when the caller explicitly provides one.
    3. Default value only when strict=False.

    Args:
        vault_key: Key name in the Vault secret path (e.g., "postgres_password")
        env_fallback: Environment variable name to check if Vault is unavailable
        default: Default value if both Vault and env are empty
        strict: If True, raises when the secret is unavailable.

    Returns:
        The secret value as a string.
    """
    # 1. Try Vault
    secrets = _fetch_vault_secrets()
    vault_value = secrets.get(vault_key, "")
    if vault_value:
        return str(vault_value)

    # 2. Try explicit environment fallback.
    if env_fallback:
        env_value = os.environ.get(env_fallback, "")
        if env_value:
            return env_value

    if strict:
        source = f"Vault key '{vault_key}'"
        if env_fallback:
            source = f"{source} or env var '{env_fallback}'"
        raise RuntimeError(f"Required secret missing: {source}")

    # 3. Default for non-strict callers.
    return default


def clear_cache() -> None:
    """Clear the cached Vault secrets. Call this to force a re-fetch."""
    global _secrets_cache, _cache_fetched_at
    _secrets_cache = {}
    _cache_fetched_at = 0.0
    logger.info("Vault: secret cache cleared")
