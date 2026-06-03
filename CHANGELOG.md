# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.0] - 2026-06-03

Second release. Adds proactive tax-deadline reminders, chat productivity
features, and per-user usage analytics on top of 1.0.0, alongside a large
internal refactor pass to break up oversized services and components.

### Added
- **Proactive tax-deadline reminders (Telegram)** — an hourly scheduler DMs linked Telegram users about upcoming Polish statutory deadlines, deduplicated once per day via Redis. (AIA-106)
- **Contextual tax-deadline nudges in chat** — the chat sidebar now surfaces upcoming deadlines from the tax calendar so they are visible without leaving the conversation. (AIA-107)
- **Clickable starter prompts** — suggestion chips on the empty-chat screen are now clickable buttons that submit the query in one tap (previously inert text); two new starters added: "List my unpaid invoices" and "Show upcoming tax deadlines". (AIA-114)
- **Saved prompt shortcuts** — users can save frequently used AI commands for one-tap reuse (20 shortcuts on the free plan, unlimited on pro). (AIA-115)
- **Personal AI usage analytics** — a per-user analytics dashboard showing activity over time, top tools used, and usage-quota consumption. (AIA-116)

### Changed
- **TelegramBotService** decomposed from a 723-line monolith into focused sub-modules (AI routing, OCR receipt flow, Redis-backed rate limiting). (AIA-108)
- **AuthController** split from a 652-line monolith into AuthCore / OAuth / Token / Profile controllers. (AIA-109)
- **i18n types** are now derived from the JSON locale data instead of ~950 lines of hand-maintained interfaces. (AIA-110)
- **KSeFDirectSendForm** refactored to separate calculation, form state, and submission concerns. (AIA-112)
- **EmailService** HTML templates extracted from inline JS template literals into standalone per-locale `.html` files under `packages/api/templates/email/`; the service shrank from 649 to 277 lines. (AIA-113)
- **HRService** god class split into per-domain HR services. (AIA-117)

### Fixed
- `checkResourceLimitFromData` now uses `const` for the non-reassigned limit value. (AIA-104 follow-up)
- Web ESLint warning count brought back under the `--max-warnings 20` CI gate that was failing the Lint job.

### Known issues
- AI tool factories still use `(tool as any)(...)` casts. The typed `DynamicStructuredTool` alternative (AIA-111) was reverted because it makes the TypeScript compiler exhaust memory during the API typecheck; the cast is intentionally retained until a non-OOM fix exists.

## [1.0.0] - 2026-06-01

First tagged release. Summary of the capabilities shipped to date.

### Added
- **AI accounting assistant** — chat agent (LangGraph) with 50+ domain tools, localized markdown responses (pl/en/ru), and persistent cross-session context memory.
- **wFirma integration** — invoices, contractors, and accounting operations via the wFirma API with retry logic and a PostgreSQL TTL cache.
- **KSeF e-invoicing** — FA(3) XML generation and submission through both the wFirma and Direct API adapters, status polling, and UPO download.
- **OCR receipts via Telegram** — photograph a receipt in the Telegram bot and book it as a wFirma expense in one tap, using the per-user OpenAI key.
- **Contractor autofill** — GUS BIR1.1 and Biała Lista (MF) lookup from a NIP, with placeholder handling when an entry is not yet registered.
- **Organizations & sharing** — company-grouped users with admin/member roles, membership approval, and shared AI conversations with real-time polling.
- **Referral program** — unique referral codes, Stripe credit for referrers, and discount coupons for referred users.
- **Tax calendar** — Polish statutory deadlines (VAT, CIT, PIT, ZUS, PCC, dividends) with weekend/holiday shifting.
- **HR / payroll** module.
- **Text-to-speech & voice input** — OpenAI TTS (higher-quality voices with a user key) and Web Speech dictation.
- **Authentication** — JWT with Google OAuth.

[Unreleased]: https://github.com/micode-ai/accounting-ai-agent/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/micode-ai/accounting-ai-agent/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/micode-ai/accounting-ai-agent/releases/tag/v1.0.0
