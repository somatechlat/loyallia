"""
Image helpers for Google Wallet pass builders.
"""

from .base import (
    _get_v2_image_url,
    _get_wallet_studio,
    _resolve_url,
)


def _build_class_images(card, payload: dict, base_url: str = "") -> None:
    """Add heroImage, wideLogo, and imageModulesData to a class payload if available."""
    v2_images = _get_wallet_studio(card).get("images") or {}

    hero_url = _resolve_url(
        _get_v2_image_url(v2_images, "strip")
        or _get_v2_image_url(v2_images, "strip2x")
        or card.strip_image_url,
        base_url,
    )
    if hero_url:
        payload["heroImage"] = {
            "sourceUri": {"uri": hero_url},
            "contentDescription": {
                "defaultValue": {"language": "es", "value": f"Banner de {card.name}"},
            },
        }

    wide_logo_url = _resolve_url(
        _get_v2_image_url(v2_images, "logo")
        or _get_v2_image_url(v2_images, "logo2x")
        or card.logo_url,
        base_url,
    )
    if wide_logo_url:
        payload["wideLogo"] = {
            "sourceUri": {"uri": wide_logo_url},
            "contentDescription": {
                "defaultValue": {"language": "es", "value": card.name},
            },
        }

    image_module_url = _resolve_url(
        _get_v2_image_url(v2_images, "thumbnail")
        or _get_v2_image_url(v2_images, "thumbnail2x")
        or _get_v2_image_url(v2_images, "icon")
        or card.icon_url,
        base_url,
    )
    if image_module_url:
        payload["imageModulesData"] = [
            {
                "mainImage": {
                    "sourceUri": {"uri": image_module_url},
                    "contentDescription": {
                        "defaultValue": {
                            "language": "es",
                            "value": "Imagen de recompensa",
                        }
                    },
                },
                "id": "reward_image",
            }
        ]
