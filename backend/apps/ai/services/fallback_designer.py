"""
Rule-based Fallback Designer for Loyallia Wallet Pass Studio.

Provides deterministic design defaults when Kimi AI is unavailable
or when the user explicitly requests offline mode.
"""

from typing import Any, Dict, List


class FallbackDesigner:
    """Rule-based design fallback with industry and card-type presets."""

    # ------------------------------------------------------------------
    # Color presets by industry
    # ------------------------------------------------------------------
    COLOR_PRESETS: Dict[str, List[Dict[str, str]]] = {
        "restaurant": [
            {"name": "Tradicional", "primary": "#8B0000", "secondary": "#FFD700", "background": "#FFF8DC", "text": "#2F4F4F", "accent": "#FF4500"},
            {"name": "Moderno", "primary": "#1A1A1A", "secondary": "#C9A227", "background": "#FFFFFF", "text": "#1A1A1A", "accent": "#E5C158"},
        ],
        "cafe": [
            {"name": "Cálido", "primary": "#6F4E37", "secondary": "#D2B48C", "background": "#F5F5DC", "text": "#3E2723", "accent": "#A0522D"},
            {"name": "Urbano", "primary": "#2C3E50", "secondary": "#BDC3C7", "background": "#ECF0F1", "text": "#2C3E50", "accent": "#E67E22"},
        ],
        "retail": [
            {"name": "Vibrante", "primary": "#FF6B35", "secondary": "#004E89", "background": "#FFFFFF", "text": "#1A1A1A", "accent": "#F7C59F"},
            {"name": "Elegante", "primary": "#2C3E50", "secondary": "#95A5A6", "background": "#F8F9FA", "text": "#2C3E50", "accent": "#C9A227"},
        ],
        "beauty": [
            {"name": "Suave", "primary": "#D63384", "secondary": "#F8D7DA", "background": "#FFF0F5", "text": "#4A154B", "accent": "#FF69B4"},
            {"name": "Lujo", "primary": "#4A154B", "secondary": "#D4AF37", "background": "#1A1A1A", "text": "#F5F5F5", "accent": "#D4AF37"},
        ],
        "gym": [
            {"name": "Energía", "primary": "#27AE60", "secondary": "#2C3E50", "background": "#F4F1EA", "text": "#2C3E50", "accent": "#E74C3C"},
            {"name": "Fuerza", "primary": "#E74C3C", "secondary": "#2C3E50", "background": "#1A1A1A", "text": "#F5F5F5", "accent": "#C0392B"},
        ],
        "hotel": [
            {"name": "Clásico", "primary": "#003366", "secondary": "#C9A227", "background": "#F5F5F5", "text": "#1A1A1A", "accent": "#4682B4"},
            {"name": "Resort", "primary": "#008B8B", "secondary": "#F0E68C", "background": "#F0FFF0", "text": "#2F4F4F", "accent": "#20B2AA"},
        ],
        "default": [
            {"name": "Estándar", "primary": "#2C3E50", "secondary": "#95A5A6", "background": "#FFFFFF", "text": "#2C3E50", "accent": "#3498DB"},
            {"name": "Contraste", "primary": "#1A1A1A", "secondary": "#F5F5F5", "background": "#1A1A1A", "text": "#F5F5F5", "accent": "#E74C3C"},
        ],
    }

    # ------------------------------------------------------------------
    # Default field configs by card type
    # ------------------------------------------------------------------
    FIELD_CONFIGS: Dict[str, List[Dict[str, Any]]] = {
        "stamp": [
            {"key": "customer_name", "label": "Cliente", "type": "text", "required": True},
            {"key": "stamps_collected", "label": "Sellos", "type": "number", "required": True},
            {"key": "reward_status", "label": "Recompensa", "type": "text", "required": False},
        ],
        "cashback": [
            {"key": "customer_name", "label": "Cliente", "type": "text", "required": True},
            {"key": "balance", "label": "Saldo", "type": "currency", "required": True},
            {"key": "lifetime_earned", "label": "Total acumulado", "type": "currency", "required": False},
        ],
        "coupon": [
            {"key": "customer_name", "label": "Cliente", "type": "text", "required": True},
            {"key": "discount_code", "label": "Código", "type": "text", "required": True},
            {"key": "valid_until", "label": "Válido hasta", "type": "date", "required": True},
        ],
        "gift_certificate": [
            {"key": "customer_name", "label": "Cliente", "type": "text", "required": True},
            {"key": "balance", "label": "Saldo", "type": "currency", "required": True},
            {"key": "certificate_id", "label": "Número", "type": "text", "required": True},
        ],
        "vip_membership": [
            {"key": "customer_name", "label": "Cliente", "type": "text", "required": True},
            {"key": "tier", "label": "Nivel", "type": "text", "required": True},
            {"key": "member_since", "label": "Miembro desde", "type": "date", "required": False},
        ],
        "multipass": [
            {"key": "customer_name", "label": "Cliente", "type": "text", "required": True},
            {"key": "sessions_left", "label": "Sesiones restantes", "type": "number", "required": True},
            {"key": "total_sessions", "label": "Total sesiones", "type": "number", "required": True},
        ],
        "default": [
            {"key": "customer_name", "label": "Cliente", "type": "text", "required": True},
            {"key": "program_name", "label": "Programa", "type": "text", "required": True},
            {"key": "status", "label": "Estado", "type": "text", "required": False},
        ],
    }

    # ------------------------------------------------------------------
    # Pre-defined layout patterns
    # ------------------------------------------------------------------
    LAYOUT_PATTERNS: List[Dict[str, Any]] = [
        {
            "id": "classic_vertical",
            "name": "Clásico Vertical",
            "description": "Logo arriba, campos apilados verticalmente. Seguro y legible.",
            "structure": {
                "header": "full_width_banner",
                "logo": "top_center",
                "fields": "vertical_stack",
                "footer": "minimal",
            },
        },
        {
            "id": "modern_grid",
            "name": "Cuadrícula Moderna",
            "description": "Logo a la izquierda, campos en grid 2x2. Compacto y dinámico.",
            "structure": {
                "header": "none",
                "logo": "top_left",
                "fields": "grid_2x2",
                "footer": "qr_code",
            },
        },
        {
            "id": "minimal_center",
            "name": "Minimalista Centrado",
            "description": "Todo centrado, mucho espacio en blanco. Elegante y sereno.",
            "structure": {
                "header": "none",
                "logo": "center",
                "fields": "compact",
                "footer": "none",
            },
        },
        {
            "id": "bold_split",
            "name": "División Audaz",
            "description": "Mitad izquierda color sólido con logo, mitad derecha campos.",
            "structure": {
                "header": "none",
                "logo": "left_half",
                "fields": "right_half",
                "footer": "minimal",
            },
        },
    ]

    def get_colors(self, industry: str) -> List[Dict[str, str]]:
        """Return color presets for the given industry."""
        return self.COLOR_PRESETS.get(industry.lower(), self.COLOR_PRESETS["default"])

    def get_fields(self, card_type: str) -> List[Dict[str, Any]]:
        """Return default field configuration for the given card type."""
        return self.FIELD_CONFIGS.get(card_type.lower(), self.FIELD_CONFIGS["default"])

    def get_layouts(self) -> List[Dict[str, Any]]:
        """Return all pre-defined layout patterns."""
        return self.LAYOUT_PATTERNS

    def build_template(self, card_type: str, industry: str, layout_id: str = "classic_vertical") -> Dict[str, Any]:
        """Build a complete fallback template from rules."""
        colors = self.get_colors(industry)
        fields = self.get_fields(card_type)
        layout = next((l for l in self.LAYOUT_PATTERNS if l["id"] == layout_id), self.LAYOUT_PATTERNS[0])

        primary_palette = colors[0] if colors else self.COLOR_PRESETS["default"][0]

        return {
            "name": f"{industry.title()} {layout['name']}",
            "description": layout["description"],
            "confidence": 0.65,
            "design": {
                "background_color": primary_palette["background"],
                "foreground_color": primary_palette["text"],
                "accent_color": primary_palette["accent"],
                "header_image": "default_header.png",
                "logo_position": layout["structure"]["logo"],
                "fields_layout": layout["structure"]["fields"],
                "font_family": "sans-serif",
            },
            "fields": fields,
            "layout": layout,
            "source": "fallback",
        }
