# Monitoring & Availability Alerts

This project ships an in-app health monitoring system with three signal channels:

1. **In-app banner** — visible to authenticated users (mounted in `<ProtectedRoute>`) when the system is `down` or `degraded`
2. **Telegram admin alerts** — fired by `HealthMonitorService` on state transitions (uses existing `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID`)
3. **Sentry** — captures unhandled exceptions and explicit health-state transitions (`@sentry/node` on api, `@sentry/nextjs` on web)

## What `/health` reports

- `db` — `prisma.$queryRaw\`SELECT 1\``
- `redis` — `redis.ping()`
- `integrations.wfirma` — list-companies probe with dedicated `WFIRMA_HEALTH_*` credentials (subscription-covered, not user-billed)
- `integrations.openai` — `GET /v1/models` (cost-free, no token charge)
- `integrations.anthropic` — `GET /v1/models` (cost-free, no token charge)

**Cost-free guarantee:** the OpenAI and Anthropic probes hit only the model-listing endpoints. They never call `/v1/chat/completions` or `/v1/messages`. Tests assert this.

## Status derivation

| Condition                                   | Status      | HTTP |
|---------------------------------------------|-------------|------|
| db or redis fails                           | `down`      | 503  |
| db + redis ok, integration fails            | `degraded`  | 200  |
| everything ok                               | `ok`        | 200  |

## Trigger thresholds

`HealthMonitorService` ticks every 30s. A state change from `ok` to `down`/`degraded` requires **2 consecutive failed ticks** (60s of confirmed badness). Recovery is single-tick (immediate).

## Required env vars

| Var                          | Where    | Required for                         |
|------------------------------|----------|--------------------------------------|
| `SENTRY_DSN`                 | api      | Sentry on backend                    |
| `APP_VERSION`                | api      | Sentry release tagging (optional)    |
| `WFIRMA_HEALTH_API_KEY`      | api      | wFirma probe — leave empty to skip   |
| `WFIRMA_HEALTH_COMPANY_ID`   | api      | wFirma probe                         |
| `TELEGRAM_BOT_TOKEN`         | api      | Telegram alerts (existing)           |
| `TELEGRAM_CHAT_ID`           | api      | Telegram alerts (existing)           |
| `OPENAI_API_KEY`             | api      | OpenAI probe — leave empty to skip   |
| `ANTHROPIC_API_KEY`          | api      | Anthropic probe                      |
| `NEXT_PUBLIC_SENTRY_DSN`     | web      | Sentry on frontend                   |
| `NEXT_PUBLIC_HEALTH_POLL_MS` | web      | Override 30s poll interval (testing) |

All are optional. Without them, the corresponding feature is a silent no-op.

## Wiring an external uptime monitor

Point UptimeRobot / BetterStack / Pingdom at:

- `GET /health/live` — process liveness only (always 200 if the process is up)
- `GET /health` — full snapshot (503 when DB/Redis down)

Both are unauthenticated.

## Common runbooks

- **Banner says AI chat unavailable** — check Sentry for the `health-monitor` tag with `state: degraded`. Look at the `extra.snapshot` payload to see whether OpenAI or Anthropic failed.
- **Telegram chat is silent during outage** — verify `TELEGRAM_CHAT_ID` (admin chat) is set; check `TelegramNotificationService` logs for delivery errors.
- **Recovery message did not arrive** — possible if the API instance restarted during the outage (state is in-memory). The next-tick `ok` is treated as the baseline, no recovery transition fires.

## Known limitations

- **wFirma probe auth scheme.** The current probe uses `Authorization: Bearer ${WFIRMA_HEALTH_API_KEY}`. The production wFirma API uses HMAC-signed headers (`appKey`/`accessKey`/`secretKey`). Until the probe is updated, leave `WFIRMA_HEALTH_API_KEY` unset to skip wFirma probing entirely (it will report `not configured` and not affect status). To enable later, either rewrite the probe to use HMAC signing or use a wFirma personal access token if your account supports Bearer auth.
