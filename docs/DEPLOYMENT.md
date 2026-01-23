# Deployment Guide

This document describes how to deploy the Accounting AI Agent to production.

## Overview

The application can be deployed using:
- Docker Compose (recommended for simple deployments)
- Kubernetes (for scalable deployments)
- Manual deployment on VPS

## Prerequisites

- Docker & Docker Compose
- Domain name with DNS configured
- SSL certificate (or use Let's Encrypt)
- Server with at least 2GB RAM

## Docker Deployment

### 1. Prepare Server

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install docker-compose-plugin

# Clone repository
git clone https://github.com/your-org/accounting-ai-agent.git
cd accounting-ai-agent
```

### 2. Configure Environment

**API Environment (packages/api/.env):**

```env
# Database
DATABASE_URL=postgresql://postgres:your-password@postgres:5432/accounting_db

# Redis
REDIS_URL=redis://redis:6379

# Server
NODE_ENV=production
PORT=3001

# JWT
JWT_SECRET=your-production-jwt-secret-min-32-chars
REFRESH_TOKEN_SECRET=your-production-refresh-secret-min-32-chars

# CORS
CORS_ORIGIN=https://your-domain.com
FRONTEND_URL=https://your-domain.com

# wFirma

WFIRMA_APP_KEY=your-app-key
WFIRMA_COMPANY_ID=your-company-id
```

**Web Environment (packages/web/.env):**

```env
NEXT_PUBLIC_API_URL=https://api.your-domain.com
```

### 3. Deploy with Docker Compose

```bash
# Pull latest images
docker-compose -f docker-compose.prod.yml pull

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Run database migrations
docker-compose -f docker-compose.prod.yml exec api npx prisma migrate deploy

# Check status
docker-compose -f docker-compose.prod.yml ps
```

### 4. Configure Reverse Proxy (Nginx)

```nginx
# /etc/nginx/sites-available/accounting-ai-agent

# API Server
server {
    listen 443 ssl http2;
    server_name api.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Web Application
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name your-domain.com api.your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

Enable and test:

```bash
ln -s /etc/nginx/sites-available/accounting-ai-agent /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

## GitHub Actions CI/CD

### Workflow Configuration

The repository includes CI/CD workflows in `.github/workflows/`:

1. **CI/CD Pipeline** (`ci-cd.yml`)
   - Runs on push/PR to `main` and `develop`
   - Linting, testing, building
   - Docker image building and pushing

2. **E2E Tests** (`e2e-tests.yml`)
   - Full integration tests
   - Runs on push/PR and daily

3. **Deploy to Production** (`deploy-production.yml`)
   - Manual trigger or on release
   - SSH deployment to server

### Required Secrets

Configure in GitHub repository settings (Settings → Secrets and variables → Actions):

```
# Deployment
DEPLOY_HOST=your-server-ip
DEPLOY_USER=your-ssh-user
DEPLOY_SSH_KEY=your-private-ssh-key

# Docker Registry (GitHub Container Registry)
GITHUB_TOKEN (automatically provided)
```

### Docker Images

Images are published to GitHub Container Registry:

```bash
ghcr.io/your-username/accounting-ai-agent/api:latest
ghcr.io/your-username/accounting-ai-agent/web:latest
```

## GitHub Environments

### Create Environments

In GitHub repository settings, create:

1. **production**
   - Protection rules: require approval
   - Environment secrets: production values

2. **staging**
   - Environment secrets: staging values

### Environment Variables

**Production:**
```
DATABASE_URL=postgresql://user:password@host:5432/accounting_db
REDIS_URL=redis://host:6379
JWT_SECRET=production-jwt-secret
...
```

**Staging:**
```
DATABASE_URL=postgresql://user:password@staging-host:5432/accounting_db_staging
REDIS_URL=redis://staging-host:6379
JWT_SECRET=staging-jwt-secret
...
```

## Health Checks

### API Health Check

```bash
curl https://api.your-domain.com/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-01-23T10:00:00.000Z"
}
```

### Web Health Check

```bash
curl https://your-domain.com
```

## Monitoring

### View Logs

```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f api
docker-compose -f docker-compose.prod.yml logs -f web
```

### Recommended Monitoring Tools

| Tool | Purpose |
|------|---------|
| Prometheus | Metrics collection |
| Grafana | Metrics visualization |
| Loki | Log aggregation |
| Jaeger | Distributed tracing |

## Database Backup

### Manual Backup

```bash
# Create backup
docker-compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U postgres accounting_db > backup_$(date +%Y%m%d).sql

# Restore backup
docker-compose -f docker-compose.prod.yml exec -T postgres \
  psql -U postgres accounting_db < backup_20260123.sql
```

### Automated Backups

Add to crontab:

```bash
# Daily backup at 2 AM
0 2 * * * /path/to/backup-script.sh >> /var/log/backup.log 2>&1
```

**backup-script.sh:**

```bash
#!/bin/bash
BACKUP_DIR=/backups
DATE=$(date +%Y%m%d_%H%M%S)

cd /path/to/accounting-ai-agent

docker-compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U postgres accounting_db > $BACKUP_DIR/backup_$DATE.sql

# Keep last 7 days
find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete
```

## Rollback

### Application Rollback

```bash
# Pull previous version
docker-compose -f docker-compose.prod.yml pull api:v1.0.0 web:v1.0.0

# Restart services
docker-compose -f docker-compose.prod.yml up -d
```

### Database Rollback

```bash
# Restore from backup
docker-compose -f docker-compose.prod.yml exec -T postgres \
  psql -U postgres accounting_db < backup_20260122.sql
```

## Security

### Firewall Configuration

```bash
# Allow only necessary ports
ufw default deny incoming
ufw default allow outgoing
ufw allow 22    # SSH
ufw allow 80    # HTTP
ufw allow 443   # HTTPS
ufw enable
```

### SSL/TLS Setup

Using Let's Encrypt with Certbot:

```bash
# Install Certbot
apt install certbot python3-certbot-nginx

# Obtain certificate
certbot --nginx -d your-domain.com -d api.your-domain.com

# Auto-renewal (added automatically)
certbot renew --dry-run
```

### Security Headers

Add to Nginx configuration:

```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'" always;
```

## Scaling

### Horizontal Scaling (Docker Swarm)

```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.prod.yml accounting

# Scale services
docker service scale accounting_api=3
```

### Kubernetes Deployment

Example deployment manifests available in `k8s/` directory (create if needed).

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs api

# Check container status
docker-compose -f docker-compose.prod.yml ps

# Restart services
docker-compose -f docker-compose.prod.yml restart
```

### Database Connection Issues

```bash
# Check PostgreSQL is running
docker-compose -f docker-compose.prod.yml exec postgres pg_isready

# Check connection from API
docker-compose -f docker-compose.prod.yml exec api \
  npx prisma db pull
```

### Memory Issues

```bash
# Check memory usage
docker stats

# Increase memory limits in docker-compose.prod.yml
services:
  api:
    deploy:
      resources:
        limits:
          memory: 1G
```

## Related Documentation

- [Getting Started](./GETTING_STARTED.md)
- [Architecture](./ARCHITECTURE.md)
- [Database](./DATABASE.md)
