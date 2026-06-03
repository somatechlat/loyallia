"""Redis backup and restore operations."""

import logging
import os
import shutil
import time
from datetime import datetime

from apps.backup.services.config import temp_backup_dir

logger = logging.getLogger(__name__)


def backup_redis(job_id: str) -> dict:
    """Trigger Redis BGSAVE and copy the resulting dump.rdb."""
    tmp_dir = temp_backup_dir("redis")
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    redis_file = os.path.join(tmp_dir, f"loyallia_redis_{timestamp}.rdb")

    try:
        from django_redis import get_redis_connection

        redis_conn = get_redis_connection("default")
        redis_conn.execute_command("BGSAVE")
        logger.info("backup_redis: BGSAVE triggered for job %s", job_id)

        for _ in range(60):
            time.sleep(1)
            info = redis_conn.execute_command("INFO", "persistence")
            if isinstance(info, bytes):
                info = info.decode("utf-8")
            if "rdb_bgsave_in_progress:0" in info:
                break

        config_get = redis_conn.execute_command("CONFIG", "GET", "dir")
        if isinstance(config_get, list | tuple) and len(config_get) >= 2:
            redis_dir = (
                config_get[1].decode()
                if isinstance(config_get[1], bytes)
                else config_get[1]
            )
        else:
            redis_dir = "/data"

        dump_source = os.path.join(redis_dir, "dump.rdb")
        if os.path.exists(dump_source):
            shutil.copy2(dump_source, redis_file)
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

        for alt_dir in ("/data", "/var/lib/redis", "/var/redis", "/tmp"):
            alt_path = os.path.join(alt_dir, "dump.rdb")
            if os.path.exists(alt_path):
                shutil.copy2(alt_path, redis_file)
                file_size = os.path.getsize(redis_file)
                logger.info("backup_redis: job %s completed from %s", job_id, alt_dir)
                return {
                    "success": True,
                    "component": "redis",
                    "job_id": job_id,
                    "file_path": redis_file,
                    "file_size": file_size,
                }

        raise FileNotFoundError(f"dump.rdb not found in {redis_dir} or known locations")
    except Exception as e:
        logger.exception("backup_redis failed for job %s: %s", job_id, e)
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
