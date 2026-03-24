import type { JurisdictionCoverage, CoverageStatus } from '@/lib/types';
import { COVERAGE_MESSAGES } from '@/lib/constants';

// ---------------------------------------------------------------------------
// In-memory fallback registry (used when DB is not available)
// ---------------------------------------------------------------------------

const STATIC_COVERAGE: Record<string, { status: CoverageStatus; billing: boolean }> = {
  federal: { status: 'active', billing: true },
  PA: { status: 'active', billing: true },
  Philadelphia_PA: { status: 'active', billing: true },
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get coverage for a jurisdiction. Tries database first, falls back to static.
 */
export async function getCoverage(
  state: string,
  city?: string,
): Promise<{
  status: CoverageStatus;
  message: string;
  intakeEnabled: boolean;
  billingEnabled: boolean;
  waitlistEnabled: boolean;
}> {
  // Build jurisdiction key
  const jurisdictionKey = city
    ? `${city.replace(/\s+/g, '_')}_${state}`
    : state;

  // Check static registry first (fast path)
  const staticEntry = STATIC_COVERAGE[jurisdictionKey] || STATIC_COVERAGE[state];

  if (staticEntry) {
    return {
      status: staticEntry.status,
      message: COVERAGE_MESSAGES[staticEntry.status],
      intakeEnabled: true,
      billingEnabled: staticEntry.billing,
      waitlistEnabled: false,
    };
  }

  // Default for unknown jurisdictions
  return {
    status: 'pending',
    message: COVERAGE_MESSAGES.pending,
    intakeEnabled: true,
    billingEnabled: false,
    waitlistEnabled: true,
  };
}

/**
 * Get coverage from the database (Supabase).
 * Used by server components and API routes.
 */
export async function getCoverageFromDB(
  supabase: { from: (table: string) => { select: (cols: string) => { eq: (col: string, val: string) => { maybeSingle: () => Promise<{ data: JurisdictionCoverage | null }> } } } },
  jurisdictionKey: string,
): Promise<JurisdictionCoverage | null> {
  const { data } = await supabase
    .from('jurisdiction_coverage')
    .select('*')
    .eq('jurisdiction_key', jurisdictionKey)
    .maybeSingle();

  return data;
}

/**
 * Get all coverage entries from the database.
 */
export async function getAllCoverage(
  supabase: { from: (table: string) => { select: (cols: string) => { order: (col: string) => Promise<{ data: JurisdictionCoverage[] | null }> } } },
): Promise<JurisdictionCoverage[]> {
  const { data } = await supabase
    .from('jurisdiction_coverage')
    .select('*')
    .order('jurisdiction_key');

  return data || [];
}
