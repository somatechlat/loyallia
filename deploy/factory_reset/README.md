# Factory Reset

## Purpose

The factory reset subsystem provides a **safe, auditable way to completely destroy** a Loyallia environment and return it to a clean slate. This is primarily used in **development** to eliminate configuration drift, stale data, or corrupted volumes before re-bootstrapping from scratch.

> **Production factory reset exists** but is gated behind stronger confirmation prompts and should only be used during controlled migration or decommissioning events.

## Files

### Development (`development/`)

| File | Description |
|------|-------------|
| `factory_reset.sh` | Destroys all development Docker containers, volumes, and networks. Requires typing `DESTROY` to proceed. |

### Production (`production/`)

| File | Description |
|------|-------------|
| `factory_reset.sh` | Destroys all production Docker containers, volumes, and networks. Additional confirmation safeguards. |

## Configuration

No configuration files are required. The script discovers resources dynamically via `docker compose`.

### What Gets Destroyed

Before confirming, the script prints a preview of:

1. **Containers** — All containers defined in `docker-compose.yml` (or `docker-compose.prod.yml`)
2. **Volumes** — Named volumes and dangling volumes matching `loyallia`
3. **Networks** — Named networks and dangling networks matching `loyallia`

### Safety Mechanisms

- **Explicit confirmation** — You must type `DESTROY` in full.
- **Preview mode** — Lists everything before destruction.
- **`set -euo pipefail`** — Aborts on any unexpected error.

## Usage

### Development Factory Reset

```bash
./deploy/factory_reset/development/factory_reset.sh
```

Example interaction:
```
==========================================
   LOYALLIA DEVELOPMENT FACTORY RESET
==========================================

--- Containers that will be destroyed ---
  /loyallia-api (abc123...)
  /loyallia-postgres (def456...)
...

--- Volumes that will be destroyed ---
  loyallia_postgres_data
  ...

Type DESTROY to confirm permanent data destruction: DESTROY
Destroying containers...
Destroying volumes...
Destroying networks...
Factory reset complete.
```

### Production Factory Reset

```bash
./deploy/factory_reset/production/factory_reset.sh
```

> ⚠️ **Extreme caution:** This will permanently delete production data. Ensure backups exist in `deploy/backups/` before proceeding.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "DESTROY" confirmation not accepted | Type exactly `DESTROY` in uppercase. No extra spaces. |
| Script exits without destroying anything | Usually means no containers/volumes were found. Check `docker compose ps`. |
| Permission denied | Ensure your user can run `docker` commands. Add to `docker` group or use `sudo` with care. |
| Volumes remain after reset | Run `docker volume prune -f` manually to remove dangling volumes. |
| Networks remain after reset | Run `docker network prune -f` manually to remove dangling networks. |
| Want to keep some volumes | The script destroys all; manually back up volumes first with `docker run --rm -v ...` if needed. |

## Related Docs

- [`deploy/bootstrap/`](../bootstrap/) — Re-bootstrap the environment after a factory reset
- [`deploy/disaster_recovery/`](../disaster_recovery/) — Recover from encrypted rescue files (preserves data)
- [`deploy/backups/`](../backups/) — Backup procedures to run *before* any factory reset
- [`../../docs/BACKUP_ARCHITECTURE.md`](../../docs/BACKUP_ARCHITECTURE.md) — Backup and retention policies
