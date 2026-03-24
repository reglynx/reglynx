/**
 * Next.js 16 Proxy (formerly Middleware).
 *
 * Runs on every matched request to refresh the Supabase session cookie
 * and enforce auth guards. Without this the access token expires silently
 * and users appear signed out on the next navigation.
 *
 * Pattern: https://supabase.com/docs/guides/auth/server-side/nextjs
 */

import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static  (static files)
     * - _next/image   (image optimisation service)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     *
     * The session cookie is refreshed on every navigation and API call.
     * Static asset requests are excluded to avoid unnecessary latency.
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
