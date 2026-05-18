#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
OUTPUT_FILE="${BOOTSTRAP_SECRETS_FILE:-$PROJECT_ROOT/.bootstrap_secrets.json}"
AGE_KEY_DIR="$PROJECT_ROOT/.age_keys"
CERTS_DIR="$PROJECT_ROOT/certs"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${GREEN}[bootstrap]${NC} $*"; }
warn() { echo -e "${YELLOW}[warn]${NC} $*"; }
err() { echo -e "${RED}[error]${NC} $*" >&2; }

read_cert_file() {
    local path="$1"
    if [ -f "$path" ]; then
        cat "$path"
    else
        echo ""
    fi
}

main() {
    log "Generating Loyallia secrets (52 keys)..."
    echo ""

    # Certificate discovery
    log "Discovering certificates in $CERTS_DIR..."

    local APPLE_CERT_PEM APPLE_KEY_PEM APPLE_WWDR_PEM
    APPLE_CERT_PEM="$(read_cert_file "$CERTS_DIR/passNew.pem")"
    APPLE_KEY_PEM="$(read_cert_file "$CERTS_DIR/apple_pass_new.key")"
    APPLE_WWDR_PEM="$(read_cert_file "$CERTS_DIR/AppleWWDRCAG4.pem")"

    local GOOGLE_SA_JSON GOOGLE_OAUTH_JSON GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET
    GOOGLE_SA_JSON=""
    GOOGLE_OAUTH_JSON=""
    GOOGLE_CLIENT_ID=""
    GOOGLE_CLIENT_SECRET=""

    for f in "$CERTS_DIR"/loyalliarewardswallet-*.json; do
        [ -f "$f" ] && GOOGLE_SA_JSON="$(cat "$f")" && break
    done

    for f in "$CERTS_DIR"/client_secret_*.apps.googleusercontent.com.json; do
        if [ -f "$f" ]; then
            GOOGLE_OAUTH_JSON="$(cat "$f")"
            GOOGLE_CLIENT_ID="$(python3 -c "import json; d=json.loads('''$GOOGLE_OAUTH_JSON'''); print(d.get('web',{}).get('client_id',''), end='')")"
            GOOGLE_CLIENT_SECRET="$(python3 -c "import json; d=json.loads('''$GOOGLE_OAUTH_JSON'''); print(d.get('web',{}).get('client_secret',''), end='')")"
            break
        fi
    done

    [ -n "$APPLE_CERT_PEM" ] && log "  Found: Apple Pass certificate (passNew.pem)"
    [ -n "$APPLE_KEY_PEM" ] && log "  Found: Apple Pass private key (apple_pass_new.key)"
    [ -n "$APPLE_WWDR_PEM" ] && log "  Found: Apple WWDR certificate (AppleWWDRCAG4.pem)"
    [ -n "$GOOGLE_SA_JSON" ] && log "  Found: Google Service Account JSON"
    [ -n "$GOOGLE_CLIENT_ID" ] && log "  Found: Google OAuth client ID"

    # Determine feature flags based on certificate presence
    local APPLE_WALLET_ENABLED GOOGLE_WALLET_ENABLED
    if [ -n "$APPLE_CERT_PEM" ] && [ -n "$APPLE_KEY_PEM" ]; then
        APPLE_WALLET_ENABLED="true"
    else
        APPLE_WALLET_ENABLED="false"
    fi
    if [ -n "$GOOGLE_SA_JSON" ]; then
        GOOGLE_WALLET_ENABLED="true"
    else
        GOOGLE_WALLET_ENABLED="false"
    fi

    # Age keypair for backup encryption
    local AGE_PUBLIC_KEY=""
    if command -v age-keygen &>/dev/null; then
        mkdir -p "$AGE_KEY_DIR"
        local private_key_path="$AGE_KEY_DIR/loyallia_age_private_key.txt"
        local public_key_path="$AGE_KEY_DIR/loyallia_age_public_key.txt"

        if [ ! -f "$private_key_path" ]; then
            age-keygen -o "$private_key_path" 2>/dev/null
            chmod 0400 "$private_key_path"
            grep "^# public key:" "$private_key_path" | sed 's/# public key: //' > "$public_key_path" || true
            if [ ! -s "$public_key_path" ]; then
                head -1 "$private_key_path" | sed 's/.*\(age1[a-z0-9]\{58\}\)/\1/' > "$public_key_path" 2>/dev/null || true
            fi
            chmod 0444 "$public_key_path"
        fi
        AGE_PUBLIC_KEY="$(cat "$public_key_path" 2>/dev/null || echo "")"
    else
        warn "age not installed. Install it for backup encryption:"
        warn "  Linux:  apt install age"
        warn "  macOS:  brew install age"
    fi

    # Load real integration credentials if present
    local INTEGRATION_JSON="$CERTS_DIR/integration_credentials.json"
    local REAL_GOOGLE_ID="" REAL_GOOGLE_SECRET=""
    local REAL_MAILJET_KEY="" REAL_MAILJET_SECRET=""
    local REAL_TWILIO_SID="" REAL_TWILIO_TOKEN="" REAL_TWILIO_API_SID="" REAL_TWILIO_API_SECRET=""
    local REAL_TWILIO_TEST_SID="" REAL_TWILIO_TEST_TOKEN=""

    if [ -f "$INTEGRATION_JSON" ]; then
        log "Loading real integration credentials from $INTEGRATION_JSON"
        REAL_GOOGLE_ID="$(python3 -c "import json; d=json.load(open('$INTEGRATION_JSON')); print(d.get('google_oauth',{}).get('client_id',''), end='')" 2>/dev/null)"
        REAL_GOOGLE_SECRET="$(python3 -c "import json; d=json.load(open('$INTEGRATION_JSON')); print(d.get('google_oauth',{}).get('client_secret',''), end='')" 2>/dev/null)"
        REAL_MAILJET_KEY="$(python3 -c "import json; d=json.load(open('$INTEGRATION_JSON')); print(d.get('mailjet',{}).get('api_key',''), end='')" 2>/dev/null)"
        REAL_MAILJET_SECRET="$(python3 -c "import json; d=json.load(open('$INTEGRATION_JSON')); print(d.get('mailjet',{}).get('secret_key',''), end='')" 2>/dev/null)"
        REAL_TWILIO_SID="$(python3 -c "import json; d=json.load(open('$INTEGRATION_JSON')); print(d.get('twilio',{}).get('account_sid',''), end='')" 2>/dev/null)"
        REAL_TWILIO_TOKEN="$(python3 -c "import json; d=json.load(open('$INTEGRATION_JSON')); print(d.get('twilio',{}).get('auth_token',''), end='')" 2>/dev/null)"
        REAL_TWILIO_API_SID="$(python3 -c "import json; d=json.load(open('$INTEGRATION_JSON')); print(d.get('twilio',{}).get('api_key_sid',''), end='')" 2>/dev/null)"
        REAL_TWILIO_API_SECRET="$(python3 -c "import json; d=json.load(open('$INTEGRATION_JSON')); print(d.get('twilio',{}).get('api_key_secret',''), end='')" 2>/dev/null)"
        REAL_TWILIO_TEST_SID="$(python3 -c "import json; d=json.load(open('$INTEGRATION_JSON')); print(d.get('twilio',{}).get('test_account_sid',''), end='')" 2>/dev/null)"
        REAL_TWILIO_TEST_TOKEN="$(python3 -c "import json; d=json.load(open('$INTEGRATION_JSON')); print(d.get('twilio',{}).get('test_auth_token',''), end='')" 2>/dev/null)"
    fi

    # Generate all secrets via Python (produces clean JSON without shell escaping)
    log "Writing bootstrap secrets to $OUTPUT_FILE ..."

    python3 - "$OUTPUT_FILE" "$APPLE_WALLET_ENABLED" "$GOOGLE_WALLET_ENABLED" "$AGE_PUBLIC_KEY" \
        "$REAL_GOOGLE_ID" "$REAL_GOOGLE_SECRET" \
        "$REAL_MAILJET_KEY" "$REAL_MAILJET_SECRET" \
        "$REAL_TWILIO_SID" "$REAL_TWILIO_TOKEN" \
        "$REAL_TWILIO_API_SID" "$REAL_TWILIO_API_SECRET" \
        "$REAL_TWILIO_TEST_SID" "$REAL_TWILIO_TEST_TOKEN" << 'PYEOF'
import json
import secrets
import string
import sys

def token(n=32):
    return secrets.token_urlsafe(n)

def password(n=24, chars=None):
    if chars is None:
        chars = string.ascii_letters + string.digits
    return ''.join(secrets.choice(chars) for _ in range(n))

def django_secret():
    chars = 'abcdefghijklmnopqrstuvwxyz0123456789!@#%^&*(-_=+)'
    return ''.join(secrets.choice(chars) for _ in range(64))

def redis_pass():
    return ''.join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(24))

