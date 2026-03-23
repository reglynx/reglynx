import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {};

export default withSentryConfig(nextConfig, {
  // Sentry org/project come from SENTRY_ORG and SENTRY_PROJECT env vars.
  // Set SENTRY_AUTH_TOKEN in Vercel for source map uploads.
  silent: !process.env.CI,
  widenClientFileUpload: true,
  reactComponentAnnotation: { enabled: true },
  // Don't fail the build if Sentry is not configured
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
});
