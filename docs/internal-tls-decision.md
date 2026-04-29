# Internal TLS Decision — LYL-H-INFRA-006

**Date:** 2026-04-29
**Status:** Accepted — Documented Decision

## Context

All internal service communication (API ↔ PostgreSQL, API ↔ Redis, API ↔ MinIO, etc.) currently uses plaintext HTTP/TCP within the Docker bridge network. This creates a theoretical risk of traffic interception if an attacker gains access to the container network.

## Decision

**We accept plaintext internal communication for the current deployment architecture, with the following mitigations in place:**

### Why Not mTLS / Internal TLS

1. **Single-host Docker Compose**: All services run on a single host within a Docker bridge network. Traffic never traverses an external network.
2. **Network segmentation**: Container network segmentation (LYL-M-INFRA-017) restricts which services can communicate.
3. **Container isolation**: Each service runs in its own container with minimal capabilities (LYL-M-INFRA-018).
4. **Complexity vs. risk**: Setting up a service mesh (Istio/Linkerd) or mTLS with cert management adds significant operational complexity for minimal security gain in a single-host deployment.

### Mitigations Already In Place

- **Docker bridge network isolation**: Internal services are not exposed to the host network (except explicitly mapped ports on 127.0.0.1).
- **Network segmentation**: Frontend/backend/monitoring networks prevent unauthorized container-to-container access.
- **Container hardening**: read-only filesystems, dropped capabilities, no-new-privileges.
- **PostgreSQL**: Requires password authentication (SCRAM-SHA-256 via PgBouncer).
- **Redis**: Requires password authentication (`--requirepass`).
- **Vault**: Token-based authentication.

### When to Revisit

Re-evaluate this decision when:
- Moving to **multi-host** deployment (Docker Swarm, Kubernetes)
- Handling **PCI-DSS** or **HIPAA** compliance requirements
- Deploying across **multiple availability zones**
- Adding **third-party integrations** that require encrypted internal channels

### Recommended Approach for Multi-Host

If/when moving to multi-host:
1. Use **Docker Swarm** with overlay network encryption (`--opt encrypted`)
2. Or deploy **mTLS via a service mesh** (Linkerd is lightweight)
3. PostgreSQL and Redis support native TLS — enable with CA-signed internal certs
