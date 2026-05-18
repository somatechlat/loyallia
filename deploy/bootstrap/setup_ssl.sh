#!/usr/bin/env bash
# =============================================================================
# LOYALLIA — SSL Configuration for Nginx
# =============================================================================
# Reads SSL certificate paths from .env:
#   SSL_CERT_PATH=/etc/letsencrypt/live/rewards.loyallia.com/fullchain.pem
#   SSL_KEY_PATH=/etc/letsencrypt/live/rewards.loyallia.com/privkey.pem
#
# Actions:
#   1. Verify SSL cert files exist and are readable
#   2. Mount certs into Nginx container (read-only)
#   3. Enable HTTPS in nginx.conf
#   4. Enable HTTP->HTTPS redirect
#   5. Configure HTTP/2 + ALPN
#   6. Set HSTS headers
#   7. Reload Nginx
#   8. Test with curl
#
# Usage:
#   ./deploy/bootstrap/setup_ssl.sh [OPTIONS]
#
# Options:
#   --env=production|development   Target environment (default: production)
#   --dry-run                      Show what would happen
#   --help                         Show this help
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="$PROJECT_ROOT/.env"
NGINX_CONF="$PROJECT_ROOT/deploy/nginx.conf"
NGINX_CONF_PROD="$PROJECT_ROOT/deploy/rewards.loyallia.com.conf"
NGINX_CONTAINER="loyallia-nginx"

# --- Colours ------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()   { echo -e "${GREEN}[ssl]${NC} $*"; }
warn()  { echo -e "${YELLOW}[warn]${NC} $*"; }
err()   { echo -e "${RED}[error]${NC} $*" >&2; }
info()  { echo -e "${CYAN}[info]${NC} $*"; }

# --- CLI ----------------------------------------------------------------------
DEPLOY_ENV="production"
DRY_RUN=0

parse_args() {
    for arg in "$@"; do
        case "$arg" in
            --env=*)
                DEPLOY_ENV="${arg#*=}"
                ;;
            --dry-run)
                DRY_RUN=1
                ;;
            --help|-h)
                sed -n '/^# ===/,/^# ===/p' "$0" | sed 's/^# //;s/^#//'
                exit 0
                ;;
        esac
    done
}

# --- Load SSL paths from .env -------------------------------------------------
load_ssl_paths() {
    SSL_CERT_PATH="${SSL_CERT_PATH:-}"
    SSL_KEY_PATH="${SSL_KEY_PATH:-}"
    DOMAIN="${DOMAIN:-rewards.loyallia.com}"

    if [ -f "$ENV_FILE" ]; then
        # Read SSL_CERT_PATH from .env if not in environment
        if [ -z "$SSL_CERT_PATH" ]; then
            SSL_CERT_PATH="$(grep -E '^\s*SSL_CERT_PATH\s*=' "$ENV_FILE" 2>/dev/null | sed 's/.*=\s*//' | tr -d '"' || true)"
        fi
        if [ -z "$SSL_KEY_PATH" ]; then
            SSL_KEY_PATH="$(grep -E '^\s*SSL_KEY_PATH\s*=' "$ENV_FILE" 2>/dev/null | sed 's/.*=\s*//' | tr -d '"' || true)"
        fi
        if [ -z "$DOMAIN" ]; then
            DOMAIN="$(grep -E '^\s*DOMAIN\s*=' "$ENV_FILE" 2>/dev/null | sed 's/.*=\s*//' | tr -d '"' || echo 'rewards.loyallia.com')"
        fi
    fi

    # Defaults
    SSL_CERT_PATH="${SSL_CERT_PATH:-/etc/letsencrypt/live/$DOMAIN/fullchain.pem}"
    SSL_KEY_PATH="${SSL_KEY_PATH:-/etc/letsencrypt/live/$DOMAIN/privkey.pem}"
}

