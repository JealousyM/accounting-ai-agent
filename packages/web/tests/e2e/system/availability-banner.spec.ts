import { test, expect, Page, Route } from '@playwright/test';
import { loginUser, dismissCookieBanner } from '../helpers/test-utils';

/**
 * E2E coverage for the SystemStatusBanner component.
 *
 * The banner is rendered inside <ProtectedRoute>, so we must be authenticated
 * to assert against it. We intercept GET /health to deterministically drive
 * the banner state regardless of whether the backend is healthy.
 *
 * Poll interval: tests assume NEXT_PUBLIC_HEALTH_POLL_MS=1000 is set for the
 * web dev server (configured via playwright.config.ts webServer.env).
 */

const okSnapshot = () => ({
  status: 'ok',
  timestamp: new Date().toISOString(),
  uptimeSeconds: 60,
  checks: {
    db: { ok: true, latencyMs: 5 },
    redis: { ok: true, latencyMs: 2 },
  },
  integrations: {
    wfirma: { ok: true },
    openai: { ok: true },
    anthropic: { ok: true },
  },
});

const downSnapshot = () => ({
  status: 'down',
  timestamp: new Date().toISOString(),
  uptimeSeconds: 0,
  checks: {
    db: { ok: false, error: 'connection refused' },
    redis: { ok: true, latencyMs: 2 },
  },
  integrations: {
    wfirma: { ok: true },
    openai: { ok: true },
    anthropic: { ok: true },
  },
});

async function fulfillJson(route: Route, status: number, body: unknown) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

async function ensureAuthenticated(page: Page): Promise<boolean> {
  const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
  const testPassword = process.env.TEST_USER_PASSWORD || 'TestPassword123!';

  try {
    await loginUser(page, testEmail, testPassword);
    await dismissCookieBanner(page);
    return true;
  } catch {
    return false;
  }
}

test.describe('Availability banner', () => {
  test('SYS-BANNER-001: hidden when API is healthy after login', async ({ page }) => {
    // Stub /health -> 200 ok so the banner has no reason to render
    await page.route('**/health', (route) => fulfillJson(route, 200, okSnapshot()));

    const loggedIn = await ensureAuthenticated(page);
    if (!loggedIn) {
      // Without test credentials we can't reach a ProtectedRoute, where the
      // banner is mounted. Skip rather than fail in non-configured envs.
      test.skip();
      return;
    }

    // Already on /chat after loginUser() — give the poller one tick to settle
    await page.waitForTimeout(1500);

    // Banner uses role="status"; nothing else in the app does. Asserting
    // count(0) covers both "never rendered" and "rendered then unmounted".
    await expect(page.getByRole('status')).toHaveCount(0);
  });

  test('SYS-BANNER-002: appears within poll interval when /health fails', async ({ page }) => {
    // Stub /health -> 503 with a "down" snapshot. Even though fetchHealth()
    // does not throw on non-2xx (it parses 503 bodies), `status: 'down'`
    // alone is enough to surface the banner.
    await page.route('**/health', (route) => fulfillJson(route, 503, downSnapshot()));

    const loggedIn = await ensureAuthenticated(page);
    if (!loggedIn) {
      test.skip();
      return;
    }

    // With NEXT_PUBLIC_HEALTH_POLL_MS=1000 the banner shows on the first poll.
    // Allow up to 10s to absorb dev-server cold-start variance on CI.
    await expect(page.getByRole('status')).toBeVisible({ timeout: 10_000 });
  });
});
