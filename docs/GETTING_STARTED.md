# Getting Started

This guide walks you through setting up the Accounting AI Agent for local development.

## Prerequisites

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **Docker** & Docker Compose
- **Git**

## Quick Start

### Option 1: Automated Setup (Recommended)

**Windows (PowerShell):**
```powershell
.\scripts\dev.ps1
```

**Linux/macOS:**
```bash
chmod +x scripts/dev.sh
./scripts/dev.sh
```

The script automatically:
- Checks Node.js version
- Creates `.env` files from examples
- Starts Docker services (PostgreSQL, Redis)
- Installs dependencies
- Runs database migrations
- Starts development servers

### Option 2: Manual Setup

#### 1. Clone the Repository

```bash
git clone https://github.com/your-org/accounting-ai-agent.git
cd accounting-ai-agent
```

#### 2. Install Dependencies

```bash
npm install
```

#### 3. Configure Environment

**Backend (packages/api/.env):**
```bash
cp packages/api/.env.example packages/api/.env
```

Required environment variables:
```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/accounting_db

# Redis
REDIS_URL=redis://localhost:6379

# JWT Authentication
JWT_SECRET=your-jwt-secret-min-32-characters
REFRESH_TOKEN_SECRET=your-refresh-secret-min-32-characters

# AI Providers (at least one required)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# wFirma Integration (optional)
WFIRMA_ACCESS_KEY=your-access-key
WFIRMA_SECRET_KEY=your-secret-key
WFIRMA_APP_KEY=your-app-key
WFIRMA_COMPANY_ID=your-company-id

# OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Telegram Notifications (optional)
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_CHAT_ID=your-chat-id
```

**Frontend (packages/web/.env):**
```bash
cp packages/web/.env.example packages/web/.env
```

Required variables:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

#### 4. Start Docker Services

```bash
docker-compose up -d postgres redis
```

#### 5. Initialize Database

```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate
```

#### 6. Start Development Servers

```bash
npm run dev
```

This starts both:
- **API Server**: http://localhost:3001
- **Web App**: http://localhost:3000

## Verify Installation

### Check Environment
```bash
node scripts/check-env.js
```

### API Health Check
```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-01-23T10:00:00.000Z"
}
```

### Open Web App
Navigate to http://localhost:3000 in your browser.

## Common Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start all services in dev mode |
| `npm run build` | Build all packages |
| `npm run test` | Run all tests |
| `npm run lint` | Lint all packages |
| `npm run prisma:studio` | Open Prisma GUI |
| `npm run docker:up` | Start Docker services |
| `npm run docker:down` | Stop Docker services |

## Single Package Commands

```bash
# Run command for specific package
npm run dev --filter=@accounting-ai-agent/api
npm run test --filter=@accounting-ai-agent/web
```

## Troubleshooting

### Port Already in Use

```bash
# Find process using port (Windows)
netstat -ano | findstr :3001

# Find process (Linux/macOS)
lsof -i :3001

# Kill process (Windows)
taskkill /PID <PID> /F

# Kill process (Linux/macOS)
kill -9 <PID>
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

### Prisma Issues

```bash
# Regenerate Prisma client
npm run prisma:generate

# Reset database and apply migrations
npm run prisma:reset
```

## Next Steps

- [Architecture Overview](./ARCHITECTURE.md) - Understand the system design
- [API Reference](./API_REFERENCE.md) - Explore API endpoints
- [Authentication](./AUTHENTICATION.md) - Learn about auth flows
- [AI Agents](./AI_AGENTS.md) - Understand the AI capabilities
