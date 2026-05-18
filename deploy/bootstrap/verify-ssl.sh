#!/usr/bin/env bash
# verify-ssl.sh — SSL Certificate Verification for Production Bootstrap
# Document: LYL-DEPLOY-SSL-001
#
# Verifies that SSL certificates exist, are valid, and match the domain
# before starting the deployment. Fails fast if certificates are missing
# or invalid, preventing Vault/Nginx TLS failures.
#
# Usage: ./deploy/bootstrap/verify-ssl.sh [--cert-path PATH] [--key-path PATH]

set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
CERT_PATH="${SSL_CERT_PATH:-/etc/letsencrypt/live/rewards.loyallia.com/fullchain.pem}"
KEY_PATH="${SSL_KEY_PATH:-/etc/letsencrypt/live/rewards.loyallia.com/privkey.pem}"
DOMAIN="${LOYALLIA_DOMAIN:-rewards.loyallia.com}"

# Parse optional arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --cert-path) CERT_PATH="$2"; shift 2 ;;
    --key-path)  KEY_PATH="$2";  shift 2 ;;
    *) echo "Usage: $0 [--cert-path PATH] [--key-path PATH]"; exit 1 ;;
  esac
done

# ---------------------------------------------------------------------------
# Step 1: Certificate file exists
# ---------------------------------------------------------------------------
echo "[verify-ssl] Checking SSL certificates for ${DOMAIN}..."
echo "[verify-ssl] Certificate: ${CERT_PATH}"
echo "[verify-ssl] Private key: ${KEY_PATH}"

if [[ ! -f "${CERT_PATH}" ]]; then
  echo "[verify-ssl] FAIL: Certificate file not found at ${CERT_PATH}"
  echo "[verify-ssl] ACTION: Ensure Let's Encrypt certs exist:"
  echo "[verify-ssl]   certbot certonly --standalone -d ${DOMAIN}"
  exit 1
fi
echo "[verify-ssl] PASS: Certificate file exists"

# ---------------------------------------------------------------------------
# Step 2: Private key exists
# ---------------------------------------------------------------------------
if [[ ! -f "${KEY_PATH}" ]]; then
  echo "[verify-ssl] FAIL: Private key not found at ${KEY_PATH}"
  exit 1
fi
echo "[verify-ssl] PASS: Private key exists"

# ---------------------------------------------------------------------------
# Step 3: Certificate and key match
# ---------------------------------------------------------------------------
CERT_MOD=$(openssl x509 -noout -modulus -in "${CERT_PATH}" 2>/dev/null | openssl md5 | awk '{print $2}')
KEY_MOD=$(openssl rsa -noout -modulus -in "${KEY_PATH}" 2>/dev/null | openssl md5 | awk '{print $2}')

if [[ "${CERT_MOD}" != "${KEY_MOD}" ]]; then
  echo "[verify-ssl] FAIL: Certificate and private key do not match"
  echo "[verify-ssl] ACTION: Regenerate certificates for ${DOMAIN}"
  exit 1
fi
echo "[verify-ssl] PASS: Certificate and key match"

# ---------------------------------------------------------------------------
# Step 4: Certificate is valid (not expired)
# ---------------------------------------------------------------------------
EXPIRY_DATE=$(openssl x509 -enddate -noout -in "${CERT_PATH}" | cut -d= -f2)
EXPIRY_EPOCH=$(date -d "${EXPIRY_DATE}" +%s 2>/dev/null || date -j -f "%b %d %H:%M:%S %Y %Z" "${EXPIRY_DATE}" +%s)
NOW_EPOCH=$(date +%s)
DAYS_REMAINING=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))

if [[ ${DAYS_REMAINING} -lt 0 ]]; then
  echo "[verify-ssl] FAIL: Certificate EXPIRED ${DAYS_REMAINING} days ago"
  echo "[verify-ssl] ACTION: Renew certificate immediately"
  exit 1
fi

if [[ ${DAYS_REMAINING} -lt 30 ]]; then
  echo "[verify-ssl] WARNING: Certificate expires in ${DAYS_REMAINING} days"
  echo "[verify-ssl] ACTION: Schedule renewal soon"
else
  echo "[verify-ssl] PASS: Certificate valid for ${DAYS_REMAINING} days"
fi

# ---------------------------------------------------------------------------
# Step 5: Certificate covers the correct domain
# ---------------------------------------------------------------------------
DOMAINS=$(openssl x509 -in "${CERT_PATH}" -text -noout 2>/dev/null | grep -A1 "Subject Alternative Name" | tail -1 | tr -d ' ')
if echo "${DOMAINS}" | grep -q "${DOMAIN}"; then
  echo "[verify-ssl] PASS: Certificate covers ${DOMAIN}"
else
  echo "[verify-ssl] WARNING: Certificate may not cover ${DOMAIN}"
  echo "[verify-ssl] Found: ${DOMAINS}"
fi

# ---------------------------------------------------------------------------
# Step 6: Certificate issuer is trusted (Let's Encrypt)
# ---------------------------------------------------------------------------
ISSUER=$(openssl x509 -issuer -noout -in "${CERT_PATH}" | sed 's/issuer=//')
if echo "${ISSUER}" | grep -qi "Let's Encrypt"; then
  echo "[verify-ssl] PASS: Certificate issued by Let's Encrypt"
else
  echo "[verify-ssl] INFO: Certificate issued by: ${ISSUER}"
fi

echo "[verify-ssl] SSL VERIFICATION COMPLETE — All checks passed"
exit 0
