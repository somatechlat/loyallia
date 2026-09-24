"""
Loyallia Apple Wallet Pass Image Utilities

Image generation and colour conversion helpers used by apple_pass.py.
Extracted to keep builder modules under the project file-size limit.
"""

import io
import logging
import struct
import zlib

from django.conf import settings

logger = logging.getLogger(__name__)


def _hex_to_rgb(hex_color: str) -> str:
    """Convert hex color (#RRGGBB or #RGB) to Apple's rgb(R, G, B) format."""
    if not hex_color:
        return settings.PASS_PLACEHOLDER_FALLBACK_RGB
    hex_color = hex_color.strip()
    if hex_color.lower().startswith("rgb("):
        return hex_color
    hex_color = hex_color.lstrip("#")
    if len(hex_color) == 3:
        hex_color = "".join(c * 2 for c in hex_color)
    if len(hex_color) != 6:
        return settings.PASS_PLACEHOLDER_FALLBACK_RGB
    try:
        r, g, b = (
            int(hex_color[0:2], 16),
            int(hex_color[2:4], 16),
            int(hex_color[4:6], 16),
        )
    except ValueError:
        return settings.PASS_PLACEHOLDER_FALLBACK_RGB
    return f"rgb({r}, {g}, {b})"


def _generate_placeholder_icon(
    name: str,
    bg_color: str = settings.PASS_PLACEHOLDER_BG_COLOR,
    size: int = settings.PASS_APPLE_ICON_SIZE,
) -> bytes:
    """Generate a simple icon PNG using a solid background with the first letter."""
    try:
        from PIL import Image, ImageDraw, ImageFont

        img = Image.new("RGBA", (size, size), bg_color)
        draw = ImageDraw.Draw(img)
        letter = name[0].upper() if name else "L"
        try:
            font = ImageFont.truetype(
                "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", size // 2
            )
        except OSError:
            font = ImageFont.load_default()
        bbox = draw.textbbox((0, 0), letter, font=font)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        x = (size - tw) // 2
        y = (size - th) // 2
        draw.text((x, y), letter, font=font, fill="#FFFFFF")
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        return buf.getvalue()
    except ImportError:
        logger.warning("Pillow not installed  returning minimal 1x1 PNG for icon")
        return _minimal_png()


def _generate_placeholder_logo(
    name: str,
    bg_color: str = settings.PASS_PLACEHOLDER_BG_COLOR,
    width: int = settings.PASS_APPLE_LOGO_WIDTH,
    height: int = settings.PASS_APPLE_LOGO_HEIGHT,
) -> bytes:
    """Generate a wide logo PNG using a solid background with the first letter.

    Apple PassKit specifies logo.png as 160 x 50 points (320 x 100 @2x).
    This creates a wide rectangular placeholder matching that aspect ratio.
    """
    try:
        from PIL import Image, ImageDraw, ImageFont

        img = Image.new("RGBA", (width, height), bg_color)
        draw = ImageDraw.Draw(img)
        letter = name[0].upper() if name else "L"
        font_size = min(width, height) // 2
        try:
            font = ImageFont.truetype(
                "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", font_size
            )
        except OSError:
            font = ImageFont.load_default()
        bbox = draw.textbbox((0, 0), letter, font=font)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        x = (width - tw) // 2
        y = (height - th) // 2
        draw.text((x, y), letter, font=font, fill="#FFFFFF")
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        return buf.getvalue()
    except ImportError:
        logger.warning("Pillow not installed  returning minimal 1x1 PNG for logo")
        return _minimal_png()


def _minimal_png() -> bytes:
    """Return a minimal valid 1x1 transparent PNG (67 bytes)."""

    def _chunk(chunk_type: bytes, data: bytes) -> bytes:
        raw = chunk_type + data
        return (
            struct.pack(">I", len(data))
            + raw
            + struct.pack(">I", zlib.crc32(raw) & 0xFFFFFFFF)
        )

    signature = b"\x89PNG\r\n\x1a\n"
    ihdr = _chunk(b"IHDR", struct.pack(">IIBBBBB", 1, 1, 8, 6, 0, 0, 0))
    raw_data = zlib.compress(b"\x00\x00\x00\x00\x00")
    idat = _chunk(b"IDAT", raw_data)
    iend = _chunk(b"IEND", b"")
    return signature + ihdr + idat + iend


def _resize_image(img, width: int, height: int) -> bytes:
    """Resize a PIL Image and return PNG bytes."""
    from PIL import Image as PILImage

    buf = io.BytesIO()
    resample = getattr(PILImage, "LANCZOS", 3)
    img_resized = img.resize((width, height), resample)
    img_resized.save(buf, format="PNG")
    return buf.getvalue()
