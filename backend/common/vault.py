"""
Loyallia -- Vault Secret Client.

Production and development runtime callers read Vault through the mounted token
file. User passwords are never Vault secrets.

SECURITY (LYL-M-SEC-015): Cache has a configurable TTL (default 5 minutes) so
secret rotation takes effect without requiring a process restart.
"""

import logging
import os
import time

logger = logging.getLogger(__name__)

# Vault connection parameters from environment
VAULT_ADDR = os.environ.get("VAULT_ADDR", "")
VAULT_TOKEN_FILE = os.environ.get("VAULT_TOKEN_FILE", "")
VAULT_SECRET_PATH = os.environ.get("VAULT_SECRET_PATH", "secret/data/loyallia/development")

# Cache TTL in seconds (default 300 = 5 minutes)
VAULT_CACHE_TTL = int(os.environ.get("VAULT_CACHE_TTL", "300"))

# Module-level cache state
_secrets_cache: dict = {}
_cache_fetched_at: float = 0.0
_cache_seen_version: str = ""

# Test overrides: set by tests to override Vault reads without modifying Vault server.
# This is NOT a production bypass. It exists solely for unit/integration tests.
_test_overrides: dict[str, str] = {}

_VAULT_CACHE_VERSION_KEY = "vault:secrets:version"


def _read_shared_cache_version() -> str:
    """Read cross-process Vault cache version from Django cache when available."""
    try:
        from django.core.cache import cache

        return str(cache.get(_VAULT_CACHE_VERSION_KEY) or "")
    except Exception as exc:
        logger.debug("Vault: shared cache version unavailable: %s", exc)
        return ""


def _publish_shared_cache_invalidation() -> None:
    """Publish a cache version bump so other workers drop stale Vault values."""
    try:
        from django.core.cache import cache

        cache.set(_VAULT_CACHE_VERSION_KEY, str(time.time()), None)
    except Exception as exc:
        logger.debug("Vault: shared cache invalidation unavailable: %s", exc)


def _clear_cache_if_shared_version_changed() -> None:
    """Clear process cache when another worker has written Vault secrets."""
    global _cache_seen_version

    current_version = _read_shared_cache_version()
    if not current_version or current_version == _cache_seen_version:
        return
    clear_cache()
    _cache_seen_version = current_version


def _get_vault_token() -> str:
    """Return the Vault token from the mounted runtime secret file."""
    if VAULT_TOKEN_FILE:
        try:
            with open(VAULT_TOKEN_FILE, encoding="utf-8") as token_file:
                token = token_file.read().strip()
                if token:
                    return token
        except OSError as exc:
            logger.warning("Vault token file is not readable: %s", exc)
    return ""


def _fetch_vault_secrets() -> dict:
    """
    Fetch all secrets from Vault KV v2 endpoint.
    Returns the 'data' dict from the Vault response, or empty dict on failure.
    Cached with a TTL to allow secret rotation without process restart.
    """
    global _secrets_cache, _cache_fetched_at

    _clear_cache_if_shared_version_changed()
    now = time.monotonic()

    # Return cached secrets if still within TTL
    if _secrets_cache and (now - _cache_fetched_at) < VAULT_CACHE_TTL:
        return _secrets_cache

    vault_token = _get_vault_token()
    if not VAULT_ADDR or not vault_token:
        logger.debug("Vault not configured (address or token missing).")
        return {}

    import json
    import urllib.error
    import urllib.request

    url = f"{VAULT_ADDR}/v1/{VAULT_SECRET_PATH}"
    headers = {"X-Vault-Token": vault_token}

    try:
        req = urllib.request.Request(url, headers=headers, method="GET")
        with urllib.request.urlopen(req, timeout=5) as response:
            body = json.loads(response.read().decode("utf-8"))
            secrets = body.get("data", {}).get("data", {})
            logger.info("Vault: loaded %d secrets from %s", len(secrets), VAULT_SECRET_PATH)
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


