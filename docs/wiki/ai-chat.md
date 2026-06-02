# AI Chat Agent

## What this is
The core product feature: a LangGraph-based AI accounting assistant with 58 domain tools (up to 82 when HR and KSeF services are available). Users interact via the web chat UI or Telegram. The agent auto-detects language (pl/en/ru), calls wFirma APIs as needed, and streams replies back to the client.

## Entry points
- `packages/api/src/services/ai-chat/ai-chat.service.ts` — `AIChatService`; a **thin orchestrator** exposing `processMessage()`, `getConversations()`, `getMessages()`. Delegates the actual work to the three pieces below.
- `packages/api/src/services/ai-chat/langgraph-agent-runner.ts` — `LangGraphAgentRunner`; builds and runs the `StateGraph` (model selection, tool binding, agent → tools loop). This is where the LLM agent logic lives (extracted out of `AIChatService`).
- `packages/api/src/services/ai-chat/conversation-repository.ts` — `ConversationRepository`; Prisma-based conversation/message CRUD plus owner / org-shared access control.
- `packages/api/src/services/ai-chat/tts-integration.ts` — `TTSIntegration`; post-processes replies for TTS and tracks audio cost.
- `packages/api/src/services/ai-chat/tools/` — all LangChain tool definitions (one file per domain)
- `packages/api/src/services/ai-chat/formatters/` — markdown formatters that turn wFirma API responses into readable AI replies
- `packages/api/src/services/ai-chat/constants.ts` — system prompt template
- `packages/api/src/services/ai-chat/prompt-fragments.ts` — injectable prompt fragments (memory, tax calendar)
- `packages/api/src/routes/ai-chat.routes.ts` — `/api/ai-chat/*` endpoints

## Key concepts
- **LangGraph StateGraph** — conversation loop is a `StateGraph` with `MessagesAnnotation`; agent node → `ToolNode` → back to agent until no tool calls remain.
- **Tool categories** — `invoice`, `contractor`, `expense`, `payment`, `declaration`, `document`, `ledger`, `taxregister`, `term`, `vehicle`, `hr`, `ksef`, `biala-lista`, `company`, `financial`, `user`, `tax-calendar`.
- **Locale auto-detect** — `detectLocale()` inspects the last user message; formatters use `Locale` to return pl/en/ru markdown.
- **Per-user LLM** — each user may specify their own OpenAI API key and preferred model (GPT-4o, GPT-4o-mini, Gemini); falls back to platform default.
- **Title generation** — conversation title is auto-generated from the first message using a fast LLM call (`generateTitleFromMessage`).
- **LangSmith tracing** — every `processMessage` call is wrapped with `traceable()` for observability.
- **TTS integration** — `TTSIntegration` post-processes AI replies to strip markdown before TTS synthesis.
- **Memory injection** — `AIMemoryService` injects persistent facts into the system prompt before each request.

## Cross-references
- Talks to: `wfirma-integration` via `WFirmaServiceFactory` (tools call wFirma services)
- Talks to: `ai-memory` — reads memory for system prompt, triggers extraction after reply
- Talks to: `ksef` — `ksef.tools.ts` calls `KSeFService`
- Talks to: `hr` — `hr.tools.ts` calls `HRService`
- Used by: `api-backend` route `/api/ai-chat/message`
- Used by: `telegram-bot` which calls `processMessage` for each Telegram message

## Where to look first
`packages/api/src/services/ai-chat/ai-chat.service.ts` method `processMessage()` to see how the orchestrator wires `ConversationRepository` + `LangGraphAgentRunner` + `TTSIntegration`, then `packages/api/src/services/ai-chat/langgraph-agent-runner.ts` for the agent loop itself; `packages/api/src/services/ai-chat/tools/contractor.tools.ts` as the canonical tool example.
