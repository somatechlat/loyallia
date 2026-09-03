"""Vault backup and restore operations."""

import json
import logging
import os
import ssl
import urllib.error
import urllib.request
from datetime import datetime

from django.conf import settings

from apps.backup.services.config import temp_backup_dir

logger = logging.getLogger(__name__)


def backup_vault(job_id: str) -> dict:
    """Export Vault KV secrets to a JSON file."""
    tmp_dir = temp_backup_dir("vault")
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    vault_file = os.path.join(tmp_dir, f"loyallia_vault_{timestamp}.json")

    try:
        from common.vault import VAULT_ADDR, VAULT_SECRET_PATH, _get_vault_token

        vault_token = _get_vault_token()
        vault_addr = VAULT_ADDR
        secret_path = VAULT_SECRET_PATH

        if not vault_addr or not vault_token:
            logger.warning("backup_vault: Vault not configured, skipping")
            return {
                "success": True,
                "component": "vault",
                "job_id": job_id,
                "file_path": "",
                "file_size": 0,
                "skipped": True,
                "reason": "Vault not configured",
            }

        url = f"{vault_addr}/v1/{secret_path}"
        headers = {"X-Vault-Token": vault_token}
        ssl_context = _build_ssl_context()

        req = urllib.request.Request(url, headers=headers, method="GET")
        with urllib.request.urlopen(req, timeout=settings.BACKUP_VAULT_TIMEOUT, context=ssl_context) as response:
            body = response.read().decode("utf-8")

        secrets_data = json.loads(body)
        with open(vault_file, "w", encoding="utf-8") as f:
            json.dump(secrets_data, f, indent=2, sort_keys=True)

        file_size = os.path.getsize(vault_file)
        os.chmod(vault_file, 0o600)
        logger.info("backup_vault: job %s completed, size=%d bytes", job_id, file_size)
        return {
            "success": True,
            "component": "vault",
            "job_id": job_id,
            "file_path": vault_file,
            "file_size": file_size,
        }
    except Exception as e:
        logger.exception("backup_vault failed for job %s: %s", job_id, e)
        raise


def restore_vault(vault_file: str) -> bool:
    """Restore Vault KV secrets from JSON backup."""
    try:
        from common.vault import VAULT_ADDR, VAULT_SECRET_PATH, _get_vault_token

        vault_token = _get_vault_token()
        vault_addr = VAULT_ADDR
        secret_path = VAULT_SECRET_PATH

        if not vault_addr or not vault_token:
            logger.warning("restore: Vault not configured, skipping vault restore")
            return True

        with open(vault_file, encoding="utf-8") as f:
            secrets_data = json.load(f)

        data_to_restore = secrets_data
        if "data" in secrets_data and "data" in secrets_data["data"]:
            data_to_restore = secrets_data["data"]["data"]
        elif "data" in secrets_data:
            data_to_restore = secrets_data["data"]

        ssl_context = _build_ssl_context()
        url = f"{vault_addr}/v1/{secret_path}"
        payload = json.dumps({"data": data_to_restore}).encode("utf-8")
        headers = {"X-Vault-Token": vault_token, "Content-Type": "application/json"}

        req = urllib.request.Request(url, data=payload, headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=settings.BACKUP_VAULT_TIMEOUT, context=ssl_context) as response:
            if response.status in (200, 204):
                logger.info("restore: Vault KV secrets restored")
                return True
            logger.error("restore: Vault returned status %d", response.status)
            return False
    except Exception as e:
        logger.exception("restore: Vault restore failed: %s", e)
        return False


def _build_ssl_context() -> ssl.SSLContext:
    """Build SSL context for Vault HTTPS connections."""
    ssl_context = ssl.create_default_context()
    vault_ca_cert = os.environ.get("VAULT_CACERT", "/vault/certs/vault.crt")
    if vault_ca_cert and os.path.isfile(vault_ca_cert):
        ssl_context.load_verify_locations(vault_ca_cert)
    else:
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
    return ssl_context
