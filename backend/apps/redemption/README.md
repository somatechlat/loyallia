# Redemption

Reward redemption engine and rule evaluation.

## Models

- `RedemptionRule` — conditions for redeeming a reward
- `Redemption` — record of a redeemed reward

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/redemption/rules/` | List redemption rules |
| POST | `/api/v1/redemption/rules/` | Create rule |
| POST | `/api/v1/redemption/redeem/` | Process redemption |

## Dependencies

- `apps.customers` (CustomerPass)
- `apps.cards` (Card, Reward)
- `apps.transactions` (Transaction)

## Called By

- QR scanner
- Dashboard redemption management
