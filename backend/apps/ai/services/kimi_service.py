"""
AI Service for Loyallia Wallet Pass Studio.

Integrates with Groq API (OpenAI-compatible) using production best practices:
- Structured Outputs with json_schema + strict=True for 100% schema compliance
- Prompt caching optimization: static system prompts first, dynamic user content last
- All settings read from Django settings (Vault-backed)
- Runtime overrides via PlatformSetting
"""

import json
import logging
from typing import Any

import requests
from django.conf import settings

logger = logging.getLogger(__name__)


# JSON Schemas for Structured Outputs (strict=True)
# Static schemas are placed first in prompts to maximize cache hits

_TEMPLATE_SCHEMA = {
    "name": "wallet_template_variations",
    "strict": True,
    "schema": {
        "type": "object",
        "properties": {
            "variations": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                        "description": {"type": "string"},
                        "confidence": {"type": "number"},
                        "design": {
                            "type": "object",
                            "properties": {
                                "background_color": {"type": "string"},
                                "foreground_color": {"type": "string"},
                                "accent_color": {"type": "string"},
                                "header_image": {"type": "string"},
                                "logo_position": {"type": "string"},
                                "fields_layout": {"type": "string"},
                                "font_family": {"type": "string"},
                            },
                            "required": [
                                "background_color",
                                "foreground_color",
                                "accent_color",
                                "header_image",
                                "logo_position",
                                "fields_layout",
                                "font_family",
                            ],
                            "additionalProperties": False,
                        },
                    },
                    "required": ["name", "description", "confidence", "design"],
                    "additionalProperties": False,
                },
            }
        },
        "required": ["variations"],
        "additionalProperties": False,
    },
}

_PALETTE_SCHEMA = {
    "name": "wallet_color_palettes",
    "strict": True,
    "schema": {
        "type": "object",
        "properties": {
            "palettes": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                        "primary": {"type": "string"},
                        "secondary": {"type": "string"},
                        "background": {"type": "string"},
                        "text": {"type": "string"},
                        "accent": {"type": "string"},
                    },
                    "required": [
                        "name",
                        "primary",
                        "secondary",
                        "background",
                        "text",
                        "accent",
                    ],
                    "additionalProperties": False,
                },
            }
        },
        "required": ["palettes"],
        "additionalProperties": False,
    },
}

_CRITIQUE_SCHEMA = {
    "name": "wallet_design_critique",
    "strict": True,
    "schema": {
        "type": "object",
        "properties": {
            "suggestions": {
                "type": "array",
                "items": {"type": "string"},
            },
            "score": {"type": "integer"},
        },
        "required": ["suggestions", "score"],
        "additionalProperties": False,
    },
}

_ICONS_SCHEMA = {
    "name": "wallet_stamp_icons",
    "strict": True,
    "schema": {
        "type": "object",
        "properties": {
            "icons": {
                "type": "array",
                "items": {"type": "string"},
            }
        },
        "required": ["icons"],
        "additionalProperties": False,
    },
}

_LAYOUT_SCHEMA = {
    "name": "wallet_layout_suggestion",
    "strict": True,
    "schema": {
        "type": "object",
        "properties": {
            "layout": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "description": {"type": "string"},
                    "logo_position": {"type": "string"},
                    "field_arrangement": {"type": "string"},
                    "header_style": {"type": "string"},
                    "footer_style": {"type": "string"},
                    "reasoning": {"type": "string"},
                },
                "required": [
                    "name",
                    "description",
                    "logo_position",
                    "field_arrangement",
                    "header_style",
                    "footer_style",
                    "reasoning",
                ],
                "additionalProperties": False,
            }
        },
        "required": ["layout"],
        "additionalProperties": False,
    },
}


def _get_ai_setting(name: str, default: Any = None) -> Any:
    """Return an AI setting, checking PlatformSetting overrides first."""
    try:
        from apps.tenants.models import PlatformSetting

        db_val = PlatformSetting.get(name, default="")
        if db_val:
            return db_val
    except Exception:
        pass
    return getattr(settings, name, default)


class KimiServiceError(Exception):
    """Raised when the AI API returns an error or cannot be reached."""

    pass


