"""
Loyallia Cards (Loyalty Programs) API router.
Phase 3 implementation of all program CRUD endpoints.
"""

import logging

from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from ninja import Router
from ninja.errors import HttpError
from pydantic import BaseModel, Field, field_validator

from apps.audit.service import log_action
from apps.cards import services
from apps.cards.models import Card, CardType
from apps.customers.models import CustomerPass
from apps.customers.segment_api import _apply_segment_filter
from common.messages import get_message
from common.permissions import is_manager_or_owner, is_owner, jwt_auth
from common.plan_enforcement import check_plan_limit, require_active_subscription
from common.request import TenantRequest, require_tenant
from common.schemas import MessageOut  # noqa: F401 -- re-exported for other modules

logger = logging.getLogger(__name__)

router = Router()

# SCHEMAS


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
    metadata: dict | None = Field(default_factory=dict)
    locations: list | None = Field(default_factory=list)
    stamps_required: int | None = None
    reward_description: str | None = None
    provider: str | None = None

    @field_validator("metadata")
    @classmethod
    def validate_metadata_size(cls, v: dict | None) -> dict | None:
        """B-007: Limit metadata JSON to 10KB and validate form_fields schema."""
        if v is not None:
            import json

            from django.conf import settings

            size = len(json.dumps(v))
            if size > settings.CARD_METADATA_MAX_SIZE_BYTES:
                raise ValueError(f"Metadata too large ({size} bytes). Maximum allowed is 10KB.")

            # Validate form_fields schema if present
            form_fields = v.get("form_fields")
            if form_fields is not None:
                if not isinstance(form_fields, list):
                    raise ValueError("form_fields must be a list")
                for field in form_fields:
                    if not isinstance(field, dict):
                        raise ValueError("Each form_field must be an object")
                    if not field.get("id"):
                        raise ValueError("Each form_field must have an 'id'")
                    if field.get("type") not in (
                        "text",
                        "email",
                        "tel",
                        "date",
                        "select",
                        "number",
                    ):
                        raise ValueError(f"Invalid form_field type: {field.get('type')}")
                # Ensure mandatory enrollment fields exist
                # Accept either a single 'name' field or 'first_name' + 'last_name'
                field_ids = {f.get("id") for f in form_fields}
                has_name = "name" in field_ids
                has_split_name = "first_name" in field_ids and "last_name" in field_ids
                if not (has_name or has_split_name):
                    raise ValueError(
                        "Enrollment form must include a 'name' field or both 'first_name' and 'last_name' fields"
                    )
                if "email" not in field_ids:
                    raise ValueError("Enrollment form must include an 'email' field")
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
    is_published: bool | None = None
    locations: list | None = None
    stamps_required: int | None = None
    reward_description: str | None = None
    provider: str | None = None

    @field_validator("metadata")
    @classmethod
    def validate_metadata_size(cls, v: dict | None) -> dict | None:
        """B-007: Limit metadata JSON to 10KB and validate form_fields schema."""
        if v is not None:
            import json

            from django.conf import settings

            size = len(json.dumps(v))
            if size > settings.CARD_METADATA_MAX_SIZE_BYTES:
                raise ValueError(f"Metadata too large ({size} bytes). Maximum allowed is 10KB.")

            # Validate form_fields schema if present
            form_fields = v.get("form_fields")
            if form_fields is not None:
                if not isinstance(form_fields, list):
                    raise ValueError("form_fields must be a list")
                for field in form_fields:
                    if not isinstance(field, dict):
                        raise ValueError("Each form_field must be an object")
                    if not field.get("id"):
                        raise ValueError("Each form_field must have an 'id'")
                    if field.get("type") not in (
                        "text",
                        "email",
                        "tel",
                        "date",
                        "select",
                        "number",
                    ):
                        raise ValueError(f"Invalid form_field type: {field.get('type')}")
                # Ensure mandatory enrollment fields exist
                # Accept either a single 'name' field or 'first_name' + 'last_name'
                field_ids = {f.get("id") for f in form_fields}
                has_name = "name" in field_ids
                has_split_name = "first_name" in field_ids and "last_name" in field_ids
                if not (has_name or has_split_name):
                    raise ValueError(
                        "Enrollment form must include a 'name' field or both 'first_name' and 'last_name' fields"
                    )
                if "email" not in field_ids:
                    raise ValueError("Enrollment form must include an 'email' field")
        return v

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
    is_published: bool
    metadata: dict
    locations: list
    created_at: str
    updated_at: str
    enrollments_count: int = 0

    @staticmethod
    def from_model(card: Card, enrollments_count: int | None = None):
        return CardOut(
            id=str(card.id),
            tenant_id=str(card.tenant.id),
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
            is_published=card.is_published,
            metadata=card.metadata,
            locations=card.locations,
            created_at=card.created_at.isoformat(),
            updated_at=card.updated_at.isoformat(),
            enrollments_count=(
                enrollments_count if enrollments_count is not None else CustomerPass.objects.filter(card=card).count()
            ),
        )


