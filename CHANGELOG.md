# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/micode-ai/accounting-ai-agent/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/micode-ai/accounting-ai-agent/releases/tag/v1.0.0
