import * as Sentry from '@sentry/node';
import { logger } from '../utils/logger';

export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    logger.info('[Sentry] SENTRY_DSN not set — Sentry disabled');
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    release: process.env.APP_VERSION,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    integrations: [
      Sentry.httpIntegration(),
      Sentry.expressIntegration(),
      // Sentry.prismaIntegration() — uncomment if available in installed @sentry/node version.
      // Some v8 minor releases relocate it; if TS errors with "not exported", drop this line.
    ],
    beforeSend(event) {
      if (event.request?.headers) {
        delete (event.request.headers as Record<string, unknown>)['authorization'];
        delete (event.request.headers as Record<string, unknown>)['cookie'];
      }
      return event;
    },
  });

  logger.info(`[Sentry] Initialized for environment: ${process.env.NODE_ENV}`);
}

export { Sentry };
