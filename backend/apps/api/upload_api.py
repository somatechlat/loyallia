"""
Loyallia  File Upload API
Handles direct image uploads (logos, etc.) to MinIO/S3 and returns public URLs.
"""

import logging
import os
import uuid
from io import BytesIO

from django.core.files.storage import default_storage
from ninja import Router
from ninja.errors import HttpError
from ninja.files import UploadedFile
from PIL import Image, UnidentifiedImageError

from common.messages import get_message
from common.permissions import is_manager_or_owner, jwt_auth
from common.request import as_tenant_request

logger = logging.getLogger(__name__)

router = Router(tags=["Uploads"])

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB


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
    filename = file.name or ""
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
            get_message("VALIDATION_ERROR", detail="Tipo de contenido de imagen no permitido."),
        )

    try:
        data = file.read()
        Image.open(BytesIO(data)).verify()
        file.seek(0)
    except (UnidentifiedImageError, OSError, ValueError):
        raise HttpError(
            400,
            get_message("VALIDATION_ERROR", detail="El archivo no es una imagen válida."),
        )

    try:
 # Generate random unique filename to prevent collisions and path traversal
        tenant_dirname = str(request.tenant.id) if request.tenant else "platform"
        filename = f"uploads/{tenant_dirname}/{uuid.uuid4().hex}{ext}"

 # Save to S3/MinIO
        path = default_storage.save(filename, file)

 # Retrieve the public URL
        public_url = default_storage.url(path)

        return {"success": True, "url": public_url}

    except Exception as exc:
        logger.error("Error uploading file to storage: %s", exc, exc_info=True)
        raise HttpError(500, get_message("SERVER_ERROR"))