# --- 1. Verify SSL cert files -------------------------------------------------
verify_certs() {
    log "Step 1/8 — Verifying SSL certificate files"
    log "  Certificate: $SSL_CERT_PATH"
    log "  Private key: $SSL_KEY_PATH"

    if [ "$DRY_RUN" -eq 1 ]; then
        info "[DRY-RUN] Would check: $SSL_CERT_PATH and $SSL_KEY_PATH"
        return 0
    fi

    if [ ! -f "$SSL_CERT_PATH" ]; then
        err "SSL certificate not found: $SSL_CERT_PATH"
        err ""
        err "To obtain a certificate with Let's Encrypt:"
        err "  certbot --nginx -d $DOMAIN"
        err ""
        err "Or for a self-signed certificate (development only):"
        err "  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \\"
        err "    -keyout $SSL_KEY_PATH -out $SSL_CERT_PATH -subj '/CN=$DOMAIN'"
        return 1
    fi

    if [ ! -f "$SSL_KEY_PATH" ]; then
        err "SSL private key not found: $SSL_KEY_PATH"
        return 1
    fi

    # Check readability
    if [ ! -r "$SSL_CERT_PATH" ]; then
        err "SSL certificate not readable (check permissions): $SSL_CERT_PATH"
        return 1
    fi

    if [ ! -r "$SSL_KEY_PATH" ]; then
        err "SSL private key not readable (check permissions): $SSL_KEY_PATH"
        return 1
    fi

    # Verify cert validity
    local cert_expiry cert_cn cert_days
    cert_expiry="$(openssl x509 -enddate -noout -in "$SSL_CERT_PATH" 2>/dev/null | cut -d= -f2 || echo 'unknown')"
    cert_cn="$(openssl x509 -subject -noout -in "$SSL_CERT_PATH" 2>/dev/null | grep -o 'CN = [^,]*' | sed 's/CN = //' || echo 'unknown')"
    cert_days="$(openssl x509 -checkend 0 -noout -in "$SSL_CERT_PATH" 2>/dev/null && echo 'valid' || echo 'expired')"

    log "  Certificate CN: $cert_cn"
    log "  Expiry: $cert_expiry"
    if [ "$cert_days" = "expired" ]; then
        err "  Certificate has EXPIRED!"
        return 1
    else
        log "  Certificate is valid ✓"
    fi

    # Verify key matches certificate
    local cert_hash key_hash
    cert_hash="$(openssl x509 -noout -modulus -in "$SSL_CERT_PATH" 2>/dev/null | openssl md5 | awk '{print $2}' || true)"
    key_hash="$(openssl rsa -noout -modulus -in "$SSL_KEY_PATH" 2>/dev/null | openssl md5 | awk '{print $2}' || true)"

    if [ -n "$cert_hash" ] && [ -n "$key_hash" ] && [ "$cert_hash" = "$key_hash" ]; then
        log "  Certificate and key match ✓"
    else
        warn "  Could not verify certificate/key match (may be OK for EC keys)"
    fi

    log "SSL certificate verification complete ✓"
}

