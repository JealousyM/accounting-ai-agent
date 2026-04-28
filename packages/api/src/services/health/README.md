# Health service

`HealthService` exposes a single `getSnapshot()` method that probes the database, Redis, and two external integrations (OpenAI + wFirma). Results for integrations are cached 5 minutes (stale-while-revalidate).

`HealthMonitorService` ticks every 30s, applies a 2-failure debounce, and fires Sentry + Telegram alerts on state transitions.

## Cost-free probes

The OpenAI probe calls only `GET /v1/models`. Do **not** add probes that hit chat / messages / completion endpoints — those are billed.

The unit test suite asserts the URL ends with `/models` and the method is `GET`. Removing that assertion silently re-enables billable probes.

## Adding a new integration probe

1. Add a `checkX` method to `HealthService` that uses `probeWithTimeout` (5s default)
2. Honor the env-key gate: skip with `{ ok: true, error: 'not configured' }` if the credential env is absent
3. Add to `HealthSnapshot.integrations` and `refreshIntegrations()`
4. Add a regression test confirming the probe URL and method
5. Update `docs/MONITORING.md`
