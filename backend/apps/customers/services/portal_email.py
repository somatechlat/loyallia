"""
Loyallia Customer Portal Email Service (apps.customers.services.portal_email)

Business logic for sending portal-related emails.
Called by: apps.customers.portal_api
"""

import logging

from django.conf import settings

from common.email_template import send_branded_email

logger = logging.getLogger(__name__)


def send_portal_password_email(email: str, password: str) -> None:
    """Send temporary password email to customer for portal access.

    Args:
        email: The customer's email address.
        password: The temporary password to include in the email.

    Raises:
        Exception: Re-raises so the caller can handle failure appropriately.
    """
    base = (
        getattr(settings, "PUBLIC_BASE_URL", "")
        or getattr(settings, "APP_URL", "")
        or "http://localhost"
    )
    login_url = f"{base.rstrip('/')}/portal/login"

    try:
        send_branded_email(
            subject="Tu contraseña de acceso al Portal de Cliente",
            to=[email],
            title="Portal de Cliente",
            subtitle="Accede a tus tarjetas y datos",
            greeting="Hola,",
            paragraphs=[
                "Recibiste una contraseña temporal para el Portal de Cliente Loyallia.",
                "Úsala junto con tu correo para iniciar sesión.",
            ],
            credentials_email=email,
            credentials_password=password,
            cta_label="Ir al Portal",
            cta_url=login_url,
            warning="Por seguridad, te recomendamos cambiarla después de iniciar sesión.",
        )
    except Exception as exc:
        logger.error("Failed to send portal password email to %s: %s", email, exc)
        raise
