# Accounting AI Agent

AI-powered accounting agent for automation of bookkeeping and financial reporting.

## 🏗️ Project Structure

Monorepo contains:
- `packages/api` - Node.js backend with REST API
- `packages/web` - Next.js frontend application

## 🚀 Quick Start

### Requirements
- Node.js >= 18.0.0
- Docker & Docker Compose
- npm >= 9.0.0

### Local Development

#### Option 1: Automated Setup (Recommended)

**Windows:**
```powershell
.\scripts\dev.ps1
```

**Linux/Mac:**
```bash
chmod +x scripts/dev.sh
./scripts/dev.sh
```

This script will:
- ✅ Check Node.js version
- ✅ Create .env files from examples
- ✅ Start Docker services (PostgreSQL, Redis)
- ✅ Install dependencies
- ✅ Run database migrations
- ✅ Start development servers

#### Option 2: Manual Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy environment files
cp packages/api/.env.example packages/api/.env
cp packages/web/.env.example packages/web/.env

# 3. Start Docker services
docker-compose up -d postgres redis

# 4. Run database migrations
npm run prisma:generate
npm run prisma:migrate

# 5. Start development servers
npm run dev
```

### Environment Check

Run environment validation before starting:

```bash
node scripts/check-env.js
```

### Available Scripts

```bash
# Development
npm run dev              # Start all services in dev mode
npm run dev:check        # Check environment and start dev

# Build
npm run build            # Build all packages

# Testing
npm run test             # Run all tests
npm run test:ci          # Run tests in CI mode

# Linting
npm run lint             # Lint all packages

# Database
npm run prisma:generate  # Generate Prisma client
npm run prisma:migrate   # Run migrations
npm run prisma:studio    # Open Prisma Studio

# Docker
npm run docker:up        # Start all Docker services
npm run docker:down      # Stop all Docker services
npm run docker:logs      # View Docker logs
npm run docker:build     # Build Docker images

# Cleanup
npm run clean            # Clean build artifacts
```

## 🐳 Docker

### Development
```bash
docker-compose up
```

### Production
```bash
docker-compose -f docker-compose.prod.yml up
```

### Individual Services
```bash
# Start only database
docker-compose up -d postgres

# Start only Redis
docker-compose up -d redis
```

## 🔄 CI/CD with GitHub Actions

### Workflows

1. **CI/CD Pipeline** (`.github/workflows/ci-cd.yml`)
   - Runs on push/PR to `main` and `develop`
   - Linting
   - Unit tests (API & Web)
   - Build packages
   - Build Docker images
   - Push to GitHub Container Registry

2. **E2E Tests** (`.github/workflows/e2e-tests.yml`)
   - Runs on push/PR and daily at 2 AM
   - Full integration tests with Playwright
   - Test artifacts and videos on failure

3. **Deploy to Production** (`.github/workflows/deploy-production.yml`)
   - Manual trigger or on release
   - Deploys to production/staging

### Required Secrets

Configure in GitHub repository settings:

```
GITHUB_TOKEN (automatically provided)
```

For deployment, add:
```
DEPLOY_HOST
DEPLOY_USER
DEPLOY_SSH_KEY
```

### Docker Images

Images are published to GitHub Container Registry:
```
ghcr.io/<username>/accounting-ai-agent/api:latest
ghcr.io/<username>/accounting-ai-agent/web:latest
```

## 📦 Packages

### API (Backend)
- Express.js server
- TypeScript
- PostgreSQL database
- JWT authentication
- OpenAI integration

### Web (Frontend)
- Next.js 15+ (App Router)
- React 19
- TypeScript
- Tailwind CSS v4
- shadcn/ui components

## 🧪 Testing

```bash
# All tests
npm run test

# API only
npm run test --filter=@accounting-ai-agent/api

# Web only
npm run test --filter=@accounting-ai-agent/web

# E2E tests
cd packages/web && npm run test:e2e
```

## 📝 Documentation

Complete technical documentation is available in the [docs](./docs) folder:

- [Getting Started](./docs/GETTING_STARTED.md) - Setup and installation guide
- [Architecture](./docs/ARCHITECTURE.md) - System design and structure
- [API Reference](./docs/API_REFERENCE.md) - REST API endpoints
- [Authentication](./docs/AUTHENTICATION.md) - JWT and OAuth authentication
- [Database](./docs/DATABASE.md) - PostgreSQL schema and Prisma ORM
- [AI Agents](./docs/AI_AGENTS.md) - LangGraph multi-agent system
- [wFirma Integration](./docs/WFIRMA_INTEGRATION.md) - Polish accounting system integration
- [Frontend](./docs/FRONTEND.md) - Next.js 15 web application
- [Deployment](./docs/DEPLOYMENT.md) - Production deployment guide

See [docs/README.md](./docs/README.md) for the full documentation index.

### 💳 Stripe Subscription System

- [**STRIPE_SETUP.md**](./STRIPE_SETUP.md) - Complete setup guide for Stripe integration
- [**STRIPE_LOCAL_DEVELOPMENT.md**](./STRIPE_LOCAL_DEVELOPMENT.md) - Step-by-step local development guide
- [**STRIPE_CHEATSHEET.md**](./STRIPE_CHEATSHEET.md) - Quick reference for daily development

**Quick start:**
```bash
# Terminal 1: Backend
npm run dev

# Terminal 2: Stripe webhooks
stripe listen --forward-to localhost:3011/api/webhooks/stripe

# Terminal 3: Frontend
npm run dev --filter=@accounting-ai-agent/web
```

## 🔧 Troubleshooting

### Port Already in Use
```bash
# Find process using port 3001 (API)
netstat -ano | findstr :3001  # Windows
lsof -i :3001                 # Linux/Mac

# Kill the process
taskkill /PID <PID> /F        # Windows
kill -9 <PID>                 # Linux/Mac
```

### Docker Issues
```bash
# Reset Docker services
docker-compose down -v
docker-compose up -d

# View logs
docker-compose logs -f
```

### Database Issues
```bash
# Reset database
docker-compose down -v postgres
docker-compose up -d postgres
npm run prisma:migrate
```

## 📄 License

MIT
