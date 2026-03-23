import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV ?? 'development',

  // Capture 10% of transactions for performance monitoring in production.
  // Increase for debugging, decrease for high-traffic to control costs.
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Replay 1% of all sessions, 100% of sessions with errors
  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,   // Mask PII in session replays
      blockAllMedia: false,
    }),
  ],

  // Don't log Sentry errors to console in production
  debug: process.env.NODE_ENV !== 'production',

  beforeSend(event) {
    // Strip auth tokens from breadcrumbs/request data before sending
    if (event.request?.headers) {
      delete event.request.headers['authorization'];
      delete event.request.headers['cookie'];
    }
    return event;
  },
});
