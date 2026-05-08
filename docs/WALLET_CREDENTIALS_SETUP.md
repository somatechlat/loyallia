# Wallet API Credentials Setup Guide

## Overview

This document explains how to obtain and configure real API credentials for **Google Wallet** and **Apple Wallet** in Loyallia.

> **Security Notice:** All wallet credentials are stored in HashiCorp Vault (`secret/data/loyallia/production`). Never commit real certificates or service account keys to Git.

---

## Current Vault Status

| Service | Key | Status |
|---------|-----|--------|
| Google Wallet | `google_wallet_enabled` | `false` (needs SA JSON) |
| Google Wallet | `google_wallet_issuer_id` | `3388000000022321101` (demo/test ID) |
| Google Wallet | `google_service_account_json` | **EMPTY** (needs real JSON) |
| Apple Wallet | `apple_wallet_enabled` | `false` |
| Apple Wallet | `apple_pass_type_identifier` | **EMPTY** |
| Apple Wallet | `apple_team_identifier` | **EMPTY** |
| Apple Wallet | `apple_cert_pem` | **EMPTY** |
| Apple Wallet | `apple_cert_key_pem` | **EMPTY** |
| Apple Wallet | `apple_wwdr_cert_pem` | **EMPTY** |

---

## Google Wallet Setup