class CardListOut(BaseModel):
    programs: list[CardOut]
    total: int


# ENDPOINTS


@router.get("/", auth=jwt_auth, response=CardListOut, summary="Listar programas de fidelización")
def list_programs(request: TenantRequest) -> CardListOut:
    """Returns all loyalty programs for the current tenant. MANAGER+ only."""
    tenant = require_tenant(request)
    if not is_manager_or_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))

    cards = services.list_programs(tenant)
    return CardListOut(
        programs=[CardOut.from_model(card, count) for card, count in cards],
        total=len(cards),
    )


@router.post("/", auth=jwt_auth, response=CardOut, summary="Crear programa de fidelización")
@require_active_subscription
def create_program(request: TenantRequest, data: CardCreateIn) -> CardOut:
    """Create a new loyalty program. OWNER only."""
    from common.permissions import is_owner

    tenant = require_tenant(request)
    if not is_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))

    check_plan_limit(tenant, "programs", write=True)

    try:
        card = services.create_program(tenant, data.model_dump())
    except ValueError as exc:
        msg = str(exc)
        if msg == "PROGRAM_DUPLICATE_NAME":
            raise HttpError(400, get_message(msg))
        raise HttpError(400, get_message("VALIDATION_ERROR", detail=msg))

    log_action(
        request=request,
        action="CREATE",
        resource_type="program",
        resource_id=str(card.id),
        details={"name": card.name, "card_type": card.card_type},
    )
    return CardOut.from_model(card)


@router.get("/{program_id}/", auth=jwt_auth, response=CardOut, summary="Detalle de programa")
def get_program(request: TenantRequest, program_id: str) -> CardOut:
    """Returns a single loyalty program. MANAGER+ only."""
    if not is_manager_or_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    card = get_object_or_404(Card, id=program_id, tenant=request.tenant)
    return CardOut.from_model(card)


@router.patch("/{program_id}/", auth=jwt_auth, response=CardOut, summary="Actualizar programa")
def update_program(request: TenantRequest, program_id: str, data: CardUpdateIn) -> CardOut:
    """Update a loyalty program. OWNER only."""
    if not is_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    card = get_object_or_404(Card, id=program_id, tenant=request.tenant)

    try:
        card = services.update_program(card, data.model_dump(), request.tenant)
    except ValueError as exc:
        msg = str(exc)
        if msg == "PROGRAM_DUPLICATE_NAME":
            raise HttpError(400, get_message(msg))
        if msg.startswith("VALIDATION_ERROR:"):
            raise HttpError(400, get_message("VALIDATION_ERROR", detail=msg.split(":", 1)[1]))
        raise HttpError(400, get_message("VALIDATION_ERROR", detail=msg))

    log_action(
        request=request,
        action="UPDATE",
        resource_type="program",
        resource_id=str(card.id),
        details={"updated_fields": [k for k, v in data.model_dump().items() if v is not None]},
    )
    return CardOut.from_model(card)


@router.post(
    "/{program_id}/publish/",
    auth=jwt_auth,
    response=CardOut,
    summary="Publicar programa",
)
def publish_program(request: TenantRequest, program_id: str) -> CardOut:
    """Publish a loyalty program so it becomes visible for enrollments. OWNER only."""
    if not is_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    card = get_object_or_404(Card, id=program_id, tenant=request.tenant)

    card = services.publish_program(card)

    log_action(
        request=request,
        action="UPDATE",
        resource_type="program",
        resource_id=str(card.id),
        details={"is_published": True, "is_active": True},
    )

    return CardOut.from_model(card)


