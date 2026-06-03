"""
Loyallia Customer Portal Email Service (apps.customers.services.portal_email)

Business logic for sending portal-related emails.
Called by: apps.customers.portal_api
"""

import logging

from django.conf import settings
from django.core.mail import send_mail

from common.email_config import get_default_from_email

logger = logging.getLogger(__name__)


def send_portal_password_email(email: str, password: str) -> None:
    """Send temporary password email to customer for portal access.

    Args:
        email: The customer's email address.
        password: The temporary password to include in the email.

    Raises:
        Exception: Re-raises so the caller can handle failure appropriately.
    """
    subject = "Tu contraseña de acceso al Portal de Cliente"
    login_url = f"{settings.BASE_URL or 'http://localhost'}/portal/login"

    plain_body = (
        f"Hola,\n\n"
        f"Tu contraseña temporal para acceder al Portal de Cliente es:\n\n"
        f"{password}\n\n"
        f"Ingresa aquí: {login_url}\n\n"
        f"Por seguridad, te recomendamos cambiarla después de iniciar sesión.\n\n"
        f"Equipo Loyallia"
    )

    html_body = f"""<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"></head>
<body style="font-family:system-ui,sans-serif;background:#f4f4f8;padding:24px;">
<div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
<h2 style="margin:0 0 8px;color:#1e293b;">Portal de Cliente</h2>
<p style="color:#475569;line-height:1.6;">Hola,</p>
<p style="color:#475569;line-height:1.6;">Tu contraseña temporal es:</p>
<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;text-align:center;margin:16px 0;">
<code style="font-size:20px;font-weight:700;color:#1e293b;letter-spacing:0.05em;">{password}</code>
</div>
<a href="{login_url}" style="display:inline-block;margin:12px 0;padding:14px 28px;background:#5660ff;color:#fff;text-decoration:none;border-radius:12px;font-weight:600;">Ir al Portal</a>
<p style="color:#94a3b8;font-size:12px;margin-top:16px;">Por seguridad, te recomendamos cambiarla después de iniciar sesión</p>
</div>
</body>
</html>
"""

    from_email = get_default_from_email()
    try:
        send_mail(
            subject=subject,
            message=plain_body,
            from_email=from_email,
            recipient_list=[email],
            html_message=html_body,
        )
    except Exception as exc:
        logger.error("Failed to send portal password email to %s: %s", email, exc)
        raise
