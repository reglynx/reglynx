/**
 * Philadelphia Open Data — OPA-keyed queries
 *
 * All downstream queries use opa_account_num for precise joins.
 * Correct join fields per table:
 *   - opa_properties_public → parcel_number
 *   - li_violations → opa_account_num
 *   - li_permits → opa_account_num
 *   - li_business_licenses → opaaccount  (NOT opa_account_num)
 */

import {
  resolvePhillyIdentity,
  type PhillyIdentity,
  type MatchConfidence,
} from './philly-identity';

const CARTO_ENDPOINT = 'https://phl.carto.com/api/v2/sql';

// ---------------------------------------------------------------------------
// Sanitization
// ---------------------------------------------------------------------------

export function sanitizeAddress(address: string): string {
  return address.replace(/[^a-zA-Z0-9\s\-\.]/g, '').trim();
}

function sanitizeForCarto(str: string): string {
  return str
    .replace(/'/g, "''")
    .replace(/\\/g, '')
    .replace(/;/g, '')
    .replace(/--/g, '')
    .replace(/\/\*/g, '')
    .replace(/\*\//g, '')
    .replace(/[\x00-\x1f]/g, '')
    .trim();
}

/** Result wrapper so callers can distinguish "0 results" from "query failed" */
interface CartoResult {
  rows: Record<string, unknown>[];
  error?: string;
}

async function cartoQuery(sql: string): Promise<CartoResult> {
  const url = new URL(CARTO_ENDPOINT);
  url.searchParams.set('q', sql);

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[CARTO] fetch error: ${msg}`);
    return { rows: [], error: `Carto fetch failed: ${msg}` };
  }

  if (!res.ok) {
    let body = '';
    try { body = await res.text(); } catch { /* ignore */ }
    const msg = `Carto HTTP ${res.status}: ${body.slice(0, 200)}`;
    console.error(`[CARTO] ${msg}`);
    return { rows: [], error: msg };
  }

  const data = await res.json();
  return { rows: data?.rows ?? [] };
}

/** Convenience: run cartoQuery and return just the rows (legacy compat) */
async function cartoRows(sql: string): Promise<Record<string, unknown>[]> {
  const { rows } = await cartoQuery(sql);
  return rows;
}

// ---------------------------------------------------------------------------
// Source status tracking
// ---------------------------------------------------------------------------

export type SourceStatus = 'active' | 'degraded' | 'unavailable';

export interface SourceMeta {
  status: SourceStatus;
  lastChecked: string;
  recordCount: number;
  error?: string;
}

function sourceOk(rows: unknown[], err?: string | unknown): SourceMeta {
  const now = new Date().toISOString();
  if (err) {
    return { status: 'unavailable', lastChecked: now, recordCount: 0, error: String(err) };
  }
  return { status: 'active', lastChecked: now, recordCount: rows.length };
}

function cartoSourceMeta(result: { rows: unknown[]; error?: string }): SourceMeta {
  const now = new Date().toISOString();
  if (result.error) {
    return { status: 'degraded', lastChecked: now, recordCount: 0, error: result.error };
  }
  return { status: 'active', lastChecked: now, recordCount: result.rows.length };
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LIViolation {
  casenumber: string;
  violationdate: string;
  violationtype: string;
  violationdescription: string;
  status: string;
  casestatus: string;
  caseresolutioncode: string;
  caseresolutiondate: string;
  aptype: string;
  casepriority: string;
  prioritydesc: string;
  opa_account_num: string;
}

export interface LIPermit {
  permitnumber: string;
  permittype: string;
  permit_type_name: string;
  typeofwork: string;
  descriptionofwork: string;
  permitissuedate: string;
  status: string;
  mostrecentinsp: string;
  opa_account_num: string;
}

export interface PropertyAssessment {
  parcel_number: string;
  owner_1: string;
  category_code_description: string;
  building_code_description: string;
  year_built: number;
  market_value: number;
  zoning: string;
  number_stories: number;
  location: string;
}

export interface RentalLicense {
  licensenum: string;
  licensetype: string;
  initialissuedate: string;
  mostrecentissuedate: string;
  inactivedate: string;
  licensestatus: string;
  legalname: string;
  business_name: string;
  opaaccount: string;
  numberofunits: string;
}

// ---------------------------------------------------------------------------
// OPA-keyed queries (correct join fields)
// ---------------------------------------------------------------------------

async function fetchAssessmentByOPA(opaNum: string): Promise<CartoResult> {
  const safe = sanitizeForCarto(opaNum);
  const sql = `SELECT parcel_number, owner_1, category_code_description, building_code_description, year_built, market_value, zoning, number_stories, location FROM opa_properties_public WHERE parcel_number = '${safe}' LIMIT 1`;
  return cartoQuery(sql);
}

async function fetchViolationsByOPA(opaNum: string): Promise<CartoResult> {
  const safe = sanitizeForCarto(opaNum);
  const sql = `SELECT casenumber, violationdate, violationtype, violationdescription, status, casestatus, caseresolutioncode, caseresolutiondate, aptype, casepriority, prioritydesc, opa_account_num FROM li_violations WHERE opa_account_num = '${safe}' ORDER BY violationdate DESC LIMIT 50`;
  return cartoQuery(sql);
}

async function fetchPermitsByOPA(opaNum: string): Promise<CartoResult> {
  const safe = sanitizeForCarto(opaNum);
  const sql = `SELECT permitnumber, permittype, permit_type_name, typeofwork, descriptionofwork, permitissuedate, status, mostrecentinsp, opa_account_num FROM li_permits WHERE opa_account_num = '${safe}' ORDER BY permitissuedate DESC LIMIT 20`;
  return cartoQuery(sql);
}

// NOTE: li_business_licenses uses `opaaccount`, NOT `opa_account_num`
async function fetchLicensesByOPA(opaNum: string): Promise<CartoResult> {
  const safe = sanitizeForCarto(opaNum);
  const sql = `SELECT licensenum, licensetype, initialissuedate, mostrecentissuedate, inactivedate, licensestatus, legalname, business_name, opaaccount, numberofunits FROM li_business_licenses WHERE opaaccount = '${safe}' AND licensetype = 'Rental' LIMIT 5`;
  return cartoQuery(sql);
}

// ---------------------------------------------------------------------------
// Legacy address-based queries (for public search without identity resolution)
// ---------------------------------------------------------------------------

export async function fetchLIViolations(address: string): Promise<LIViolation[]> {
  const safe = sanitizeForCarto(address.toUpperCase());
  if (!safe) return [];
  const sql = `SELECT casenumber, violationdate, violationtype, violationdescription, status, casestatus, caseresolutioncode, caseresolutiondate, aptype, casepriority, prioritydesc, opa_account_num FROM li_violations WHERE address ILIKE '%${safe}%' ORDER BY violationdate DESC LIMIT 50`;
  return (await cartoRows(sql)) as unknown as LIViolation[];
}

export async function fetchRentalLicenses(address: string): Promise<RentalLicense[]> {
  const safe = sanitizeForCarto(address.toUpperCase());
  if (!safe) return [];
  const sql = `SELECT licensenum, licensetype, initialissuedate, mostrecentissuedate, inactivedate, licensestatus, legalname, business_name, opaaccount, numberofunits FROM li_business_licenses WHERE address ILIKE '%${safe}%' AND licensetype = 'Rental' LIMIT 5`;
  return (await cartoRows(sql)) as unknown as RentalLicense[];
}

// ---------------------------------------------------------------------------
// Full OPA-keyed pipeline
// ---------------------------------------------------------------------------

export interface PhiladelphiaCityData {
  identity: PhillyIdentity;
  assessment: PropertyAssessment | null;
  violations: LIViolation[];
  permits: LIPermit[];
  rentalLicenses: RentalLicense[];
  violationCount: number;
  openViolationCount: number;
  estimatedFineExposure: number;
  rentalLicenseStatus: 'active' | 'expired' | 'expiring_soon' | 'not_found';
  requiredActions: string[];
  sources: {
    assessment: SourceMeta;
    violations: SourceMeta;
    permits: SourceMeta;
    licenses: SourceMeta;
  };
  evidence: {
    atlas_link: string | null;
    li_property_history: string | null;
  };
}

export async function fetchAllCityData(address: string): Promise<PhiladelphiaCityData> {
  // Step 1: Resolve identity
  const identity = await resolvePhillyIdentity(address);

  const emptyResult: PhiladelphiaCityData = {
    identity,
    assessment: null,
    violations: [],
    permits: [],
    rentalLicenses: [],
    violationCount: 0,
    openViolationCount: 0,
    estimatedFineExposure: 0,
    rentalLicenseStatus: 'not_found',
    requiredActions: [],
    sources: {
      assessment: { status: 'unavailable', lastChecked: new Date().toISOString(), recordCount: 0, error: 'Identity unresolved' },
      violations: { status: 'unavailable', lastChecked: new Date().toISOString(), recordCount: 0, error: 'Identity unresolved' },
      permits: { status: 'unavailable', lastChecked: new Date().toISOString(), recordCount: 0, error: 'Identity unresolved' },
      licenses: { status: 'unavailable', lastChecked: new Date().toISOString(), recordCount: 0, error: 'Identity unresolved' },
    },
    evidence: {
      atlas_link: identity.atlas_link,
      li_property_history: null,
    },
  };

  // If identity is unresolved, block downstream — do NOT fabricate results
  if (!identity.resolved || !identity.opa_account_num) {
    emptyResult.requiredActions = ['Property identity could not be resolved — verify address'];
    return emptyResult;
  }

  const opa = identity.opa_account_num;

  // Step 2: Query all sources in parallel using OPA key
  const [assessmentRes, violationsRes, permitsRes, licensesRes] = await Promise.all([
    fetchAssessmentByOPA(opa),
    fetchViolationsByOPA(opa),
    fetchPermitsByOPA(opa),
    fetchLicensesByOPA(opa),
  ]);

  const assessment = (assessmentRes.rows[0] as unknown as PropertyAssessment) ?? null;
  const violations: LIViolation[] = violationsRes.error ? [] : violationsRes.rows as unknown as LIViolation[];
  const permits: LIPermit[] = permitsRes.error ? [] : permitsRes.rows as unknown as LIPermit[];
  const rentalLicenses: RentalLicense[] = licensesRes.error ? [] : licensesRes.rows as unknown as RentalLicense[];

  // Open violations — use `status` field (confirmed correct Carto column)
  const openViolations = violations.filter(
    (v) => {
      const s = (v.status ?? v.casestatus ?? '').toLowerCase();
      return s === 'open' || s === 'active' || s === 'in violation';
    },
  );

  const estimatedFineExposure = openViolations.length * 300;

  // Rental license status
  let rentalLicenseStatus: PhiladelphiaCityData['rentalLicenseStatus'] = 'not_found';
  if (rentalLicenses.length > 0) {
    const license = rentalLicenses[0];
    const status = (license.licensestatus ?? '').toLowerCase();
    if (status === 'active' || status === 'issued') {
      const inactive = license.inactivedate ? new Date(license.inactivedate) : null;
      const now = new Date();
      const in30Days = new Date(now.getTime() + 30 * 86_400_000);
      if (inactive && inactive <= now) {
        rentalLicenseStatus = 'expired';
      } else if (inactive && inactive <= in30Days) {
        rentalLicenseStatus = 'expiring_soon';
      } else {
        rentalLicenseStatus = 'active';
      }
    } else {
      rentalLicenseStatus = 'expired';
    }
  }

  // Required actions
  const requiredActions: string[] = [];
  if (openViolations.length > 0) {
    requiredActions.push(`Address ${openViolations.length} open L&I violation(s)`);
  }
  if (rentalLicenseStatus === 'not_found') {
    requiredActions.push('Obtain Philadelphia rental license');
  } else if (rentalLicenseStatus === 'expired') {
    requiredActions.push('Renew expired rental license');
  } else if (rentalLicenseStatus === 'expiring_soon') {
    requiredActions.push('Rental license expiring soon — renew now');
  }

  // Evidence links
  const liLink = identity.standardized_address
    ? `https://li.phila.gov/property-history/search?address=${encodeURIComponent(identity.standardized_address)}`
    : null;

  return {
    identity,
    assessment,
    violations,
    permits,
    rentalLicenses,
    violationCount: violations.length,
    openViolationCount: openViolations.length,
    estimatedFineExposure,
    rentalLicenseStatus,
    requiredActions,
    sources: {
      assessment: cartoSourceMeta(assessmentRes),
      violations: cartoSourceMeta(violationsRes),
      permits: cartoSourceMeta(permitsRes),
      licenses: cartoSourceMeta(licensesRes),
    },
    evidence: {
      atlas_link: identity.atlas_link,
      li_property_history: liLink,
    },
  };
}
