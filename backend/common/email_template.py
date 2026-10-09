"""
Loyallia branded HTML email template.

Single reusable shell for every platform email. Callers only pass content
slots: greeting, body paragraphs, optional code, CTA, credentials, warning.

Usage:
    from common.email_template import send_branded_email

    send_branded_email(
        subject="Tu código Loyallia",
        to=["user@example.com"],
        greeting="Hola Marco,",
        paragraphs=["Tu código de verificación es:"],
        code="123456",
        cta_label="Abrir portal",
        cta_url="https://rewards.loyallia.com/portal/login",
        warning="No compartas este código con nadie.",
    )
"""

from __future__ import annotations

import html
import logging
from datetime import datetime
from typing import Iterable

from django.conf import settings
from django.core.mail import EmailMultiAlternatives

from common.email_config import get_default_from_email
from common.messages import get_message

logger = logging.getLogger(__name__)

DEFAULT_PRIMARY = "#5660FF"
DEFAULT_BRAND = "Loyallia"


def _base_url() -> str:
    return (
        getattr(settings, "PUBLIC_BASE_URL", "")
        or getattr(settings, "APP_URL", "")
        or "https://rewards.loyallia.com"
    ).rstrip("/")


def _escape(value: object) -> str:
    return html.escape(str(value if value is not None else ""), quote=True)


def _paragraphs_html(paragraphs: Iterable[str] | None) -> str:
    if not paragraphs:
        return ""
    parts = []
    for p in paragraphs:
        text = _escape(p)
        if text:
            parts.append(f'<p style="margin:0 0 14px;font-size:14px;line-height:1.65;color:#475569;">{text}</p>')
    return "".join(parts)


def _code_block(code: str, label: str = "") -> str:
    return f"""
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:20px;text-align:center;margin:20px 0;">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;font-weight:700;margin-bottom:8px;">{_escape(label or get_message("EMAIL_TEMPLATE_CODE_LABEL"))}</div>
      <div style="font-size:32px;font-weight:800;letter-spacing:0.28em;color:#0f172a;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">{_escape(code)}</div>
    </div>"""


def _cta_block(label: str, url: str, primary: str) -> str:
    if not url:
        return ""
    return f"""
    <div style="margin:22px 0 8px;text-align:center;">
      <a href="{_escape(url)}"
         style="display:inline-block;padding:14px 28px;background:{_escape(primary)};color:#ffffff;text-decoration:none;border-radius:12px;font-weight:700;font-size:14px;">
        {_escape(label)}
      </a>
    </div>"""


def _credentials_block(email: str, password: str) -> str:
    if not password:
        return ""
    return f"""
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin:16px 0;">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;font-weight:700;margin-bottom:6px;">{_escape(get_message("EMAIL_TEMPLATE_EMAIL_LABEL"))}</div>
      <div style="font-size:14px;font-weight:600;color:#0f172a;margin-bottom:12px;word-break:break-all;">{_escape(email)}</div>
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;font-weight:700;margin-bottom:6px;">{_escape(get_message("EMAIL_TEMPLATE_PASSWORD_LABEL"))}</div>
      <div style="font-size:18px;font-weight:800;color:#0f172a;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">{_escape(password)}</div>
    </div>"""


def _warning_block(text: str) -> str:
    if not text:
        return ""
    return f"""
    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:12px 16px;margin:16px 0;">
      <p style="margin:0;font-size:12px;line-height:1.5;color:#92400e;">{_escape(text)}</p>
    </div>"""


