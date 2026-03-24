/**
 * Adapter Registry
 *
 * Maps jurisdictions to their available compliance data adapters.
 * The compliance engine uses this registry to discover which adapters to run
 * for a given property, without needing to hard-code city-specific logic.
 *
 * To add a new jurisdiction:
 *   1. Implement adapters in src/lib/compliance/adapters/
 *   2. Add an entry to ADAPTER_REGISTRY below
 *   3. Add the jurisdiction config to jurisdiction-config.ts
 */

import type { AdapterQueryInput, AdapterResult } from '../compliance/types';
import type { Jurisdiction } from './types';
import { getJurisdictionConfig } from './jurisdiction-config';

// ── Adapter function type ─────────────────────────────────────────────────────

/** A function that accepts query input and returns an adapter result */
export type AdapterFn = (input: AdapterQueryInput) => Promise<AdapterResult>;

export interface RegisteredAdapter {
  adapterName: string;
  /** Which compliance item type this adapter informs */
  itemType: string;
  fn: AdapterFn;
}

// ── Registry ──────────────────────────────────────────────────────────────────

interface RegistryEntry {
  jurisdiction: Jurisdiction;
  adapters: RegisteredAdapter[];
}

// Adapters are imported lazily to avoid loading all city modules on every request.
// The registry is a plain array; add entries here as new cities are onboarded.
const ADAPTER_REGISTRY: RegistryEntry[] = [
  {
    jurisdiction: { city: 'Philadelphia', state: 'PA', country: 'US' },
    adapters: [
      {
        adapterName: 'lni_violations',
        itemType: 'open_violation',
        fn: async (input) => {
          const { fetchLniViolations } = await import('../compliance/adapters/lni-violations');
          return fetchLniViolations(input);
        },
      },
      {
        adapterName: 'rental_license',
        itemType: 'rental_license',
        fn: async (input) => {
          const { fetchRentalLicenses } = await import('../compliance/adapters/rental-license');
          return fetchRentalLicenses(input);
        },
      },
      {
        adapterName: 'rental_suitability',
        itemType: 'cert_of_rental_suitability',
        fn: async (input) => {
          const { fetchRentalSuitability } = await import('../compliance/adapters/rental-suitability');
          return fetchRentalSuitability(input);
        },
      },
      {
        adapterName: 'building_permits',
        itemType: 'building_permit',
        fn: async (input) => {
          const { fetchBuildingPermits } = await import('../compliance/adapters/property-history');
          return fetchBuildingPermits(input);
        },
      },
      {
        adapterName: 'inspection_history',
        itemType: 'housing_inspection',
        fn: async (input) => {
          const { fetchInspectionHistory } = await import('../compliance/adapters/property-history');
          return fetchInspectionHistory(input);
        },
      },
    ],
  },
  // ── Future cities ────────────────────────────────────────────────────────────
  // {
  //   jurisdiction: { city: 'Baltimore', state: 'MD', country: 'US' },
  //   adapters: [
  //     { adapterName: 'balt_violations', itemType: 'open_violation', fn: ... },
  //   ],
  // },
];

// ── Lookup helpers ────────────────────────────────────────────────────────────

function normalizeCity(city: string): string {
  return city.toLowerCase().replace(/\s+/g, '');
}

/**
 * Return the registered adapters for a given city + state.
 * Returns an empty array for unsupported jurisdictions.
 */
export function getAdapters(city: string, state: string): RegisteredAdapter[] {
  const entry = ADAPTER_REGISTRY.find(
    (e) =>
      normalizeCity(e.jurisdiction.city) === normalizeCity(city) &&
      e.jurisdiction.state.toUpperCase() === state.toUpperCase(),
  );
  return entry?.adapters ?? [];
}

/**
 * Return true if any adapters are registered for this jurisdiction.
 */
export function hasAdapters(city: string, state: string): boolean {
  return getAdapters(city, state).length > 0;
}

/**
 * Return the list of supported jurisdictions with their coverage configs.
 */
export function listSupportedJurisdictions(): Array<{
  jurisdiction: Jurisdiction;
  adapterCount: number;
  coverageLevel: string;
}> {
  return ADAPTER_REGISTRY.map((entry) => {
    const config = getJurisdictionConfig(entry.jurisdiction.city, entry.jurisdiction.state);
    return {
      jurisdiction: entry.jurisdiction,
      adapterCount: entry.adapters.length,
      coverageLevel: config?.coverageLevel ?? 'unknown',
    };
  });
}
