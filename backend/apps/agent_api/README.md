# Agent API

Internal API for AI assistant queries and agent operations.

## Models

- `AgentAPICallLog` — per-tenant AI query usage tracking

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/agent/chat/` | AI assistant chat |
| GET | `/api/v1/agent/usage/` | Query usage stats |

## Dependencies

- `apps.tenants` (Tenant)

## Called By

- Dashboard chatbot
