"""
Loyallia — Cards (Loyalty Programs) API router.
Phase 3 implementation of all program CRUD endpoints.
"""

from django.db.models import Count
from django.shortcuts import get_object_or_404
from ninja import Router
from ninja.errors import HttpError
from pydantic import BaseModel, field_validator

from apps.cards.models import Card, CardType
from common.messages import get_message
from common.permissions import is_manager_or_owner, is_owner, jwt_auth
from common.plan_enforcement import require_active_subscription, enforce_limit

router = Router()


# =============================================================================
# SCHEMAS
# =============================================================================


class CardCreateIn(BaseModel):
    name: str
    description: str | None = ""
    card_type: CardType
    barcode_type: str | None = "qr_code"
    logo_url: str | None = ""
    background_color: str | None = "#1a1a2e"
    text_color: str | None = "#ffffff"
    strip_image_url: str | None = ""
    icon_url: str | None = ""
    metadata: dict | None = {}
    locations: list | None = []

    @field_validator("metadata")
    @classmethod
    def validate_metadata_size(cls, v: dict | None) -> dict | None:
        """B-007: Limit metadata JSON to 10KB to prevent abuse."""
        if v is not None:
            import json

            size = len(json.dumps(v))
            if size > 10240:
                raise ValueError(
                    f"Metadata too large ({size} bytes). Maximum allowed is 10KB."
                )
        return v

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        if len(v.strip()) < 2:
            raise ValueError("Program name must be at least 2 characters")
        return v.strip()

    @field_validator("background_color", "text_color")
    @classmethod
    def validate_hex_color(cls, v: str) -> str:
        if not v.startswith("#") or len(v) != 7:
            raise ValueError("Color must be a valid hex color (e.g., #1a1a2e)")
        try:
            int(v[1:], 16)
        except ValueError:
            raise ValueError("Invalid hex color format")
        return v


class CardUpdateIn(BaseModel):
    name: str | None = None
    description: str | None = None
    barcode_type: str | None = None
    logo_url: str | None = None
    background_color: str | None = None
    text_color: str | None = None
    strip_image_url: str | None = None
    icon_url: str | None = None
    metadata: dict | None = None
    is_active: bool | None = None
    locations: list | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str | None) -> str | None:
        if v is not None and len(v.strip()) < 2:
            raise ValueError("Program name must be at least 2 characters")
        return v.strip() if v else v


class CardOut(BaseModel):
    id: str
    tenant_id: str
    card_type: CardType
    barcode_type: str
    name: str
    description: str
    logo_url: str
    background_color: str
    text_color: str
    strip_image_url: str
    icon_url: str
    is_active: bool
    metadata: dict
    locations: list
    created_at: str
    updated_at: str
    enrollments_count: int = 0

    @staticmethod
    def from_model(card: Card, enrollments_count: int | None = None) -> "CardOut":
        return CardOut(
            id=str(card.id),
            tenant_id=str(card.tenant_id),
            card_type=card.card_type,
            barcode_type=card.barcode_type,
            name=card.name,
            description=card.description,
            logo_url=card.logo_url,
            background_color=card.background_color,
            text_color=card.text_color,
            strip_image_url=card.strip_image_url,
            icon_url=card.icon_url,
            is_active=card.is_active,
            metadata=card.metadata,
            locations=card.locations,
            created_at=card.created_at.isoformat(),
            updated_at=card.updated_at.isoformat(),
            enrollments_count=enrollments_count if enrollments_count is not None else card.passes.count(),
        )


class MessageOut(BaseModel):
    success: bool
    message: str


# =============================================================================
# ENDPOINTS
# =============================================================================


class CardListOut(BaseModel):
    programs: list[CardOut]
    total: int


@router.get(
    "/", auth=jwt_auth, response=CardListOut, summary="Listar programas de fidelización"
)
def list_programs(request):
    """Returns all loyalty programs for the current tenant. MANAGER+ only."""
    if not is_manager_or_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    cards = list(Card.objects.filter(tenant=request.tenant).annotate(
        _enrollments_count=Count("passes", distinct=True)
    ).order_by("-created_at"))
    return {"programs": [CardOut.from_model(c, getattr(c, '_enrollments_count', c.passes.count())) for c in cards], "total": len(cards)}


@router.post(
    "/", auth=jwt_auth, response=CardOut, summary="Crear programa de fidelización"
)
@require_active_subscription
@enforce_limit("programs")
def create_program(request, data: CardCreateIn):
    """Create a new loyalty program. OWNER only."""
    from common.permissions import is_owner

    if not is_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    # Check tenant program limit (from subscription plan, not hardcoded)
    from apps.billing.models import Subscription

    current_count = Card.objects.filter(tenant=request.tenant).count()
    sub = Subscription.objects.filter(tenant=request.tenant).first()
    max_programs = sub.get_limit("programs") if sub else 0
    if current_count >= max_programs:
        raise HttpError(400, get_message("TENANT_MAX_PROGRAMS", max=max_programs))

    # Check for duplicate name
    if Card.objects.filter(tenant=request.tenant, name=data.name).exists():
        raise HttpError(400, get_message("PROGRAM_DUPLICATE_NAME"))

    card = Card.objects.create(
        tenant=request.tenant,
        card_type=data.card_type,
        barcode_type=data.barcode_type,
        name=data.name,
        description=data.description,
        logo_url=data.logo_url,
        background_color=data.background_color,
        text_color=data.text_color,
        strip_image_url=data.strip_image_url,
        icon_url=data.icon_url,
        metadata=data.metadata,
        locations=data.locations,
    )

    return CardOut.from_model(card)


