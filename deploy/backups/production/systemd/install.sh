#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SYSTEMD_DIR="/etc/systemd/system"

echo "Installing Loyallia systemd services and timers..."

cp "${SCRIPT_DIR}/loyallia-backup.service" "${SYSTEMD_DIR}/"
cp "${SCRIPT_DIR}/loyallia-backup.timer" "${SYSTEMD_DIR}/"
cp "${SCRIPT_DIR}/loyallia-verify.service" "${SYSTEMD_DIR}/"
cp "${SCRIPT_DIR}/loyallia-verify.timer" "${SYSTEMD_DIR}/"
cp "${SCRIPT_DIR}/loyallia-rescue.service" "${SYSTEMD_DIR}/"
cp "${SCRIPT_DIR}/loyallia-rescue.timer" "${SYSTEMD_DIR}/"

systemctl daemon-reload

systemctl enable loyallia-backup.timer
systemctl enable loyallia-verify.timer
systemctl enable loyallia-rescue.timer

systemctl start loyallia-backup.timer
systemctl start loyallia-verify.timer
systemctl start loyallia-rescue.timer

echo ""
echo "Status of Loyallia timers:"
systemctl list-timers loyallia-backup.timer loyallia-verify.timer loyallia-rescue.timer --no-pager
