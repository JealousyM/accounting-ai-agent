# Deployment Guide

## GitHub Environments Setup

### 1. Create Environments

In your GitHub repository, go to Settings → Environments and create:

- **production** - for production deployments
- **staging** - for staging deployments

### 2. Environment Variables

Configure the following environment variables for each environment:

#### Production Environment
```
DATABASE_URL=postgresql://user:password@host:5432/accounting_db
REDIS_URL=redis://host:6379
JWT_SECRET=your-production-jwt-secret-min-32-chars
REFRESH_TOKEN_SECRET=your-production-refresh-secret-min-32-chars
FRONTEND_URL=https://your-domain.com
BACKEND_URL=https://api.your-domain.com
CORS_ORIGIN=https://your-domain.com
NODE_ENV=production

# Telegram Notifications (optional)
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_CHAT_ID=your-chat-id
```

#### Staging Environment
```
DATABASE_URL=postgresql://user:password@staging-host:5432/accounting_db_staging
REDIS_URL=redis://staging-host:6379
JWT_SECRET=your-staging-jwt-secret-min-32-chars
REFRESH_TOKEN_SECRET=your-staging-refresh-secret-min-32-chars
FRONTEND_URL=https://staging.your-domain.com
BACKEND_URL=https://api-staging.your-domain.com
CORS_ORIGIN=https://staging.your-domain.com
NODE_ENV=staging

# Telegram Notifications (optional)
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_CHAT_ID=your-chat-id
```

### 3. Deployment Secrets

Add these secrets to your repository (Settings → Secrets and variables → Actions):

```
DEPLOY_HOST=your-server-ip-or-domain
DEPLOY_USER=your-server-username
DEPLOY_SSH_KEY=your-private-ssh-key
```

## Docker Registry

The CI/CD pipeline automatically builds and pushes Docker images to GitHub Container Registry (ghcr.io).

### Image Tags

- `main` branch → `latest` tag
- `develop` branch → `develop` tag
- Pull requests → `pr-<number>` tag
- Releases → version tags (e.g., `v1.0.0`)

### Pull Images

```bash
# Pull latest images
docker pull ghcr.io/your-username/accounting-ai-agent/api:latest
docker pull ghcr.io/your-username/accounting-ai-agent/web:latest

# Pull specific version
docker pull ghcr.io/your-username/accounting-ai-agent/api:v1.0.0
```

## Manual Deployment

### Using Docker Compose

1. **Prepare server:**
```bash
# Install Docker and Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Clone repository
git clone https://github.com/your-username/accounting-ai-agent.git
cd accounting-ai-agent
```

2. **Configure environment:**
```bash
# Copy and edit environment files
cp packages/api/.env.example packages/api/.env
cp packages/web/.env.example packages/web/.env

# Edit with production values
nano packages/api/.env
nano packages/web/.env
```

3. **Deploy:**
```bash
# Pull latest images
docker-compose -f docker-compose.prod.yml pull

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Run migrations
docker-compose -f docker-compose.prod.yml exec api npx prisma migrate deploy
```

### Using Kubernetes

Example Kubernetes manifests are available in the `k8s/` directory (create if needed).

## Health Checks

### API Health Check
```bash
curl https://api.your-domain.com/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-01-15T17:00:00.000Z"
}
```

### Web Health Check
```bash
curl https://your-domain.com/api/health
```

## Monitoring

### Logs

```bash
# View all logs
docker-compose -f docker-compose.prod.yml logs -f

# View specific service logs
docker-compose -f docker-compose.prod.yml logs -f api
docker-compose -f docker-compose.prod.yml logs -f web
```

### Metrics

Consider adding monitoring tools:
- **Prometheus** - metrics collection
- **Grafana** - metrics visualization
- **Loki** - log aggregation
- **Jaeger** - distributed tracing

## Backup

### Database Backup

```bash
# Create backup
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U postgres accounting_db > backup.sql

# Restore backup
docker-compose -f docker-compose.prod.yml exec -T postgres psql -U postgres accounting_db < backup.sql
```

### Automated Backups

Add to crontab:
```bash
# Daily backup at 2 AM
0 2 * * * /path/to/backup-script.sh
```

## Rollback

### Quick Rollback

```bash
# Rollback to previous version
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

### Database Rollback

```bash
# Rollback migrations (if needed)
docker-compose -f docker-compose.prod.yml exec api npx prisma migrate reset
```

## Security

### SSL/TLS

Use a reverse proxy (nginx, Traefik, or Cloudflare) to handle SSL termination.

### Firewall

```bash
# Allow only necessary ports
ufw allow 22    # SSH
ufw allow 80    # HTTP
ufw allow 443   # HTTPS
ufw enable
```

### Updates

```bash
# Update system packages
apt update && apt upgrade -y

# Update Docker images
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```