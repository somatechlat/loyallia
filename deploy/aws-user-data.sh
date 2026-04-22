#!/bin/bash
set -euo pipefail
exec > /var/log/loyallia-setup.log 2>&1

echo "=== Loyallia PoC Setup — $(date) ==="

# System updates
dnf update -y
dnf install -y docker git

# Start Docker
systemctl enable docker
systemctl start docker

# Install Docker Compose v2 plugin
DOCKER_CONFIG=/usr/local/lib/docker
mkdir -p $DOCKER_CONFIG/cli-plugins
curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 -o $DOCKER_CONFIG/cli-plugins/docker-compose
chmod +x $DOCKER_CONFIG/cli-plugins/docker-compose

# Add ec2-user to docker group
usermod -aG docker ec2-user

# Create app directory
mkdir -p /opt/loyallia
cd /opt/loyallia

# Clone repo (public or use deploy key)
git clone https://github.com/macbookpro201916i964gb1tb/loyallia.git . || {
  echo "Git clone failed — will need manual setup"
  exit 0
}

# Copy env file
cp .env.example .env 2>/dev/null || true

# Generate a real SECRET_KEY
SECRET=$(python3 -c "import secrets; print(secrets.token_urlsafe(50))")
sed -i "s/change-me-in-production-use-long-random-string/$SECRET/" .env 2>/dev/null || true

# Set ALLOWED_HOSTS for the Elastic IP or domain
# For production, use the real hostname instead of a hardcoded IP when possible.
PUBLIC_HOST=$(curl -s http://169.254.169.254/latest/meta-data/public-hostname || true)
if [ -z "$PUBLIC_HOST" ]; then
  PUBLIC_HOST=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 || true)
fi
if [ -z "$PUBLIC_HOST" ]; then
  PUBLIC_HOST=localhost
fi

echo "ALLOWED_HOSTS=*" >> .env
echo "APP_URL=http://$PUBLIC_HOST:33906" >> .env
echo "FRONTEND_URL=http://$PUBLIC_HOST:33906" >> .env
echo "NEXT_PUBLIC_APP_URL=http://$PUBLIC_HOST:33906" >> .env
echo "NEXT_PUBLIC_API_URL=http://$PUBLIC_HOST:33905" >> .env

# Build and start
docker compose build --no-cache 2>&1 | tail -20
docker compose up -d

# Run migrations
sleep 30
docker compose exec -T api python manage.py migrate 2>&1 || true

echo "=== Setup Complete — $(date) ==="
