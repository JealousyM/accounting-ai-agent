# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Accounting AI Agent - full-stack monorepo for AI-powered accounting automation with Polish wFirma system integration. Features AI chat (Claude/GPT-4 via LangGraph), wFirma API integration with caching, OAuth authentication.

## Commands

```bash
# Development (starts both API and Web)
npm run dev

# Build all packages
npm run build

# Test all packages
npm run test

# Lint all packages
npm run lint

# Database
npm run prisma:generate    # Generate Prisma client
npm run prisma:migrate     # Run migrations
npm run prisma:studio      # Open Prisma GUI

# Docker
npm run docker:up          # Start PostgreSQL + Redis
npm run docker:down        # Stop services

# Single package commands
npm run dev --filter=@accounting-ai-agent/api
npm run test --filter=@accounting-ai-agent/web

# E2E tests (from packages/web)
npm run test:e2e
```

## Architecture

### Monorepo Structure (Turbo)
- `packages/api` - Express.js backend (TypeScript, Prisma, Redis)
- `packages/web` - Next.js 15 frontend (React 19, Tailwind, Zustand)

### Backend Layers (packages/api/src/)
```
routes/      → controllers/      → services/      → Prisma/Redis
             HTTP handlers        Business logic   Data access
```

### Key Services
- **WFirmaIntegrationService** - wFirma API calls with retry logic
- **WFirmaCacheService** - PostgreSQL caching layer (TTL-based)
- **AIChatService** - LangChain/LangGraph AI with tool calling
- **AuthService** - JWT + OAuth (Google, GitHub)

### Frontend Structure (packages/web/src/)
- `app/` - Next.js App Router pages
- `components/` - React components (chat/, auth/, ui/)
- `hooks/` - Custom hooks (useChat, useAuth)
- `i18n/` - Translations (en, pl, ru)
- `lib/api/` - Axios API client

### Database
PostgreSQL with Prisma ORM. Key models: User, AIConversation, WFirmaCache, WFirmaInvoice, WFirmaCustomer.

## Tech Stack

**Backend:** Node.js 18+, Express, TypeScript, Prisma, Redis, LangChain/LangGraph, Zod, Winston
**Frontend:** Next.js 15, React 19, Tailwind CSS, React Query, Zustand, next-intl
**Infrastructure:** Docker Compose, Turbo, GitHub Actions

## Environment

API requires `.env` with: DATABASE_URL, REDIS_URL, JWT_SECRET, WFIRMA_* credentials
Web requires `.env.local` with: NEXT_PUBLIC_API_URL

## Key Patterns

- Singleton services via `*.instance.ts` files
- Zod validation on both frontend and backend
- wFirma responses cached in PostgreSQL with configurable TTL
- AI tools return localized markdown (auto-detect user language)
- Protected routes via AuthContext + JWT middleware

## Documentation

Detailed docs in `packages/api/docs/` (API.md, ARCHITECTURE.md, AUTH_API.md)
Service docs: `packages/api/src/services/README.wfirma.md`, `README.cache.md`
