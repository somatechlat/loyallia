"""Loyallia Customers Service Layer.

Extracted business logic from customers API views.
"""

import logging
from typing import Any

from django.db import transaction
from django.db.models import Q
from django.utils.dateparse import parse_date

from apps.cards.models import Card
from apps.customers.models import Customer, CustomerPass
from apps.transactions.models import Enrollment

logger = logging.getLogger(__name__)


def list_customers(tenant, search: str | None, limit: int, offset: int) -> dict:
    """List customers for the current tenant with optional search."""
    queryset = Customer.objects.filter(tenant=tenant).select_related("tenant")

    if search:
        queryset = queryset.filter(
            Q(first_name__icontains=search)
            | Q(last_name__icontains=search)
            | Q(email__icontains=search)
            | Q(phone__icontains=search)
        )

    customers = queryset.order_by("-created_at")[offset : offset + limit]
    total = queryset.count()

    return {
        "customers": customers,
        "total": total,
    }


def search_customers(
    tenant,
    query: str | None,
    program_ids: str | None,
    device_type: str | None,
    wallet_platform: str | None,
) -> list[dict]:
    """Search customers with filters. Max 50 results."""
    queryset = Customer.objects.filter(tenant=tenant, is_active=True)

    if query:
        queryset = queryset.filter(
            Q(first_name__icontains=query)
            | Q(last_name__icontains=query)
            | Q(email__icontains=query)
            | Q(phone__icontains=query)
        )

    if program_ids:
        card_ids = [c.strip() for c in program_ids.split(",") if c.strip()]
        if card_ids:
            queryset = queryset.filter(
                passes__card_id__in=card_ids,
                passes__is_active=True,
            ).distinct()

    if device_type and device_type != "both":
        if device_type == "none":
            queryset = queryset.filter(devices__isnull=True)
        elif device_type in ("ios", "android"):
            queryset = queryset.filter(
                devices__device_type=device_type,
                devices__is_active=True,
            ).distinct()

    if wallet_platform and wallet_platform != "both":
        if wallet_platform == "none":
            wallet_customer_ids = (
                CustomerPass.objects.filter(
                    is_active=True,
                )
                .exclude(
                    apple_pass_id="",
                    google_pass_id="",
                )
                .values_list("customer_id", flat=True)
                .distinct()
            )
            queryset = queryset.exclude(id__in=wallet_customer_ids)
        elif wallet_platform == "apple":
            queryset = queryset.filter(
                passes__is_active=True,
                passes__apple_pass_id__gt="",
            ).distinct()
        elif wallet_platform == "google":
            queryset = queryset.filter(
                passes__is_active=True,
                passes__google_pass_id__gt="",
            ).distinct()

    customers = queryset.order_by("-created_at")[:50]

    passes_qs = CustomerPass.objects.filter(is_active=True).select_related("card")
    customer_ids = [c.id for c in customers]

    passes_map = {}
    for cp in passes_qs.filter(customer_id__in=customer_ids):
        passes_map.setdefault(cp.customer_id, []).append(cp)

    from apps.notifications.models import PushDevice

    devices_map = {}
    for device in PushDevice.objects.filter(
        customer_id__in=customer_ids, is_active=True
    ):
        devices_map.setdefault(device.customer_id, set()).add(device.device_type)

    results = []
    for customer in customers:
        customer_passes = passes_map.get(customer.id, [])
        programs = []
        wallet_platforms = []
        has_apple = False
        has_google = False
        for cp in customer_passes:
            if cp.card and cp.card.name and cp.card.name not in programs:
                programs.append(cp.card.name)
            if cp.apple_pass_id:
                has_apple = True
            if cp.google_pass_id:
                has_google = True
        if has_apple:
            wallet_platforms.append("apple")
        if has_google:
            wallet_platforms.append("google")

        results.append(
            {
                "customer": customer,
                "programs": programs,
                "wallet_platforms": wallet_platforms,
                "devices": devices_map.get(customer.id, set()),
            }
        )

    return results


