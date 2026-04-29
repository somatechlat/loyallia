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
