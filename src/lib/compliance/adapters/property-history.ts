/**
 * Philadelphia Property History adapter — Building Permits + Inspections.
 *
 * Datasets used:
 *   - Building/Zoning Permits: https://data.phila.gov/resource/nc89-3ue8.json
 *   - L&I Inspections:         https://data.phila.gov/resource/g4i8-nerb.json
 *
 * These are informational — permits and inspections are not directly required
 * compliance items but provide context for the compliance engine.
 *
 * Query priority (same as all Philadelphia adapters):
 *   1. OPA account number  — exact parcel match
 *   2. Normalized address  — canonical form from geocoder
 *   3. Raw address prefix  — lowest confidence
 */

import type {
  AdapterResult,
  AdapterQueryInput,
  AdapterMatchMethod,
  AdapterMatchState,
  SourceRecord,
} from '../types';

const PERMITS_URL = 'https://data.phila.gov/resource/nc89-3ue8.json';
const INSPECTIONS_URL = 'https://data.phila.gov/resource/g4i8-nerb.json';

function getAppToken(): string | undefined {
  return process.env.PHILLY_OPEN_DATA_APP_TOKEN;
}

function buildHeaders(): HeadersInit {
  const headers: HeadersInit = { Accept: 'application/json' };
  const token = getAppToken();
  if (token) headers['X-App-Token'] = token;
  return headers;
}

export interface PermitRecord {
  permitnumber?: string;
  permittype?: string;
  status?: string;
  permitissuedate?: string;
  address?: string;
  opa_account_num?: string;
  typeofwork?: string;
  approvedscopeofwork?: string;
}

export interface InspectionRecord {
  casenumber?: string;
  casetype?: string;
  casestatus?: string;
  inspectiondate?: string;
  address?: string;
  opa_account_num?: string;
  investigationdescription?: string;
}

/**
 * Sanitize an address string for a SODA LIKE query.
 * Keeps first 4 tokens (house number + up to 3 street words).
 */
