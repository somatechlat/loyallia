"""
Loyallia Backup Offsite Service (apps.backup.services.offsite)

Business logic for listing offsite backups stored on MinIO.
Called by: apps.backup.api (list_offsite_backups endpoint)
"""

import logging
import subprocess
from pathlib import Path

from apps.backup.schemas import OffsiteBackupOut

logger = logging.getLogger("loyallia.backup")


def list_offsite_backups() -> list[OffsiteBackupOut]:
    """List offsite backups on MinIO using the client wrapper script.

    Returns:
        A list of OffsiteBackupOut objects representing offsite backups.

    Raises:
        RuntimeError: If the MinIO client script is missing or the subprocess fails.
    """
    project_root = Path(__file__).resolve().parent.parent.parent.parent
    minio_script = project_root / "deploy" / "backups" / "lib" / "minio-client.sh"

    if not minio_script.exists():
        raise RuntimeError(get_message("BACKUP_MINIO_SCRIPT_NOT_FOUND"))

    try:
        result = subprocess.run(
            [str(minio_script), "list", ""],
            capture_output=True,
            text=True,
            cwd=str(project_root),
        )
    except Exception as exc:
        logger.exception("list_offsite_backups failed")
        raise RuntimeError(f"Failed to list offsite backups: {exc}") from exc

    backups: list[OffsiteBackupOut] = []
    for line in result.stdout.splitlines():
        parts = line.strip().split("\t")
        if len(parts) >= 3:
            backups.append(
                OffsiteBackupOut(
                    key=parts[0],
                    size=int(parts[1]) if parts[1].isdigit() else 0,
                    last_modified=parts[2],
                )
            )

    return backups