redis_password = redis_pass()

# Shell-injected values
output_path = sys.argv[1]
apple_wallet_enabled = sys.argv[2]
google_wallet_enabled = sys.argv[3]
age_public_key = sys.argv[4] if len(sys.argv) > 4 else ""

# Real integration credentials (empty string = not configured)
real_google_id = sys.argv[5] if len(sys.argv) > 5 else ""
real_google_secret = sys.argv[6] if len(sys.argv) > 6 else ""
real_mailjet_key = sys.argv[7] if len(sys.argv) > 7 else ""
real_mailjet_secret = sys.argv[8] if len(sys.argv) > 8 else ""
real_twilio_sid = sys.argv[9] if len(sys.argv) > 9 else ""
real_twilio_token = sys.argv[10] if len(sys.argv) > 10 else ""
real_twilio_api_sid = sys.argv[11] if len(sys.argv) > 11 else ""
real_twilio_api_secret = sys.argv[12] if len(sys.argv) > 12 else ""
real_twilio_test_sid = sys.argv[13] if len(sys.argv) > 13 else ""
real_twilio_test_token = sys.argv[14] if len(sys.argv) > 14 else ""

# Use real credentials when available, otherwise leave empty for graceful degradation
mailjet_api_key = real_mailjet_key if real_mailjet_key else password(16, string.ascii_uppercase + string.digits)
mailjet_secret_key = real_mailjet_secret if real_mailjet_secret else token(32)
twilio_account_sid = real_twilio_sid if real_twilio_sid else ""
twilio_auth_token = real_twilio_token if real_twilio_token else ""
twilio_api_key_sid = real_twilio_api_sid if real_twilio_api_sid else ""
twilio_api_key_secret = real_twilio_api_secret if real_twilio_api_secret else ""
twilio_test_account_sid = real_twilio_test_sid if real_twilio_test_sid else ""
twilio_test_auth_token = real_twilio_test_token if real_twilio_test_token else ""