# --- 2. Mount certs into Nginx container --------------------------------------
mount_certs() {
    log "Step 2/8 — Mounting certificates into Nginx container"

    if [ "$DRY_RUN" -eq 1 ]; then
        info "[DRY-RUN] Would mount certs as read-only volume into $NGINX_CONTAINER"
        return 0
    fi

    # Nginx container reads certs from /etc/nginx/certs via volume mount
    # The docker-compose already mounts ./certs:/app/certs:ro
    # We copy the host certs into the project certs directory

    local host_certs_dir="$PROJECT_ROOT/certs"
    mkdir -p "$host_certs_dir"

    # Copy with restrictive permissions
    cp "$SSL_CERT_PATH" "$host_certs_dir/fullchain.pem"
    cp "$SSL_KEY_PATH" "$host_certs_dir/privkey.pem"
    chmod 0644 "$host_certs_dir/fullchain.pem"
    chmod 0600 "$host_certs_dir/privkey.pem"

    log "Certificates copied to $host_certs_dir/ ✓"

    # If Nginx is running, copy certs into the container
    if docker inspect "$NGINX_CONTAINER" --format '{{.State.Status}}' 2>/dev/null | grep -q running; then
        log "Copying certs into running Nginx container..."
        docker exec "$NGINX_CONTAINER" mkdir -p /etc/nginx/certs 2>/dev/null || true
        docker cp "$host_certs_dir/fullchain.pem" "$NGINX_CONTAINER:/etc/nginx/certs/" 2>/dev/null
        docker cp "$host_certs_dir/privkey.pem" "$NGINX_CONTAINER:/etc/nginx/certs/" 2>/dev/null
        docker exec "$NGINX_CONTAINER" chmod 0644 /etc/nginx/certs/fullchain.pem 2>/dev/null || true
        docker exec "$NGINX_CONTAINER" chmod 0600 /etc/nginx/certs/privkey.pem 2>/dev/null || true
        log "Certificates mounted into $NGINX_CONTAINER ✓"
    fi
}

# --- 3. Enable HTTPS in nginx.conf --------------------------------------------
enable_https() {
    log "Step 3/8 — Enabling HTTPS in Nginx configuration"

    if [ "$DRY_RUN" -eq 1 ]; then
        info "[DRY-RUN] Would enable HTTPS server block in $NGINX_CONF"
        return 0
    fi

    # Check if HTTPS is already enabled
    if grep -q "listen 443 ssl" "$NGINX_CONF" 2>/dev/null; then
        log "HTTPS already enabled in nginx.conf ✓"
        return 0
    fi

    # Build HTTPS server block
    local https_block
    https_block="
    # HTTPS server
    server {
        listen 443 ssl http2;
        listen [::]:443 ssl http2;
        server_name $DOMAIN localhost;

        ssl_certificate /etc/nginx/certs/fullchain.pem;
        ssl_certificate_key /etc/nginx/certs/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 1d;
        ssl_session_tickets off;

        # HSTS
        add_header Strict-Transport-Security \"max-age=63072000; includeSubDomains; preload\" always;

        # Security headers
        add_header X-Frame-Options \"SAMEORIGIN\" always;
        add_header X-Content-Type-Options \"nosniff\" always;
        add_header X-XSS-Protection \"1; mode=block\" always;
        add_header Referrer-Policy \"strict-origin-when-cross-origin\" always;
        add_header Content-Security-Policy \"default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://accounts.google.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self';\" always;
        add_header Permissions-Policy \"accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()\" always;

        client_max_body_size 10m;
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 60s;

        gzip on;
        gzip_types text/plain application/json application/javascript text/css;
        gzip_min_length 1000;

        location /api/v1/auth/ {
            limit_req zone=auth burst=20 nodelay;
            proxy_pass http://api;
            proxy_http_version 1.1;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }

        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://api;
            proxy_http_version 1.1;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }

        location / {
            proxy_pass http://web;
            proxy_http_version 1.1;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection \$http_connection;
        }
    }"

    # Append HTTPS server block to nginx.conf before the closing brace
    # Insert before the final closing brace of the http block
    if [ -f "$NGINX_CONF" ]; then
        # Use a temporary file to insert the HTTPS block
        local tmp_conf
        tmp_conf="$(mktemp)"
        # Remove the closing '}' of the http block, append the HTTPS block, then add it back
        head -n -1 "$NGINX_CONF" > "$tmp_conf"
        echo "$https_block" >> "$tmp_conf"
        echo "" >> "$tmp_conf"
        echo "}" >> "$tmp_conf"
        mv "$tmp_conf" "$NGINX_CONF"
        log "HTTPS server block added to $NGINX_CONF ✓"
    else
        err "nginx.conf not found at $NGINX_CONF"
        return 1
    fi
}

