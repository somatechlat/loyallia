"""Loyallia Cards Service Layer.

Extracted business logic from cards API views.
"""

import logging
import uuid

from django.db import transaction
from django.db.models import Count, Q

from apps.cards.models import Card
from apps.customers.models import CustomerPass
from apps.transactions.models import Enrollment

logger = logging.getLogger(__name__)


def list_programs(tenant):
    """Return all loyalty programs for tenant with enrollment counts."""
    cards = list(
        Card.objects.filter(tenant=tenant)
        .annotate(_enrollments_count=Count("passes", distinct=True))
        .order_by("-created_at")
    )
    return [(card, getattr(card, "_enrollments_count", 0)) for card in cards]


def create_program(tenant, data: dict) -> Card:
    """Create a new loyalty program."""
    if Card.objects.filter(tenant=tenant, name=data["name"]).exists():
        raise ValueError("PROGRAM_DUPLICATE_NAME")

    metadata = data.get("metadata", {})

    stamps_required = data.get("stamps_required")
    if stamps_required is not None:
        metadata["stamps_required"] = stamps_required

    reward_description = data.get("reward_description")
    if reward_description is not None:
        metadata["reward_description"] = reward_description

    provider = data.get("provider")
    if provider is not None:
        metadata["provider"] = provider

    return Card.objects.create(
        tenant=tenant,
        card_type=data["card_type"],
        barcode_type=data.get("barcode_type", "qr_code"),
        name=data["name"],
        description=data.get("description", ""),
        logo_url=data.get("logo_url", ""),
        background_color=data.get("background_color", "#1a1a2e"),
        text_color=data.get("text_color", "#ffffff"),
        strip_image_url=data.get("strip_image_url", ""),
        icon_url=data.get("icon_url", ""),
        stamps_required=stamps_required,
        metadata=metadata,
        locations=data.get("locations", []),
    )


def update_program(card: Card, data: dict, tenant) -> Card:
    """Update card fields and sync to Google Wallet if needed."""
    update_fields = []

    if data.get("name") is not None:
        if Card.objects.filter(tenant=tenant, name=data["name"]).exclude(id=card.id).exists():
            raise ValueError("PROGRAM_DUPLICATE_NAME")
        card.name = data["name"]
        update_fields.append("name")

    if data.get("description") is not None:
        card.description = data["description"]
        update_fields.append("description")

    if data.get("logo_url") is not None:
        card.logo_url = data["logo_url"]
        update_fields.append("logo_url")

    if data.get("background_color") is not None:
        card.background_color = data["background_color"]
        update_fields.append("background_color")

    if data.get("text_color") is not None:
        card.text_color = data["text_color"]
        update_fields.append("text_color")

    if data.get("strip_image_url") is not None:
        card.strip_image_url = data["strip_image_url"]
        update_fields.append("strip_image_url")

    if data.get("icon_url") is not None:
        card.icon_url = data["icon_url"]
        update_fields.append("icon_url")

    if data.get("metadata") is not None:
        card.metadata = data["metadata"]
        update_fields.append("metadata")

    if data.get("locations") is not None:
        card.locations = data["locations"]
        update_fields.append("locations")

    if data.get("barcode_type") is not None:
        card.barcode_type = data["barcode_type"]
        update_fields.append("barcode_type")

    if data.get("is_active") is not None:
        card.is_active = data["is_active"]
        update_fields.append("is_active")

    if data.get("is_published") is not None:
        card.is_published = data["is_published"]
        update_fields.append("is_published")

    if data.get("stamps_required") is not None:
        card.stamps_required = data["stamps_required"]
        update_fields.append("stamps_required")
        if card.metadata is None:
            card.metadata = {}
        card.metadata["stamps_required"] = data["stamps_required"]

    if data.get("reward_description") is not None:
        if card.metadata is None:
            card.metadata = {}
        card.metadata["reward_description"] = data["reward_description"]
        if "metadata" not in update_fields:
            update_fields.append("metadata")

    if data.get("provider") is not None:
        if card.metadata is None:
            card.metadata = {}
        card.metadata["provider"] = data["provider"]
        if "metadata" not in update_fields:
            update_fields.append("metadata")

    if update_fields:
        try:
            from apps.customers.tasks import update_loyalty_class_async
        except Exception as e:
            logger.error(
                "Failed to enqueue Google Wallet sync for Card %s on update: %s",
                card.id,
                e,
            )
            update_loyalty_class_async = None

        try:
            with transaction.atomic():
                card.save(update_fields=update_fields + ["updated_at"])
                if update_loyalty_class_async is not None:
                    transaction.on_commit(lambda: update_loyalty_class_async.delay(str(card.id)))  # type: ignore[reportCallIssue]
        except ValueError as exc:
            raise ValueError(f"VALIDATION_ERROR:{exc}")

    return card