data = {
    "_meta": {
        "generated": __import__('datetime').datetime.utcnow().isoformat() + "Z",
        "version": "2.0",
        "source": "generate_secrets.sh",
        "note": "ALL 52 secrets generated. Real integration credentials loaded from certs/integration_credentials.json when present."
    },
    "secrets": {
        # Core infrastructure
        "secret_key": django_secret(),
        "postgres_password": password(40),
        "redis_url": f"redis://:{redis_password}@redis:6379/0",
        "celery_broker_url": f"redis://:{redis_password}@redis:6379/1",
        "celery_result_backend": f"redis://:{redis_password}@redis:6379/2",
        "minio_access_key": f"loyallia-{secrets.token_hex(4)}",
        "minio_secret_key": token(32),
        "jwt_secret_key": token(48),
        "pass_hmac_secret": token(32),
        "flower_basic_auth": f"loyallia:{token(16)}",

        # Apple Wallet
        "apple_cert_pem": "",          # filled from certs below
        "apple_cert_key_pem": "",      # filled from certs below
        "apple_wwdr_cert_pem": "",     # filled from certs below
        "apple_pass_type_identifier": "pass.com.loyallia.placeholder",
        "apple_team_identifier": "PLACEHOLDER_TEAM_ID",
        "apple_wallet_enabled": apple_wallet_enabled,

        # Google Wallet
        "google_service_account_json": "",  # filled from certs below
        "google_oauth_client_id": real_google_id,
        "google_oauth_client_secret": real_google_secret,
        "google_wallet_issuer_id": "PLACEHOLDER_ISSUER_ID",
        "google_wallet_enabled": google_wallet_enabled,

        # Payment Gateway
        "payment_gateway_enabled": "false",
        "payment_gateway_provider": "manual",
        "payment_gateway_login": "placeholder_login",
        "payment_gateway_tran_key": "placeholder_tran_key",
        "payment_gateway_webhook_secret": token(32),

        # Email / Mailjet
        "mailjet_api_key": mailjet_api_key,
        "mailjet_secret_key": mailjet_secret_key,
        "mailjet_sender_email": "noreply@loyallia.com",
        "mailjet_sender_name": "Loyallia",

        # WhatsApp Bridge
        "whatsapp_bridge_url": "http://whatsapp-bridge:3001",
        "whatsapp_bridge_api_key": token(32),

        # Twilio
        "twilio_account_sid": twilio_account_sid,
        "twilio_auth_token": twilio_auth_token,
        "twilio_from_number": "+15555555555",
        "twilio_verify_enabled": "false",
        "twilio_verify_service_sid": "VA_placeholder_verify_sid",
        "twilio_verify_default_channel": "sms",
        "twilio_api_key_sid": twilio_api_key_sid,
        "twilio_api_key_secret": twilio_api_key_secret,
        "twilio_test_account_sid": twilio_test_account_sid,
        "twilio_test_auth_token": twilio_test_auth_token,
        "twilio_use_test_mode": "false",

        # Apple NFC
        "apple_nfc_enabled": "false",
        "apple_nfc_encryption_public_key": "",

        # AI Agent
        "ai_agent_base_url": "http://ai-agent:8000",
        "ai_agent_api_key": token(32),

        # System / Backup
        "system_mode": "development",
        "backup_frequency": "15days",
        "backup_retention": "31",
        "cron_hour": "5",

        # Age encryption
        "age_public_key": age_public_key,
    }
}

