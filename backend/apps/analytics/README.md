# Analytics

Business intelligence: dashboards, trends, segments, and revenue breakdowns.

## Models

- `AnalyticsSnapshot` — daily aggregated metrics per tenant
- `CustomerSegment` — reusable audience segments

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/analytics/overview/` | Dashboard KPIs |
| GET | `/api/v1/analytics/trends/` | Time-series trends |
| GET | `/api/v1/analytics/segments/` | Customer segments |
| GET | `/api/v1/analytics/programs/` | Program performance |
| GET | `/api/v1/analytics/revenue-breakdown/` | Revenue by channel |
| GET | `/api/v1/analytics/visits/` | Visit patterns |
| GET | `/api/v1/analytics/top-buyers/` | Highest-value customers |
| GET | `/api/v1/analytics/demographics/` | Customer demographics |
| GET | `/api/v1/analytics/by-program-type/` | Performance by card type |

## Tasks

- `tasks.py` — Daily analytics aggregation (Celery beat)

## Dependencies

- `apps.tenants` (Tenant)
- `apps.customers` (Customer, Transaction)
- `apps.cards` (Card)

## Called By

- Dashboard analytics page
