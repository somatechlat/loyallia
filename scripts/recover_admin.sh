#!/usr/bin/env bash
# Admin Account Recovery — Run this if you are locked out
set -e

cd "$(dirname "$0")/.."

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  LOYALLIA — ADMIN ACCOUNT RECOVERY                            ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

EMAIL="${1:-admin@loyallia.com}"
PASS="${2:-}"

if [ -z "$PASS" ]; then
    echo "Error: Password argument is required." >&2
    exit 1
fi

docker compose exec -T api python manage.py recover_admin_access \
    --email "$EMAIL" \
    --password "$PASS"

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  RECOVERY COMPLETE                                            ║"
echo "║                                                               ║"
echo "║  Login URL: http://localhost/login                            ║"
echo "║  Email:    $EMAIL"
echo "║  Password: $PASS"
echo "╚════════════════════════════════════════════════════════════════╝"