def render_email_html(
    *,
    title: str,
    subtitle: str = "",
    preheader: str = "",
    greeting: str = "",
    paragraphs: Iterable[str] | None = None,
    code: str = "",
    code_label: str = "",
    cta_label: str = "",
    cta_url: str = "",
    credentials_email: str = "",
    credentials_password: str = "",
    warning: str = "",
    extra_html: str = "",
    primary_color: str = DEFAULT_PRIMARY,
    brand_name: str = DEFAULT_BRAND,
) -> str:
    """Render full branded HTML email body."""
    pre = _escape(preheader or subtitle or title)
    year = datetime.now().year
    site = _base_url()
    primary = primary_color or DEFAULT_PRIMARY

    return f"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <title>{_escape(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">{pre}&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 10px 40px rgba(15,23,42,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,{_escape(primary)} 0%,#312e81 100%);padding:28px 24px;text-align:center;color:#ffffff;">
              <div style="font-size:12px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;opacity:0.85;margin-bottom:8px;">{_escape(brand_name)}</div>
              <h1 style="margin:0;font-size:22px;font-weight:800;line-height:1.25;">{_escape(title)}</h1>
              {f'<p style="margin:8px 0 0;font-size:13px;opacity:0.88;">{_escape(subtitle)}</p>' if subtitle else ''}
            </td>
          </tr>
          <tr>
            <td style="padding:28px 24px 8px;">
              {f'<p style="margin:0 0 12px;font-size:16px;font-weight:700;color:#0f172a;">{_escape(greeting)}</p>' if greeting else ''}
              {_paragraphs_html(paragraphs)}
              {_code_block(code, code_label) if code else ''}
              {_credentials_block(credentials_email, credentials_password)}
              {_cta_block(cta_label, cta_url, primary)}
              {_warning_block(warning)}
              {extra_html}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 24px 24px;">
              <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.5;">
                {_escape(get_message("EMAIL_TEMPLATE_OPEN_LINK"))}<br>
                <span style="color:#64748b;word-break:break-all;">{_escape(cta_url or site)}</span>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:18px 24px;text-align:center;">
              <p style="margin:0;font-size:11px;color:#94a3b8;">
                © {year} <a href="{_escape(site)}" style="color:{_escape(primary)};text-decoration:none;font-weight:600;">{_escape(brand_name)}</a>
                · {_escape(get_message("EMAIL_TEMPLATE_FOOTER_TAGLINE"))}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def send_branded_email(
    *,
    subject: str,
    to: list[str],
    title: str = "",
    subtitle: str = "",
    preheader: str = "",
    greeting: str = "",
    paragraphs: Iterable[str] | None = None,
    code: str = "",
    code_label: str = "",
    cta_label: str = "",
    cta_url: str = "",
    credentials_email: str = "",
    credentials_password: str = "",
    warning: str = "",
    extra_html: str = "",
    primary_color: str = DEFAULT_PRIMARY,
    brand_name: str = DEFAULT_BRAND,
    from_email: str | None = None,
) -> bool:
    """Render branded HTML and send via Django email backend.

    Returns True if at least one message was sent.
    """
    if not to:
        logger.warning("send_branded_email called with empty recipient list")
        return False

    html_body = render_email_html(
        title=title or subject,
        subtitle=subtitle,
        preheader=preheader or subtitle or subject,
        greeting=greeting,
        paragraphs=paragraphs,
        code=code,
        code_label=code_label,
        cta_label=cta_label,
        cta_url=cta_url,
        credentials_email=credentials_email,
        credentials_password=credentials_password,
        warning=warning,
        extra_html=extra_html,
        primary_color=primary_color,
        brand_name=brand_name,
    )
    plain = "\n".join(
        filter(
            None,
            [
                title or subject,
                subtitle,
                greeting,
                *(paragraphs or []),
                f"Código: {code}" if code else "",
                f"{get_message('EMAIL_TEMPLATE_PASSWORD_LABEL')}: {credentials_password}"
                if credentials_password
                else "",
                f"Abrir: {cta_url}" if cta_url else "",
                warning,
                brand_name,
            ],
        )
    )

    msg = EmailMultiAlternatives(
        subject=subject,
        body=plain,
        from_email=from_email or get_default_from_email(),
        to=to,
    )
    msg.attach_alternative(html_body, "text/html")
    sent = msg.send(fail_silently=False)
    logger.info("Branded email sent subject=%r to=%s count=%s", subject, to, sent)
    return bool(sent)