def create_customer(tenant, data: dict) -> Customer:
    """Create a customer for the current tenant."""
    if Customer.objects.filter(tenant=tenant, email=data["email"]).exists():
        raise ValueError("CUSTOMER_DUPLICATE_EMAIL")

    date_of_birth = None
    if data.get("date_of_birth"):
        date_of_birth = parse_date(data["date_of_birth"])

    return Customer.objects.create(
        tenant=tenant,
        first_name=data["first_name"],
        last_name=data["last_name"],
        email=data["email"],
        phone=data.get("phone") or "",
        date_of_birth=date_of_birth,
        gender=data.get("gender") or "",
        notes=data.get("notes") or "",
    )


def public_enroll(card: Card, customer_data: dict) -> tuple[CustomerPass, Customer, bool, bool]:
    """Public endpoint for customer self-enrollment via QR code scan.

    Does NOT overwrite existing customer profile data — only creates/updates the pass.
    Returns (pass_obj, customer, already_enrolled, is_new_customer).
    """
    date_of_birth = None
    if customer_data.get("date_of_birth"):
        date_of_birth = parse_date(customer_data["date_of_birth"])

    customer, created = Customer.objects.get_or_create(
        tenant=card.tenant,
        email=customer_data["email"],
        defaults={
            "first_name": customer_data["first_name"],
            "last_name": customer_data["last_name"],
            "phone": customer_data.get("phone", ""),
            "date_of_birth": date_of_birth,
            "gender": customer_data.get("gender", ""),
            "notes": customer_data.get("notes", ""),
        },
    )

    existing_pass = CustomerPass.objects.filter(customer=customer, card=card).first()
    if existing_pass:
        return existing_pass, customer, True

    standard_fields = {
        "first_name",
        "last_name",
        "email",
        "phone",
        "date_of_birth",
        "gender",
        "notes",
    }
    dynamic_fields = {
        k: v for k, v in customer_data.items() if k not in standard_fields
    }

    with transaction.atomic():
        pass_obj = CustomerPass.objects.create(customer=customer, card=card)

        if dynamic_fields:
            pass_obj.update_pass_data({"enrollment_data": dynamic_fields})

        Enrollment.objects.create(
            tenant=card.tenant,
            customer=customer,
            card=card,
            enrollment_method="qr_scan",
        )

        from apps.automation.engine import fire_trigger_async

        transaction.on_commit(
            lambda: fire_trigger_async(
                trigger="customer_enrolled",
                customer_id=str(customer.id),
                context={
                    "card_id": str(card.id),
                    "card_type": card.card_type,
                    "method": "qr_scan",
                    "is_new_customer": created,
                },
            )
        )

        from apps.customers.tasks import generate_qr_for_pass

        try:
            task_fn: Any = generate_qr_for_pass
            transaction.on_commit(lambda: task_fn.delay(str(pass_obj.id)))
        except Exception as e:
            logger.warning(
                "Could not queue QR generation task for pass %s: %s",
                str(pass_obj.id),
                e,
                exc_info=True,
            )

    return pass_obj, customer, False


