#!/bin/sh
set -eu

DATA_DIR=/var/lib/postgresql/data
POSTGRES_USER="${POSTGRES_USER:-loyallia}"

chown -R postgres:postgres "$DATA_DIR"

export PGPASSWORD="$(cat /run/loyallia-vault/postgres_password)"

if [ ! -f "$DATA_DIR/PG_VERSION" ]; then
    until su-exec postgres pg_basebackup \
        --pgdata="$DATA_DIR" \
        --host=postgres \
        --port=5432 \
        --username="$POSTGRES_USER" \
        --wal-method=stream \
        --checkpoint=fast \
        --progress \
        --verbose 2>&1; do
        echo "Waiting for primary to accept replication connections..."
        sleep 5
    done
fi

chmod 0700 "$DATA_DIR"

POSTGRES_PASSWORD="$(cat /run/loyallia-vault/postgres_password)"
PRIMARY_CONNINFO="host=postgres port=5432 user=${POSTGRES_USER} password=${POSTGRES_PASSWORD}"
export PRIMARY_CONNINFO

su-exec postgres sh -c '
printf "%s\n" "primary_conninfo = '\''${PRIMARY_CONNINFO}'\''" "hot_standby = on" > /var/lib/postgresql/data/postgresql.auto.conf
touch /var/lib/postgresql/data/standby.signal
'

exec su-exec postgres postgres \
    -c hot_standby=on \
    -c max_connections=200 \
    -c shared_buffers=256MB \
    -c work_mem=8MB