@router.post(
    "/{program_id}/suspend/",
    auth=jwt_auth,
    response=MessageOut,
    summary="Suspender programa",
)
def suspend_program(request: TenantRequest, program_id: str) -> MessageOut:
    """Suspend a loyalty program (soft delete). OWNER only."""
    if not is_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    card = get_object_or_404(Card, id=program_id, tenant=request.tenant)

    card = services.suspend_program(card)

    log_action(
        request=request,
        action="UPDATE",
        resource_type="program",
        resource_id=str(card.id),
        details={"is_active": card.is_active},
    )

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
def delete_program(request: TenantRequest, program_id: str) -> HttpResponse:
    """Delete a loyalty program PERMANENTLY. OWNER only."""
    if not is_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    card = get_object_or_404(Card, id=program_id, tenant=require_tenant(request))

    stats = services.delete_program(card)

    log_action(
        request=request,
        action="DELETE",
        resource_type="program",
        resource_id=str(card.id),
        details={
            "name": card.name,
            "card_type": card.card_type,
            "deleted_passes": stats["deleted_passes"],
            "active_passes": stats["active_passes"],
        },
    )

    return HttpResponse(status=204)


@router.get("/{program_id}/member-count/", auth=jwt_auth, summary="Contar miembros del programa")
def program_member_count(request: TenantRequest, program_id: str) -> dict:
    """Returns member count for a program. MANAGER+ only."""
    if not is_manager_or_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    card = get_object_or_404(Card, id=program_id, tenant=require_tenant(request))
    return services.program_member_count(card)


@router.get(
    "/{program_id}/segment-counts/",
    auth=jwt_auth,
    summary="Contar segmentos del programa",
)
def program_segment_counts(
    request: TenantRequest,
    program_id: str,
    wallet_platform: str = "both",
) -> dict:
    """Returns segment member counts for a program. MANAGER+ only."""
    if not is_manager_or_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    card = get_object_or_404(Card, id=program_id, tenant=require_tenant(request))

    from apps.customers.models import Customer

    base = Customer.objects.filter(
        passes__card=card,
        passes__is_active=True,
    ).distinct()

    if wallet_platform == "apple":
        base = base.filter(passes__apple_pass_id__gt="")
    elif wallet_platform == "google":
        base = base.filter(passes__google_pass_id__gt="")

    counts: dict[str, int] = {}
    for seg_id in ["all", "active", "vip", "at_risk", "inactive", "new", "most_active"]:
        counts[seg_id] = _apply_segment_filter(base, seg_id).count()

    return {"counts": counts}


@router.get(
    "/{program_id}/members/",
    auth=jwt_auth,
    response=dict,
    summary="Miembros del programa",
)
def program_members(
    request: TenantRequest,
    program_id: str,
    search: str | None = None,
    limit: int = 25,
    offset: int = 0,
) -> dict:
    """Returns paginated members of a program. MANAGER+ only."""
    if not is_manager_or_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    card = get_object_or_404(Card, id=program_id, tenant=require_tenant(request))
    return services.program_members(card, search, limit, offset)


@router.get(
    "/{program_id}/transactions/",
    auth=jwt_auth,
    response=dict,
    summary="Transacciones del programa",
)
def program_transactions(
    request: TenantRequest,
    program_id: str,
    limit: int = 25,
    offset: int = 0,
) -> dict:
    """Returns paginated transactions for a program. MANAGER+ only."""
    if not is_manager_or_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    card = get_object_or_404(Card, id=program_id, tenant=require_tenant(request))
    return services.program_transactions(card, limit, offset)


@router.get("/{program_id}/stats/", auth=jwt_auth, summary="Estadísticas del programa")
def program_stats(request: TenantRequest, program_id: str) -> dict:
    """Returns program statistics. MANAGER+ only."""
    if not is_manager_or_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    card = get_object_or_404(Card, id=program_id, tenant=require_tenant(request))
    return services.program_stats(card)


@router.get("/{slug}/public/", auth=None, summary="Info pública del programa (para enrollment)")
def public_program(request: TenantRequest, slug: str) -> dict:
    """
    Public program info for the enrollment page. No authentication required.
    Resolves by tenant slug + program slug (name-based).
    URL format: /api/v1/programs/{tenant_slug}--{card_id}/public/
    Uses card_id to keep it simple and unambiguous.
    """
    try:
        return services.public_program(slug)
    except ValueError as exc:
        if str(exc) == "PROGRAM_NOT_FOUND":
            raise HttpError(404, get_message("PROGRAM_NOT_FOUND"))
        raise
