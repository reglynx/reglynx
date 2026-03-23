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
 *   - 'RENTAL' (general rental license)
 *   - 'RENTAL MULTI-FAMILY' (multi-unit buildings)
 *   - 'RENTAL SINGLE FAMILY' (1-unit)
 *
 * A separate "Certificate of Rental Suitability" is required per tenancy but
 * is not in this dataset — it is issued on demand and not tracked centrally.
 *
 * TODO (production): Cross-reference with L&I License data
 *   (https://data.phila.gov/resource/qgdg-qhvy.json) for more detail.
 *
 * TODO (multi-city expansion): Abstract as RentalLicenseAdapter<City>.
 */

import type { AdapterResult, SourceRecord } from '../types';

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
  licensetype?: string;          // 'RENTAL', 'RENTAL MULTI-FAMILY', etc.
  licensestatusdate?: string;
  licensestatus?: string;        // 'Active', 'Inactive', 'Expired', 'Pending'
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
 * Normalise a raw address string for a SODA LIKE query.
 * Returns "STREETNUM STREETNAME" prefix (first 3 tokens after cleaning).
 * Example: "1234 N. Broad St, Philadelphia, PA 19130" → "1234 N BROAD"
 */
function normalizeAddressForQuery(raw: string): string {
  const cleaned = raw
    .toUpperCase()
    .replace(/[.,#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  // Keep 3 tokens (number + first 2 street words) for a tighter prefix match
  return cleaned.split(' ').slice(0, 3).join(' ');
}

/**
 * Parse an expiration date string safely. Returns null on any parse failure.
 */
function parseExpirationDate(raw: string | undefined): Date | null {
  if (!raw) return null;
  try {
    // Strip time component if present (e.g. "2025-12-31T00:00:00.000")
    const dateStr = raw.split('T')[0];
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d;
  } catch {
    return null;
  }
}

/**
 * Return true if a license record has an active status per the `licensestatus` field.
 * We check the explicit status field first; expiration date is secondary.
 */
function isActiveStatus(raw: RentalLicenseRecord): boolean {
  const s = (raw.licensestatus ?? '').trim().toUpperCase();
  // Accept 'ACTIVE' and 'PENDING' as live statuses
  return s === 'ACTIVE' || s === 'PENDING';
}

/**
 * Fetch rental licenses for a Philadelphia property.
 * Returns ALL license records (active and historical).
 */
export async function fetchRentalLicenses(
  addressRaw: string,
  opaAccountNumber?: string,
): Promise<AdapterResult> {
  try {
    let query: string;

    if (opaAccountNumber) {
      query = `opa_account_num='${opaAccountNumber}' AND (licensetype='RENTAL' OR licensetype like 'RENTAL %')`;
    } else {
      const prefix = normalizeAddressForQuery(addressRaw);
      query = `upper(address) like '${prefix}%' AND (licensetype='RENTAL' OR licensetype like 'RENTAL %')`;
    }

    const url = `${DATASET_URL}?$where=${encodeURIComponent(query)}&$limit=10&$order=expirationdate DESC`;
    const res = await fetch(url, {
      headers: buildHeaders(),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      throw new Error(`Rental License API returned ${res.status}: ${res.statusText}`);
    }

    const records: RentalLicenseRecord[] = await res.json();

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
    };
  } catch (error) {
    console.error('[rental-license] fetch error:', error);
    return {
      adapterName: 'rental_license',
      success: false,
      records: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Get the current compliance status of a rental license.
 *
 * Strategy:
 *   1. Prefer records whose `licensestatus` field is 'Active' or 'Pending'.
 *   2. Among those, pick the one with the latest expiration date.
 *   3. If no active records exist, fall back to the most recently expired record
 *      so the operator sees history rather than "not_found".
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

  // Partition into active vs historical
  const activeRecords = records.filter((r) => isActiveStatus(r.rawData as unknown as RentalLicenseRecord));
  const pool = activeRecords.length > 0 ? activeRecords : records;

  // Sort pool by expiration date descending — most recent first
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
    // Expiration date is missing or unparseable — can't determine status
    return { status: 'not_found', expirationDate: null, licenseNumber, daysUntilExpiration: null };
  }

  const now = new Date();
  const daysUntilExpiration = Math.ceil((expiry.getTime() - now.getTime()) / 86_400_000);

  if (daysUntilExpiration < 0) {
    return { status: 'expired', expirationDate, licenseNumber, daysUntilExpiration };
  }

  if (daysUntilExpiration <= EXPIRING_SOON_DAYS) {
    return { status: 'expiring', expirationDate, licenseNumber, daysUntilExpiration };
  }

  return { status: 'active', expirationDate, licenseNumber, daysUntilExpiration };
}
