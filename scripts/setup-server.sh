#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${1:-}"
APP_DIR="/opt/accounting-ai-agent"
BACKUP_DIR="/backups"

if [ -z "$REPO_URL" ]; then
  echo "Usage: ./setup-server.sh <REPOSITORY_URL>"
  echo "Example: ./setup-server.sh https://github.com/user/accounting-ai-agent.git"
  exit 1
fi

echo "=== Updating system ==="
apt update && apt upgrade -y

echo "=== Installing Docker ==="
curl -fsSL https://get.docker.com -o /tmp/get-docker.sh && sh /tmp/get-docker.sh
rm -f /tmp/get-docker.sh

echo "=== Installing packages ==="
apt install -y docker-compose-plugin certbot git

echo "=== Configuring UFW firewall ==="
ufw default deny incoming
ufw default allow outgoing
ufw allow 22
ufw allow 80
ufw allow 443
ufw --force enable

echo "=== Creating directories ==="
mkdir -p "$APP_DIR"
mkdir -p "$BACKUP_DIR"

echo "=== Cloning repository ==="
git clone "$REPO_URL" "$APP_DIR"

echo "=== Setup complete ==="
echo "Next steps:"
echo "  1. cd $APP_DIR"
echo "  2. Configure .env files"
echo "  3. Obtain SSL certificate (see DEPLOYMENT.md, step 4)"
echo "  4. Start services with docker compose"
