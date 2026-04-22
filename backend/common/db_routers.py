"""
Loyallia — Database Router for PgBouncer
Routes migrations/schema operations to 'direct' (bypasses PgBouncer).
All other queries go through 'default' (PgBouncer transaction pooling).

PgBouncer in transaction mode does not support:
  - SET/RESET statements (used by migrations)
  - Advisory locks (used by migration framework)
  - Prepared statements (if DISABLE_PREPARED=True not set)

This router ensures schema changes use the direct PostgreSQL connection
while all application queries benefit from connection pooling.
"""


class PgBouncerRouter:
    """Route migrations to direct PostgreSQL; everything else through PgBouncer."""

    def db_for_read(self, model, **hints):
        """All reads go through PgBouncer (default)."""
        return "default"

    def db_for_write(self, model, **hints):
        """All writes go through PgBouncer (default)."""
        return "default"

    def allow_relation(self, obj1, obj2, **hints):
        """Allow all relations (both DBs point to the same PostgreSQL)."""
        return True

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        """Migrations only run on 'direct' (bypasses PgBouncer)."""
        return db == "direct"
