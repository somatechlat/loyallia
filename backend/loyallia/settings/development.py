"""
Loyallia Django Settings — DEVELOPMENT
Inherits from base. Enables DEBUG, relaxed CORS, console email.
"""
from .base import *  # noqa: F401, F403

DEBUG = True
ALLOWED_HOSTS = ["*"]

# Email to console in development
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# Relaxed CORS in development
CORS_ALLOW_ALL_ORIGINS = True

# Show SQL queries in development (set to WARNING in production)
import logging

logging.getLogger("django.db.backends").setLevel(logging.DEBUG)

# Django extensions (shell_plus, etc.)
if "django_extensions" not in INSTALLED_APPS:  # noqa: F405
    INSTALLED_APPS += ["django_extensions"]  # noqa: F405

# Use local file storage instead of MinIO in development (optional)
# Uncomment to use local files instead of MinIO:
# STORAGES = {
#     "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
#     "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
# }
