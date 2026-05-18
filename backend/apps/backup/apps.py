"""
Loyallia  Backup App Configuration

Provides database backup/restore orchestration with Vault-secured credentials,
encrypted compressed archives, S3-compatible object storage, and full audit trail.
"""

from django.apps import AppConfig


class BackupConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.backup"
    verbose_name = "Backup & Restore"