function sanitizeAddressPrefix(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[.,#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .slice(0, 4)
    .join(' ');
}

/**
 * Build the WHERE clause and identify the match method.
 */
function buildWhereAndMethod(
  input: AdapterQueryInput,
  opaClause: (opa: string) => string,
  addressClause: (prefix: string) => string,
): { whereClause: string; matchMethod: AdapterMatchMethod; queryInput: string } {
  if (input.opaAccountNumber) {
    return {
      whereClause: opaClause(input.opaAccountNumber),
      matchMethod: 'opa_account',
      queryInput: input.opaAccountNumber,
    };
  }
  const addr = input.normalizedAddress ?? input.addressRaw;
  const prefix = sanitizeAddressPrefix(addr);
  return {
    whereClause: addressClause(prefix),
    matchMethod: input.normalizedAddress ? 'normalized_address' : 'address_fallback',
    queryInput: prefix,
  };
}

// ── Building Permits ──────────────────────────────────────────────────────────

/**
 * Fetch recent building permits (last 2 years) for a property.
 */
export async function fetchBuildingPermits(
  input: AdapterQueryInput,
): Promise<AdapterResult> {
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  const cutoff = twoYearsAgo.toISOString().split('T')[0];

  const { whereClause, matchMethod, queryInput } = buildWhereAndMethod(
    input,
    (opa) => `opa_account_num='${opa}' AND permitissuedate > '${cutoff}'`,
    (prefix) => `upper(address) like '${prefix}%' AND permitissuedate > '${cutoff}'`,
  );

  const sourceEndpoint = `${PERMITS_URL}?$where=${encodeURIComponent(whereClause)}&$limit=25&$order=permitissuedate DESC`;

  console.log(
    `[building-permits] query method=${matchMethod} input="${queryInput}" endpoint=${PERMITS_URL}`,
  );

  try {
    const res = await fetch(sourceEndpoint, {
      headers: buildHeaders(),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      console.error(`[building-permits] API error ${res.status} (method=${matchMethod})`);
      return {
        adapterName: 'building_permits',
        success: false,
        records: [],
        error: `Permits API returned ${res.status}: ${res.statusText}`,
        matchMethod,
        matchState: 'query_failed',
        queryInput,
        sourceEndpoint,
        recordCount: 0,
      };
    }

    const records: PermitRecord[] = await res.json();
    const recordCount = records.length;

    console.log(`[building-permits] method=${matchMethod} records=${recordCount}`);

    const matchState: AdapterMatchState =
      recordCount > 0 ? 'verified_match' : 'no_match_found';

    const sourceRecords: SourceRecord[] = records.map((r) => ({
      sourceType: 'permit',
      sourceName: 'philly_building_permits',
      sourceUrl: r.permitnumber
        ? `https://li.phila.gov/license-and-inspection/permits/?id=${r.permitnumber}`
        : 'https://www.opendataphilly.org/datasets/building-permits',
      rawData: r as Record<string, unknown>,
      effectiveDate: r.permitissuedate?.split('T')[0] ?? null,
      retrievedAt: new Date().toISOString(),
    }));

    return {
      adapterName: 'building_permits',
      success: true,
      records: sourceRecords,
      matchMethod,
      matchState,
      queryInput,
      sourceEndpoint,
      recordCount,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[building-permits] fetch error (method=${matchMethod}):`, message);
    return {
      adapterName: 'building_permits',
      success: false,
      records: [],
      error: message,
      matchMethod,
      matchState: 'query_failed',
      queryInput,
      sourceEndpoint,
      recordCount: 0,
    };
  }
}

// ── Inspections ───────────────────────────────────────────────────────────────

/**
 * Fetch L&I inspection history for a property.
 */
export async function fetchInspectionHistory(
  input: AdapterQueryInput,
): Promise<AdapterResult> {
  const { whereClause, matchMethod, queryInput } = buildWhereAndMethod(
    input,
    (opa) => `opa_account_num='${opa}'`,
    (prefix) => `upper(address) like '${prefix}%'`,
  );

  const sourceEndpoint = `${INSPECTIONS_URL}?$where=${encodeURIComponent(whereClause)}&$limit=25&$order=inspectiondate DESC`;

  console.log(
    `[inspection-history] query method=${matchMethod} input="${queryInput}" endpoint=${INSPECTIONS_URL}`,
  );

  try {
    const res = await fetch(sourceEndpoint, {
      headers: buildHeaders(),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      console.error(`[inspection-history] API error ${res.status} (method=${matchMethod})`);
      return {
        adapterName: 'inspection_history',
        success: false,
        records: [],
        error: `Inspections API returned ${res.status}: ${res.statusText}`,
        matchMethod,
        matchState: 'query_failed',
        queryInput,
        sourceEndpoint,
        recordCount: 0,
      };
    }

    const records: InspectionRecord[] = await res.json();
    const recordCount = records.length;

    console.log(`[inspection-history] method=${matchMethod} records=${recordCount}`);

    const matchState: AdapterMatchState =
      recordCount > 0 ? 'verified_match' : 'no_match_found';

    const sourceRecords: SourceRecord[] = records.map((r) => ({
      sourceType: 'inspection',
      sourceName: 'philly_lni_inspections',
      sourceUrl: 'https://www.opendataphilly.org/datasets/l-i-inspections',
      rawData: r as Record<string, unknown>,
      effectiveDate: r.inspectiondate?.split('T')[0] ?? null,
      retrievedAt: new Date().toISOString(),
    }));

    return {
      adapterName: 'inspection_history',
      success: true,
      records: sourceRecords,
      matchMethod,
      matchState,
      queryInput,
      sourceEndpoint,
      recordCount,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[inspection-history] fetch error (method=${matchMethod}):`, message);
    return {
      adapterName: 'inspection_history',
      success: false,
      records: [],
      error: message,
      matchMethod,
      matchState: 'query_failed',
      queryInput,
      sourceEndpoint,
      recordCount: 0,
    };
  }
}