### Prerequisites
- A Google Cloud project with billing enabled
- Access to [Google Pay & Wallet Console](https://pay.google.com/gp/w/homepage)

### Step 1: Create a Google Wallet Issuer Account

1. Go to [Google Pay & Wallet Console](https://pay.google.com/gp/w/homepage)
2. Sign in with your Google account
3. Click **"Get Started"** or **"Create Account"**
4. Complete the business verification process
5. Once approved, you will receive an **Issuer ID** (e.g., `3388000000022321101`)

### Step 2: Create a Service Account in Google Cloud

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **IAM & Admin** → **Service Accounts**
3. Click **"Create Service Account"**
4. Name it: `loyallia-wallet-sa`
5. Grant it the role: **"Wallet API Service Account"** (or create a custom role with `walletobjects.eventticket` permissions)
6. Click **"Create Key"** → Choose **JSON** format
7. Download the `.json` file — this is your service account key

### Step 3: Enable the Wallet API

1. In Google Cloud Console, go to **APIs & Services** → **Library**
2. Search for **"Google Wallet API"**
3. Click **Enable**

### Step 4: Inject Credentials into Vault

#### Option A: Via SuperAdmin UI (Recommended)

1. Log in to Loyallia as SuperAdmin: `http://localhost/superadmin/login`
2. Navigate to **Configuración** → **Integraciones**
3. Find the **Google Wallet** card
4. Click **"Configurar credenciales en Vault"**
5. Fill in:
   - `google_wallet_issuer_id`: Paste your Issuer ID
   - `google_service_account_json`: Paste the **entire contents** of the downloaded `.json` file
6. Click **"Guardar en Vault"**
7. Toggle `google_wallet_enabled` to `true`
8. Click **"Guardar en Vault"** again

#### Option B: Via Vault CLI

```bash
# Read the service account JSON file
SA_JSON=$(cat /path/to/loyallia-wallet-sa-*.json)

# Get the Vault root token
export VAULT_TOKEN="$(docker exec loyallia-vault cat /vault/file/init.json | python3 -c "import sys,json; print(json.load(sys.stdin)['root_token'])")"

# Write credentials to Vault
curl -X POST \
  -H "X-Vault-Token: $VAULT_TOKEN" \
  -H "Content-Type: application/json" \
  http://localhost:33908/v1/secret/data/loyallia/production \
  -d "{
    \"data\": {
      \"google_wallet_issuer_id\": \"YOUR_ISSUER_ID\",
      \"google_service_account_json\": $(echo "$SA_JSON" | python3 -c "import sys,json; print(json.dumps(sys.stdin.read()))"),
      \"google_wallet_enabled\": \"true\"
    }
  }"
```

#### Option C: Via API Script

Use the provided helper script:

```bash
# Copy your service account JSON to the project root
cp /path/to/loyallia-wallet-sa-*.json ./google-service-account.json

# Run the injection script
python3 scripts/inject_wallet_credentials.py --google-issuer-id "YOUR_ISSUER_ID" --google-sa-json ./google-service-account.json
```

### Step 5: Verify Integration

1. Go to SuperAdmin → Configuración → Integraciones
2. The Google Wallet card should show:
   - Status: **Verde** (Conectado)
   - Diagnostics: `service_account_present: true`, `service_account_valid_json: true`

---

## Apple Wallet Setup

### Prerequisites
- Apple Developer Program membership ($99/year)
- macOS with Keychain Access (for certificate export)
- OpenSSL installed (for PEM conversions)

### Step 1: Create a Pass Type Identifier

1. Go to [Apple Developer Certificates Portal](https://developer.apple.com/account/resources/identifiers/list/passTypeId)
2. Click **"+"** to add a new identifier
3. Select **"Pass Type IDs"**
4. Description: `Loyallia Loyalty Pass`
5. Identifier: `pass.com.yourcompany.loyallia` (replace `yourcompany` with your domain)
6. Click **Continue** → **Register**

### Step 2: Create a Pass Type ID Certificate

1. Go to [Apple Developer Certificates](https://developer.apple.com/account/resources/certificates/list)
2. Click **"+"** to add a new certificate
3. Select **"Pass Type ID Certificate"**
4. Choose the Pass Type ID you just created
5. Upload a Certificate Signing Request (CSR):
   ```bash
   # Generate a CSR on macOS
   openssl req -new -newkey rsa:2048 -nodes -keyout apple_pass.key -out apple_pass.csr
   ```
6. Download the `.cer` file

### Step 3: Convert Certificate to PEM

```bash
# Convert .cer to .pem
openssl x509 -in pass.cer -inform DER -out apple_cert.pem -outform PEM
```

### Step 4: Export Private Key to PEM

1. Open **Keychain Access** on macOS
2. Find your private key (associated with the CSR you created)
3. Right-click → **Export**
4. Save as `.p12` file (set a password)
5. Convert to PEM:
   ```bash
   openssl pkcs12 -in apple_pass.p12 -out apple_cert_key.pem -nodes
   ```

### Step 5: Download WWDR Certificate

1. Download [Apple WWDR G4 Certificate](https://www.apple.com/certificateauthority/AppleWWDRCAG4.cer)
2. Convert to PEM:
   ```bash
   openssl x509 -in AppleWWDRCAG4.cer -inform DER -out apple_wwdr.pem -outform PEM
   ```

### Step 6: Get Your Team ID

1. Go to [Apple Developer Account](https://developer.apple.com/account)
2. Click on **Membership Details**
3. Copy your **Team ID** (10-character string, e.g., `ABCDE12345`)

### Step 7: Inject Credentials into Vault

#### Option A: Via SuperAdmin UI (Recommended)

1. Log in to Loyallia as SuperAdmin
2. Navigate to **Configuración** → **Integraciones**
3. Find the **Apple Wallet** card
4. Click **"Configurar credenciales en Vault"**
5. Fill in each field:
   - `apple_pass_type_identifier`: `pass.com.yourcompany.loyallia`
   - `apple_team_identifier`: `ABCDE12345`
   - `apple_cert_pem`: Paste contents of `apple_cert.pem`
   - `apple_cert_key_pem`: Paste contents of `apple_cert_key.pem`
   - `apple_wwdr_cert_pem`: Paste contents of `apple_wwdr.pem`
6. Click **"Guardar en Vault"**
7. Toggle `apple_wallet_enabled` to `true`
8. Click **"Guardar en Vault"** again

#### Option B: Via Vault CLI

```bash
# Read certificate contents
CERT_PEM=$(cat apple_cert.pem | awk '{printf "%s\\n", $0}' | sed 's/\\n$//')
KEY_PEM=$(cat apple_cert_key.pem | awk '{printf "%s\\n", $0}' | sed 's/\\n$//')
WWDR_PEM=$(cat apple_wwdr.pem | awk '{printf "%s\\n", $0}' | sed 's/\\n$//')

export VAULT_TOKEN="$(docker exec loyallia-vault cat /vault/file/init.json | python3 -c "import sys,json; print(json.load(sys.stdin)['root_token'])")"

curl -X POST \
  -H "X-Vault-Token: $VAULT_TOKEN" \
  -H "Content-Type: application/json" \
  http://localhost:33908/v1/secret/data/loyallia/production \
  -d "{
    \"data\": {
      \"apple_pass_type_identifier\": \"pass.com.yourcompany.loyallia\",
      \"apple_team_identifier\": \"ABCDE12345\",
      \"apple_cert_pem\": \"$CERT_PEM\",
      \"apple_cert_key_pem\": \"$KEY_PEM\",
      \"apple_wwdr_cert_pem\": \"$WWDR_PEM\",
      \"apple_wallet_enabled\": \"true\"
    }
  }"
```

#### Option C: Via Helper Script

```bash
# Run the injection script
python3 scripts/inject_wallet_credentials.py \
  --apple-pass-id "pass.com.yourcompany.loyallia" \
  --apple-team-id "ABCDE12345" \
  --apple-cert ./apple_cert.pem \
  --apple-key ./apple_cert_key.pem \
  --apple-wwdr ./apple_wwdr.pem
```

### Step 8: Verify Integration

1. Go to SuperAdmin → Configuración → Integraciones
2. The Apple Wallet card should show:
   - Status: **Verde** (Conectado)
   - Diagnostics: `certs_cryptographically_valid: true`

---

## Helper Script

A convenience script is provided at `scripts/inject_wallet_credentials.py` to automate credential injection.

### Usage

```bash
# Google Wallet only
python3 scripts/inject_wallet_credentials.py \
  --google-issuer-id "3388000000022321101" \
  --google-sa-json ./google-service-account.json

# Apple Wallet only
python3 scripts/inject_wallet_credentials.py \
  --apple-pass-id "pass.com.yourcompany.loyallia" \
  --apple-team-id "ABCDE12345" \
  --apple-cert ./apple_cert.pem \
  --apple-key ./apple_cert_key.pem \
  --apple-wwdr ./apple_wwdr.pem

# Both
python3 scripts/inject_wallet_credentials.py \
  --google-issuer-id "3388000000022321101" \
  --google-sa-json ./google-service-account.json \
  --apple-pass-id "pass.com.yourcompany.loyallia" \
  --apple-team-id "ABCDE12345" \
  --apple-cert ./apple_cert.pem \
  --apple-key ./apple_cert_key.pem \
  --apple-wwdr ./apple_wwdr.pem
```

---

## Troubleshooting

### Google Wallet Diagnostics Failed

| Error | Solution |
|-------|----------|
| `issuer_id_present: false` | Set `google_wallet_issuer_id` in Vault |
| `service_account_present: false` | Set `google_service_account_json` in Vault |
| `service_account_valid_json: false` | Ensure the JSON is valid and complete |
| `service_account_has_required_fields: false` | JSON must contain `client_email`, `private_key`, `token_uri` |

### Apple Wallet Diagnostics Failed

| Error | Solution |
|-------|----------|
| `pass_type_id_present: false` | Set `apple_pass_type_identifier` in Vault |
| `team_id_present: false` | Set `apple_team_identifier` in Vault |
| `cert_pem_present: false` | Set `apple_cert_pem` in Vault |
| `key_pem_present: false` | Set `apple_cert_key_pem` in Vault |
| `wwdr_cert_present: false` | Set `apple_wwdr_cert_pem` in Vault |
| `certs_cryptographically_valid: false` | Certificates may be expired or mismatched |

### Vault Permission Denied

Ensure the Vault token has `create` and `update` permissions on `secret/data/loyallia/production`:

```bash
# Check current policy
docker exec loyallia-vault vault policy read loyallia-app

# Policy should include:
# path "secret/data/loyallia/production" {
#   capabilities = ["read", "create", "update"]
# }
```

---

## Security Best Practices

1. **Rotate credentials regularly** — especially service account keys
2. **Use separate environments** — never use production credentials in staging
3. **Monitor Vault audit logs** — track who accesses wallet credentials
4. **Store certificates securely** — keep `.p12` and `.key` files encrypted at rest
5. **Enable certificate expiry alerts** — Apple certificates expire annually

---

## References

- [Google Wallet API Documentation](https://developers.google.com/wallet)
- [Apple Wallet Developer Guide](https://developer.apple.com/documentation/walletpasses)
- [HashiCorp Vault KV v2 API](https://developer.hashicorp.com/vault/docs/secrets/kv/kv-v2)
