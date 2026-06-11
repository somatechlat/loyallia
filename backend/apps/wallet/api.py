"""
Wallet Template API for Loyallia Wallet Pass Studio.

Django Ninja router for CRUD operations on user-saved wallet pass templates.
Mounted at /api/v1/wallet/templates/ via the main API router.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from django.shortcuts import get_object_or_404
from ninja import Router, Schema
from ninja.errors import HttpError

from apps.wallet.models import WalletPassOperationLog, WalletTemplate
from common.permissions import jwt_auth
from common.plan_enforcement import enforce_limit, require_feature

router = Router(tags=["wallet-templates"])


# ── Schemas ─────────────────────────────────────────────────────────


class WalletTemplateIn(Schema):
    """Payload for creating a new template."""

    name: str
    description: str = ""
    card_type: str
    industry: str = "retail"
    design_state: dict[str, Any]
    include_back_content: bool = True
    tags: list[str] = []


class WalletTemplateUpdateIn(Schema):
    """Payload for updating an existing template."""

    name: str | None = None
    description: str | None = None
    design_state: dict[str, Any] | None = None
    include_back_content: bool | None = None
    is_favorite: bool | None = None
    tags: list[str] | None = None


class WalletTemplateOut(Schema):
    """Serialized template response."""

    id: str
    name: str
    description: str
    card_type: str
    industry: str
    include_back_content: bool
    is_favorite: bool
    usage_count: int
    last_used_at: datetime | None
    tags: list[str]
    preview_image_url: str
    created_at: datetime
    updated_at: datetime


# ── Helpers ─────────────────────────────────────────────────────────


def _get_tenant_and_user(request) -> tuple:
    """Extract tenant and user from request."""
    user = request.user
    tenant = getattr(request, "tenant", None) or getattr(user, "tenant", None)
    return tenant, user


# ── Endpoints ───────────────────────────────────────────────────────


@router.get("/", response=list[WalletTemplateOut], auth=jwt_auth)
@require_feature("wallet_pass_studio")
def list_templates(request):
    """List all templates for the current user."""
    tenant, user = _get_tenant_and_user(request)
    qs = WalletTemplate.objects.filter(tenant=tenant, owner=user)
    return list(qs)


@router.post("/", response=WalletTemplateOut, auth=jwt_auth)
@require_feature("wallet_pass_studio")
@enforce_limit("wallet_templates")
def create_template(request, payload: WalletTemplateIn):
    """Create a new template."""
    tenant, user = _get_tenant_and_user(request)

    if WalletTemplate.objects.filter(
        tenant=tenant, owner=user, name=payload.name
    ).exists():
        raise HttpError(409, "A template with this name already exists.")

    template = WalletTemplate.objects.create(
        tenant=tenant,
        owner=user,
        name=payload.name,
        description=payload.description,
        card_type=payload.card_type,
        industry=payload.industry,
        design_state=payload.design_state,
        include_back_content=payload.include_back_content,
        tags=payload.tags,
    )
    WalletPassOperationLog.objects.create(
        tenant=tenant,
        user=user,
        operation_type="template_create",
        metadata={"template_id": str(template.id), "name": template.name},
    )
    return template


@router.get("/{template_id}/", response=WalletTemplateOut, auth=jwt_auth)
@require_feature("wallet_pass_studio")
def get_template(request, template_id: str):
    """Get a single template by ID."""
    tenant, user = _get_tenant_and_user(request)
    template = get_object_or_404(
        WalletTemplate, id=template_id, tenant=tenant, owner=user
    )
    return template


@router.patch("/{template_id}/", response=WalletTemplateOut, auth=jwt_auth)
@require_feature("wallet_pass_studio")
@enforce_limit("wallet_pass_updates_month")
def update_template(request, template_id: str, payload: WalletTemplateUpdateIn):
    """Update an existing template."""
    tenant, user = _get_tenant_and_user(request)
    template = get_object_or_404(
        WalletTemplate, id=template_id, tenant=tenant, owner=user
    )

    if payload.name is not None:
        if (
            WalletTemplate.objects.filter(tenant=tenant, owner=user, name=payload.name)
            .exclude(id=template_id)
            .exists()
        ):
            raise HttpError(409, "A template with this name already exists.")
        template.name = payload.name

    if payload.description is not None:
        template.description = payload.description

    if payload.design_state is not None:
        template.design_state = payload.design_state

    if payload.include_back_content is not None:
        template.include_back_content = payload.include_back_content

    if payload.is_favorite is not None:
        template.is_favorite = payload.is_favorite

    if payload.tags is not None:
        template.tags = payload.tags

    template.save()
    WalletPassOperationLog.objects.create(
        tenant=tenant,
        user=user,
        operation_type="template_update",
        metadata={"template_id": str(template.id), "name": template.name},
    )
    return template


@router.delete("/{template_id}/", auth=jwt_auth)
@require_feature("wallet_pass_studio")
def delete_template(request, template_id: str):
    """Delete a template."""
    tenant, user = _get_tenant_and_user(request)
    template = get_object_or_404(
        WalletTemplate, id=template_id, tenant=tenant, owner=user
    )
    template.delete()
    WalletPassOperationLog.objects.create(
        tenant=tenant,
        user=user,
        operation_type="template_delete",
        metadata={"template_id": template_id, "name": template.name},
    )
    return {"success": True}


@router.post("/{template_id}/use/", response=WalletTemplateOut, auth=jwt_auth)
@require_feature("wallet_pass_studio")
def use_template(request, template_id: str):
    """Increment usage count and update last_used_at."""
    tenant, user = _get_tenant_and_user(request)
    template = get_object_or_404(
        WalletTemplate, id=template_id, tenant=tenant, owner=user
    )
    template.usage_count += 1
    template.last_used_at = datetime.now()
    template.save(update_fields=["usage_count", "last_used_at"])
    WalletPassOperationLog.objects.create(
        tenant=tenant,
        user=user,
        operation_type="template_use",
        metadata={"template_id": str(template.id), "name": template.name},
    )
    return template