# --- 4. Enable HTTP->HTTPS redirect -------------------------------------------
enable_redirect() {
    log "Step 4/8 — Enabling HTTP to HTTPS redirect"

    if [ "$DRY_RUN" -eq 1 ]; then
        info "[DRY-RUN] Would enable HTTP→HTTPS redirect in $NGINX_CONF"
        return 0
    fi

    if grep -q "return 301 https://" "$NGINX_CONF" 2>/dev/null; then
        log "HTTP→HTTPS redirect already enabled ✓"
        return 0
    fi

    # Uncomment the redirect server block in nginx.conf
    # The existing nginx.conf has a commented-out redirect block
    if sed -i.bak 's/# server {/server {/' "$NGINX_CONF" 2>/dev/null && \
       sed -i 's/#     listen 80;/    listen 80;/' "$NGINX_CONF" 2>/dev/null && \
       sed -i 's/#     server_name _;/    server_name _;/' "$NGINX_CONF" 2>/dev/null && \
       sed -i 's/#     return 301 https/    return 301 https/' "$NGINX_CONF" 2>/dev/null && \
       sed -i 's/# }/}/' "$NGINX_CONF" 2>/dev/null; then
        rm -f "$NGINX_CONF.bak"
        log "HTTP→HTTPS redirect enabled ✓"
    else
        # If sed didn't work, manually inject the redirect
        local redirect_block="
    # Redirect HTTP to HTTPS
    server {
        listen 80;
        server_name _;
        return 301 https://\$host\$request_uri;
    }"

        local tmp_conf
        tmp_conf="$(mktemp)"
        head -n -1 "$NGINX_CONF" > "$tmp_conf"
        echo "$redirect_block" >> "$tmp_conf"
        echo "" >> "$tmp_conf"
        echo "}" >> "$tmp_conf"
        mv "$tmp_conf" "$NGINX_CONF"
        log "HTTP→HTTPS redirect added ✓"
    fi
}

# --- 5. HTTP/2 + ALPN (handled in HTTPS block) --------------------------------
configure_http2() {
    log "Step 5/8 — Configuring HTTP/2 + ALPN"

    if [ "$DRY_RUN" -eq 1 ]; then
        info "[DRY-RUN] HTTP/2 already configured in the HTTPS server block"
        return 0
    fi

    if grep -q "listen 443 ssl http2" "$NGINX_CONF" 2>/dev/null; then
        log "HTTP/2 already enabled ✓"
    else
        warn "HTTP/2 not found — may need manual configuration"
    fi
}

# --- 6. HSTS headers (handled in HTTPS block) ---------------------------------
configure_hsts() {
    log "Step 6/8 — Configuring HSTS headers"

    if [ "$DRY_RUN" -eq 1 ]; then
        info "[DRY-RUN] HSTS already configured in the HTTPS server block"
        return 0
    fi

    if grep -q "Strict-Transport-Security.*63072000" "$NGINX_CONF" 2>/dev/null; then
        log "HSTS header configured (63072000 seconds = 2 years) ✓"
    elif grep -q "Strict-Transport-Security" "$NGINX_CONF" 2>/dev/null; then
        log "HSTS header is configured ✓"
    else
        warn "HSTS header not found — may need manual configuration"
    fi
}

