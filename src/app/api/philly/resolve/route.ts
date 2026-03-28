import { NextResponse } from 'next/server';
import { resolvePhillyIdentity } from '@/lib/data-sources/philly-identity';
import { fetchAllCityData } from '@/lib/data-sources/philadelphia-open-data';
import { checkRateLimit, getRateLimitKey } from '@/lib/rate-limit';

/**
 * GET /api/philly/resolve?address=...
 *
 * Public endpoint. Rate-limited to 20 requests/min per IP.
 * Resolves a Philadelphia address to its OPA identity
 * and returns full city data using the correct parcel-based joins.
 *
 * Optional: pass ?identity_only=true to skip downstream data queries.
 */
export async function GET(request: Request) {
  try {
    const rateLimitMsg = checkRateLimit(getRateLimitKey(request), 20, 60_000);
    if (rateLimitMsg) {
      return NextResponse.json({ error: rateLimitMsg }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address')?.trim();
    const identityOnly = searchParams.get('identity_only') === 'true';

    if (!address || address.length < 3) {
      return NextResponse.json(
        { error: 'address parameter is required (min 3 characters)' },
        { status: 400 },
      );
    }

    if (identityOnly) {
      const identity = await resolvePhillyIdentity(address);
      return NextResponse.json(identity);
    }

    const data = await fetchAllCityData(address);
    return NextResponse.json(data);
  } catch (error) {
    console.error('[/api/philly/resolve] error:', error);
    return NextResponse.json(
      { error: 'Failed to resolve address' },
      { status: 500 },
    );
  }
}
