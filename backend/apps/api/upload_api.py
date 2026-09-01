"""
Loyallia File Upload API
Handles direct image uploads (logos, etc.) to MinIO/S3 and returns public URLs.
"""

import logging
import os
import re
import uuid
from io import BytesIO
from typing import Any

from django.conf import settings
from django.core.files.storage import default_storage
from ninja import Router, Schema
from ninja.errors import HttpError
from ninja.files import UploadedFile
from PIL import Image, UnidentifiedImageError

from common.messages import get_message
from common.permissions import is_manager_or_owner, jwt_auth
from common.request import as_tenant_request

try:
    from botocore.exceptions import ClientError
except ImportError:
    ClientError = Exception  # type: ignore[misc,assignment]

logger = logging.getLogger(__name__)

router = Router(tags=["Uploads"])

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".pdf"}
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "application/pdf"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


def _sanitize_filename(filename: str) -> str:
    """Remove path traversal and unsafe characters from filename."""
    filename = os.path.basename(filename)
    filename = re.sub(r"[^a-zA-Z0-9._-]", "", filename)
    return filename


class AssetOut(Schema):
    """Single uploaded asset metadata."""

    url: str
    name: str
    size: int
    last_modified: str


class AssetListOut(Schema):
    """Paginated list of uploaded assets."""

    success: bool
    assets: list[AssetOut]
    count: int


@router.post("/", auth=jwt_auth, summary="Subir imagen")
def upload_file(request, file: UploadedFile):
    """
    Uploads an image (logo, strip) to cloud storage and returns the public URL.
    Only allows image files up to 5MB.
    MANAGER+ only.
    """
    if not is_manager_or_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    request = as_tenant_request(request)
    filename = _sanitize_filename(file.name or "")
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HttpError(
            400,
            get_message(
                "VALIDATION_ERROR",
                detail="Formato de archivo no permitido. Usa JPG, PNG o WEBP.",
            ),
        )

    if file.size is None or file.size > MAX_FILE_SIZE:
        raise HttpError(
            400,
            get_message(
                "VALIDATION_ERROR",
                detail="El archivo supera el tamaño máximo permitido (5MB).",
            ),
        )

    if getattr(file, "content_type", "") not in ALLOWED_CONTENT_TYPES:
        raise HttpError(
            400,
            get_message(
                "VALIDATION_ERROR", detail="Tipo de contenido de imagen no permitido."
            ),
        )

    try:
        data = file.read()
        Image.open(BytesIO(data)).verify()
        file.seek(0)
    except (UnidentifiedImageError, OSError, ValueError):
        raise HttpError(
            400,
            get_message(
                "VALIDATION_ERROR", detail="El archivo no es una imagen válida."
            ),
        )

    try:
        # Generate random unique filename to prevent collisions and path traversal
        tenant_dirname = str(request.tenant.id) if request.tenant else "platform"
        filename = f"uploads/{tenant_dirname}/{uuid.uuid4().hex}{ext}"

        # Save to S3/MinIO
        path = default_storage.save(filename, file)

        # Build absolute URL so wallet pass generation can fetch images via HTTP.
        # Relative URLs work in browsers but fail server-side during .pkpass/JWT generation.
        from common.platform_config import get_platform_config

        public_base = get_platform_config(
            "public_base_url", getattr(settings, "PUBLIC_BASE_URL", "")
        ).rstrip("/")
        public_url = (
            f"{public_base}/assets/{path}" if public_base else f"/assets/{path}"
        )

        return {"success": True, "url": public_url}

    except Exception as exc:
        logger.error("Error uploading file to storage: %s", exc, exc_info=True)
        raise HttpError(500, get_message("SERVER_ERROR"))


@router.get(
    "/assets/", auth=jwt_auth, response=AssetListOut, summary="Listar imágenes subidas"
)
def list_assets(request):
    """
    Lists previously uploaded images for the current tenant from MinIO/S3.
    MANAGER+ only.
    """
    if not is_manager_or_owner(request):
        raise HttpError(403, get_message("AUTH_PERMISSION_DENIED"))
    request = as_tenant_request(request)
    tenant_dirname = str(request.tenant.id) if request.tenant else "platform"
    prefix = f"uploads/{tenant_dirname}/"

    try:
        import boto3

        client = boto3.client(
            "s3",
            endpoint_url=settings.MINIO_ENDPOINT,
            aws_access_key_id=settings.MINIO_ACCESS_KEY,
            aws_secret_access_key=settings.MINIO_SECRET_KEY,
            region_name="us-east-1",
        )

        response = client.list_objects_v2(
            Bucket=settings.MINIO_BUCKET_ASSETS,
            Prefix=prefix,
        )

        # Build absolute base URL for consistent image URLs
        from common.platform_config import get_platform_config

        public_base = get_platform_config(
            "public_base_url", getattr(settings, "PUBLIC_BASE_URL", "")
        ).rstrip("/")

        assets: list[dict[str, Any]] = []
        for obj in response.get("Contents", []):
            key = obj["Key"]
            name = key.split("/")[-1]
            url = f"{public_base}/assets/{key}" if public_base else f"/assets/{key}"
            assets.append(
                {
                    "url": url,
                    "name": name,
                    "size": obj["Size"],
                    "last_modified": obj["LastModified"].isoformat(),
                }
            )

        # Sort by most recent first
        assets.sort(key=lambda x: x["last_modified"], reverse=True)

        return {"success": True, "assets": assets, "count": len(assets)}

    except ClientError as exc:
        logger.error("MinIO list_objects failed: %s", exc)
        raise HttpError(500, get_message("SERVER_ERROR"))
    except Exception as exc:
        logger.error("Error listing assets: %s", exc, exc_info=True)
        raise HttpError(500, get_message("SERVER_ERROR"))
