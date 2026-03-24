/**
 * Philadelphia Certificate of Rental Suitability adapter.
 *
 * The Certificate of Rental Suitability (CRS) is required for each new tenancy
 * in Philadelphia (Philadelphia Code § 9-3902). It must be obtained before a
 * new lease is signed and provided to the tenant.
 *
 * Current data availability:
 *   Philadelphia does NOT publish a public dataset for CRS issuance. The
 *   certificate is issued per-tenancy on demand via the L&I Self-Service portal
 *   (https://li.phila.gov) and is not tracked in any open data feed.
 *
 * This adapter always returns `derived_from_rule` provenance with an explicit
 * `no_match_found` state, which surfaces in the UI as "rule-based check —
 * verify manually." When a public dataset becomes available, replace the
 * body of fetchRentalSuitability() with a real API call.
 *
 * Related requirement:
 *   Landlords must also provide a valid rental license and lead disclosure
 *   (if applicable) at the same time as the CRS.
 */

import type { AdapterResult, AdapterQueryInput } from '../types';

/**
 * "Fetch" rental suitability certificate status.
 *
 * Since no public data source exists, this always returns a rule-derived result
 * with guidance for manual verification. It is explicitly NOT a stub — it
 * represents the true state of data availability.
 */
export async function fetchRentalSuitability(
  input: AdapterQueryInput,
): Promise<AdapterResult> {
  console.log(
    `[rental-suitability] no public dataset available for address="${input.normalizedAddress ?? input.addressRaw}"`,
  );

  return {
    adapterName: 'rental_suitability',
    success: true,             // The adapter itself succeeded — there's just no public data
    records: [],
    matchMethod: 'none',       // No query was sent — no public API exists
    matchState: 'no_match_found',
    queryInput: undefined,
    sourceEndpoint: undefined,
    recordCount: 0,
  };
}
