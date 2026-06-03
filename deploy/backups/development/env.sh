#!/usr/bin/env bash
# =============================================================================
# LOYALLIA BACKUP — DEVELOPMENT ENVIRONMENT CONFIG
# =============================================================================
# THIS FILE IS FOR DEVELOPMENT ONLY.
# NO production paths. NO production compose files.
# Hardcoded. No --env flag. No auto-detection.
# =============================================================================

set -euo pipefail

# --- Identity ----------------------------------------------------------------
DEPLOY_ENV="development"
COMPOSE_FILE="docker-compose.yml"

# --- Paths -------------------------------------------------------------------
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
BACKUP_DIR="$PROJECT_ROOT/backups"
LOG_DIR="$BACKUP_DIR/logs"
TEMP_DIR="$BACKUP_DIR/.tmp"

# --- Offsite prefix ----------------------------------------------------------
OFFSITE_PREFIX="loyallia/development"

# --- Vault path --------------------------------------------------------------
VAULT_SECRET_PATH="secret/data/loyallia/development"

# --- Compose command ---------------------------------------------------------
COMPOSE_CMD="docker compose -f $PROJECT_ROOT/$COMPOSE_FILE"

# --- Ensure directories exist ------------------------------------------------
mkdir -p "$BACKUP_DIR" "$LOG_DIR" "$TEMP_DIR"