def publish_program(card: Card) -> Card:
    """Publish a loyalty program so it becomes visible for enrollments."""
    card.is_published = True
    card.is_active = True
    card.save(update_fields=["is_published", "is_active", "updated_at"])
    return card


def suspend_program(card: Card) -> Card:
    """Toggle the active status of a loyalty program."""
    card.is_active = not card.is_active
    card.save(update_fields=["is_active", "updated_at"])
    return card


def delete_program(card: Card) -> dict:
    """Delete a loyalty program and all associated passes.

    Returns deletion statistics.
    """
    pass_count = CustomerPass.objects.filter(card=card).count()
    active_pass_count = CustomerPass.objects.filter(card=card, is_active=True).count()

    with transaction.atomic():
        CustomerPass.objects.filter(card=card).delete()
        card.delete()

    return {
        "deleted_passes": pass_count,
        "active_passes": active_pass_count,
    }


def program_member_count(card: Card) -> dict:
    """Return total and active member counts for a program."""
    total = CustomerPass.objects.filter(card=card).count()
    active = CustomerPass.objects.filter(card=card, is_active=True).count()
    return {"count": total, "active_count": active}


def program_members(card: Card, search: str | None, limit: int, offset: int) -> dict:
    """Return paginated members of a program."""
    qs = CustomerPass.objects.filter(card=card).select_related("customer")

    if search:
        qs = qs.filter(
            Q(customer__first_name__icontains=search)
            | Q(customer__last_name__icontains=search)
            | Q(customer__email__icontains=search)
            | Q(customer__phone__icontains=search)
        )

    total = qs.count()
    passes = qs[offset : offset + limit]

    items = []
    for cp in passes:
        c = cp.customer
        items.append(
            {
                "id": str(c.id),
                "first_name": c.first_name,
                "last_name": c.last_name,
                "email": c.email,
                "phone": c.phone,
                "total_visits": c.total_visits,
                "total_spent": str(c.total_spent),
                "last_visit": c.last_visit.isoformat() if c.last_visit else None,
                "is_active": c.is_active,
                "enrolled_at": cp.enrolled_at.isoformat() if cp.enrolled_at else "",
                "pass_state": {
                    "stamp_count": cp.stamp_count_val,
                    "cashback_balance": str(cp.cashback_balance_val),
                    "coupon_used": cp.coupon_redemption_count > 0,
                    "gift_balance": str(cp.gift_balance_val),
                    "multipass_remaining": cp.multipass_remaining_val,
                },
            }
        )

    return {"items": items, "total": total}


def program_transactions(card: Card, limit: int, offset: int) -> dict:
    """Return paginated transactions for a program."""
    from apps.transactions.models import Transaction

    qs = Transaction.objects.filter(customer_pass__card=card).select_related("customer_pass__customer")
    total = qs.count()
    transactions = qs.order_by("-created_at")[offset : offset + limit]

    items = []
    for t in transactions:
        c = t.customer_pass.customer if t.customer_pass else None
        items.append(
            {
                "id": str(t.id),
                "customer_name": f"{c.first_name} {c.last_name}".strip() if c else "—",
                "amount": str(t.amount),
                "type": t.transaction_type,
                "created_at": t.created_at.isoformat() if t.created_at else "",
            }
        )

    return {"items": items, "total": total}


def program_stats(card: Card) -> dict:
    """Return program statistics."""
    from apps.transactions.models import Transaction

    enrollment_count = Enrollment.objects.filter(card=card).count()
    active_passes = CustomerPass.objects.filter(card=card, is_active=True).count()
    transaction_count = Transaction.objects.filter(customer_pass__card=card).count()

    return {
        "program_id": str(card.id),
        "program_name": card.name,
        "enrollments": enrollment_count,
        "active_passes": active_passes,
        "transactions": transaction_count,
        "card_type": card.card_type,
        "is_active": card.is_active,
    }


def public_program(slug: str) -> dict:
    """Public program info for the enrollment page."""
    try:
        card_uuid = uuid.UUID(slug)
    except ValueError:
        raise ValueError("PROGRAM_NOT_FOUND")

    try:
        card = Card.objects.select_related("tenant").get(
            id=card_uuid,
            is_active=True,
            is_published=True,
        )
    except Card.DoesNotExist:
        raise ValueError("PROGRAM_NOT_FOUND")

    tenant = card.tenant

    return {
        "program_id": str(card.id),
        "name": card.name,
        "description": card.description,
        "card_type": card.card_type,
        "logo_url": card.logo_url,
        "background_color": card.background_color,
        "text_color": card.text_color,
        "strip_image_url": card.strip_image_url,
        "metadata": card.metadata,
        "tenant": {
            "name": tenant.name,
            "logo_url": tenant.logo_url,
            "primary_color": tenant.primary_color,
            "secondary_color": tenant.secondary_color,
        },
    }
