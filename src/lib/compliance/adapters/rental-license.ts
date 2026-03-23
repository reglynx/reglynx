/**
 * Philadelphia Rental License adapter.
 *
 * Uses the Philadelphia Open Data (Socrata SODA API) — free, no authentication.
 *
 * Dataset: "Business Licenses" filtered to rental license types
 * Dataset ID: jp3q-4wb6
 * API endpoint: https://data.phila.gov/resource/jp3q-4wb6.json
 * Dataset page: https://www.opendataphilly.org/datasets/business-licenses
 *
 * Rental license types in Philadelphia:
 *   - 'RENTAL'              (general rental license)
 *   - 'RENTAL MULTI-FAMILY' (multi-unit buildings)
 *   - 'RENTAL SINGLE FAMILY'(1-unit)
 *
 * Query priority:
 *   1. OPA account number  — most reliable; exact parcel match
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

const DATASET_URL = 'https://data.phila.gov/resource/jp3q-4wb6.json';
const SOURCE_PAGE = 'https://www.opendataphilly.org/datasets/business-licenses';

/** Days before expiration to flag as "expiring soon" */
export const EXPIRING_SOON_DAYS = 60;

function getAppToken(): string | undefined {
  return process.env.PHILLY_OPEN_DATA_APP_TOKEN;
}

export interface RentalLicenseRecord {
  licensenumber?: string;
  licensekey?: string;
  licensecodenumber?: string;
  licensetype?: string;
  licensestatusdate?: string;
  licensestatus?: string;
  expirationdate?: string;
  initialissuedate?: string;
  opa_account_num?: string;
  address?: string;
  business_name?: string;
}

function buildHeaders(): HeadersInit {
  const headers: HeadersInit = { Accept: 'application/json' };
  const token = getAppToken();
  if (token) headers['X-App-Token'] = token;
  return headers;
}

/**
 * Sanitize an address string for a SODA LIKE query.
 * Returns first 3 tokens (house number + first 2 street words), uppercased.
 */
