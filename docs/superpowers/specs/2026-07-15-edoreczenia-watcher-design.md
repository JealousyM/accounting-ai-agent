# Strażnik e-Doręczeń — design spec

- **Date:** 2026-07-15
- **Status:** Draft — awaiting user review
- **Author:** Product brainstorm (Claude Code)
- **Feature area:** New service module `packages/api/src/services/edoreczenia/` + web page + AI tools

---

## 1. Summary

**Strażnik e-Doręczeń** ("the e-Delivery Guardian") is a watcher for a user's Polish
government e-Doręczenia (electronic delivery) mailbox. It monitors the mailbox for
incoming official correspondence, uses AI to explain each letter in plain language
(what arrived, what it means, what to do, by when), tracks response deadlines, sends
escalating Telegram reminders, and surfaces everything on a web page and in the AI
chat.

**Why now:** From **1 October 2026**, existing sole traders registered in CEIDG before
1 January 2025 must have an active e-Doręczenia address. Millions of entrepreneurs will
receive a government mailbox that many will not check, while statutory response clocks
(e.g. 14-day *fikcja doręczenia*) tick. This is a dated, self-marketing hook with no
direct competitor among Polish AI accounting products.

**Positioning (decided):** A feature for **existing subscribers** — part of the current
subscription, strengthening retention. Not a standalone product and not a cold-audience
lead magnet. (Marketing on the 1.10.2026 wave still applies, but aimed at converting and
retaining existing users.)

**v1 scope (decided):** *Watcher + AI letter analysis.* Mailbox monitoring, Telegram
alerts, deadline tracking, and AI plain-language explanations of letters. **Reply
drafting is explicitly out of v1** (deferred to a later version) to avoid the highest-risk
surface — generating legally significant responses.

**Surfaces (decided):** Telegram alerts + AI chat tools + a dedicated web page ("Skrzynka").

**Integration approach (decided):** **Go straight to UA API** (variant A) — full autopilot
mailbox polling via the official User Agent API v3. A time-boxed spike on the INT
(test) environment is the mandatory first milestone and gates go/no-go; if it fails, we
fall back to the already-designed hybrid (variant C: manual upload + email-notification
watcher).

---

## 2. Background research

### 2.1 e-Doręczenia obligation timeline
- Entrepreneurs entered in CEIDG **before 1 January 2025** must have an active e-Doręczenia
  address **from 1 October 2026** (application by 30 September 2026).
- Since 1 July 2025, any CEIDG entry change also triggers the obligation to provide
  e-Doręczenia address data.
- Public bodies and newly registered businesses are already onboarded in earlier waves.

### 2.2 Official APIs (gov.pl / Poczta Polska)
- **UA API (User Agent API)** — prepare, send, receive, store and retrieve messages with
  guaranteed delivery and non-repudiation. **Current version: UA API 3** (v1/v2 deprecated;
  PROD cutoff 11.01.2026). OpenAPI spec published (`ua_api` YAML).
- **SE API (Search Engine API)** — look up a recipient's e-Doręczenia address in the
  electronic address database (by identifier such as NIP). Versions 2/3/4 concurrent.
