#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/opt/accounting-ai-agent"
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.production"

# Detect docker compose command (v2 plugin vs v1 standalone)
if docker compose version &>/dev/null; then
  DC="docker compose"
else
  DC="docker-compose"
fi

cd "$APP_DIR"

echo "=== Pulling latest code ==="
git fetch origin
git reset --hard origin/development

echo "=== Building and restarting containers ==="
$DC -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build api web
$DC -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d

echo "=== Waiting for services to start ==="
sleep 15

echo "=== Restarting nginx to pick up new container IPs ==="
$DC -f "$COMPOSE_FILE" --env-file "$ENV_FILE" restart nginx
sleep 3

echo "=== Reconnecting nginx to marketing-ai network ==="
docker network connect marketing-ai_marketing-network accounting-nginx 2>/dev/null || true
docker exec accounting-nginx nginx -s reload 2>/dev/null || true
echo "accounting-nginx reconnected to marketing-ai network."

echo "=== Running database migrations ==="
$DC -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T api npx prisma migrate deploy

echo "=== Health checks ==="
API_STATUS=$($DC -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T api node -e "
  const http = require('http');
  http.get('http://localhost:3001/health', (r) => {
    let d=''; r.on('data', c => d+=c); r.on('end', () => { console.log(d); process.exit(r.statusCode===200?0:1); });
  }).on('error', (e) => { console.error(e.message); process.exit(1); });
" 2>&1) || true
echo "API health: $API_STATUS"

echo "=== Container status ==="
$DC -f "$COMPOSE_FILE" ps

echo "=== Cleaning up old images ==="
docker image prune -f

echo "=== Deployment complete ==="
