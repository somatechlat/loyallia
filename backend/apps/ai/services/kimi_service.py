"""
Kimi AI Service for Loyallia Wallet Pass Studio.

Integrates with Moonshot AI (Kimi) API for template generation,
color suggestions, design critique, and stamp icon recommendations.

For Phase 8b, all methods return MOCK responses with realistic sample data.
TODO comments mark where real API calls will be implemented.
"""

import json
import logging
from typing import Any, Dict, List

from common.vault import get_secret

logger = logging.getLogger(__name__)

KIMI_API_BASE = "https://api.moonshot.cn/v1"
KIMI_MODEL = "kimi-k2-6"


class KimiService:
    """Service wrapper for Kimi AI API calls."""

    def __init__(self):
        self.api_key = get_secret("kimi_api_key")

    def _build_prompt(self, task: str, **kwargs) -> str:
        """Build a structured prompt for the Kimi API."""
        base = f"Task: {task}\n"
        for key, value in kwargs.items():
            base += f"{key.replace('_', ' ').title()}: {value}\n"
        base += "\nRespond in JSON format."
        return base

    def _mock_tokens(self) -> Dict[str, int]:
        """Return mock token usage stats."""
        return {
            "prompt_tokens": 240,
            "completion_tokens": 380,
            "total_tokens": 620,
        }

    # ------------------------------------------------------------------
    # TODO: Replace mock implementations with real Kimi API calls.
    # Real implementation pattern:
    #   req = urllib.request.Request(
    #       f"{KIMI_API_BASE}/chat/completions",
    #       data=json.dumps({"model": KIMI_MODEL, "messages": [...]}).encode(),
    #       headers={"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"},
    #   )
    #   with urllib.request.urlopen(req, timeout=30) as resp:
    #       body = json.loads(resp.read())
    # ------------------------------------------------------------------

    def generate_template(
        self, description: str, card_type: str, industry: str, language: str = "es"
    ) -> Dict[str, Any]:
        """Generate 3 template variations from a business description.

        Returns a dict with:
            - variations: list of variation dicts (name, description, confidence, design)
            - tokens_used: token consumption stats
        """
        logger.info(
            "Kimi generate_template: type=%s industry=%s lang=%s",
            card_type,
            industry,
            language,
        )

        # TODO: Replace with real Kimi API call.
        variations = [
            {
                "name": "Elegancia Clásica",
                "description": (
                    "Diseño sobrio con tipografía serif y paleta neutra. "
                    "Ideal para transmitir confianza y profesionalismo."
                ),
                "confidence": 0.92,
                "design": {
                    "background_color": "#1A1A1A",
                    "foreground_color": "#F5F5F5",
                    "accent_color": "#C9A227",
                    "header_image": "default_header_dark.png",
                    "logo_position": "top_center",
                    "fields_layout": "vertical_stack",
                    "font_family": "serif",
                },
            },
            {
                "name": "Vibrante Moderno",
                "description": (
                    "Colores vivos, bordes redondeados y tipografía sans-serif. "
                    "Perfecto para atraer una audiencia joven y dinámica."
                ),
                "confidence": 0.88,
                "design": {
                    "background_color": "#FF6B35",
                    "foreground_color": "#FFFFFF",
                    "accent_color": "#004E89",
                    "header_image": "default_header_warm.png",
                    "logo_position": "top_left",
                    "fields_layout": "grid_2x2",
                    "font_family": "sans-serif",
                },
            },
            {
                "name": "Minimalista Natural",
                "description": (
                    "Tono tierra con mucho espacio en blanco y líneas finas. "
                    "Transmite sostenibilidad y calma."
                ),
                "confidence": 0.85,
                "design": {
                    "background_color": "#F4F1EA",
                    "foreground_color": "#2C3E50",
                    "accent_color": "#27AE60",
                    "header_image": "default_header_natural.png",
                    "logo_position": "center",
                    "fields_layout": "compact",
                    "font_family": "monospace",
                },
            },
        ]

        return {
            "variations": variations,
            "tokens_used": self._mock_tokens(),
        }

    def suggest_colors(self, description: str, industry: str) -> Dict[str, Any]:
        """Suggest color palettes based on description and industry.

        Returns a dict with:
            - palettes: list of palette dicts (name, primary, secondary, background, text, accent)
            - tokens_used: token consumption stats
        """
        logger.info("Kimi suggest_colors: industry=%s", industry)

        # TODO: Replace with real Kimi API call.
        palettes = [
            {
                "name": "Oro y Carbón",
                "primary": "#C9A227",
                "secondary": "#8C8C8C",
                "background": "#1A1A1A",
                "text": "#F5F5F5",
                "accent": "#E5C158",
            },
            {
                "name": "Coral Profundo",
                "primary": "#FF6B35",
                "secondary": "#004E89",
                "background": "#FFFFFF",
                "text": "#1A1A1A",
                "accent": "#F7C59F",
            },
            {
                "name": "Bosque Neutro",
                "primary": "#27AE60",
                "secondary": "#2C3E50",
                "background": "#F4F1EA",
                "text": "#2C3E50",
                "accent": "#A8D5BA",
            },
        ]

        return {
            "palettes": palettes,
            "tokens_used": self._mock_tokens(),
        }

    def critique_design(self, design_data: Dict[str, Any]) -> Dict[str, Any]:
        """Critique a design and return improvement suggestions.

        Returns a dict with:
            - suggestions: list of suggestion strings
            - score: overall design score (0-100)
            - tokens_used: token consumption stats
        """
        logger.info("Kimi critique_design")

        # TODO: Replace with real Kimi API call.
        suggestions = [
            "Aumentar el contraste entre el texto y el fondo para mejorar la legibilidad.",
            "Considerar reducir la cantidad de colores a 3 principales para mayor coherencia visual.",
            "El logo se pierde en el fondo oscuro; probar con un fondo blanco detrás del logo.",
            "Usar jerarquía tipográfica: título grande, subtítulo mediano, cuerpo pequeño.",
        ]

        return {
            "suggestions": suggestions,
            "score": 72,
            "tokens_used": self._mock_tokens(),
        }

    def suggest_stamp_icons(self, business_type: str) -> Dict[str, Any]:
        """Suggest stamp icons for stamp cards based on business type.

        Returns a dict with:
            - icons: list of icon identifier strings
            - tokens_used: token consumption stats
        """
        logger.info("Kimi suggest_stamp_icons: business_type=%s", business_type)

        # TODO: Replace with real Kimi API call.
        icon_map = {
            "restaurant": ["utensils", "chef-hat", "pizza", "burger", "coffee", "wine-glass"],
            "cafe": ["coffee", "mug", "croissant", "bean", "steam", "cup"],
            "retail": ["shopping-bag", "tag", "gift", "cart", "star", "heart"],
            "beauty": ["sparkles", "scissors", "nail-polish", "heart", "crown", "flower"],
            "gym": ["dumbbell", "heartbeat", "trophy", "flame", "star", "medal"],
            "hotel": ["bed", "key", "star", "suitcase", "moon", "wifi"],
            "default": ["star", "heart", "check-circle", "gift", "crown", "sparkles"],
        }

        icons = icon_map.get(business_type.lower(), icon_map["default"])

        return {
            "icons": icons,
            "tokens_used": self._mock_tokens(),
        }
