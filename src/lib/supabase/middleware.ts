import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { logger } from '@/lib/debug-logger';

/**
 * Refreshes the Supabase session cookie on every request and enforces
 * route-level auth guards.
 *
 * IMPORTANT: The response object returned here must be the one used downstream.
 * Do not create a new NextResponse after this function — it would drop the
 * updated Set-Cookie headers and break session persistence.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If Supabase is not configured, allow all requests through (local dev without env)
  if (
    !supabaseUrl ||
    !supabaseAnonKey ||
    supabaseUrl === 'your_supabase_url' ||
    supabaseAnonKey === 'your_supabase_anon_key'
  ) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Step 1: write cookies onto the mutated request (for downstream Server Components)
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));

        // Step 2: create a new response that carries the same mutated request headers
        supabaseResponse = NextResponse.next({ request });

        // Step 3: write Set-Cookie onto the response so the browser stores the refreshed token
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // IMPORTANT: always call getUser() here to trigger the token refresh cycle.
  // Never use getSession() in middleware — it reads from the cookie only and
  // does not verify the JWT signature with Supabase's servers.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Paths that are always public (no auth required)
  const publicPaths = [
    '/',
    '/login',
    '/signup',
    '/auth',
    '/terms',
    '/privacy',
    '/onboarding',
    '/early-access',
  ];

  // API routes handle their own auth — middleware only needs to refresh the
  // session cookie; it does not redirect API calls.
  const isApiRoute = pathname.startsWith('/api/');

  const isPublicPath =
    isApiRoute ||
    publicPaths.some(
      (p) => pathname === p || pathname.startsWith(p + '/'),
    );

  // Redirect unauthenticated users away from protected pages
  if (!user && !isPublicPath) {
    logger.debug('auth', 'Unauthenticated access → redirect to login', { pathname });
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    const redirect = NextResponse.redirect(url);
    redirect.headers.set('Cache-Control', 'no-store');
    return redirect;
  }

  // Redirect already-authenticated users away from login / signup pages
  if (user && (pathname.startsWith('/login') || pathname.startsWith('/signup'))) {
    const rawNext = request.nextUrl.searchParams.get('next') ?? '/dashboard';
    // Guard against open-redirect: next must be a relative path that is not another auth page
    const safeNext =
      rawNext.startsWith('/') &&
      !rawNext.startsWith('//') &&
      !rawNext.startsWith('/login') &&
      !rawNext.startsWith('/signup')
        ? rawNext
        : '/dashboard';
    logger.debug('auth', 'Authenticated user on auth page → redirect', { pathname, next: safeNext });
    const url = request.nextUrl.clone();
    url.pathname = safeNext;
    url.search = '';
    return NextResponse.redirect(url);
  }

  if (user) {
    logger.debug('auth', 'Session refreshed', { pathname, userId: user.id });
  }

  // Return the supabaseResponse — it carries the refreshed Set-Cookie headers.
  // Do NOT return a different response object here or the cookie will be lost.
  return supabaseResponse;
}
