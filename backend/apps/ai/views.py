"""
AI API Views for Loyallia Wallet Pass Studio.

Standard Django views (not Ninja routers) to satisfy the URL include pattern.
All endpoints accept POST, require JWT authentication, and enforce the
"ai_assistant" plan feature.
"""

import json
import logging
from typing import Any

from django.http import HttpRequest, JsonResponse
from django.views.decorators.http import require_http_methods

from apps.ai.auth import jwt_required
from apps.ai.services import CostTracker, FallbackDesigner, KimiService
from common.plan_enforcement import require_feature
from common.request import require_tenant

logger = logging.getLogger(__name__)


def _parse_json_body(request: HttpRequest) -> dict[str, Any]:
    """Parse and return the JSON body, or raise a friendly error."""
    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
        raise ValueError(f"Invalid JSON body: {exc}")
    if not isinstance(body, dict):
        raise ValueError("Request body must be a JSON object.")
    return body


def _success_response(data: Any, tokens_used: dict[str, Any]) -> JsonResponse:
    """Build a standardized success JSON response."""
    return JsonResponse(
        {
            "success": True,
            "data": data,
            "tokens_used": tokens_used,
        }
    )


def _error_response(message: str, status: int = 400, error_code: str = "AI_ERROR") -> JsonResponse:
    """Build a standardized error JSON response."""
    return JsonResponse(
        {
            "success": False,
            "error": error_code,
            "message": message,
        },
        status=status,
    )


def _track_and_respond(
    tenant_id: int,
    endpoint: str,
    service_result: dict[str, Any],
    data_key: str = "data",
) -> JsonResponse:
    """Track costs and wrap service result into the standard response shape."""
    tokens = service_result.get("tokens_used", {})
    tracker = CostTracker()
    tracker.record_cost(
        tenant_id=tenant_id,
        endpoint=endpoint,
        tokens_used=tokens,
        request_data={},
        response_data={data_key: service_result.get(data_key, service_result)},
        status="success",
    )
    return _success_response(
        data=service_result.get(data_key, service_result),
        tokens_used=tokens,
    )


@require_http_methods(["POST"])
@jwt_required
@require_feature("ai_assistant")
def generate_template(request: HttpRequest):
    """POST /api/v1/ai/generate-template/

    Generate 3 template variations from a business description.
    Body: { description: str, card_type: str, industry: str, language?: str }
    """
    try:
        body = _parse_json_body(request)
    except ValueError as exc:
        return _error_response(str(exc), status=422, error_code="VALIDATION_ERROR")

    description = body.get("description", "").strip()
    card_type = body.get("card_type", "").strip()
    industry = body.get("industry", "").strip()
    language = body.get("language", "es").strip()

    if not description:
        return _error_response("'description' is required.", status=422, error_code="VALIDATION_ERROR")
    if not card_type:
        return _error_response("'card_type' is required.", status=422, error_code="VALIDATION_ERROR")
    if not industry:
        return _error_response("'industry' is required.", status=422, error_code="VALIDATION_ERROR")

    tenant = require_tenant(request)

    try:
        service = KimiService()
        result = service.generate_template(description, card_type, industry, language)
    except Exception as exc:
        logger.warning("KimiService failed, falling back to FallbackDesigner: %s", exc)
        fallback = FallbackDesigner()
        template = fallback.build_template(card_type, industry)
        result = {
            "variations": [template],
            "tokens_used": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
        }

    return _track_and_respond(tenant.id, "generate-template", result, data_key="variations")


@require_http_methods(["POST"])
@jwt_required
@require_feature("ai_assistant")
def suggest_colors(request: HttpRequest):
    """POST /api/v1/ai/suggest-colors/

    Suggest color palettes based on description and industry.
    Body: { description: str, industry: str }
    """
    try:
        body = _parse_json_body(request)
    except ValueError as exc:
        return _error_response(str(exc), status=422, error_code="VALIDATION_ERROR")

    description = body.get("description", "").strip()
    industry = body.get("industry", "").strip()

    if not description:
        return _error_response("'description' is required.", status=422, error_code="VALIDATION_ERROR")
    if not industry:
        return _error_response("'industry' is required.", status=422, error_code="VALIDATION_ERROR")

    tenant = require_tenant(request)

    try:
        service = KimiService()
        result = service.suggest_colors(description, industry)
    except Exception as exc:
        logger.warning("KimiService failed, falling back to FallbackDesigner: %s", exc)
        fallback = FallbackDesigner()
        palettes = fallback.get_colors(industry)
        result = {
            "palettes": palettes,
            "tokens_used": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
        }

    return _track_and_respond(tenant.id, "suggest-colors", result, data_key="palettes")


@require_http_methods(["POST"])
@jwt_required
@require_feature("ai_assistant")
def critique_design(request: HttpRequest):
    """POST /api/v1/ai/critique-design/

    Critique a design and return improvement suggestions.
    Body: { design_data: object }
    """
    try:
        body = _parse_json_body(request)
    except ValueError as exc:
        return _error_response(str(exc), status=422, error_code="VALIDATION_ERROR")

    design_data = body.get("design_data")
    if not design_data or not isinstance(design_data, dict):
        return _error_response("'design_data' object is required.", status=422, error_code="VALIDATION_ERROR")

    tenant = require_tenant(request)

    try:
        service = KimiService()
        result = service.critique_design(design_data)
    except Exception as exc:
        logger.warning("KimiService failed, falling back to FallbackDesigner: %s", exc)
        fallback = FallbackDesigner()
        result = fallback.critique(design_data)

    return _track_and_respond(tenant.id, "critique-design", result, data_key="suggestions")


@require_http_methods(["POST"])
@jwt_required
@require_feature("ai_assistant")
def suggest_stamp_icons(request: HttpRequest):
    """POST /api/v1/ai/suggest-stamp-icons/

    Suggest stamp icons for stamp cards based on business type.
    Body: { business_type: str }
    """
    try:
        body = _parse_json_body(request)
    except ValueError as exc:
        return _error_response(str(exc), status=422, error_code="VALIDATION_ERROR")

    business_type = body.get("business_type", "").strip()
    if not business_type:
        return _error_response("'business_type' is required.", status=422, error_code="VALIDATION_ERROR")

    tenant = require_tenant(request)

    try:
        service = KimiService()
        result = service.suggest_stamp_icons(business_type)
    except Exception as exc:
        logger.warning("KimiService failed, falling back to FallbackDesigner: %s", exc)
        fallback = FallbackDesigner()
        icons = fallback.stamp_icons(business_type)
        result = {
            "icons": icons,
            "tokens_used": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
        }

    return _track_and_respond(tenant.id, "suggest-stamp-icons", result, data_key="icons")
