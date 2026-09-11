# AI App

AI-powered features for Loyallia.

## Endpoints

- `POST /api/v1/ai/design/` — Generate wallet pass design suggestions
- `POST /api/v1/ai/chat/` — AI chat assistant

## Services

- `kimi_service` — Kimi AI integration for design generation
- `fallback_designer` — Fallback design when AI is unavailable
- `cost_tracker` — Track AI API usage costs

## Configuration

AI settings are stored in Vault under `ai_agent_api_key` and `ai_agent_base_url`.
