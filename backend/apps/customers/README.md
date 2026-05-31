# Customers

Customer database, digital pass enrollment, wallet pass generation (Apple/Google), and portal access.

## Models

- `Customer` — customer profile with contact info and metadata
- `CustomerPass` — enrollment linking customer to a program/card
- `CustomerSegment` — dynamic/static customer segments
- `PassEvent` — scan/redemption event log

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/customers/` | List customers (search, filter, paginate) |
| POST | `/api/v1/customers/` | Create customer |
| GET | `/api/v1/customers/{id}/` | Customer detail |
| PUT | `/api/v1/customers/{id}/` | Update customer |
| DELETE | `/api/v1/customers/{id}/` | Delete customer |
| POST | `/api/v1/customers/import/` | CSV import |
| GET | `/api/v1/customers/export/` | CSV export |
| POST | `/api/v1/customers/{id}/enroll/` | Enroll in program |
| GET | `/api/v1/customers/{id}/passes/` | Customer's active passes |

## Services

- `import_service.py` — CSV import with duplicate detection
- `service.py` — Customer CRUD business logic
- `segment_api.py` — Segment filtering and member lookup

## Pass Engine

- `pass_engine/apple_pass.py` — Apple Wallet .pkpass generation
- `pass_engine/apple_push.py` — APNs push notifications
- `pass_engine/google_pass.py` — Google Wallet JWT link generation
- `pass_engine/qr_generator.py` — Enrollment QR codes

## Portal

- `portal_api.py` — Customer self-service portal
- `portal_auth.py` — Portal token authentication

## Dependencies

- `apps.cards` (Card/Program model)
- `apps.tenants` (Tenant model)
- `apps.notifications` (Campaign delivery)

## Called By

- Dashboard customer management
- Enrollment page (`/enroll/{slug}`)
- Customer portal
