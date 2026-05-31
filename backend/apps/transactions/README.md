# Transactions

Redemption and accrual transactions: stamps, points, cashback, coupon redemptions.

## Models

- `Transaction` — single redemption/accrual event
- `TransactionLog` — audit trail for transaction changes

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/transactions/` | List transactions |
| GET | `/api/v1/transactions/{id}/` | Transaction detail |
| POST | `/api/v1/scanner/validate/` | Validate QR code |
| POST | `/api/v1/scanner/transact/` | Process scan transaction |

## Services

- `service.py` — Transaction processing with idempotency keys

## Dependencies

- `apps.customers` (Customer, CustomerPass)
- `apps.cards` (Card, Reward)
- `apps.tenants` (Tenant)

## Called By

- QR scanner app (`/scanner`)
- Dashboard transaction history
- Automation engine (birthday rewards, etc.)
