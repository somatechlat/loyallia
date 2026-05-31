# Audit

Comprehensive audit logging for compliance, security forensics, and operational transparency.

## Models

- `AuditLog` — immutable record of every significant action
- `AuditAction` — enum of action types (CREATE, READ, UPDATE, DELETE, EXPORT, LOGIN, etc.)
- `AuditStatus` — SUCCESS, FAILED, BLOCKED

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/audit/` | Query audit logs (filter by action, user, date) |

## Service

- `service.py` — `log_action()` helper used across all apps

## Decorator

- `common/decorators.py` — `@audit_log(action, resource_type)` replaces manual `try/except/log_action` blocks

## Dependencies

- `apps.tenants` (Tenant)

## Called By

- All API endpoints (via decorator or manual calls)
