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
  licensestatus?: string;        // 'Active', 'Inactive', 'Expired'
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
      const addr = addressRaw.toUpperCase().replace(/,/g, '').trim();
      const parts = addr.split(' ');
      // Match street number + first word of street name
      query = `address like '${parts[0]} ${parts[1]}%' AND (licensetype='RENTAL' OR licensetype like 'RENTAL %')`;
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
      rawData: r as Record<string, unknown>,
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
 * Returns the most recent active (or most recently expired) license status.
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

  // Sort by expiration date descending — most recent first
  const sorted = [...records].sort((a, b) => {
    if (!a.effectiveDate) return 1;
    if (!b.effectiveDate) return -1;
    return b.effectiveDate.localeCompare(a.effectiveDate);
  });

  const latest = sorted[0];
  const raw = latest.rawData as RentalLicenseRecord;
  const expirationDate = latest.effectiveDate;
  const licenseNumber = raw.licensenumber ?? null;

  if (!expirationDate) {
    return { status: 'not_found', expirationDate: null, licenseNumber, daysUntilExpiration: null };
  }

  const now = new Date();
  const expiry = new Date(expirationDate);
  const daysUntilExpiration = Math.ceil((expiry.getTime() - now.getTime()) / 86_400_000);

  if (daysUntilExpiration < 0) {
    return { status: 'expired', expirationDate, licenseNumber, daysUntilExpiration };
  }

  if (daysUntilExpiration <= EXPIRING_SOON_DAYS) {
    return { status: 'expiring', expirationDate, licenseNumber, daysUntilExpiration };
  }

  return { status: 'active', expirationDate, licenseNumber, daysUntilExpiration };
}
