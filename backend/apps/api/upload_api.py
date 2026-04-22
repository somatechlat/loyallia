"""
Loyallia — File Upload API
Handles direct image uploads (logos, etc.) to MinIO/S3 and returns public URLs.
"""

import logging
import os
import uuid

from django.core.files.storage import default_storage
from ninja import File, Router
from ninja.errors import HttpError
from ninja.files import UploadedFile

from common.permissions import jwt_auth

logger = logging.getLogger(__name__)

router = Router(tags=["Uploads"])

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".svg", ".webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB


@router.post("/", auth=jwt_auth, summary="Subir imagen")
def upload_file(request, file: UploadedFile = File(...)):
    """
    Uploads an image (logo, strip) to cloud storage and returns the public URL.
    Only allows image files up to 5MB.
    """
    ext = os.path.splitext(file.name)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HttpError(
            400, "Formato de archivo no permitido. Usa JPG, PNG, SVG o WEBP."
        )

    if file.size > MAX_FILE_SIZE:
        raise HttpError(400, "El archivo supera el tamaño máximo permitido (5MB).")

    try:
        # Generate random unique filename to prevent collisions and path traversal
        tenant_dirname = (
            str(request.tenant.id) if getattr(request, "tenant", None) else "platform"
        )
        filename = f"uploads/{tenant_dirname}/{uuid.uuid4().hex}{ext}"

        # Save to S3/MinIO
        path = default_storage.save(filename, file)

        # Retrieve the public URL
        public_url = default_storage.url(path)

        return {"success": True, "url": public_url}

    except Exception as exc:
        logger.error("Error uploading file to storage: %s", exc, exc_info=True)
        raise HttpError(500, "Error interno al subir el archivo.")
