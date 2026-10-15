"""Redis backup and restore operations."""

import logging
import os
import shutil
import subprocess
from datetime import datetime
from urllib.parse import urlparse

from apps.backup.services.config import get_redis_url, scrub_error, temp_backup_dir

logger = logging.getLogger(__name__)


def _redis_cli_args(redis_url: str, rdb_path: str) -> list[str]:
    """Build redis-cli argv for an RDB dump. Uses explicit host/port/auth flags."""
    parsed = urlparse(redis_url) if redis_url else None
    host = parsed.hostname if parsed and parsed.hostname else "redis"
    port = str(parsed.port or 6379)
    password = parsed.password if parsed else None

    cmd = ["redis-cli", "-h", host, "-p", port, "--no-auth-warning"]
    if password:
        cmd.extend(["-a", password])
    cmd.extend(["--rdb", rdb_path])
    return cmd


def backup_redis(job_id: str) -> dict:
    """Dump Redis RDB via redis-cli --rdb (works from any container with the URL)."""
    tmp_dir = temp_backup_dir("redis")
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    redis_file = os.path.join(tmp_dir, f"loyallia_redis_{timestamp}.rdb")

    cmd = _redis_cli_args(get_redis_url(), redis_file)

    try:
        logger.info("backup_redis: starting redis-cli --rdb for job %s", job_id)
        subprocess.run(cmd, check=True, capture_output=True, timeout=120)

        file_size = os.path.getsize(redis_file)
        logger.info(
            "backup_redis: job %s completed, size=%d bytes", job_id, file_size
        )
        return {
            "success": True,
            "component": "redis",
            "job_id": job_id,
            "file_path": redis_file,
            "file_size": file_size,
        }
    except Exception as e:
        logger.exception(
            "backup_redis failed for job %s: %s", job_id, scrub_error(str(e))
        )
        raise


def restore_redis(rdb_file: str) -> bool:
    """Restore Redis by replacing dump.rdb and restarting."""
    try:
        logger.info("restore: restoring Redis from %s", rdb_file)
        from django_redis import get_redis_connection

        redis_conn = get_redis_connection("default")
        config_get = redis_conn.execute_command("CONFIG", "GET", "dir")
        if isinstance(config_get, list | tuple) and len(config_get) >= 2:
            redis_dir = (
                config_get[1].decode()
                if isinstance(config_get[1], bytes)
                else config_get[1]
            )
        else:
            redis_dir = "/data"

        dump_dest = os.path.join(redis_dir, "dump.rdb")
        redis_conn.execute_command("SHUTDOWN", "NOSAVE")
        shutil.copy2(rdb_file, dump_dest)
        logger.info("restore: copied Redis RDB to %s", dump_dest)
        return True
    except Exception as e:
        logger.exception("restore: Redis restore failed: %s", e)
        return False