- **Access model:** integration is for "authorized EZD systems and other domain systems."
  The integrating system generates a keypair and a **CSR (PKCS#10)**; the mailbox
  administrator uploads the CSR in the mailbox's **Moduł uprawnień** (Permissions Module)
  and receives a certificate. Auth to the API is certificate-based (mTLS).
- **Environments:** INT (test) and PROD.
- **Notifications:** the government service itself sends SMS/email notifications of new
  correspondence, plus reminders at 7 and 14 days if the recipient does not authenticate.
  (We do better: structured ingestion + AI explanation + deadline tracking, not just "you
  have mail".)

### 2.3 Open question flagged for the spike (legal)
Government-to-citizen e-Doręczenia carry **fikcja doręczenia**: a letter is deemed
delivered on mailbox entry (public senders) or after 14 days. **Risk:** our system
authenticating/receiving via the API may itself constitute legal "receipt", starting the
response clock — whereas some users deliberately let the 14 days run. This must be
verified on INT before shipping and drives the `autoReceive` design decision (§6.3).

**Sources:**
- https://www.gov.pl/web/e-doreczenia/interfejsy-api
- https://www.gov.pl/web/e-doreczenia/pytania-i-odpowiedzi
- https://www.biznes.gov.pl/pl/portal/004495
- https://edoreczenia.poczta-polska.pl/wp-content/uploads/2024/06/Projekt_Techniczny_UA_API_v5_0.pdf

---

## 3. Existing building blocks (reuse map)

This feature is largely a recomposition of patterns already in the repo:

| Need | Reuse |
|---|---|
| Mailbox polling loop | Clone `KSeFStatusPoller` (`services/ksef/status-poller.service.ts`) — `setInterval`, `start()`/`stop()` wired in `index.ts`, `dbUnavailable` guard + `SELECT 1` reconnect probe |
| Adapter/facade shape | Mirror `KSeFService` + `IKSeFAdapter` (`services/ksef/`) |
| Deadline reminders | Clone `TaxDeadlineReminderService` (`services/telegram-bot/tax-deadline-reminder.service.ts`) — hourly tick, Redis `setEx` dedupe, `telegramBotService.sendProactiveMessage()` |
| Telegram proactive DM | `telegramBotService.sendProactiveMessage(telegramUserId, text)` |
| Telegram inline-action flow | `OcrFlowHandler` pattern (download → process → cache in Redis → inline keyboard callbacks `edelivery:show:<id>` etc.) |
| Attachment download surface | `FileStorageService` (transient, owner-scoped, base64/PDF) |
| AI tools + localized output | `tools/ksef.tools.ts` + `formatters/ksef.formatter.ts`, registered in `tools/index.ts` (conditional spread), exposed via `langgraph-agent-runner.ts` |
| i18n (pl/en/ru) | `i18n/locales/{pl,en,ru}.json` — add an `edelivery` block; accessor pattern like `getKSeFTranslations` |
| Encrypted secret storage | Same approach used for LLM API keys (`credentialsService`) — for the mailbox private key + certificate |
| Email (later, digest) | `EmailService` (`sendKSeFNotification` pattern + localized templates) |
| Config/prefs on link | `TelegramLink.reminderEnabled/reminderLeadDays` pattern |

---

## 4. Architecture

New service module `packages/api/src/services/edoreczenia/`, mirroring `ksef/`:

```
edoreczenia/
├── edoreczenia.service.ts          # facade (like KSeFService)
├── ua-api-client.ts                # REST client for UA API v3, mTLS via user cert
├── se-api-client.ts                # SE API — address lookup by NIP
├── certificate.service.ts          # keypair + CSR (PKCS#10) gen, encrypted storage, renewal
├── mailbox-poller.service.ts       # setInterval poller (clone of KSeFStatusPoller)
├── letter-analysis.service.ts      # AI analysis of a letter -> structured JSON
├── deadline.service.ts             # response-deadline + fikcja-doręczenia (14d) computation
├── edoreczenia-reminder.service.ts # escalating reminders (clone of TaxDeadlineReminderService)
├── edoreczenia.instance.ts         # singleton (project convention)
└── index.ts                        # barrel
```

**Poller behaviour:** iterates all `active` configs every N minutes (env `EDORECZENIA_POLL_INTERVAL_MINUTES`, default 15 — urzędy letters do not need sub-minute latency). For each config: fetch new messages via UA API, dedupe by government message ID, persist to `EDoreczeniaLetter`, enqueue AI analysis. DB-outage resilience copied from `KSeFStatusPoller`. Attachments handled transiently via `FileStorageService`; the letter body/metadata is stored durably in Postgres (this is the user's archive).

---

## 5. Data model

Three new Prisma models (conventions per KSeF models; migration
`YYYYMMDDHHMMSS_add_edoreczenia_models`; run `prisma generate` after to avoid the
stale-client `as any` casts seen elsewhere in the repo).

### 5.1 `EDoreczeniaConfig` (per user)
- `id`, `userId @unique`, relation to `User` (onDelete: Cascade)
- `adeAddress String?` — the AE (Adres do e-Doręczeń) address
- `status` enum: `pending_csr | pending_cert | active | degraded | cert_expiring | cert_expired`
- `privateKeyEnc` / `certificateEnc` — **encrypted** (credentialsService approach); private key never leaves the server
- `certExpiresAt DateTime?`
- `autoReceive Boolean @default(...)` — default set by spike outcome (§6.3)
- `notifyEnabled Boolean @default(true)`, `notifyLeadDays Int @default(3)` (mirror `TelegramLink` prefs)
- `lastPolledAt DateTime?`, `lastPollError String?`, `consecutiveFailures Int @default(0)`
- `provider` enum: `poczta_polska` (v1 only; commercial providers → waitlist)
- timestamps

### 5.2 `EDoreczeniaLetter` (per letter)
- `id`, `userId`, relation
- `messageId String` — government message ID; **`@@unique([userId, messageId])`** for dedupe
- `senderName String?`, `senderType` enum: `us | zus | court | other | unknown`
- `subject String?`, `receivedAt DateTime`
- `bodyText String? @db.Text`, `attachmentsMeta Json?` (filenames, sizes, mime)
- `analysis Json?` — structured AI result (see §6.2)
- `status` enum: `new | needs_action | done`
- `analysisStatus` enum: `pending | done | failed | unavailable`
- timestamps

### 5.3 `EDoreczeniaDeadline` (per deadline; a letter may have several)
- `id`, `letterId` (relation, onDelete: Cascade), `userId`
- `type` enum: `response_deadline | fikcja_doreczenia | custom`
- `dueDate DateTime`
- `description String?`
- `status` enum: `active | met | missed | dismissed`
- `remindersSent Int @default(0)`, `lastRemindedAt DateTime?`
- timestamps

Rationale for separate deadline model: one letter can carry multiple dates, and the
reminder engine iterates over *deadlines*, not letters.

---

## 6. Data flow

```
Poller (every 15 min)
  → UA API: list new messages for each active config
  → dedupe by messageId → persist EDoreczeniaLetter(status=new, analysisStatus=pending)
  → enqueue AI analysis (letter-analysis.service)
       → structured output (Zod): summary, letterType, severity, requiredAction, deadlines[]
       → persist analysis + create EDoreczeniaDeadline rows
       → status → needs_action (or new if no action needed)
  → Telegram alert immediately (inline keyboard)
  → escalating reminders at 7 / 3 / 1 / 0 days before each active deadline (Redis dedupe)
  → available in AI chat (tools) and on the Skrzynka web page
```

### 6.1 Onboarding wizard (Settings → e-Doręczenia; also banner on Skrzynka page)
4 steps:
1. **ADE address** — auto-lookup via SE API by NIP (NIP known from wFirma profile); user
   confirms. If no address exists yet → "how to set up an address" screen with the
   1.10.2026 reminder (a natural nudge for users who haven't created the mailbox).
2. **CSR generation** — backend generates keypair (private key stays server-side,
   encrypted like LLM keys), builds PKCS#10 CSR; user downloads it with one click.
3. **Manual step in the government panel** — heavily illustrated, step-by-step (with
   video): log into mailbox → Moduł uprawnień → upload CSR → download issued
   certificate → upload it back into the wizard. *This is the feature's biggest friction
   point;* make the instructions exhaustive.
4. **Validation** — test UA API call, read mailbox metadata → status `active`, run first
   poll immediately, success screen "Strażnik czuwa 🛡️" + prompt to link Telegram if not
   linked.

Certificate lifecycle: track expiry, `cert_expiring` status + reminders at 30/7 days,
renewal flow = repeat steps 2–3. v1 supports only the operator wyznaczony (Poczta
Polska); commercial-provider users are captured on a waitlist.

### 6.2 AI letter analysis
Input: letter text + PDF attachments (text extraction; scanned images go through the
existing vision-OCR path in `services/ocr/`). Output — structured (Zod schema), localized
to the user's language via the formatter + i18n pattern:
- `summary` — plain-language "what arrived"
- `letterType` — `wezwanie | decyzja | zawiadomienie | postanowienie | informacja | inne`
- `severity` — `high (action required) | medium (to note) | low (informational)`
- `requiredAction` — what to do
- `deadlines[]` — `{ type, dueDate, description }`

The analysis sees company context from wFirma + AI memory, enabling replies like
"wezwanie about March VAT? Your JPK for March was filed 25.04, here's the UPO number" —
something no standalone letter-reader can do.

### 6.3 `autoReceive` and the fikcja-doręczenia decision
Setting `autoReceive` (on/off) controls whether the poller performs a *legally
receiving* action:
- **off** → alert on envelope metadata only ("a letter from US is waiting"); the user
  triggers full receipt + analysis with an explicit "Odbierz i przeanalizuj" button,
  understanding the consequence.
- **on** → full auto ingestion + analysis.

Default is decided by the INT spike outcome (§8, milestone 1) + a check of how API
authentication is treated legally. If receiving via API triggers the clock, default is
**off** (safe); if it does not, default can be **on**.

---

## 7. Surfaces

### 7.1 AI chat tools
New `tools/edoreczenia.tools.ts` + `formatters/edoreczenia.formatter.ts` (per
`ksef.tools.ts`), registered in `tools/index.ts` via conditional spread — tools appear
only for users with an active config. Tools:
- `get_official_letters` — list with filters (new / needs action / by sender)
- `explain_official_letter` — full AI analysis of a specific letter (what, risk, action, by when)
- `get_letter_deadlines` — active deadlines across all letters
- `mark_letter_done` — close a letter as handled

Enables "co mi przyszło z urzędu w tym miesiącu?" in both web chat and Telegram (via the
existing `AIChatRouter`).

### 7.2 Telegram alerts
Inline keyboards per the OCR-flow pattern: `edelivery:show:<id>` (Pokaż analizę),
`edelivery:done:<id>` (Załatwione), `edelivery:remind:<id>` (Przypomnij jutro). Escalating
reminders reuse the `TaxDeadlineReminderService` mechanics (hourly tick, Redis dedupe).

### 7.3 Web page "Skrzynka"
`packages/web/src/app/skrzynka/` — protected route:
- **List:** letter cards — sender body, subject, date, severity chip
  (🔴 wezwanie / 🟡 do wiadomości / 🟢 informacja), countdown to nearest deadline.
  Filters: all / needs action / closed.
- **Detail:** AI summary on top, original letter + attachments below (download via
  `FileStorageService`), deadlines with dates, buttons "Załatwione" and "Zapytaj AI"
  (opens chat with letter context).
- **Onboarding banner:** while config ≠ `active`, the page hosts the §6.1 wizard — single
  entry point.
- REST: `routes/edoreczenia.routes.ts` + controller per `hr.routes.ts`; React Query hooks
  per existing frontend conventions.

---

## 8. Error handling & degradation

- **UA API down / 5xx:** retry with backoff (per `WFirmaIntegrationService`); after N
  consecutive failures → config `degraded`, one Telegram alert "can't reach your mailbox"
  (Redis-deduped, no spam), auto-recover on next successful poll.
- **Certificate expired/revoked:** status `cert_expired`, poll stops, DM with link to
  renewal flow.
- **DB down during poll:** `dbUnavailable` flag + probe reconnect — exactly as
  `KSeFStatusPoller`.
- **AI analysis fails** (no key, quota): letter stays visible with "analiza niedostępna";
  alert still fires from metadata — the guardian works even without AI.
- **Alert honesty:** if polling was down > 24h, on recovery say "N letters arrived during
  the outage" rather than pretending nothing was missed.

---

## 9. Testing

- **Unit:** `deadline.service` (deadline computation, fikcja logic, date boundaries),
  `certificate.service` (CSR gen, key encryption), `letter-analysis` (structured-output
  parsing against fixtures — build a corpus of real wezwań/decyzji on the spike).
- **Integration:** poller against a mocked UA API (new letters, dedupe, degradation);
  REST routes with auth.
- **E2E (Playwright):** onboarding wizard (with mocked API) and Skrzynka page.
- **Manual on the INT government environment** — a required part of every milestone.

---

## 10. Milestones

1. **INT spike (1 week, time-boxed)** — before any product code. Verify: certificate
   issuance via Moduł uprawnień; mailbox polling; downloading a letter with attachments;
   and critically, **whether API access triggers fikcja doręczenia** (§6.3). Deliverable:
   go/no-go + `autoReceive` default. If no-go → fall back to hybrid (variant C, already
   designed) with this same spec.
2. **Core (2–3 weeks):** models, poller, UA API client, AI analysis, Telegram alerts &
   reminders.
3. **Surfaces (1–2 weeks):** onboarding wizard, Skrzynka page, AI tools, i18n.
4. **Beta on ourselves** → marketing wave toward 1.10.2026 (ties into the content engine:
   "e-Doręczenia od 1 października" articles for the blog).

---

## 11. Out of scope (v1)

- Reply drafting / generating legally significant responses (czynny żal, odpowiedź na
  wezwanie) — deferred to a later version.
- Commercial e-Doręczenia providers (non-Poczta-Polska) — waitlist only.
- Sending messages *out* via e-Doręczenia — v1 is receive/watch only.
- Weekly email digest of letters — possible fast-follow using `EmailService`.

---

## 12. Open questions

1. **fikcja doręczenia on API receipt** — the load-bearing legal question; resolved by the
   INT spike (§8.1). Drives `autoReceive` default.
2. **Certificate storage & key custody** — confirm the credentialsService encryption
   approach is acceptable for a government-mailbox private key; consider whether key
   custody needs stronger guarantees than LLM API keys.
3. **UA API rate limits / fair-use** — poll interval (default 15 min) may need tuning
   against provider limits; confirm on the spike.
4. **Multi-mailbox / accountant view** — a user managing several companies' mailboxes is a
   likely fast-follow (ties to the Organizations model); out of v1 but keep the data model
   from precluding it (`EDoreczeniaConfig` is per user, not per org — revisit).
