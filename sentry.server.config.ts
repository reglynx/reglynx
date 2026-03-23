import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV ?? 'development',

  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  debug: process.env.NODE_ENV !== 'production',

  beforeSend(event, hint) {
    const error = hint?.originalException;

    // Categorize errors for easier triage
    if (error instanceof Error) {
      if (error.message.includes('Supabase')) {
        event.tags = { ...event.tags, service: 'supabase' };
      } else if (error.message.includes('Stripe') || error.message.includes('stripe')) {
        event.tags = { ...event.tags, service: 'stripe' };
      } else if (error.message.includes('Anthropic') || error.message.includes('anthropic')) {
        event.tags = { ...event.tags, service: 'anthropic' };
      } else if (
        error.message.includes('phila.gov') ||
        error.message.includes('data.phila.gov') ||
        error.message.includes('L&I')
      ) {
        event.tags = { ...event.tags, service: 'philly_open_data' };
      }
    }

    return event;
  },
});