@router.get(
    "/{program_id}/", auth=jwt_auth, response=CardOut, summary="Detalle de programa"
)
def get_program(request, program_id: str):
    """Returns a single loyalty program."""
    card = get_object_or_404(Card, id=program_id, tenant=request.tenant)
    return CardOut.from_model(card)


@router.patch(
    "/{program_id}/", auth=jwt_auth, response=CardOut, summary="Actualizar programa"
)
def update_program(request, program_id: str, data: CardUpdateIn):
    """Update a loyalty program. OWNER only."""
    if not is_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    card = get_object_or_404(Card, id=program_id, tenant=request.tenant)

    # Update fields if provided
    update_fields = []
    if data.name is not None:
        # Check for duplicate name (excluding current card)
        if (
            Card.objects.filter(tenant=request.tenant, name=data.name)
            .exclude(id=card.id)
            .exists()
        ):
            raise HttpError(400, get_message("PROGRAM_DUPLICATE_NAME"))
        card.name = data.name
        update_fields.append("name")

    if data.description is not None:
        card.description = data.description
        update_fields.append("description")

    if data.logo_url is not None:
        card.logo_url = data.logo_url
        update_fields.append("logo_url")

    if data.background_color is not None:
        card.background_color = data.background_color
        update_fields.append("background_color")

    if data.text_color is not None:
        card.text_color = data.text_color
        update_fields.append("text_color")

    if data.strip_image_url is not None:
        card.strip_image_url = data.strip_image_url
        update_fields.append("strip_image_url")

    if data.icon_url is not None:
        card.icon_url = data.icon_url
        update_fields.append("icon_url")

    if data.metadata is not None:
        card.metadata = data.metadata
        update_fields.append("metadata")

    if data.locations is not None:
        card.locations = data.locations
        update_fields.append("locations")

    if data.barcode_type is not None:
        card.barcode_type = data.barcode_type
        update_fields.append("barcode_type")

    if data.is_active is not None:
        card.is_active = data.is_active
        update_fields.append("is_active")

    if update_fields:
        card.save(update_fields=update_fields + ["updated_at"])

        # Sync changes to Google Wallet in background (non-blocking if possible, but currently direct)
        try:
            from apps.customers.pass_engine.google_pass import update_loyalty_class

            update_loyalty_class(card)
        except Exception as e:
            import logging

            logging.getLogger(__name__).error(
                f"Failed to sync Card {card.id} to Google Wallet on update: {e}"
            )

    return CardOut.from_model(card)


@router.post(
    "/{program_id}/suspend/",
    auth=jwt_auth,
    response=MessageOut,
    summary="Suspender programa",
)
def suspend_program(request, program_id: str):
    """Suspend a loyalty program (soft delete). OWNER only."""
    if not is_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    card = get_object_or_404(Card, id=program_id, tenant=request.tenant)

    card.is_active = not card.is_active  # Toggle status
    card.save(update_fields=["is_active", "updated_at"])

    msg_code = "PROGRAM_REACTIVATED" if card.is_active else "PROGRAM_SUSPENDED"
    return MessageOut(
        success=True,
        message=get_message(msg_code),
    )


@router.delete(
    "/{program_id}/",
    auth=jwt_auth,
    response=MessageOut,
    summary="Eliminar programa permanentemente",
)
def delete_program(request, program_id: str):
    """Delete a loyalty program PERMANENTLY. OWNER only."""
    if not is_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    card = get_object_or_404(Card, id=program_id, tenant=request.tenant)

    card.delete()

    # LYL-M-API-023: Return 204 No Content on successful delete
    from django.http import HttpResponse

    return HttpResponse(status=204)


@router.get("/{program_id}/stats/", auth=jwt_auth, summary="Estadísticas del programa")
def program_stats(request, program_id: str):
    """Returns program statistics."""
    card = get_object_or_404(Card, id=program_id, tenant=request.tenant)

    # Get enrollment count
    enrollment_count = card.enrollments.count()

    # Get active passes count
    active_passes = card.passes.filter(is_active=True).count()

    # Get transaction count for this program
    from apps.transactions.models import Transaction

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


@router.get(
    "/{slug}/public/", auth=None, summary="Info pública del programa (para enrollment)"
)
def public_program(request, slug: str):
    """
    Public program info for the enrollment page. No authentication required.
    Resolves by tenant slug + program slug (name-based).
    URL format: /api/v1/programs/{tenant_slug}--{card_id}/public/
    Uses card_id to keep it simple and unambiguous.
    """
    import uuid

    try:
        card_uuid = uuid.UUID(slug)
    except ValueError:
        raise HttpError(404, get_message("PROGRAM_NOT_FOUND"))

    try:
        card = Card.objects.select_related("tenant").get(
            id=card_uuid,
            is_active=True,
        )
    except Card.DoesNotExist:
        raise HttpError(404, get_message("PROGRAM_NOT_FOUND"))

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