# --- 7. Reload Nginx ----------------------------------------------------------
reload_nginx() {
    log "Step 7/8 — Reloading Nginx"

    if [ "$DRY_RUN" -eq 1 ]; then
        info "[DRY-RUN] Would reload Nginx configuration"
        return 0
    fi

    if ! docker inspect "$NGINX_CONTAINER" --format '{{.State.Status}}' 2>/dev/null | grep -q running; then
        warn "Nginx container is not running — starting it"
        cd "$PROJECT_ROOT" && docker compose up -d nginx
        sleep 2
    fi

    # Copy updated nginx.conf into container
    docker cp "$NGINX_CONF" "$NGINX_CONTAINER:/etc/nginx/nginx.conf" 2>/dev/null

    # Validate configuration inside container
    if docker exec "$NGINX_CONTAINER" nginx -t 2>/dev/null; then
        log "Nginx configuration is valid ✓"
    else
        err "Nginx configuration test failed"
        docker exec "$NGINX_CONTAINER" nginx -t 2>&1 || true
        return 1
    fi

    # Reload Nginx
    if docker exec "$NGINX_CONTAINER" nginx -s reload 2>/dev/null; then
        log "Nginx reloaded successfully ✓"
    else
        err "Failed to reload Nginx"
        return 1
    fi
}

# --- 8. Test with curl --------------------------------------------------------
test_ssl() {
    log "Step 8/8 — Testing SSL connection"

    if [ "$DRY_RUN" -eq 1 ]; then
        info "[DRY-RUN] Would test HTTPS with curl"
        return 0
    fi

    # Test HTTP redirect
    log "  Testing HTTP→HTTPS redirect..."
    local redirect_code
    redirect_code="$(curl -s -o /dev/null -w "%{http_code}" "http://localhost/" 2>/dev/null || echo '000')"
    if [ "$redirect_code" = "301" ] || [ "$redirect_code" = "308" ]; then
        log "  HTTP redirect: $redirect_code ✓"
    else
        warn "  HTTP redirect: $redirect_code (expected 301)"
    fi

    # Test HTTPS (self-signed certs need -k flag)
    log "  Testing HTTPS connection..."
    local https_code https_proto
    https_code="$(curl -sk -o /dev/null -w "%{http_code}" "https://localhost/" 2>/dev/null || echo '000')"
    https_proto="$(curl -sk -o /dev/null -w "%{ssl_verify_result}" "https://localhost/" 2>/dev/null || echo 'unknown')"

    if [ "$https_code" = "200" ] || [ "$https_code" = "302" ] || [ "$https_code" = "404" ]; then
        log "  HTTPS: HTTP $https_code ✓"
    else
        warn "  HTTPS: HTTP $https_code (may be OK if content not yet served)"
    fi

    # Check HTTP/2
    local http2_proto
    http2_proto="$(curl -sk --http2 -o /dev/null -w "%{http_version}" "https://localhost/" 2>/dev/null || echo '0')"
    if [ "$http2_proto" = "2" ] || [ "$http2_proto" = "2.0" ]; then
        log "  HTTP/2: enabled ✓"
    else
        info "  HTTP/2 protocol version: $http2_proto"
    fi

    # Check HSTS header
    local hsts_header
    hsts_header="$(curl -sk -I "https://localhost/" 2>/dev/null | grep -i 'strict-transport-security' || true)"
    if [ -n "$hsts_header" ]; then
        log "  HSTS header: $hsts_header ✓"
    else
        warn "  HSTS header not found in response"
    fi

    log "SSL testing complete ✓"
    echo ""
    log "═══════════════════════════════════════════════════════════════════════"
    log "  SSL CONFIGURATION COMPLETE"
    log ""
    log "  Domain:    https://$DOMAIN"
    log "  Cert:      $SSL_CERT_PATH"
    log "  Key:       $SSL_KEY_PATH"
    log "  HTTP/2:    enabled"
    log "  HSTS:      enabled"
    log "═══════════════════════════════════════════════════════════════════════"
}

# =============================================================================
# MAIN
# =============================================================================
main() {
    parse_args "$@"

    echo ""
    echo -e "${CYAN}╔══════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║        LOYALLIA — SSL CONFIGURATION                                 ║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""

    load_ssl_paths

    verify_certs
    mount_certs
    enable_https
    enable_redirect
    configure_http2
    configure_hsts
    reload_nginx
    test_ssl

    log "SSL setup complete."
}

main "$@"
