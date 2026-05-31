# Automation

Rule-based automation engine for triggered campaigns and rewards.

## Models

- `Automation` — trigger + condition + action rule
- `AutomationExecution` — log of each automation run

## Triggers

- `birthday` — Customer birthday
- `signup` — New enrollment
- `transaction` — Purchase/redemption
- `inactivity` — No activity for N days
- `milestone` — Stamp/points milestone

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/automation/` | List automations |
| POST | `/api/v1/automation/` | Create automation |
| GET | `/api/v1/automation/{id}/` | Automation detail |
| PUT | `/api/v1/automation/{id}/` | Update automation |
| DELETE | `/api/v1/automation/{id}/` | Delete automation |
| POST | `/api/v1/automation/{id}/toggle/` | Enable/disable |
| POST | `/api/v1/automation/{id}/execute/` | Manual trigger |
| GET | `/api/v1/automation/stats/` | Execution stats |

## Engine

- `engine.py` — Celery task that evaluates triggers and executes actions
- Respects plan limits (`automations`, `automation_executions_day`)

## Dependencies

- `apps.tenants` (Tenant)
- `apps.customers` (Customer, CustomerPass)
- `apps.cards` (Card)
- `apps.notifications` (Campaign delivery)

## Called By

- Dashboard automation builder
- Celery beat scheduler
