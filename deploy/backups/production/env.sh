#!/usr/bin/env bash
# =============================================================================
# LOYALLIA BACKUP — PRODUCTION ENVIRONMENT CONFIG
# =============================================================================
# THIS FILE IS FOR PRODUCTION ONLY.
# NO development paths. NO development compose files.
# Hardcoded. No --env flag. No auto-detection.
# =============================================================================

set -euo pipefail

# --- Identity ----------------------------------------------------------------
DEPLOY_ENV="production"
COMPOSE_FILE="docker-compose.yml"
COMPOSE_PROD_FILE="docker-compose.prod.yml"

# --- Paths -------------------------------------------------------------------
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
BACKUP_DIR="/var/backups/loyallia"
LOG_DIR="/var/log/loyallia"
TEMP_DIR="/tmp/loyallia-backups"

# --- Offsite prefix ----------------------------------------------------------
OFFSITE_PREFIX="loyallia/production"

# --- Vault path --------------------------------------------------------------
VAULT_SECRET_PATH="secret/data/loyallia/production"

# --- Compose command ---------------------------------------------------------
COMPOSE_CMD="docker compose -f $PROJECT_ROOT/$COMPOSE_FILE -f $PROJECT_ROOT/$COMPOSE_PROD_FILE"

# --- Ensure directories exist ------------------------------------------------
mkdir -p "$BACKUP_DIR" "$LOG_DIR" "$TEMP_DIR"