class KimiService:
    """Service wrapper for AI API calls (Groq provider)."""

    def __init__(self):
        self.api_key = _get_ai_setting("AI_API_KEY", "")
        if not self.api_key:
            raise KimiServiceError("ai_api_key not configured in Vault")

    def _call_chat_completion(
        self,
        system_prompt: str,
        user_prompt: str,
        json_schema: dict[str, Any],
        temperature: float = 0.7,
    ) -> dict[str, Any]:
        """Call AI chat completions with Structured Outputs (strict=True).

        Prompt organization is optimized for caching:
        - Static system prompt (schema + instructions) comes FIRST
        - Dynamic user prompt comes LAST
        This maximizes cache hits across repeated calls.
        """
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        model = _get_ai_setting("AI_MODEL", "openai/gpt-oss-120b")
        max_tokens = _get_ai_setting("AI_MAX_TOKENS", 4096)

        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "response_format": {
                "type": "json_schema",
                "json_schema": json_schema,
            },
        }

        base_url = _get_ai_setting("AI_API_BASE_URL", "https://api.groq.com/openai/v1")
        timeout = _get_ai_setting("AI_TIMEOUT_SECONDS", 30)

        try:
            resp = requests.post(
                f"{base_url}/chat/completions",
                headers=headers,
                json=payload,
                timeout=timeout,
            )
            resp.raise_for_status()
        except requests.exceptions.RequestException as exc:
            logger.warning("AI API request failed: %s", exc)
            raise KimiServiceError(f"AI API request failed: {exc}") from exc

        data = resp.json()
        choice = data.get("choices", [{}])[0]
        message = choice.get("message", {})
        content = message.get("content", "")
        usage = data.get("usage", {})

        try:
            parsed = json.loads(content)
        except json.JSONDecodeError as exc:
            logger.warning("AI API returned invalid JSON: %s", content[:200])
            raise KimiServiceError(f"AI API returned invalid JSON: {exc}") from exc

        parsed["_tokens_used"] = {
            "prompt_tokens": usage.get("prompt_tokens", 0),
            "completion_tokens": usage.get("completion_tokens", 0),
            "total_tokens": usage.get("total_tokens", 0),
            "cached_tokens": usage.get("prompt_tokens_details", {}).get(
                "cached_tokens", 0
            ),
        }
        return parsed

    def generate_template(
        self, description: str, card_type: str, industry: str, language: str = "es"
    ) -> dict[str, Any]:
        """Generate 3 template variations from a business description."""
        system_prompt = (
            "You are an expert digital wallet pass designer. "
            "Given a business description, card type, and industry, "
            "generate 3 distinct design template variations. "
            "Respond ONLY with a JSON object matching the provided schema exactly."
        )

        user_prompt = (
            f"Business description: {description}\n"
            f"Card type: {card_type}\n"
            f"Industry: {industry}\n"
            f"Language: {language}\n"
            "Generate 3 creative, visually distinct template variations."
        )

        logger.info(
            "AI generate_template: type=%s industry=%s lang=%s",
            card_type,
            industry,
            language,
        )
        result = self._call_chat_completion(
            system_prompt, user_prompt, _TEMPLATE_SCHEMA
        )
        variations = result.get("variations", [])
        if not variations:
            raise KimiServiceError("AI API returned no variations")
        return {
            "variations": variations,
            "tokens_used": result.get("_tokens_used", {}),
        }

    def suggest_colors(self, description: str, industry: str) -> dict[str, Any]:
        """Suggest color palettes based on description and industry."""
        system_prompt = (
            "You are a color theory expert for digital wallet design. "
            "Given a business description and industry, suggest 3 color palettes. "
            "Respond ONLY with a JSON object matching the provided schema exactly."
        )

        user_prompt = (
            f"Business description: {description}\n"
            f"Industry: {industry}\n"
            "Suggest 3 cohesive color palettes suitable for a digital loyalty card."
        )

        logger.info("AI suggest_colors: industry=%s", industry)
        result = self._call_chat_completion(system_prompt, user_prompt, _PALETTE_SCHEMA)
        palettes = result.get("palettes", [])
        if not palettes:
            raise KimiServiceError("AI API returned no palettes")
        return {
            "palettes": palettes,
            "tokens_used": result.get("_tokens_used", {}),
        }

    def critique_design(self, design_data: dict[str, Any]) -> dict[str, Any]:
        """Critique a design and return improvement suggestions."""
        system_prompt = (
            "You are a senior UX designer specializing in digital wallet passes. "
            "Critique the provided design and return actionable suggestions. "
            "Respond ONLY with a JSON object matching the provided schema exactly."
        )

        user_prompt = (
            f"Design data: {json.dumps(design_data, ensure_ascii=False)}\n"
            "Provide 3-5 specific, actionable improvement suggestions and an overall score (0-100)."
        )

        logger.info("AI critique_design")
        result = self._call_chat_completion(
            system_prompt, user_prompt, _CRITIQUE_SCHEMA, temperature=0.5
        )
        suggestions = result.get("suggestions", [])
        if not suggestions:
            raise KimiServiceError("AI API returned no suggestions")
        return {
            "suggestions": suggestions,
            "score": result.get("score", 50),
            "tokens_used": result.get("_tokens_used", {}),
        }

    def suggest_stamp_icons(self, business_type: str) -> dict[str, Any]:
        """Suggest stamp icons for stamp cards based on business type."""
        system_prompt = (
            "You are a digital icon curator for loyalty stamp cards. "
            "Given a business type, suggest 6 relevant icon names. "
            "Respond ONLY with a JSON object matching the provided schema exactly."
        )

        user_prompt = (
            f"Business type: {business_type}\n"
            "Suggest 6 relevant stamp icons for a loyalty stamp card."
        )

        logger.info("AI suggest_stamp_icons: business_type=%s", business_type)
        result = self._call_chat_completion(
            system_prompt, user_prompt, _ICONS_SCHEMA, temperature=0.8
        )
        icons = result.get("icons", [])
        if not icons:
            raise KimiServiceError("AI API returned no icons")
        return {
            "icons": icons,
            "tokens_used": result.get("_tokens_used", {}),
        }

    def suggest_layout(
        self, design_data: dict[str, Any], card_type: str
    ) -> dict[str, Any]:
        """Suggest an improved layout for the current design and card type."""
        system_prompt = (
            "You are an expert digital wallet pass layout designer. "
            "Given current design data and card type, suggest an optimal layout. "
            "Respond ONLY with a JSON object matching the provided schema exactly. "
            "All reasoning must be in Spanish."
        )

        user_prompt = (
            f"Card type: {card_type}\n"
            f"Current design: {json.dumps(design_data, ensure_ascii=False)}\n"
            "Suggest the best layout for this wallet pass."
        )

        logger.info("AI suggest_layout: card_type=%s", card_type)
        result = self._call_chat_completion(
            system_prompt, user_prompt, _LAYOUT_SCHEMA, temperature=0.6
        )
        layout = result.get("layout", {})
        if not layout:
            raise KimiServiceError("AI API returned no layout")
        return {
            "layout": layout,
            "tokens_used": result.get("_tokens_used", {}),
        }
