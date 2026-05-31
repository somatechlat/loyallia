"""
Loyallia Backup Services

Business logic for platform backup, verification, restore, and cleanup.
Each module handles one backup component (PostgreSQL, Redis, Vault, Media).

Called by: apps.backup.tasks (Celery task wrappers)
"""
