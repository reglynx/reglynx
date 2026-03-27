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

async function cartoQuery(sql: string): Promise<Record<string, unknown>[]> {
  const url = new URL(CARTO_ENDPOINT);
  url.searchParams.set('q', sql);

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    console.error(`[CARTO] HTTP ${res.status}`);
    return [];
  }

  const data = await res.json();
  return data?.rows ?? [];
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

function sourceOk(rows: unknown[], err?: unknown): SourceMeta {
  const now = new Date().toISOString();
  if (err) {
    return { status: 'unavailable', lastChecked: now, recordCount: 0, error: String(err) };
  }
  return { status: 'active', lastChecked: now, recordCount: rows.length };
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

async function fetchAssessmentByOPA(opaNum: string): Promise<{ rows: PropertyAssessment[]; error?: unknown }> {
  const safe = sanitizeForCarto(opaNum);
  try {
    const sql = `SELECT parcel_number, owner_1, category_code_description, building_code_description, year_built, market_value, zoning, number_stories, location FROM opa_properties_public WHERE parcel_number = '${safe}' LIMIT 1`;
    const rows = await cartoQuery(sql);
    return { rows: rows as unknown as PropertyAssessment[] };
  } catch (e) {
    return { rows: [], error: e };
  }
}

async function fetchViolationsByOPA(opaNum: string): Promise<{ rows: LIViolation[]; error?: unknown }> {
  const safe = sanitizeForCarto(opaNum);
  try {
    const sql = `SELECT casenumber, violationdate, violationtype, violationdescription, status, casestatus, caseresolutioncode, caseresolutiondate, aptype, casepriority, prioritydesc, opa_account_num FROM li_violations WHERE opa_account_num = '${safe}' ORDER BY violationdate DESC LIMIT 50`;
    const rows = await cartoQuery(sql);
    return { rows: rows as unknown as LIViolation[] };
  } catch (e) {
    return { rows: [], error: e };
  }
}

async function fetchPermitsByOPA(opaNum: string): Promise<{ rows: LIPermit[]; error?: unknown }> {
  const safe = sanitizeForCarto(opaNum);
  try {
    const sql = `SELECT permitnumber, permittype, permit_type_name, typeofwork, descriptionofwork, permitissuedate, status, mostrecentinsp, opa_account_num FROM li_permits WHERE opa_account_num = '${safe}' ORDER BY permitissuedate DESC LIMIT 20`;
    const rows = await cartoQuery(sql);
    return { rows: rows as unknown as LIPermit[] };
  } catch (e) {
    return { rows: [], error: e };
  }
}

// NOTE: li_business_licenses uses `opaaccount`, NOT `opa_account_num`
async function fetchLicensesByOPA(opaNum: string): Promise<{ rows: RentalLicense[]; error?: unknown }> {
  const safe = sanitizeForCarto(opaNum);
  try {
    const sql = `SELECT licensenum, licensetype, initialissuedate, mostrecentissuedate, inactivedate, licensestatus, legalname, business_name, opaaccount, numberofunits FROM li_business_licenses WHERE opaaccount = '${safe}' AND licensetype = 'Rental' LIMIT 5`;
    const rows = await cartoQuery(sql);
    return { rows: rows as unknown as RentalLicense[] };
  } catch (e) {
    return { rows: [], error: e };
  }
}

// ---------------------------------------------------------------------------
// Legacy address-based queries (for public search without identity resolution)
// ---------------------------------------------------------------------------

export async function fetchLIViolations(address: string): Promise<LIViolation[]> {
  const safe = sanitizeForCarto(address.toUpperCase());
  if (!safe) return [];
  const sql = `SELECT casenumber, violationdate, violationtype, violationdescription, status, casestatus, caseresolutioncode, caseresolutiondate, aptype, casepriority, prioritydesc, opa_account_num FROM li_violations WHERE address ILIKE '%${safe}%' ORDER BY violationdate DESC LIMIT 50`;
  const rows = await cartoQuery(sql);
  return rows as unknown as LIViolation[];
}

export async function fetchRentalLicenses(address: string): Promise<RentalLicense[]> {
  const safe = sanitizeForCarto(address.toUpperCase());
  if (!safe) return [];
  const sql = `SELECT licensenum, licensetype, initialissuedate, mostrecentissuedate, inactivedate, licensestatus, legalname, business_name, opaaccount, numberofunits FROM li_business_licenses WHERE street_address ILIKE '%${safe}%' AND licensetype = 'Rental' LIMIT 5`;
  const rows = await cartoQuery(sql);
  return rows as unknown as RentalLicense[];
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

  const assessment = assessmentRes.rows[0] ?? null;
  const violations = violationsRes.rows;
  const permits = permitsRes.rows;
  const rentalLicenses = licensesRes.rows;

  // Open violations
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
      assessment: sourceOk(assessmentRes.rows, assessmentRes.error),
      violations: sourceOk(violationsRes.rows, violationsRes.error),
      permits: sourceOk(permitsRes.rows, permitsRes.error),
      licenses: sourceOk(licensesRes.rows, licensesRes.error),
    },
    evidence: {
      atlas_link: identity.atlas_link,
      li_property_history: liLink,
    },
  };
}