def resend_pass_email(card: Card, email: str, base_url: str) -> dict:
    """Resend a customer's pass link via email.

    Returns {"email": customer_email} on success.
    """
    from django.core.mail import send_mail

    from common.email_config import get_default_from_email

    customer = Customer.objects.filter(tenant=card.tenant, email=email).first()
    if not customer:
        raise ValueError("CUSTOMER_NOT_FOUND")

    existing_pass = CustomerPass.objects.filter(customer=customer, card=card).first()
    if not existing_pass:
        raise ValueError("PASS_NOT_FOUND")

    pass_id = str(existing_pass.id)
    pass_url = f"{base_url}/pass/{pass_id}/"
    apple_url = f"{base_url}/api/v1/wallet/apple/{pass_id}/"
    google_url = f"{base_url}/api/v1/wallet/google/{pass_id}/?redirect=true"

    wallet_instructions = f"""Apple Wallet (iPhone/iPad):
{apple_url}

Google Wallet (Android):
{google_url}
"""

    subject = f"Tu tarjeta de {card.name} — {card.tenant.name}"
    message = f"""Hola {customer.first_name},

Ya estás inscrito en el programa {card.name} de {card.tenant.name}.
Aquí tienes los enlaces para acceder a tu tarjeta digital:

Ver tu tarjeta (código QR):
{pass_url}

{wallet_instructions}
---
¿Necesitas gestionar tus datos?
Muy pronto podrás crear una contraseña y acceder a tu portal de cliente
para ver todas tus tarjetas, descargarlas y gestionar tu información.

Saludos,
Equipo {card.tenant.name}
"""

    html_message = f"""<html><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
<div style="max-width: 480px; margin: 0 auto; padding: 24px;">
  <h2 style="color: #1a1a2e;">¡Hola {customer.first_name}!</h2>
  <p>Ya estás inscrito en <strong>{card.name}</strong> de <strong>{card.tenant.name}</strong>.</p>
  <div style="background: #f8f9fa; border-radius: 12px; padding: 16px; margin: 16px 0;">
    <p style="margin: 0 0 8px;"><strong>Tu tarjeta digital:</strong></p>
    <a href="{pass_url}" style="display: inline-block; background: #5660ff; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Ver mi tarjeta</a>
  </div>
  <p style="color: #666; font-size: 14px;">Muy pronto podrás crear una contraseña y acceder a tu portal de cliente para gestionar todas tus tarjetas e información</p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
  <p style="font-size: 12px; color: #999;">Equipo {card.tenant.name}</p>
</div>
</body></html>"""

    send_mail(
        subject=subject,
        message=message,
        from_email=get_default_from_email(),
        recipient_list=[customer.email],
        html_message=html_message,
        fail_silently=False,
    )

    return {"email": customer.email}


def update_customer(customer: Customer, data: dict) -> tuple[Customer, list[str]]:
    """Update customer fields safely.

    Returns (updated_customer, list_of_updated_fields).
    """
    update_fields = []

    if data.get("first_name") is not None:
        customer.first_name = data["first_name"]
        update_fields.append("first_name")
    if data.get("last_name") is not None:
        customer.last_name = data["last_name"]
        update_fields.append("last_name")
    if data.get("phone") is not None:
        customer.phone = data["phone"]
        update_fields.append("phone")
    if data.get("date_of_birth") is not None:
        customer.date_of_birth = parse_date(data["date_of_birth"])
        update_fields.append("date_of_birth")
    if data.get("gender") is not None:
        customer.gender = data["gender"]
        update_fields.append("gender")
    if data.get("notes") is not None:
        customer.notes = data["notes"]
        update_fields.append("notes")
    if data.get("is_active") is not None:
        customer.is_active = data["is_active"]
        update_fields.append("is_active")

    if update_fields:
        customer.save(update_fields=update_fields + ["updated_at"])

    return customer, update_fields


def delete_customer(customer: Customer) -> None:
    """Permanent delete of a customer and all associated data."""
    customer.delete()


def get_customer_passes(customer: Customer) -> list[CustomerPass]:
    """Get all passes for a customer."""
    return list(CustomerPass.objects.filter(customer=customer).select_related("card"))


def enroll_customer(tenant, customer: Customer, card: Card) -> CustomerPass:
    """Enroll customer in a loyalty program."""
    if CustomerPass.objects.filter(customer=customer, card=card).exists():
        raise ValueError("ALREADY_ENROLLED")

    with transaction.atomic():
        pass_obj = CustomerPass.objects.create(customer=customer, card=card)

        Enrollment.objects.create(
            tenant=tenant, customer=customer, card=card, enrollment_method="manual"
        )

        from apps.automation.engine import fire_trigger_async

        transaction.on_commit(
            lambda: fire_trigger_async(
                trigger="customer_enrolled",
                customer_id=str(customer.id),
                context={
                    "card_id": str(card.id),
                    "card_type": card.card_type,
                    "method": "manual",
                },
            )
        )

        from apps.customers.tasks import generate_qr_for_pass

        try:
            task_fn: Any = generate_qr_for_pass
            transaction.on_commit(lambda: task_fn.delay(str(pass_obj.id)))
        except Exception as e:
            logger.warning(
                "Could not queue QR generation task for pass %s: %s",
                str(pass_obj.id),
                e,
                exc_info=True,
            )

    return pass_obj
