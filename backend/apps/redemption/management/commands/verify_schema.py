"""
Resilient schema verification command.

Runs after migrate to ensure all model fields exist as database columns.
This prevents the "column does not exist" error when migrations and schema
get out of sync (e.g., PgBouncer DDL issues, failed transactions).

Usage: python manage.py verify_schema --database=direct
"""

from django.apps import apps
from django.core.management.base import BaseCommand
from django.db import connection, transaction


class Command(BaseCommand):
    help = "Verify model fields exist as DB columns; auto-repair if missing."

    def add_arguments(self, parser):
        parser.add_argument(
            "--database",
            default="default",
            help="Database alias to verify.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show mismatches without fixing.",
        )

    def handle(self, *args, **options):
        db = options["database"]
        dry_run = options["dry_run"]
        mismatches = []

        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT table_name, column_name
                FROM information_schema.columns
                WHERE table_schema = 'public'
            """
            )
            db_columns = {(row[0], row[1]) for row in cursor.fetchall()}

        for model in apps.get_models():
            table = model._meta.db_table
            for field in model._meta.fields:
                col = field.column
                if (table, col) not in db_columns:
                    mismatches.append((model._meta.label, table, col, field.get_internal_type()))

        if not mismatches:
            self.stdout.write(self.style.SUCCESS("Schema verification passed: all model fields exist as columns."))
            return

        self.stdout.write(self.style.WARNING(f"Schema mismatches found: {len(mismatches)}"))
        for label, table, col, typ in mismatches:
            self.stdout.write(f"  MISSING: {label}.{col} ({typ}) on table {table}")

        if dry_run:
            return

        self.stdout.write(self.style.NOTICE("Auto-repairing missing columns..."))
        with transaction.atomic(using=db), connection.cursor() as cursor:
            for _label, table, col, typ in mismatches:
                sql = self._generate_column_sql(col, typ)
                if sql:
                    stmt = f'ALTER TABLE "{table}" ADD COLUMN IF NOT EXISTS "{col}" {sql}'
                    self.stdout.write(f"  Executing: {stmt}")
                    cursor.execute(stmt)

        self.stdout.write(self.style.SUCCESS("Schema auto-repair complete."))

    def _generate_column_sql(self, col, typ):
        mapping = {
            "JSONField": "JSONB NOT NULL DEFAULT '{}'",
            "CharField": "VARCHAR(255) NOT NULL DEFAULT ''",
            "TextField": "TEXT NOT NULL DEFAULT ''",
            "IntegerField": "INTEGER NOT NULL DEFAULT 0",
            "PositiveIntegerField": "INTEGER NOT NULL DEFAULT 0",
            "DateTimeField": "TIMESTAMP WITH TIME ZONE",
            "BooleanField": "BOOLEAN NOT NULL DEFAULT FALSE",
            "UUIDField": "UUID",
            "DecimalField": "DECIMAL(12,2) NOT NULL DEFAULT 0",
            "AutoField": "SERIAL",
            "BigAutoField": "BIGSERIAL",
            "ForeignKey": "UUID",
        }
        return mapping.get(typ)
