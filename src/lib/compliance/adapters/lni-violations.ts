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
 * TODO (production): Request a Socrata app token from https://data.phila.gov
 *   and set PHILLY_OPEN_DATA_APP_TOKEN env var for 1000 req/hr vs 1000 req/day.
 *
 * TODO (multi-city expansion): Abstract as a ViolationsAdapter<City> interface
 *   so Baltimore (via Maryland Open Data), NYC (via NYC Open Data), etc. can plug in.
 */

import type { AdapterResult, SourceRecord } from '../types';

const DATASET_URL = 'https://data.phila.gov/resource/6vkh-6s3i.json';
const SOURCE_PAGE = 'https://www.opendataphilly.org/datasets/l-i-violations';

function getAppToken(): string | undefined {
  return process.env.PHILLY_OPEN_DATA_APP_TOKEN;
}

export interface LniViolationRecord {
  casenumber: string;
  casetype?: string;
  casepriority?: string;
  casestatus?: string;       // 'OPEN' | 'CLOSED' | 'IN VIOLATION' | varies
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
 * Normalise a raw address string into a form safe for SODA LIKE queries.
 * Returns the street number + up to three words of the street name.
 * Example: "1234 N. Broad St, Philadelphia, PA" → "1234 N BROAD ST"
 */
function normalizeAddressForQuery(raw: string): string {
  // Strip punctuation (commas, periods, hashes), uppercase, collapse spaces
  const cleaned = raw
    .toUpperCase()
    .replace(/[.,#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Take the first 4 tokens (number + up to 3 street words) for the LIKE match.
  // This is conservative: "1234 N BROAD" matches better than "1234 N BROAD ST PHILADELPHIA PA".
  const tokens = cleaned.split(' ').slice(0, 4);
  return tokens.join(' ');
}

/**
 * Fetch L&I violations for a Philadelphia property.
 * Queries by OPA account number when available; falls back to address substring match.
 */
export async function fetchLniViolations(
  addressRaw: string,
  opaAccountNumber?: string,
): Promise<AdapterResult> {
  try {
    let query: string;

    if (opaAccountNumber) {
      // Prefer OPA account number — most reliable match
      query = `opa_account_num='${opaAccountNumber}'`;
    } else {
      // Fall back to address prefix match (normalised to uppercase, punctuation stripped)
      const prefix = normalizeAddressForQuery(addressRaw);
      query = `upper(address) like '${prefix}%'`;
    }

    const url = `${DATASET_URL}?$where=${encodeURIComponent(query)}&$limit=50&$order=violationdate DESC`;
    const res = await fetch(url, {
      headers: buildHeaders(),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      throw new Error(`L&I API returned ${res.status}: ${res.statusText}`);
    }

    const records: LniViolationRecord[] = await res.json();

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
    };
  } catch (error) {
    console.error('[lni-violations] fetch error:', error);
    return {
      adapterName: 'lni_violations',
      success: false,
      records: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Determine whether a violation case status indicates an active / open violation.
 *
 * Known values from the Philly dataset:
 *   'OPEN'         — explicitly open
 *   'IN VIOLATION' — synonymous with open (used by some case types)
 *   'CLOSED'       — resolved
 *   'VIOLATION'    — shorthand seen in some records; treat as open
 *
 * Anything not clearly 'CLOSED' / 'RESOLVED' / 'COMPLIANT' is treated as open
 * to avoid false negatives.
 */
function isOpenStatus(rawStatus: string | undefined): boolean {
  const s = (rawStatus ?? '').toUpperCase().trim();
  if (!s) return false; // unknown — do not count as open
  const closedTerms = ['CLOSED', 'RESOLVED', 'COMPLIANT', 'CANCELLED', 'WITHDRAWN'];
  return !closedTerms.some((term) => s === term || s.startsWith(term));
}

/**
 * Classify violations as open or closed and extract the most recent open case details.
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