function sanitizeAddressPrefix(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[.,#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .slice(0, 3)
    .join(' ');
}

/**
 * Parse an expiration date string safely. Returns null on any parse failure.
 */
function parseExpirationDate(raw: string | undefined): Date | null {
  if (!raw) return null;
  try {
    const d = new Date(raw.split('T')[0]);
    if (isNaN(d.getTime())) return null;
    return d;
  } catch {
    return null;
  }
}

/**
 * Return true if a license record has an active status.
 */
function isActiveStatus(raw: RentalLicenseRecord): boolean {
  const s = (raw.licensestatus ?? '').trim().toUpperCase();
  return s === 'ACTIVE' || s === 'PENDING';
}

const RENTAL_LICENSE_FILTER =
  `(licensetype='RENTAL' OR licensetype like 'RENTAL %')`;

/**
 * Fetch rental licenses for a Philadelphia property.
 *
 * Query priority:
 *   1. OPA account number (exact match)
 *   2. Normalized canonical address (tight prefix)
 *   3. Raw address prefix (lowest confidence)
 */
export async function fetchRentalLicenses(
  input: AdapterQueryInput,
): Promise<AdapterResult> {
  let whereClause: string;
  let matchMethod: AdapterMatchMethod;
  let queryInput: string;

  if (input.opaAccountNumber) {
    whereClause = `opa_account_num='${input.opaAccountNumber}' AND ${RENTAL_LICENSE_FILTER}`;
    matchMethod = 'opa_account';
    queryInput = input.opaAccountNumber;
  } else if (input.normalizedAddress) {
    const prefix = sanitizeAddressPrefix(input.normalizedAddress);
    whereClause = `upper(address) like '${prefix}%' AND ${RENTAL_LICENSE_FILTER}`;
    matchMethod = 'normalized_address';
    queryInput = prefix;
  } else {
    const prefix = sanitizeAddressPrefix(input.addressRaw);
    whereClause = `upper(address) like '${prefix}%' AND ${RENTAL_LICENSE_FILTER}`;
    matchMethod = 'address_fallback';
    queryInput = prefix;
  }

  const sourceEndpoint = `${DATASET_URL}?$where=${encodeURIComponent(whereClause)}&$limit=10&$order=expirationdate DESC`;

  console.log(
    `[rental-license] query method=${matchMethod} input="${queryInput}" endpoint=${DATASET_URL}`,
  );

  try {
    const res = await fetch(sourceEndpoint, {
      headers: buildHeaders(),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      console.error(`[rental-license] API error ${res.status} ${res.statusText} (method=${matchMethod})`);
      return {
        adapterName: 'rental_license',
        success: false,
        records: [],
        error: `Rental License API returned ${res.status}: ${res.statusText}`,
        matchMethod,
        matchState: 'query_failed',
        queryInput,
        sourceEndpoint,
        recordCount: 0,
      };
    }

    const records: RentalLicenseRecord[] = await res.json();
    const recordCount = records.length;

    console.log(`[rental-license] method=${matchMethod} records=${recordCount}`);

    const matchState: AdapterMatchState =
      recordCount > 0 ? 'verified_match' : 'no_match_found';

    const sourceRecords: SourceRecord[] = records.map((r) => ({
      sourceType: 'license',
      sourceName: 'philly_rental_license',
      sourceUrl: r.licensenumber
        ? `https://li.phila.gov/license-and-inspection/licensing/business-licenses/?id=${r.licensenumber}`
        : SOURCE_PAGE,
      rawData: r as unknown as Record<string, unknown>,
      effectiveDate: r.expirationdate?.split('T')[0] ?? null,
      retrievedAt: new Date().toISOString(),
    }));

    return {
      adapterName: 'rental_license',
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
    console.error(`[rental-license] fetch error (method=${matchMethod}):`, message);
    return {
      adapterName: 'rental_license',
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
 * Evaluate the compliance status of a rental license from adapter records.
 *
 * Strategy:
 *   1. Prefer records whose `licensestatus` field is 'Active' or 'Pending'.
 *   2. Among those, pick the one with the latest expiration date.
 *   3. Fall back to most-recently-expired record if no active records found.
 */
export function evaluateRentalLicenseStatus(records: SourceRecord[]): {
  status: 'active' | 'expired' | 'expiring' | 'not_found';
  expirationDate: string | null;
  licenseNumber: string | null;
  daysUntilExpiration: number | null;
} {
  if (records.length === 0) {
    return { status: 'not_found', expirationDate: null, licenseNumber: null, daysUntilExpiration: null };
  }

  const activeRecords = records.filter((r) =>
    isActiveStatus(r.rawData as unknown as RentalLicenseRecord),
  );
  const pool = activeRecords.length > 0 ? activeRecords : records;

  const sorted = [...pool].sort((a, b) => {
    const da = parseExpirationDate(a.effectiveDate ?? undefined);
    const db = parseExpirationDate(b.effectiveDate ?? undefined);
    if (!da) return 1;
    if (!db) return -1;
    return db.getTime() - da.getTime();
  });

  const best = sorted[0];
  const raw = best.rawData as unknown as RentalLicenseRecord;
  const expirationDate = best.effectiveDate ?? null;
  const licenseNumber = raw.licensenumber ?? null;

  const expiry = parseExpirationDate(expirationDate ?? undefined);
  if (!expiry) {
    return { status: 'not_found', expirationDate: null, licenseNumber, daysUntilExpiration: null };
  }

  const daysUntilExpiration = Math.ceil((expiry.getTime() - Date.now()) / 86_400_000);

  if (daysUntilExpiration < 0) {
    return { status: 'expired', expirationDate, licenseNumber, daysUntilExpiration };
  }
  if (daysUntilExpiration <= EXPIRING_SOON_DAYS) {
    return { status: 'expiring', expirationDate, licenseNumber, daysUntilExpiration };
  }
  return { status: 'active', expirationDate, licenseNumber, daysUntilExpiration };
}
