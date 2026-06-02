#!/bin/bash
# LYL-C-DR-005: Backup Encryption with age (modern, simple) or GPG fallback.
#
# Encrypts backup files at rest using asymmetric encryption.
# Public key encrypts; only the private key holder can decrypt.
#
# Usage:
#   ./encrypt_backup.sh /var/backups/postgresql/daily/pg_dump_20260429.dump
#   ./encrypt_backup.sh --decrypt /var/backups/postgresql/daily/pg_dump_20260429.dump.age
#
# Requirements:
#   - age (https://age-encryption.org) — preferred
#   - gpg — fallback
#
# Key management:
#   - Public key: BACKUP_ENCRYPTION_PUBLIC_KEY env var or /etc/backup/backup_public_key.txt
#   - Private key: Stored offline in secure location (NOT on the server)
#   - Recipient: BACKUP_ENCRYPTION_RECIPIENT (age public key or GPG key ID)

set -euo pipefail

# Configuration
PUBLIC_KEY_FILE="${BACKUP_ENCRYPTION_PUBLIC_KEY:-/etc/backup/backup_public_key.txt}"
RECIPIENT="${BACKUP_ENCRYPTION_RECIPIENT:-}"
ENCRYPTED_SUFFIX=".age"
GPG_RECIPIENT="${BACKUP_GPG_RECIPIENT:-backup@loyallia.com}"

# Detect available encryption tool
encrypt_file() {
    local input_file="$1"
    local output_file="${input_file}${ENCRYPTED_SUFFIX}"

    if command -v age &>/dev/null; then
        # Use age (preferred — simpler, modern)
        local recipient_flag=""
        if [[ -n "$RECIPIENT" ]]; then
            recipient_flag="-r $RECIPIENT"
        elif [[ -f "$PUBLIC_KEY_FILE" ]]; then
            recipient_flag="-R $PUBLIC_KEY_FILE"
        else
            echo "ERROR: No age recipient or public key file found."
            echo "Set BACKUP_ENCRYPTION_RECIPIENT or create $PUBLIC_KEY_FILE"
            exit 1
        fi
        age $recipient_flag -o "$output_file" "$input_file"
    elif command -v gpg &>/dev/null; then
        # Fallback to GPG
        output_file="${input_file}.gpg"
        gpg --batch --yes --trust-model always \
            --recipient "$GPG_RECIPIENT" \
            --output "$output_file" \
            --encrypt "$input_file"
    else
        echo "ERROR: Neither 'age' nor 'gpg' found. Install one for backup encryption."
        exit 1
    fi

    # Verify encrypted file exists and is non-empty
    if [[ ! -s "$output_file" ]]; then
        echo "ERROR: Encrypted file is empty or missing: $output_file"
        exit 1
    fi

    # Remove unencrypted original
    rm -f "$input_file"
    echo "Encrypted: $output_file ($(du -h "$output_file" | cut -f1))"
}

decrypt_file() {
    local input_file="$1"
    local output_file="${input_file%.*}"  # Remove .age or .gpg extension

    if [[ "$input_file" == *.age ]] && command -v age &>/dev/null; then
        age --decrypt -o "$output_file" "$input_file"
    elif [[ "$input_file" == *.gpg ]] && command -v gpg &>/dev/null; then
        gpg --batch --yes --output "$output_file" --decrypt "$input_file"
    else
        echo "ERROR: Cannot decrypt $input_file. Check tool availability."
        exit 1
    fi

    echo "Decrypted: $output_file"
}

# Main
if [[ "${1:-}" == "--decrypt" ]]; then
    shift
    for f in "$@"; do
        decrypt_file "$f"
    done
else
    for f in "$@"; do
        encrypt_file "$f"
    done
fi