def get_secret(vault_key: str, env_fallback: str = "", default: str = "", strict: bool = False) -> str:
    """
    Retrieve a secret value.

    Priority:
    1. Test overrides (set by unit tests via set_test_override)
    2. HashiCorp Vault KV v2.
    3. Optional env_fallback only when the caller explicitly provides one.
    4. Default value only when strict=False.

    Args:
        vault_key: Key name in the Vault secret path (e.g., "postgres_password")
        env_fallback: Environment variable name to check if Vault is unavailable
        default: Default value if both Vault and env are empty
        strict: If True, raises when the secret is unavailable.

    Returns:
        The secret value as a string.
    """
    # 1. Test overrides (highest priority for tests)
    if vault_key in _test_overrides:
        return _test_overrides[vault_key]

    # 2. Try Vault
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


def put_secret(vault_key: str, value: str) -> bool:
    """Write a secret value to Vault KV v2.

    Args:
        vault_key: Key name in the Vault secret path
        value: The secret value to store

    Returns:
        True if the write succeeded, False otherwise.
    """
    vault_token = _get_vault_token()
    if not VAULT_ADDR or not vault_token:
        logger.warning("Vault not configured (address or token missing). Cannot write.")
        return False

    import json
    import urllib.error
    import urllib.request

    url = f"{VAULT_ADDR}/v1/{VAULT_SECRET_PATH}"
    headers = {
        "X-Vault-Token": vault_token,
        "Content-Type": "application/json",
    }
    patch_headers = {
        "X-Vault-Token": vault_token,
        "Content-Type": "application/merge-patch+json",
    }

    payload = json.dumps({"data": {vault_key: value}}).encode("utf-8")

    try:
        req = urllib.request.Request(url, data=payload, headers=patch_headers, method="PATCH")
        with urllib.request.urlopen(req, timeout=5) as response:
            if response.status in (200, 204):
                logger.info("Vault: patched secret '%s' in %s", vault_key, VAULT_SECRET_PATH)
                _publish_shared_cache_invalidation()
                clear_cache()
                return True
    except urllib.error.HTTPError as exc:
        if exc.code not in (404, 405, 415):
            logger.error("Vault: patch failed (%s).", exc.reason)
            return False
        logger.warning("Vault: patch unsupported or path missing; falling back to merge write.")
    except urllib.error.URLError as exc:
        logger.error("Vault: patch failed (%s).", exc.reason)
        return False
    except Exception as exc:
        logger.error("Vault: unexpected patch error (%s).", exc)
        return False

    existing = _fetch_vault_secrets().copy()
    existing[vault_key] = value
    fallback_payload = json.dumps({"data": existing}).encode("utf-8")

    try:
        req = urllib.request.Request(url, data=fallback_payload, headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=5) as response:
            if response.status in (200, 204):
                logger.info("Vault: merge-wrote secret '%s' to %s", vault_key, VAULT_SECRET_PATH)
                _publish_shared_cache_invalidation()
                clear_cache()
                return True
    except urllib.error.URLError as exc:
        logger.error("Vault: write failed (%s).", exc.reason)
    except Exception as exc:
        logger.error("Vault: unexpected write error (%s).", exc)

    return False


def clear_cache() -> None:
    """Clear the cached Vault secrets. Call this to force a re-fetch."""
    global _secrets_cache, _cache_fetched_at
    _secrets_cache = {}
    _cache_fetched_at = 0.0
    logger.info("Vault: secret cache cleared")


def set_test_override(key: str, value: str) -> None:
    """Set a test override for a Vault key.

    This is intended for unit/integration tests only. Overrides take
    precedence over real Vault reads. Call clear_test_overrides() in tearDown.
    """
    global _test_overrides
    _test_overrides[key] = value


def clear_test_override(key: str) -> None:
    """Clear a single test override."""
    global _test_overrides
    _test_overrides.pop(key, None)


def clear_test_overrides() -> None:
    """Clear all test overrides. Call this in test tearDown."""
    global _test_overrides
    _test_overrides = {}
    logger.info("Vault: test overrides cleared")
