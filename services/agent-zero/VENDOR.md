# VENDOR.md — Agent Zero (vendored first-party)

## Provenance

| Field | Value |
| --- | --- |
| Upstream project | Agent Zero |
| Upstream URL | https://github.com/agent0ai/agent-zero (fallback: https://github.com/frdel/agent-zero) |
| Docker image upstream | `agent0ai/agent-zero` (prebuilt; NOT used by our build) |
| Pinned release tag | `v2.14` (annotated tag object `47558208016dfb0e09827323154bd3aae32e6a28`) |
| Pinned commit SHA | `ff2a5b9c9c4e490ba38dd7c313e779510bb2071a` (tag `v2.14` == HEAD of `main` at vendoring time) |
| Vendoring date | 2026-10-16 |
| License | MIT — see `LICENSE` (upstream header: Copyright (c) 2025 Agent Zero, s.r.o.) |
| Git history | Stripped. This directory contains a plain working tree with no `.git`. |

## Ownership

Vendored into Loyallia. Modifications made inside `services/agent-zero/` are
first-party Loyallia code. Everything not explicitly listed under
"Deliberate omissions", "Renamed files" or "First-party additions / patches"
below is an unmodified copy of upstream at the pinned SHA. The MIT license text
in `LICENSE` is kept intact and governs the upstream-derived portions.

## Deliberate omissions (pruned at vendoring)

| Omitted | Why |
| --- | --- |
| `.git/` | Git history stripped; this is first-party Loyallia code now. |
| `.github/workflows/` (`close-inactive.yml`, `docker-publish.yml`) | Upstream CI/release automation; Loyallia builds and releases from the monorepo. |
| `.github/FUNDING.yml` | Upstream funding metadata. |
| `.vscode/` | Upstream editor configuration. |
| `docs/res/` (~19 MB demo GIFs) | Non-runtime documentation media; the rest of `docs/` is kept. |
| `DockerfileLocal` | Upstream dev-build Dockerfile that consumes the prebuilt `agent0ai/agent-zero-base` Kali image; redundant with our self-contained `Dockerfile` (see below). |
| `plugins/_kokoro_tts/`, `plugins/_whisper_stt/` | LOYALLIA CPU-only policy (2026-10-16): optional local TTS/STT plugins and their audio ML stack (`kokoro`, `openai-whisper`, `soundfile`, `ffmpeg`) are not shipped — torch-heavy, unused by Loyallia's text-only chat. See "Policy note" below for the re-enable procedure. |
| `tests/test_kokoro_tts.py`, `tests/test_paradee_tts.py`, `tests/test_speech_plugin_split.py` | Removed with the audio plugins above (they test only those plugins). |

Deliberately **kept** despite being non-runtime (small, useful provenance or
test references): `docker/` (upstream's full base/run image pipeline — the
runtime layout `docker/run/fs/{exe,ins,etc}` is referenced by
`helpers/self_update.py` and tests), `.github/scripts/docker_release_plan.py`
(loaded by `tests/test_docker_release_plan.py`), `security-review/LEDGER.md`
(upstream security review record), `tests/`, `docs/` (minus `docs/res`).

No `agents/*loyallia*` profiles exist upstream — none were fabricated here.

## Renamed files (root name collisions with our service docs)

| Upstream name | Now | Why |
| --- | --- | --- |
| `README.md` | `README.upstream.md` | Root `README.md` is reserved for the Loyallia service README. Content unmodified. |
| `AGENTS.md` | `AGENTS.upstream.md` | Avoid upstream's agent guidance being picked up as this directory's agent instructions. Content unmodified. |

Nested `AGENTS.md` files inside subdirectories are upstream content and are kept
unmodified.

## First-party additions / patches

