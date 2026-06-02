#!/usr/bin/env sh
# =============================================================================
# Generate self-signed TLS certificates for Vault (development only)
# =============================================================================
# Production should use real certificates (Let's Encrypt, etc.)
# This script is a fallback for fresh development environments.
# =============================================================================

set -e

CERT_DIR="${1:-./certs}"
CERT_FILE="$CERT_DIR/vault.crt"
KEY_FILE="$CERT_DIR/vault.key"

mkdir -p "$CERT_DIR"

if [ -f "$CERT_FILE" ] && [ -f "$KEY_FILE" ]; then
    echo "[vault-certs] Certificates already exist at $CERT_DIR"
    exit 0
fi

echo "[vault-certs] Generating self-signed TLS certificate for Vault..."

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout "$KEY_FILE" \
    -out "$CERT_FILE" \
    -subj "/CN=vault/O=Loyallia" \
    -addext "subjectAltName=DNS:vault,DNS:localhost,IP:127.0.0.1"

chmod 0600 "$KEY_FILE"
chmod 0644 "$CERT_FILE"

echo "[vault-certs] Self-signed certificate generated:"
echo "  Certificate: $CERT_FILE"
echo "  Key:         $KEY_FILE"
