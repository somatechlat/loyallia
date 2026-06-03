"""
Test credential helper.

User passwords are not Vault secrets. Local development credentials are loaded
from the ignored Playwright credential file when a full-stack test explicitly
needs a real login password.
"""

from __future__ import annotations

import json
from pathlib import Path


def _credentials_path() -> Path:
    return (
        Path(__file__).resolve().parents[2]
        / "frontend"
        / ".auth"
        / "e2e-credentials.json"
    )


def load_e2e_credentials() -> dict:
    path = _credentials_path()
    if not path.exists():
        raise RuntimeError(
            "Local E2E credentials are missing. Run "
            "`python manage.py provision_development_rbac_test_users --generate` "
            "in the development environment."
        )
    return json.loads(path.read_text(encoding="utf-8")).get("users", {})


def get_test_password(role: str = "owner") -> str:
    """Return a local development test password from the ignored credential file."""
    credentials = load_e2e_credentials()
    password = credentials.get(role, {}).get("password", "")
    if not password:
        raise RuntimeError(f"Missing local E2E password for role '{role}'.")
    return password
