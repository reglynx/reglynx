/**
 * Philadelphia Property History adapter.
 *
 * Fetches building permits and inspection history from Philadelphia Open Data.
 *
 * Datasets used:
 *   - Building/Zoning Permits: https://data.phila.gov/resource/nc89-3ue8.json
 *   - L&I Inspections:         https://data.phila.gov/resource/g4i8-nerb.json
 *
 * This adapter is informational — permits and inspections are not directly
 * required compliance items but provide context for the compliance engine
 * (e.g., recent renovations may indicate lead paint disturbance).
 *
 * TODO (production): Cross-reference permits with EPA RRP requirements.
 * TODO (production): Add Certificate of Rental Suitability tracking once
 *   Philadelphia publishes this dataset (currently not on OpenDataPhilly).
 * TODO (multi-city expansion): Abstract as PropertyHistoryAdapter<City>.
 */

import type { AdapterResult, SourceRecord } from '../types';

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
 * Fetch recent building permits (last 2 years) for a property.
 */
export async function fetchBuildingPermits(
  addressRaw: string,
  opaAccountNumber?: string,
): Promise<AdapterResult> {
  try {
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    const cutoff = twoYearsAgo.toISOString().split('T')[0];

    let query: string;
    if (opaAccountNumber) {
      query = `opa_account_num='${opaAccountNumber}' AND permitissuedate > '${cutoff}'`;
    } else {
      const addr = addressRaw.toUpperCase().replace(/,/g, '').trim().split(' ');
      query = `address like '${addr[0]} ${addr[1]}%' AND permitissuedate > '${cutoff}'`;
    }

    const url = `${PERMITS_URL}?$where=${encodeURIComponent(query)}&$limit=25&$order=permitissuedate DESC`;
    const res = await fetch(url, {
      headers: buildHeaders(),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) throw new Error(`Permits API returned ${res.status}`);

    const records: PermitRecord[] = await res.json();
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

    return { adapterName: 'building_permits', success: true, records: sourceRecords };
  } catch (error) {
    console.error('[property-history] permits fetch error:', error);
    return {
      adapterName: 'building_permits',
      success: false,
      records: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Fetch L&I inspection history for a property.
 */
export async function fetchInspectionHistory(
  addressRaw: string,
  opaAccountNumber?: string,
): Promise<AdapterResult> {
  try {
    let query: string;
    if (opaAccountNumber) {
      query = `opa_account_num='${opaAccountNumber}'`;
    } else {
      const addr = addressRaw.toUpperCase().replace(/,/g, '').trim().split(' ');
      query = `address like '${addr[0]} ${addr[1]}%'`;
    }

    const url = `${INSPECTIONS_URL}?$where=${encodeURIComponent(query)}&$limit=25&$order=inspectiondate DESC`;
    const res = await fetch(url, {
      headers: buildHeaders(),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) throw new Error(`Inspections API returned ${res.status}`);

    const records: InspectionRecord[] = await res.json();
    const sourceRecords: SourceRecord[] = records.map((r) => ({
      sourceType: 'inspection',
      sourceName: 'philly_lni_inspections',
      sourceUrl: 'https://www.opendataphilly.org/datasets/l-i-inspections',
      rawData: r as Record<string, unknown>,
      effectiveDate: r.inspectiondate?.split('T')[0] ?? null,
      retrievedAt: new Date().toISOString(),
    }));

    return { adapterName: 'inspection_history', success: true, records: sourceRecords };
  } catch (error) {
    console.error('[property-history] inspections fetch error:', error);
    return {
      adapterName: 'inspection_history',
      success: false,
      records: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
