/**
 * Philadelphia L&I Violations adapter.
 *
 * Uses the Philadelphia Open Data (Socrata SODA API) — free, no authentication
 * required. Optionally accepts an app token for higher rate limits.
 *
 * Dataset: "L&I Violations" (enforced violations, not just complaints)
 * Dataset ID: 6vkh-6s3i
 * API endpoint: https://data.phila.gov/resource/6vkh-6s3i.json
 * Dataset page: https://www.opendataphilly.org/datasets/l-i-violations
 *
 * Query priority:
 *   1. OPA account number  — most reliable; exact parcel match
 *   2. Normalized address  — canonical form from geocoder; tight LIKE match
 *   3. Raw address prefix  — lowest confidence; only if no better option
 *
 * TODO (production): Request a Socrata app token from https://data.phila.gov
 *   and set PHILLY_OPEN_DATA_APP_TOKEN env var for 1000 req/hr vs 1000 req/day.
 */

import type {
  AdapterResult,
  AdapterQueryInput,
  AdapterMatchMethod,
  AdapterMatchState,
  SourceRecord,
} from '../types';

const DATASET_URL = 'https://data.phila.gov/resource/6vkh-6s3i.json';
const SOURCE_PAGE = 'https://www.opendataphilly.org/datasets/l-i-violations';

function getAppToken(): string | undefined {
  return process.env.PHILLY_OPEN_DATA_APP_TOKEN;
}

export interface LniViolationRecord {
  casenumber: string;
  casetype?: string;
  casepriority?: string;
  casestatus?: string;
  violationdate?: string;
  violationresolutiondate?: string;
  address?: string;
  opa_account_num?: string;
  lat?: string;
  lng?: string;
  violationdescription?: string;
  violationcodesection?: string;
}

function buildHeaders(): HeadersInit {
  const headers: HeadersInit = { Accept: 'application/json' };
  const token = getAppToken();
  if (token) headers['X-App-Token'] = token;
  return headers;
}

/**
 * Sanitize an address string for a SODA LIKE query.
 * Returns the first 4 tokens (house number + up to 3 street words), uppercased.
 * Example: "1234 N. Broad St, Philadelphia" → "1234 N BROAD ST"
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
 * Fetch L&I violations for a Philadelphia property.
 *
 * Query priority:
 *   1. OPA account number (exact match — most reliable)
 *   2. Normalized canonical address (tight LIKE prefix)
 *   3. Raw address fallback (lowest confidence — logged as such)
 */
export async function fetchLniViolations(
  input: AdapterQueryInput,
): Promise<AdapterResult> {
  let whereClause: string;
  let matchMethod: AdapterMatchMethod;
  let queryInput: string;

  if (input.opaAccountNumber) {
    whereClause = `opa_account_num='${input.opaAccountNumber}'`;
    matchMethod = 'opa_account';
    queryInput = input.opaAccountNumber;
  } else if (input.normalizedAddress) {
    const prefix = sanitizeAddressPrefix(input.normalizedAddress);
    whereClause = `upper(address) like '${prefix}%'`;
    matchMethod = 'normalized_address';
    queryInput = prefix;
  } else {
    const prefix = sanitizeAddressPrefix(input.addressRaw);
    whereClause = `upper(address) like '${prefix}%'`;
    matchMethod = 'address_fallback';
    queryInput = prefix;
  }

  const sourceEndpoint = `${DATASET_URL}?$where=${encodeURIComponent(whereClause)}&$limit=50&$order=violationdate DESC`;

  console.log(
    `[lni-violations] query method=${matchMethod} input="${queryInput}" endpoint=${DATASET_URL}`,
  );

  try {
    const res = await fetch(sourceEndpoint, {
      headers: buildHeaders(),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      console.error(`[lni-violations] API error ${res.status} ${res.statusText} (method=${matchMethod})`);
      return {
        adapterName: 'lni_violations',
        success: false,
        records: [],
        error: `L&I API returned ${res.status}: ${res.statusText}`,
        matchMethod,
        matchState: 'query_failed',
        queryInput,
        sourceEndpoint,
        recordCount: 0,
      };
    }

    const records: LniViolationRecord[] = await res.json();
    const recordCount = records.length;

    console.log(
      `[lni-violations] method=${matchMethod} records=${recordCount}`,
    );

    const matchState: AdapterMatchState =
      recordCount > 0 ? 'verified_match' : 'no_match_found';

    const sourceRecords: SourceRecord[] = records.map((r) => ({
      sourceType: 'violation',
      sourceName: 'philly_lni_violations',
      sourceUrl: `${SOURCE_PAGE}?casenumber=${r.casenumber}`,
      rawData: r as unknown as Record<string, unknown>,
      effectiveDate: r.violationdate?.split('T')[0] ?? null,
      retrievedAt: new Date().toISOString(),
    }));

    return {
      adapterName: 'lni_violations',
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
    console.error(`[lni-violations] fetch error (method=${matchMethod}):`, message);
    return {
      adapterName: 'lni_violations',
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

/**
 * Determine whether a violation case status indicates an active / open violation.
 *
 * Known values from the Philly dataset:
 *   'OPEN'         — explicitly open
 *   'IN VIOLATION' — synonymous with open
 *   'VIOLATION'    — shorthand; treat as open
 *   'CLOSED'       — resolved
 *
 * Anything not in the closed-terms list is treated as open to avoid false negatives.
 */
function isOpenStatus(rawStatus: string | undefined): boolean {
  const s = (rawStatus ?? '').toUpperCase().trim();
  if (!s) return false;
  const closedTerms = ['CLOSED', 'RESOLVED', 'COMPLIANT', 'CANCELLED', 'WITHDRAWN'];
  return !closedTerms.some((term) => s === term || s.startsWith(term));
}

/**
 * Classify violations as open or closed and extract the most recent open case.
 */
export function classifyViolations(records: SourceRecord[]): {
  openCount: number;
  closedCount: number;
  mostRecentOpenDate: string | null;
  mostRecentOpenDescription: string | null;
} {
  let openCount = 0;
  let closedCount = 0;
  let mostRecentOpenDate: string | null = null;
  let mostRecentOpenDescription: string | null = null;

  for (const rec of records) {
    const raw = rec.rawData as unknown as LniViolationRecord;

    if (isOpenStatus(raw.casestatus)) {
      openCount++;
      if (!mostRecentOpenDate || (rec.effectiveDate && rec.effectiveDate > mostRecentOpenDate)) {
        mostRecentOpenDate = rec.effectiveDate;
        mostRecentOpenDescription = raw.violationdescription ?? raw.violationcodesection ?? null;
      }
    } else {
      closedCount++;
    }
  }

  return { openCount, closedCount, mostRecentOpenDate, mostRecentOpenDescription };
}