| File | Status |
| --- | --- |
| `Dockerfile` | NEW (first-party) + PATCHED — CPU-only guard and browser preinstall: `ffmpeg` system package removed (only the removed whisper plugin needed it), `triton` (GPU kernel compiler — a transitive dependency of the Linux torch wheel, used only by `torch.compile`; proven present even without the audio stack) is uninstalled after dependency resolution, and the build asserts the torch wheel is CPU-flavored and FAILS if any `nvidia`/`cuda`/`triton`/`onnxruntime-gpu`/`tensorflow-gpu` distribution is present. The Patchright (stealth Chromium) browser is preinstalled at build into `/ms-playwright` and the browser plugin's own cache env (`A0_BROWSER_PLAYWRIGHT_CACHE_DIR`, see `plugins/_browser/helpers/playwright.py`) points at it, so the agent never downloads browsers at boot. See "Dockerfile approach" below. |
| `.dockerignore` | REPLACED with a first-party version (upstream's was tuned for its own build pipeline). |
| `README.md` | NEW (first-party Loyallia service README). |
| `VENDOR.md` | NEW (this file). |
| `requirements.txt` | PATCHED — CPU-only policy (2026-10-16): removed `openai-whisper`, `kokoro`, `soundfile` (audio ML for the optional `_whisper_stt` / `_kokoro_tts` plugins — torch-heavy, unused by Loyallia's text-only chat). `torch` remains for `sentence-transformers` (knowledge embeddings) and MUST come from the PyTorch CPU wheel index. |
| `docker/loyallia-entrypoint.sh` | NEW (first-party). Loyallia cluster integration: fetches the agent API key from HashiCorp Vault at boot (`VAULT_ADDR`, `VAULT_TOKEN_FILE`, `VAULT_SECRET_PATH`, `VAULT_CACERT`) or accepts `A0_SET_MCP_SERVER_TOKEN` directly, and injects it both as the `A0_SET_*` settings default and into `/a0/usr/settings.json` (`mcp_server_token`). Secrets stay in Vault + the runtime state volume — never in the image or git. |
| `plugins/_kokoro_tts/` + `plugins/_whisper_stt/` | REMOVED (2026-10-16) — see "Deliberate omissions". Note the removal must stay atomic with the dependency removal: `_kokoro_tts`'s startup hook imports `soundfile` at module load, so removing only the deps crash-loops boot (`ModuleNotFoundError: soundfile` — verified). |
| `tests/test_kokoro_tts.py`, `tests/test_paradee_tts.py`, `tests/test_speech_plugin_split.py` | REMOVED with the audio plugins. |
| `tests/test_browser_agent_regressions.py`, `tests/test_welcome_composer_static.py` | PATCHED — dropped the assertions that read files inside the removed `_whisper_stt` plugin (all other assertions kept). |
| `plugins/AGENTS.md` | PATCHED — audio plugin rows removed from the plugin registry table. |
| `docs/guides/usage.md`, `docs/setup/installation.md` | PATCHED — annotated the audio plugin sections as "Not shipped in the Loyallia distribution" with a pointer to this file (content otherwise kept). |
| `helpers/settings.py` | PATCHED (patch **P1**, 2026-10-16) — `create_auth_token()` now honors `A0_SET_MCP_SERVER_TOKEN` before the upstream derivation. Upstream derives `mcp_server_token` from `SHA256(runtime_id:AUTH_LOGIN:AUTH_PASSWORD)` (`.env` + persistent runtime id), so the effective X-API-KEY drifted whenever `.env` or the runtime id changed and broke the Django `ai_proxy` contract (observed 2026-10-16: a root-created `.env` on the state volume changed the derivation mid-flight → 401s). With P1 the effective token is always the Vault-owned key injected by `docker/loyallia-entrypoint.sh` (secrets in Vault ONLY — LOYALLIA-RULES-001). When the env var is absent, upstream behavior is preserved exactly. **Re-apply on every re-sync.** |

Policy note: **this image is CPU-only by contract.** If the `_whisper_stt` /
`_kokoro_tts` plugins are ever re-enabled (they were removed together with
their tests), their dependencies must be added behind a separate opt-in
requirements file and the CPU-only guard must still pass (whisper/kokoro run
on CPU torch — no CUDA wheels, ever). Upstream user docs
(`docs/guides/usage.md`, `docs/setup/installation.md`) still describe the
plugins; each carries a distribution note marking them as not shipped here.

Upstream source files are modified ONLY where listed in the table above
(`requirements.txt` audio pins, `plugins/AGENTS.md` registry rows, the two
patched tests); everything else is byte-identical to the pinned SHA.
Known graceful degradation: `plugins/_browser/webui/browser-store.js` still
references `/plugins/_whisper_stt/webui/whisper-stt-store.js` for browser
annotation voice dictation — the dynamic import is wrapped in try/catch, so the
feature silently disables itself instead of crashing (upstream file left
unpatched on purpose).
`prepare.py` (SSH root password setup for upstream's sshd) is not invoked by our
image entrypoint; upstream's sshd, searxng, supervisord, tunnel and self-update
bootstrap (`docker/run/fs/…`) are not wired into the image — updates flow
through this monorepo instead. The `/a0/usr` state layout, `A0_SET_*` settings
mechanism and `/api/health` probe all work exactly as upstream.

## Dockerfile approach

Upstream's `docker/base/Dockerfile` (Kali rolling) + `docker/run/Dockerfile`
build a prebuilt-base two-image pipeline (supervisord + nginx + sshd + searxng).
Our `Dockerfile` instead:

- bases on pinned `python:3.12-slim-bookworm`;
- follows upstream's install sequence from `docker/run/fs/ins/install_A0.sh`:
  `torch` from the CPU-only PyTorch index first, then `requirements.txt`, then
  `preload.py --dockerized=true` to warm the embedding model cache;
- enforces Loyallia's CPU-only image policy at build time: the build FAILS if
  `torch` is not a CPU build or if any `nvidia-*`/`cuda*`/`triton`/
  `onnxruntime-gpu`/`tensorflow-gpu` distribution ends up in the image; no
  GPU/CUDA system libraries and no `ffmpeg` are installed (audio plugins not
  shipped);
- preinstalls the Patchright stealth Chromium at build
  (`PLAYWRIGHT_BROWSERS_PATH=/ms-playwright`) so boots never download browsers;
- copies the vendored tree to `/a0` (the base dir `helpers/files.py` expects)
  and runs `python run_ui.py --dockerized=true` like upstream's
  `docker/run/fs/exe/self_update_manager.py` entrypoint does, listening on
  `0.0.0.0:80`, via `docker/loyallia-entrypoint.sh` (Vault API-key injection —
  see "First-party additions / patches");
- runs as non-root user `a0` (uid 1000), with `cap_net_bind_service` granted to
  the interpreter so port 80 works without root;
- wires `HEALTHCHECK` to `http://127.0.0.1:$WEB_UI_PORT/api/health`
  (`api/health.py`, unauthenticated).

## Re-sync procedure (future upstream updates)

1. Clone upstream fresh and check out the new target (prefer the latest release
   tag, else `main`):
   `git clone https://github.com/agent0ai/agent-zero /tmp/agent-zero-upstream`
   `cd /tmp/agent-zero-upstream && git checkout <new-tag-or-sha>`
   Record the exact commit SHA (`git rev-parse HEAD`) and tag (`git describe --tags`).
2. Overwrite the vendored tree WITHOUT deleting our first-party files and
   WITHOUT bringing `.git` or upstream root-name collisions in:
   `rsync -a --delete --exclude='.git' --exclude='/VENDOR.md' --exclude='/README.md' --exclude='/AGENTS.md' --exclude='/Dockerfile' --exclude='/.dockerignore' --exclude='/README.upstream.md' --exclude='/AGENTS.upstream.md' --exclude='/docker/loyallia-entrypoint.sh' /tmp/agent-zero-upstream/ <monorepo>/services/agent-zero/`
3. Re-apply the deliberate omissions from the tables above (`.github/workflows/`,
   `.github/FUNDING.yml`, `.vscode/`, `docs/res/`, `DockerfileLocal`, `.git`,
   `plugins/_kokoro_tts/`, `plugins/_whisper_stt/`, `tests/test_kokoro_tts.py`,
   `tests/test_paradee_tts.py`, `tests/test_speech_plugin_split.py`).
4. Re-apply the first-party patches from the table above that the rsync
   overwrote: `requirements.txt` (drop the `openai-whisper`/`kokoro`/`soundfile`
   pins), `plugins/AGENTS.md` (drop the audio plugin registry rows),
   `tests/test_browser_agent_regressions.py` and
   `tests/test_welcome_composer_static.py` (drop the `_whisper_stt` file
   assertions), `docs/guides/usage.md` and `docs/setup/installation.md`
   (re-add the "Not shipped in the Loyallia distribution" annotations). Keep
   removal of plugins and deps atomic — see the note in the patches table.
5. Refresh the renamed upstream root docs from the fresh clone:
   `cp /tmp/agent-zero-upstream/README.md <monorepo>/services/agent-zero/README.upstream.md`
   `cp /tmp/agent-zero-upstream/AGENTS.md <monorepo>/services/agent-zero/AGENTS.upstream.md`
   (if upstream renames/removes those root files, resolve the collision again as
   documented above).
6. Diff our `Dockerfile`, `.dockerignore`, `README.md` against the new upstream
   tree (requirements, entrypoint args, health path, `/a0` layout) and adjust
   first-party files if upstream changed those contracts.
7. Update this file: new SHA, new tag, new vendoring date, and any new omissions
   or deviations.
8. Build and smoke-test: `docker build -t loyallia-agent services/agent-zero`
   then check `GET /api/health` returns 200.
