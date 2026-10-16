# agent-zero (Loyallia service)

Agent Zero — an AI agent platform (chat UI, tools, plugins, sub-agents) —
vendored as first-party Loyallia code. Upstream provenance, pinned version and
re-sync procedure: see [`VENDOR.md`](VENDOR.md). Upstream's own documentation:
[`README.upstream.md`](README.upstream.md). License: MIT (`LICENSE`).

## Build

```sh
docker build -t loyallia-agent services/agent-zero
```

Runs as non-root user `a0` (uid 1000) and listens on `0.0.0.0:80` inside the
container (override with `WEB_UI_PORT` / `WEB_UI_HOST`). Health endpoint:
`GET /api/health` (unauthenticated; used by the image `HEALTHCHECK`).

## Configuration (env, secrets at boot)

Agent Zero reads its settings through `helpers/settings.py`: every setting can
be pre-set with an environment variable named `A0_SET_<SETTING_NAME>` (exact
name or uppercase), type-coerced to the setting's default type (JSON for dicts,
`true/1/yes/on` for booleans). Example:

```sh
docker run -p 8080:80 \
  -e A0_SET_auth_login=admin \
  -e A0_SET_auth_password='secret-from-vault' \
  -e A0_SET_api_keys='{"openrouter":"sk-..."}' \
  loyallia-agent
```

Inject secrets this way (orchestrator env / secrets → container env); never
commit them. Caveat: values written to `usr/.env` (e.g. from the Settings UI)
are loaded at boot with override and take precedence over container env vars of
the same name.

In the cluster the container boots through `docker/loyallia-entrypoint.sh`,
which fetches the agent API key from HashiCorp Vault at boot (or takes
`A0_SET_MCP_SERVER_TOKEN` directly) and injects it as that setting both via env
and into `/a0/usr/settings.json`. Fail-closed: the container refuses to start
without the key. The image is CPU-only (no CUDA/GPU wheels) and ships without
the optional `_whisper_stt` / `_kokoro_tts` audio plugins — see `VENDOR.md`.

## State

All mutable state lives under `/a0/usr` and `/a0/tmp` inside the container —
mount `/a0/usr` as a volume:

- `/a0/usr/chats` — chat history
- `/a0/usr/uploads`, `/a0/usr/workdir` — files and workspace
- `/a0/usr/.env`, settings store — runtime configuration
- `/a0/tmp` — scratch space

## Agent profiles

Agent profiles (`agents/*`) and plugin/prompt configuration are deployed
config-as-code from this directory (`agents/`, `plugins/`, `prompts/`,
`skills/`, `conf/`), not edited in the running container. There are no
Loyallia-specific profiles yet; add them under `agents/<name>/` and rebuild.
