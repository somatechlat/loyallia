# Cards (Programs)

Loyalty program definitions: stamp cards, points, cashback, coupons, VIP memberships, and more.

## Models

- `Card` — loyalty program definition (type, rewards, rules, branding)
- `Reward` — reward tier within a program
- `StampRule` — rules for stamp accumulation
- `CashbackRule` — cashback percentage/limits

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/programs/` | List programs |
| POST | `/api/v1/programs/` | Create program |
| GET | `/api/v1/programs/{id}/` | Program detail |
| PATCH | `/api/v1/programs/{id}/` | Update program |
| POST | `/api/v1/programs/{id}/suspend/` | Suspend program |
| POST | `/api/v1/programs/{id}/publish/` | Publish program |
| DELETE | `/api/v1/programs/{id}/` | Delete program |
| GET | `/api/v1/programs/{id}/stats/` | Program statistics |
| GET | `/api/v1/programs/{id}/members/` | Enrolled members |
| GET | `/api/v1/programs/{id}/transactions/` | Program transactions |

## Dependencies

- `apps.tenants` (Tenant model)
- `apps.customers` (CustomerPass for enrollment counts)

## Called By

- Dashboard program management
- Wallet designer
- Enrollment page
