# syntax=docker/dockerfile:1
###############################################################################
# Loyallia service image: Agent Zero (vendored first-party, see VENDOR.md)
#
# Upstream ships no self-contained root Dockerfile: its docker/base + docker/run
# pipeline builds two Kali-based images and expects the prebuilt
# agent0ai/agent-zero-base image plus supervisord/nginx/sshd/searxng. This
# Dockerfile keeps upstream's install sequence (torch CPU wheels first, then
# requirements.txt, then preload.py - see docker/run/fs/ins/install_A0.sh) but
# builds the agent self-contained from a pinned python:3.12-slim base.
###############################################################################

FROM python:3.12-slim-bookworm

ARG DEBIAN_FRONTEND=noninteractive

# System dependencies required at runtime by the Python stack:
#   git            - GitPython tools/skills and self-update plumbing
#   curl           - container HEALTHCHECK probe
#   tesseract-ocr  - pytesseract (document OCR)
#   poppler-utils  - pdf2image (PDF rendering)
#   libmagic1      - unstructured (file type detection)
#   pandoc         - unstructured document conversion
#   libgomp1       - faiss-cpu / onnxruntime OpenMP runtime
#   libcap2-bin    - setcap: let the non-root user bind TCP port 80
#   build-essential- pip fallback for any sdist that has no prebuilt wheel
# NOTE (LOYALLIA CPU-only policy): no GPU/CUDA system libraries are installed.
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        ca-certificates \
        curl \
        file \
        git \
        libcap2-bin \
        libgomp1 \
        libmagic1 \
        pandoc \
        poppler-utils \
        procps \
        tesseract-ocr \
    && rm -rf /var/lib/apt/lists/*

# Python dependencies, layered separately from app source for cache reuse.
# CPU-ONLY POLICY (LOYALLIA): torch is installed first from the CPU wheel index
# so sentence-transformers never resolves the multi-GB CUDA wheels from PyPI.
# The optional audio plugins _whisper_stt / _kokoro_tts and their ML deps
# (openai-whisper, kokoro, soundfile) are NOT shipped — LOYALLIA CPU-only
# policy, they are torch-heavy and unused by text-only chat. Keep plugin and
# dependency removal atomic: with the plugin present but soundfile missing,
# boot crash-loops (verified). The guard below FAILS THE BUILD if any GPU
# distribution (nvidia/cuda/triton/onnxruntime-gpu/tensorflow-gpu) slips in;
# triton uninstall is a safety net (openai-whisper declared it on Linux; it is
# only used by whisper's CUDA timing paths anyway — moot while the plugin is
# pruned).
COPY requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir -r /tmp/requirements.txt \
    && (pip uninstall -y triton 2>/dev/null || true) \
    && python -c "import torch; v=torch.__version__; assert '+cpu' in v or 'cu' not in v, f'non-CPU torch: {v}'; print('torch', v, 'CUDA available:', torch.cuda.is_available())" \
    && if pip list --format=freeze | grep -iE '^(nvidia|cuda|triton|onnxruntime-gpu|tensorflow-gpu)' ; then echo 'ERROR: GPU/CUDA distribution found in image' >&2; exit 1; else echo 'CPU-only verified: no GPU distributions'; fi

# Non-root runtime user. /a0 is the Agent Zero base directory (helpers/files.py
# resolves all runtime paths under it and exposes them as /a0/... inside chats).
# Persistent state lives in /a0/usr (chats, uploads, settings, .env) and /a0/tmp.
RUN useradd --create-home --uid 1000 --shell /bin/bash a0 \
    && mkdir -p /a0/usr/chats /a0/usr/uploads /a0/tmp \
    && chown -R a0:a0 /a0

# Preinstall the Patchright (stealth Chromium) browser at BUILD time so the
# agent never downloads "Chrome for Testing" at boot (was: slow, network-bound
# startup on every fresh container). IMPORTANT: plugins/_browser/helpers/
# playwright.py manages its own cache dir (default /a0/tmp/playwright, override
# A0_BROWSER_PLAYWRIGHT_CACHE_DIR) and runs `patchright install chromium
# --no-shell` only when no chromium-*/chrome-linux*/chrome binary is found
# there - so preinstall with that exact invocation and point the plugin's cache
# env at it. System libs installed as root; the browser tree is handed to the
# runtime user.
RUN python -m patchright install-deps chromium >/dev/null \
    && mkdir -p /ms-playwright \
    && chown -R a0:a0 /ms-playwright
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
    A0_BROWSER_PLAYWRIGHT_CACHE_DIR=/ms-playwright

WORKDIR /a0
COPY --chown=a0:a0 . /a0

# Upstream's docker runtime listens on TCP 80 (docker/run/fs/exe/
# self_update_manager.py probes http://127.0.0.1:80/api/health). Grant only the
# bind-low-ports capability to the interpreter so the service can run as non-root
# on port 80. Set WEB_UI_PORT to a high port to run without this capability.
RUN setcap 'cap_net_bind_service=+ep' /usr/local/bin/python3.12

USER a0

# Browser binary for the runtime user (cached layer — no runtime downloads).
RUN python -m patchright install chromium --no-shell

# Warm the default embedding model into the runtime user's home cache so the
# first boot does not need network access (upstream runs the same preload step
# in install_A0.sh; preload.py swallows its own errors).
RUN python preload.py --dockerized=true

# Loyallia: Vault-backed API-key injection at boot (first-party, see VENDOR.md).
# Secrets arrive via runtime file injection (vault_runtime volume) — never baked
# into the image or compose config.
ENTRYPOINT ["/a0/docker/loyallia-entrypoint.sh"]

# Defaults matching upstream's docker runtime entrypoint
# (python run_ui.py --dockerized=true --port=80 --host=0.0.0.0).
ENV WEB_UI_HOST=0.0.0.0 \
    WEB_UI_PORT=80

EXPOSE 80

# Unauthenticated probe endpoint (api/health.py: requires_auth() == False).
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
    CMD curl -fsS "http://127.0.0.1:${WEB_UI_PORT}/api/health" >/dev/null || exit 1

# Settings override env vars of the form A0_SET_<SETTING_NAME> are read at boot
# by helpers/settings.py - inject secrets that way (see README.md).
CMD ["python", "run_ui.py", "--dockerized=true"]
