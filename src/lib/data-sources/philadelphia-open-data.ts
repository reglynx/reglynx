/**
 * Philadelphia Open Data API client.
 * Connects to FREE Philadelphia city APIs (no key needed) via CARTO.
 */

const CARTO_ENDPOINT = 'https://phl.carto.com/api/v2/sql';

/**
 * Sanitize address input to prevent SQL injection.
 * Strips everything except alphanumeric, spaces, hyphens, periods.
 */
export function sanitizeAddress(address: string): string {
  return address.replace(/[^a-zA-Z0-9\s\-\.]/g, '').trim();
}

async function cartoQuery(sql: string): Promise<Record<string, unknown>[]> {
  const url = new URL(CARTO_ENDPOINT);
  url.searchParams.set('q', sql);

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    console.error(`[PhillyOpenData] CARTO HTTP ${res.status}`);
    return [];
  }

  const data = await res.json();
  return data?.rows ?? [];
}

// ---------------------------------------------------------------------------
// L&I Violations
// ---------------------------------------------------------------------------

export interface LIViolation {
  violationcode: string;
  violationcodetitle: string;
  violationdate: string;
  violationstatus: string;
  casenbr: string;
  mostrecentinsp: string;
  address: string;
}

export async function fetchLIViolations(address: string): Promise<LIViolation[]> {
  const safe = sanitizeAddress(address);
  if (!safe) return [];

  const sql = `SELECT * FROM li_violations WHERE address_street_name ILIKE '%${safe}%' ORDER BY violationdate DESC LIMIT 50`;
  const rows = await cartoQuery(sql);
  return rows as unknown as LIViolation[];
}

// ---------------------------------------------------------------------------
// Permits
// ---------------------------------------------------------------------------

export interface LIPermit {
  permitnumber: string;
  permitdescription: string;
  permittype: string;
  permitissuedate: string;
  status: string;
  address: string;
}

export async function fetchPermits(address: string): Promise<LIPermit[]> {
  const safe = sanitizeAddress(address);
  if (!safe) return [];

  const sql = `SELECT * FROM li_permits WHERE address ILIKE '%${safe}%' ORDER BY permitissuedate DESC LIMIT 20`;
  const rows = await cartoQuery(sql);
  return rows as unknown as LIPermit[];
}

// ---------------------------------------------------------------------------
// Rental Licenses
// ---------------------------------------------------------------------------

export interface RentalLicense {
  licensenumber: string;
  licensetype: string;
  licensestatus: string;
  initialissuedate: string;
  expirationdate: string;
  street_address: string;
  legalname: string;
}

export async function fetchRentalLicenses(address: string): Promise<RentalLicense[]> {
  const safe = sanitizeAddress(address);
  if (!safe) return [];

  const sql = `SELECT * FROM business_licenses WHERE street_address ILIKE '%${safe}%' AND licensetype='Rental' LIMIT 5`;
  const rows = await cartoQuery(sql);
  return rows as unknown as RentalLicense[];
}

// ---------------------------------------------------------------------------
// Property Assessment (OPA)
// ---------------------------------------------------------------------------

export interface PropertyAssessment {
  location: string;
  owner_1: string;
  owner_2: string;
  market_value: number;
  sale_price: number;
  sale_date: string;
  year_built: number;
  category_code_description: string;
  total_livable_area: number;
  number_of_rooms: number;
  number_of_bedrooms: number;
  number_of_bathrooms: number;
  parcel_number: string;
  zoning: string;
}

export async function fetchPropertyAssessment(address: string): Promise<PropertyAssessment | null> {
  const safe = sanitizeAddress(address);
  if (!safe) return null;

  const sql = `SELECT * FROM opa_properties_public WHERE location ILIKE '%${safe}%' LIMIT 1`;
  const rows = await cartoQuery(sql);
  return (rows[0] as unknown as PropertyAssessment) ?? null;
}

// ---------------------------------------------------------------------------
// Aggregate city data fetch
// ---------------------------------------------------------------------------

export interface PhiladelphiaCityData {
  violations: LIViolation[];
  permits: LIPermit[];
  rentalLicenses: RentalLicense[];
  assessment: PropertyAssessment | null;
  violationCount: number;
  openViolationCount: number;
  estimatedFineExposure: number;
  rentalLicenseStatus: 'active' | 'expired' | 'expiring_soon' | 'not_found';
  requiredActions: string[];
}

export async function fetchAllCityData(address: string): Promise<PhiladelphiaCityData> {
  const [violations, permits, rentalLicenses, assessment] = await Promise.all([
    fetchLIViolations(address),
    fetchPermits(address),
    fetchRentalLicenses(address),
    fetchPropertyAssessment(address),
  ]);

  const openViolations = violations.filter(
    (v) => v.violationstatus?.toLowerCase() === 'open',
  );

  // Estimate fine exposure: $300 per open violation (conservative average)
  const estimatedFineExposure = openViolations.length * 300;

  // Determine rental license status
  let rentalLicenseStatus: PhiladelphiaCityData['rentalLicenseStatus'] = 'not_found';
  if (rentalLicenses.length > 0) {
    const license = rentalLicenses[0];
    const expDate = license.expirationdate ? new Date(license.expirationdate) : null;
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 86_400_000);

    if (license.licensestatus?.toLowerCase() === 'active' && expDate && expDate > now) {
      rentalLicenseStatus = expDate <= in30Days ? 'expiring_soon' : 'active';
    } else {
      rentalLicenseStatus = 'expired';
    }
  }

  // Build required actions
  const requiredActions: string[] = [];
  if (openViolations.length > 0) {
    requiredActions.push(`Address ${openViolations.length} open L&I violation(s)`);
  }
  if (rentalLicenseStatus === 'not_found') {
    requiredActions.push('Obtain Philadelphia rental license');
  }
  if (rentalLicenseStatus === 'expired') {
    requiredActions.push('Renew expired rental license');
  }
  if (rentalLicenseStatus === 'expiring_soon') {
    requiredActions.push('Rental license expiring soon - renew now');
  }

  return {
    violations,
    permits,
    rentalLicenses,
    assessment,
    violationCount: violations.length,
    openViolationCount: openViolations.length,
    estimatedFineExposure,
    rentalLicenseStatus,
    requiredActions,
  };
}
