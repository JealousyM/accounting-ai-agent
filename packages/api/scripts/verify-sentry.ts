/**
 * One-off Sentry verification script. NOT committed.
 *
 * Run with:
 *   cd packages/api && npx tsx scripts/verify-sentry.ts
 *
 * Sends a captureMessage + captureException to Sentry, flushes, and exits.
 * Then check https://sentry.io for new issues in the project.
 */

import 'dotenv/config';
import { initSentry, Sentry } from '../src/lib/sentry';

async function main() {
  console.log('[verify-sentry] DSN configured:', !!process.env.SENTRY_DSN);
  console.log('[verify-sentry] Environment:', process.env.NODE_ENV ?? 'unset');

  initSentry();

  if (!process.env.SENTRY_DSN) {
    console.error('[verify-sentry] SENTRY_DSN not set. Aborting.');
    process.exit(1);
  }

  const stamp = new Date().toISOString();
  const messageId = Sentry.captureMessage(`[verify-sentry] Test message at ${stamp}`, 'info');
  const exceptionId = Sentry.captureException(
    new Error(`[verify-sentry] Test exception at ${stamp}`),
  );

  console.log('[verify-sentry] captureMessage event id:', messageId);
  console.log('[verify-sentry] captureException event id:', exceptionId);
  console.log('[verify-sentry] Flushing...');

  const flushed = await Sentry.flush(5000);
  console.log('[verify-sentry] Flush result:', flushed);

  await Sentry.close(2000);
  console.log('[verify-sentry] Done. Check https://sentry.io/ for the two events.');
}

main().catch((err) => {
  console.error('[verify-sentry] Failed:', err);
  process.exit(1);
});
