"""
Loyallia Tenant Email Services (apps.tenants.services.email)

Business logic for sending tenant-related emails.
Called by: apps.tenants.api (team management endpoints)
"""

import html
import logging
from datetime import datetime

from django.conf import settings as django_settings
from django.core.mail import EmailMultiAlternatives

from apps.tenants.models import PlatformSetting
from common.email_config import get_default_from_email

logger = logging.getLogger(__name__)


def send_team_member_welcome_email(user, temp_password: str, tenant, payload) -> None:
    """Build and send a welcome HTML email to a newly added team member.

    Args:
        user: The created User instance.
        temp_password: The temporary password generated for the user.
        tenant: The Tenant instance the user belongs to.
        payload: The TeamMemberCreateIn schema instance containing first_name, email, role.

    Raises:
        Exception: Logs the error but does not re-raise so the caller flow continues.
    """
    try:
        role_labels = {
            "MANAGER": "Gerente",
            "STAFF": "Personal / Cajero",
        }
        role_label = role_labels.get(payload.role, payload.role)
        tenant_name = tenant.name

        dashboard_url = PlatformSetting.get(
            "dashboard_url", django_settings.FRONTEND_URL
        )
        login_url = dashboard_url.rstrip("/") + "/login"
        from_email = get_default_from_email()
        primary_color = (
            getattr(tenant, "primary_color", "#6366f1") or "#6366f1"
        )
        current_year = datetime.now().year

        html_content = f"""<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>body{{margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f4f4f8;color:#1e293b;}}.container{{max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);}}.header{{background:linear-gradient(135deg,{html.escape(primary_color)} 0%,#312e81 100%);padding:32px 24px;text-align:center;color:#fff;}}.header h1{{margin:0 0 4px;font-size:22px;font-weight:700;}}.header p{{margin:0;font-size:13px;opacity:0.8;}}.body{{padding:28px 24px;}}.body h2{{margin:0 0 8px;font-size:18px;font-weight:700;color:#1e293b;}}.body p{{margin:0 0 16px;font-size:14px;line-height:1.6;color:#475569;}}.cred-box{{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin:16px 0;}}.cred-box .label{{font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;font-weight:600;margin-bottom:4px;}}.cred-box .value{{font-size:16px;font-weight:700;color:#1e293b;font-family:monospace;}}.cta{{display:inline-block;margin:20px 0;padding:14px 28px;background:{html.escape(primary_color)};color:#fff;text-decoration:none;border-radius:12px;font-weight:600;font-size:14px;}}.warning{{background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:12px 16px;margin:16px 0;}}.warning p{{margin:0;font-size:12px;color:#92400e;}}.footer{{padding:20px 24px;text-align:center;background:#f8fafc;border-top:1px solid #f1f5f9;}}.footer p{{margin:0;font-size:11px;color:#94a3b8;}}.footer a{{color:{html.escape(primary_color)};text-decoration:none;}}</style></head><body><div class="container"><div class="header"><h1>{html.escape(tenant_name)}</h1><p>Bienvenido al equipo</p></div><div class="body"><h2>Hola {html.escape(payload.first_name)}</h2><p>Has sido invitado como <strong>{html.escape(role_label)}</strong> en <strong>{html.escape(tenant_name)}</strong>. A continuación encontrarás tus credenciales de acceso:</p><div class="cred-box"><div class="label">Email de acceso</div><div class="value">{html.escape(payload.email)}</div></div><div class="cred-box"><div class="label">Contraseña temporal</div><div class="value">{html.escape(temp_password)}</div></div><div class="warning"><p><strong>Importante:</strong> Por seguridad, te recomendamos cambiar tu contraseña al iniciar sesión por primera vez.</p></div><center><a href="{html.escape(login_url)}" class="cta">Iniciar Sesión →</a></center><p style="font-size:12px;color:#94a3b8;text-align:center;margin-top:20px;">Si no reconoces esta invitación, puedes ignorar este correo.</p></div><div class="footer"><p>Powered by <a href="https://loyallia.com">Loyallia</a> Intelligent Rewards</p><p style="margin-top:4px;">© {html.escape(str(current_year))} {html.escape(tenant_name)}. Todos los derechos reservados.</p></div></div></body></html>"""

        msg = EmailMultiAlternatives(
            subject=f"Bienvenido al equipo de {tenant_name}",
            from_email=from_email,
            to=[payload.email],
        )
        msg.attach_alternative(html_content, "text/html")
        msg.send(fail_silently=True)
        logger.info("Welcome email sent to %s", payload.email)
    except Exception as exc:
        logger.error("Failed to send welcome email to %s: %s", payload.email, exc)