with open(output_path, 'w') as f:
    json.dump(data, f, indent=2)

print(f"Wrote {len(data['secrets'])} secrets to bootstrap file")
PYEOF

    # Inject certificate content into JSON
    python3 - "$OUTPUT_FILE" "$APPLE_CERT_PEM" "$APPLE_KEY_PEM" "$APPLE_WWDR_PEM" "$GOOGLE_SA_JSON" << 'PYEOF'
import json
import sys

output_path = sys.argv[1]
pem = sys.argv[2]
key = sys.argv[3]
wwdr = sys.argv[4]
sa = sys.argv[5]

with open(output_path, 'r') as f:
    data = json.load(f)

data['secrets']['apple_cert_pem'] = pem
data['secrets']['apple_cert_key_pem'] = key
data['secrets']['apple_wwdr_cert_pem'] = wwdr
data['secrets']['google_service_account_json'] = sa

# Remove empty certificate values to keep Vault clean
for k in ['apple_cert_pem', 'apple_cert_key_pem', 'apple_wwdr_cert_pem', 'google_service_account_json']:
    if not data['secrets'][k]:
        del data['secrets'][k]

with open(output_path, 'w') as f:
    json.dump(data, f, indent=2)

print(f"Final secret count: {len(data['secrets'])}")
PYEOF

    # Convert JSON secrets to flat .env file for Vault init container (Alpine, no Python3)
    python3 - "$OUTPUT_FILE" << 'PYEOF'
import json
import base64
import sys

json_path = sys.argv[1]
env_path = json_path.replace('.json', '.env')

with open(json_path) as f:
    data = json.load(f)

secrets = data.get('secrets', {})

with open(env_path, 'w') as f:
    for key, value in secrets.items():
        val = str(value)
        # Base64-encode multiline or very long values (certs, JSON)
        if '\n' in val or len(val) > 500:
            encoded = base64.b64encode(val.encode('utf-8')).decode('ascii')
            f.write(f"{key}_b64={encoded}\n")
        else:
            f.write(f"{key}={val}\n")

print(f"Wrote {len(secrets)} secrets to flat env file: {env_path}")
PYEOF

    chmod 0600 "$OUTPUT_FILE"
    chmod 0600 "${OUTPUT_FILE%.json}.env"
    log "Secrets written to: $OUTPUT_FILE (permissions: 600)"
    log "Flat env written to: ${OUTPUT_FILE%.json}.env (permissions: 600)"

    if [ -n "$AGE_PUBLIC_KEY" ]; then
        log "Age public key: $AGE_PUBLIC_KEY"
        warn "CRITICAL: Store the Age private key offline."
        warn "Without it, encrypted backups cannot be decrypted."
    fi

    echo ""
    log "Bootstrap secrets generated (52 keys)"
    log "Next: run bootstrap.sh to start the full bootstrap sequence"
    log "CRITICAL: After bootstrap, rescue files auto-save to .agents/"
    log "          and .bootstrap_secrets.json is securely shredded."
}

main
