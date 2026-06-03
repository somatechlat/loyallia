#!/usr/bin/env bash
# =============================================================================
# LOYALLIA BACKUP — AGE ENCRYPTION WRAPPER
# =============================================================================
# Encrypts/decrypts files using age.
# Requires: age (https://github.com/FiloSottile/age)
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

# --- Find public key ---------------------------------------------------------
find_public_key() {
    local key_file="${AGE_PUBLIC_KEY_FILE:-$SCRIPT_DIR/../../.age_keys/loyallia_age_public_key.txt}"
    if [ ! -f "$key_file" ]; then
        die "Age public key not found: $key_file"
    fi
    cat "$key_file" | tr -d '[:space:]'
}

# --- Find private key --------------------------------------------------------
find_private_key() {
    local key_file="${AGE_PRIVATE_KEY_FILE:-$SCRIPT_DIR/../../.age_keys/loyallia_age_private_key.txt}"
    if [ ! -f "$key_file" ]; then
        die "Age private key not found: $key_file"
    fi
    echo "$key_file"
}

# --- Encrypt a file ----------------------------------------------------------
# Usage: encrypt_file <input_file> [output_file]
# If output_file is omitted, outputs to <input_file>.age
encrypt_file() {
    local input="$1"
    local output="${2:-$input.age}"
    local pubkey
    pubkey=$(find_public_key)

    if [ ! -f "$input" ]; then
        die "Cannot encrypt: file not found: $input"
    fi

    require_cmd age

    age -r "$pubkey" -o "$output" "$input" || die "Encryption failed: $input"
    log "Encrypted: $input → $output"
}

# --- Decrypt a file ----------------------------------------------------------
# Usage: decrypt_file <input_file> [output_file]
# If output_file is omitted, outputs to stdout
decrypt_file() {
    local input="$1"
    local output="${2:-}"
    local privkey
    privkey=$(find_private_key)

    if [ ! -f "$input" ]; then
        die "Cannot decrypt: file not found: $input"
    fi

    require_cmd age

    if [ -n "$output" ]; then
        age -d -i "$privkey" -o "$output" "$input" || die "Decryption failed: $input"
        log "Decrypted: $input → $output"
    else
        age -d -i "$privkey" "$input" || die "Decryption failed: $input"
    fi
}

# --- Encrypt all files in a directory ----------------------------------------
# Usage: encrypt_directory <directory>
encrypt_directory() {
    local dir="$1"
    if [ ! -d "$dir" ]; then
        die "Cannot encrypt: directory not found: $dir"
    fi

    local count=0
    find "$dir" -type f ! -name '*.age' | while read -r file; do
        encrypt_file "$file" "$file.age"
        rm -f "$file"
        count=$((count + 1))
    done
    log "Encrypted $count files in $dir"
}

# --- Decrypt all .age files in a directory -----------------------------------
# Usage: decrypt_directory <directory>
decrypt_directory() {
    local dir="$1"
    if [ ! -d "$dir" ]; then
        die "Cannot decrypt: directory not found: $dir"
    fi

    local count=0
    find "$dir" -type f -name '*.age' | while read -r file; do
        local output="${file%.age}"
        decrypt_file "$file" "$output"
        count=$((count + 1))
    done
    log "Decrypted $count files in $dir"
}

# --- Verify encryption key works ---------------------------------------------
verify_key() {
    local pubkey privkey
    pubkey=$(find_public_key)
    privkey=$(find_private_key)

    require_cmd age

    local test_data="loyallia-backup-key-test-$(date +%s)"
    local test_file="/tmp/loyallia_key_test_$$"

    echo "$test_data" | age -r "$pubkey" -o "${test_file}.age" || die "Key encryption test failed"
    local result
    result=$(age -d -i "$privkey" "${test_file}.age" 2>/dev/null) || die "Key decryption test failed"

    rm -f "${test_file}.age"

    if [ "$result" = "$test_data" ]; then
        log "Age keypair verified OK"
        return 0
    else
        die "Age keypair verification failed: decrypted data mismatch"
    fi
}

# --- Main (for direct execution) ---------------------------------------------
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    case "${1:-}" in
        encrypt)
            encrypt_file "$2" "${3:-}"
            ;;
        decrypt)
            decrypt_file "$2" "${3:-}"
            ;;
        verify)
            verify_key
            ;;
        *)
            echo "Usage: $0 {encrypt|decrypt|verify} <file> [output]"
            exit 1
            ;;
    esac
fi
