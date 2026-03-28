import { NextResponse } from 'next/server';

/**
 * GET /api/health
 * Public health check endpoint for UptimeRobot / monitoring.
 * Returns 200 with basic status info. No auth required.
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.NEXT_PUBLIC_GIT_COMMIT ?? 'unknown',
  });
}
