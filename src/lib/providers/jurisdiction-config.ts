/**
 * Jurisdiction coverage configuration.
 *
 * Defines which jurisdictions have active local compliance coverage and
 * what data sources are available for each.
 *
 * To add a new city:
 *   1. Add an entry to JURISDICTION_CONFIGS below
 *   2. Implement the required adapters in src/lib/compliance/adapters/
 *   3. Register them in adapter-registry.ts
 */

import type { Jurisdiction } from './types';

export type CoverageLevel =
  | 'full'       // All major compliance categories covered
  | 'partial'    // Some categories covered; others pending
  | 'minimal'    // Identity resolution only; no local compliance data
  | 'none';      // No coverage in this jurisdiction

export interface JurisdictionConfig {
  jurisdiction: Jurisdiction;
  coverageLevel: CoverageLevel;
  /** Human-readable summary of what is monitored */
  coverageSummary: string;
  /** ISO 8601 date when this jurisdiction went live */
  liveDate: string;
  /** Links to primary data portals */
  dataSources: Array<{
    name: string;
    url: string;
    type: 'socrata' | 'arcgis' | 'ckan' | 'custom';
  }>;
  /** True if the identity resolver is active for this jurisdiction */
  identityResolutionActive: boolean;
  /** True if local parcel/OPA IDs can be resolved */
  parcelIdResolutionActive: boolean;
  /** Compliance categories actively monitored */
  activeCategories: string[];
  /** Compliance categories pending data availability */
  pendingCategories: string[];
}

// ── Supported jurisdictions ───────────────────────────────────────────────────

export const JURISDICTION_CONFIGS: JurisdictionConfig[] = [
  {
    jurisdiction: { city: 'Philadelphia', state: 'PA', country: 'US' },
    coverageLevel: 'partial',
    coverageSummary:
      'L&I Violations, Rental Licenses, Building Permits, and Inspection History ' +
      'are monitored via Philadelphia Open Data (Socrata). Certificate of Rental ' +
      'Suitability is rule-derived (no public dataset). Lead certification is ' +
      'rule-derived for pre-1978 properties.',
    liveDate: '2025-01-01',
    dataSources: [
      {
        name: 'Philadelphia Open Data (Socrata)',
        url: 'https://www.opendataphilly.org',
        type: 'socrata',
      },
      {
        name: 'Philadelphia Address Information Service (AIS)',
        url: 'https://api.phila.gov/ais/v1',
        type: 'custom',
      },
    ],
    identityResolutionActive: true,
    parcelIdResolutionActive: true,
    activeCategories: [
      'lni_violations',
      'rental_license',
      'building_permits',
      'inspection_history',
    ],
    pendingCategories: [
      'cert_of_rental_suitability', // No public dataset
      'lead_safe_cert',             // No public dataset
    ],
  },
];

// ── Lookup helpers ─────────────────────────────────────────────────────────────

function normalizeCity(city: string): string {
  return city.toLowerCase().replace(/\s+/g, '');
}

/**
 * Find the config for a given city + state pair.
 * Returns null for unsupported jurisdictions.
 */
export function getJurisdictionConfig(
  city: string,
  state: string,
): JurisdictionConfig | null {
  return (
    JURISDICTION_CONFIGS.find(
      (c) =>
        normalizeCity(c.jurisdiction.city) === normalizeCity(city) &&
        c.jurisdiction.state.toUpperCase() === state.toUpperCase(),
    ) ?? null
  );
}

/**
 * True if local compliance coverage is active for this jurisdiction.
 */
export function isJurisdictionSupported(city: string, state: string): boolean {
  const config = getJurisdictionConfig(city, state);
  return config !== null && config.coverageLevel !== 'none';
}

/**
 * Return the UI message for unsupported jurisdictions.
 */
export const UNSUPPORTED_JURISDICTION_MESSAGE =
  'Nationwide address support active; local compliance coverage pending in this jurisdiction.';
