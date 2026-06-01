# AI Memory

## What this is
A persistent cross-session memory system that stores facts about the user's business and injects them into the AI system prompt. Memory is extracted automatically after every AI response — zero LLM cost, pattern-based only.

## Entry points
- `packages/api/src/services/ai-memory/ai-memory.service.ts` — `AIMemoryService`: CRUD for memory entries, system-prompt injection
- `packages/api/src/services/ai-memory/memory-extraction.service.ts` — `AIMemoryExtractionService`: fire-and-forget extraction from conversation turns
- `packages/api/src/routes/ai-memory.routes.ts` — `/api/ai-memory/*` endpoints (list, create, update, delete)
- `packages/web/src/components/chat/AIMemoryPanel.tsx` — frontend panel to view and manage memories

## Key concepts
- **Memory categories** — `user_preference`, `business_fact`, `frequent_entity`, `workflow_pattern` (Prisma enum `AIMemoryCategory`).
- **Memory sources** — `explicit` (user directly asked to remember), `implicit` (extracted by pattern), `tool_usage` (inferred from tool calls).
- **Pattern-based extraction** — `AIMemoryExtractionService` uses regex/keyword matching on conversation turns; no LLM involved, so it runs cheaply after every reply.
- **Prompt injection** — `AIMemoryService.buildMemoryPrompt()` returns a formatted block inserted into the system prompt before every `processMessage` call.
- **Per-user isolation** — all `AIMemory` rows are scoped to `userId`; no cross-user leakage.

## Cross-references
- Talks to: `database` — `AIMemory` Prisma model
- Used by: `ai-chat` — `AIChatService` reads memory for prompt injection and calls extraction after replies
- Used by: `web-frontend` — `AIMemoryPanel` component calls `/api/ai-memory/*`

## Where to look first
`packages/api/src/services/ai-memory/ai-memory.service.ts` for the injection logic; `packages/api/src/services/ai-memory/memory-extraction.service.ts` for the extraction patterns.
