"""PostgreSQL backup and restore operations."""

import logging
import os
import subprocess
from datetime import datetime

from apps.backup.services.config import get_db_config, scrub_error, temp_backup_dir

logger = logging.getLogger(__name__)


def backup_postgresql(job_id: str, compression_enabled: bool = True) -> dict:
    """Run pg_dump and compress the output.

    Returns a dict with success, file_path, and file_size.
    Raises on failure for Celery retry.
    """
    tmp_dir = temp_backup_dir("pg")
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    dump_file = os.path.join(tmp_dir, f"loyallia_pg_{timestamp}.sql.gz")

    db = get_db_config()
    env = os.environ.copy()
    env["PGPASSWORD"] = db["password"]

    compress_flag = "--gzip" if compression_enabled else ""
    cmd_parts = [
        "pg_dump",
        "--host",
        db["host"],
        "--port",
        str(db["port"]),
        "--username",
        db["user"],
        "--dbname",
        db["name"],
        "--verbose",
        "--no-owner",
        "--no-privileges",
        "--format",
        "custom" if not compression_enabled else "plain",
    ]
    if compress_flag:
        cmd_parts.append("--gzip")

    try:
        logger.info("backup_postgresql: starting pg_dump for job %s", job_id)
        with open(dump_file, "wb") as out_fh:
            subprocess.run(
                cmd_parts, stdout=out_fh, stderr=subprocess.PIPE, env=env, check=True
            )

        file_size = os.path.getsize(dump_file)
        logger.info(
            "backup_postgresql: job %s completed, size=%d bytes", job_id, file_size
        )
        return {
            "success": True,
            "component": "postgresql",
            "job_id": job_id,
            "file_path": dump_file,
            "file_size": file_size,
        }
    except subprocess.CalledProcessError as exc:
        stderr = (exc.stderr or b"").decode("utf-8", errors="replace")
        logger.error("backup_postgresql failed: %s", scrub_error(stderr))
        raise
    finally:
        env.pop("PGPASSWORD", None)


def restore_postgresql(dump_file: str) -> bool:
    """Restore PostgreSQL from a pg_dump file."""
    db = get_db_config()
    env = os.environ.copy()
    env["PGPASSWORD"] = db["password"]

    try:
        logger.info("restore: restoring PostgreSQL from %s", dump_file)
        if dump_file.endswith(".gz") or dump_file.endswith(".gzip"):
            with subprocess.Popen(
                ["zcat", dump_file], stdout=subprocess.PIPE
            ) as zcat_proc:
                subprocess.run(
                    [
                        "psql",
                        "--host",
                        db["host"],
                        "--port",
                        str(db["port"]),
                        "--username",
                        db["user"],
                        "--dbname",
                        db["name"],
                        "--set",
                        "ON_ERROR_STOP=1",
                    ],
                    stdin=zcat_proc.stdout,
                    env=env,
                    check=True,
                    capture_output=True,
                )
        else:
            subprocess.run(
                [
                    "psql",
                    "--host",
                    db["host"],
                    "--port",
                    str(db["port"]),
                    "--username",
                    db["user"],
                    "--dbname",
                    db["name"],
                    "--set",
                    "ON_ERROR_STOP=1",
                    "--file",
                    dump_file,
                ],
                env=env,
                check=True,
                capture_output=True,
            )
        logger.info("restore: PostgreSQL restore completed")
        return True
    except subprocess.CalledProcessError as exc:
        stderr = (exc.stderr or b"").decode("utf-8", errors="replace")
        logger.error("restore: PostgreSQL restore failed: %s", scrub_error(stderr))
        return False
    except Exception:
        logger.exception("restore: PostgreSQL restore unexpected error")
        return False
    finally:
        env.pop("PGPASSWORD", None)
