---
title: "Database Migration Rollback Strategy"
document_id: "LOYALLIA-DOC-MIGRATION_ROLLBACK.MD"
version: "1.0"
status: "approved"
last_updated: "2026-09-16"
author: "Engineering Lead"
owner: "Engineering Lead"
approver: "Product Owner"
classification: "Internal Use"
confidentiality: "Internal — Restricted to Engineering and Product teams"
review_cycle: "Upon each major release, or annually (whichever comes first)"
standard: "ISO/IEC 27001:2022, ISO 9001:2015, ISO/IEC 42010:2011"
parent_document: "N/A"
---

## DOCUMENT CONTROL

| Field | Details |
|-------|---------|
| **Document ID** | LOYALLIA-DOC-MIGRATION_ROLLBACK.MD |
| **Title** | Database Migration Rollback Strategy |
| **Version** | 1.0 |
| **Date** | 2026-09-16 |
| **Author** | Engineering Lead |
| **Approver** | Product Owner |
| **Owner** | Engineering Lead |
| **Classification** | Internal Use |
| **Confidentiality** | Internal — Restricted to Engineering and Product teams |
| **Review Cycle** | Upon each major release, or annually (whichever comes first) |
| **Status** | approved |
| **Standard** | ISO/IEC 27001:2022, ISO 9001:2015, ISO/IEC 42010:2011|
| **Parent Document** | N/A |
| **Supersedes** | N/A |
| **Language** | Spanish |
| **Format** | Markdown (.md) |
| **Location** | `docs/07-reviews/MIGRATION_ROLLBACK.md` |

### Revision History

| Version | Date | Author | Description of Changes |
|---------|------|--------|------------------------|
| 1.0 | 2026-09-16 | Engineering Lead | Added ISO-compliant document controls |

### Distribution List

| Recipient | Role | Purpose |
|-----------|------|---------|
| Engineering Lead | Author / Owner | Maintains document |
| Product Owner | Approver | Business validation |
| Security Officer | Reviewer | Security requirements validation |
| QA Lead | Reviewer | Quality assurance validation |

### Related Documents

| Document ID | Title | Relationship |
|-------------|-------|-------------|
| LOYALLIA-RULES-001 | Loyallia Agent Rules And Coding Standards | Reference |
| LOYALLIA-AGENTS-001 | Loyallia Agent Instructions | Reference |
| LOYALLIA-DOC-ARCHITECTURE.MD | Loyallia Architecture, Sequence & Flowchart Diagrams | Reference |

### Change Control Process

1. All changes to this document MUST be recorded in the Revision History table above.
2. Status transitions: `draft` → `review` → `approved` → `active` → `deprecated` → `archived`.
3. Changes after `approved` status require a new version number and re-approval.
4. Minor corrections (typos, formatting) increment the minor version (e.g., 1.0 → 1.1).
5. Major changes (new requirements, scope changes) increment the major version (e.g., 1.0 → 2.0).
6. Deprecated documents MUST be moved to `docs/09-archive/` with a deprecation notice.
7. All dates in this document use ISO 8601 format (`YYYY-MM-DD`).

## DOCUMENT APPROVAL

| Role | Name | Signature | Date | Decision |
|------|------|-----------|------|----------|
| Engineering Lead | — | — | 2026-09-16 | Approved |
| Product Owner | — | — | 2026-09-16 | Approved |
| Security Officer | — | — | — | Pending Review |

### Document Lifecycle

| State | Date | Actor | Notes |
|-------|------|-------|-------|
| Draft | 2026-09-16 | Engineering Lead | Initial ISO controls added |
| Approved | 2026-09-16 | Engineering Lead | Document approved for use |

### Next Review Date

| Trigger | Date | Notes |
|---------|------|-------|
| Annual review | 2026-12-31 | End of year review cycle |
| Major release | — | Triggered by major platform release |

> **Estado del documento (2026-06-11):** Revisión basada en el código y documentación vigente.
> **Snapshot as of 2026-06-11:** Command paths and migration practices reflect the codebase at this date; verify against current HEAD before acting.
> Algunos hallazgos pueden haber cambiado; verificar siempre contra el código fuente.

# Database Migration Rollback Strategy
**LYL-M-ARCH-034**

## Overview

All Django migrations must follow a safe rollback strategy to minimize downtime
and data loss during deployments.

## Pre-Migration Checklist

1. **Backup first**: Always create a point-in-time backup before running migrations
   ```bash
   ./deploy/backups/pg_dump_backup.sh
   ```

2. **Test on staging**: Run migration on staging environment with production-like data

3. **Check migration reversibility**: Every migration must have a reversible `Reverse` operation
   ```bash
   python manage.py migrate --check  # Verify all migrations are reversible
   ```

4. **Review SQL**: Inspect the generated SQL before applying
   ```bash
   python manage.py sqlmigrate <app> <migration_number>
   ```

## Safe Migration Patterns

### Adding a column (safe)
```python
# Forward
migrations.AddField(
    model_name='tenant',
    name='new_field',
    field=models.CharField(max_length=100, default='', blank=True),
)
# Reverse is automatic — Django drops the column
```

### Renaming a column (requires care)
```python
# Step 1: Add new column
migrations.AddField(model_name='tenant', name='new_name', field=models.CharField(...))
# Step 2: Copy data (data migration)
# Step 3: Deploy code that reads from new_name
# Step 4: Remove old column in next release
migrations.RemoveField(model_name='tenant', name='old_name')
```

### Adding a NOT NULL column (requires default)
```python
# Always provide a default for existing rows
migrations.AddField(
    model_name='tenant',
    name='required_field',
    field=models.CharField(max_length=50, default='legacy_value'),
)
```

### Removing a column (safe)
```python
# Forward — Django drops the column
migrations.RemoveField(model_name='tenant', name='deprecated_field')
# Reverse is automatic — Django re-adds the column
```

## Rollback Procedures

### Immediate Rollback (< 5 minutes)
```bash
# 1. Stop the API server
docker compose stop api celery-worker

# 2. Rollback the migration
docker compose exec api python manage.py migrate <app> <previous_migration_number>

# 3. Restart
docker compose start api celery-worker
```

### Full Restore (if data corruption)
```bash
# 1. Stop all services
docker compose stop api celery-worker celery-beat

# 2. Restore from backup
pg_restore -h postgres -U loyallia -d loyallia --clean /var/backups/postgresql/daily/latest.dump

# 3. Apply any pending migrations up to the rollback point
docker compose exec api python manage.py migrate <app> <safe_migration>

# 4. Restart
docker compose start api celery-worker celery-beat
```

## Monitoring After Migration

1. Check error rates in Grafana for 30 minutes post-deploy
2. Verify database connection pool health
3. Check Celery task success rates
4. Monitor API response times

## Data Migration Best Practices

- Use `RunPython` with `reverse_code` for reversible data migrations
- Process in batches of 1000-5000 rows to avoid long locks
- Use `transaction.atomic()` for each batch
- Add `dependencies` to ensure correct ordering

```python
def forward_func(apps, schema_editor):
    MyModel = apps.get_model('myapp', 'MyModel')
    batch_size = 1000
    total = MyModel.objects.count()
    for start in range(0, total, batch_size):
        batch = MyModel.objects.all()[start:start + batch_size]
        for obj in batch:
            obj.new_field = transform(obj.old_field)
        MyModel.objects.bulk_update(batch, ['new_field'], batch_size=batch_size)

def reverse_func(apps, schema_editor):
    # Reverse the transformation
    pass

migrations.RunPython(forward_func, reverse_code=reverse_func),
```
