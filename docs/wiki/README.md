# Wiki Index

Domain wiki for the Accounting AI Agent monorepo. Each page covers one coherent subsystem.

| Page | Summary |
|------|---------|
| [api-backend](api-backend.md) | Express.js backend: routing, middleware, service singletons, and request lifecycle |
| [web-frontend](web-frontend.md) | Next.js 15 frontend: App Router pages, React contexts, API client wrappers |
| [auth](auth.md) | JWT + Google OAuth authentication, per-user API credential storage |
| [wfirma-integration](wfirma-integration.md) | wFirma Polish accounting API: retry client, per-module services, PostgreSQL cache |
| [ai-chat](ai-chat.md) | LangGraph AI agent with 50+ domain tools, locale auto-detect, LangSmith tracing |
| [ai-memory](ai-memory.md) | Persistent cross-session memory injected into AI system prompt; pattern-based extraction |
| [ksef](ksef.md) | KSeF e-invoice integration: FA(3) XML, adapter pattern (wFirma/direct), status polling |
| [organizations](organizations.md) | Multi-tenant company grouping, shared conversations, admin/member roles |
| [telegram-bot](telegram-bot.md) | Telegraf chatbot: AI chat, photo OCR, account linking via 6-digit codes |
| [ocr](ocr.md) | Receipt/invoice OCR via GPT-4o vision; structured `ParsedReceipt` output |
| [subscriptions](subscriptions.md) | Stripe billing (free/pro plans), webhooks, referral program |
| [hr](hr.md) | Employee management, Polish payroll calculations, contracts, absences |
| [database](database.md) | PostgreSQL schema (Prisma), Redis usage, key models reference |
