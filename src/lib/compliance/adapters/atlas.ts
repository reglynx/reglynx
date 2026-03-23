/**
 * Atlas (City of Philadelphia) address normalization adapter.
 *
 * Uses the Address Information Service (AIS) API — free, no API key required.
 * AIS normalizes addresses and returns the official OPA account number, which
 * all other Philadelphia adapters rely on for cross-referencing.
 *
 * API docs: https://cityofphiladelphia.github.io/ais_docs/
 * Live endpoint: https://api.phila.gov/ais/v1/search/{address}
 *
 * TODO (multi-city expansion): replace this adapter with a city-agnostic
 * geocoding abstraction. Candidate: US Census Geocoder API or SmartyStreets.
 */

import type { NormalizedAddress } from '../types';

const AIS_BASE = 'https://api.phila.gov/ais/v1';

export interface AisFeature {
  type: string;
  ais_feature_type: string;
  properties: {
    street_address: string;
    address_low: number;
    street_predir: string;
    street_name: string;
    street_suffix: string;
    unit_type: string | null;
    unit_num: string | null;
    zip_code: string;
    zip_4: string;
    usps_bldgfirm: string | null;
    usps_type: string | null;
    electoral_ward: string;
    council_district_8: string;
    opa_account_num: string;
    opa_address: string;
    opa_owners: string[];
    geocode_type: string;
    lat: number;
    lng: number;
  };
}

export interface AisResponse {
  type: string;
  features: AisFeature[];
  total_size: number;
}

/**
 * Normalize a raw address string through the Philadelphia AIS.
 * Returns the OPA account number and canonical address — or null if not found.
 */
export async function normalizePhillyAddress(
  rawAddress: string,
): Promise<{ opaAccountNumber: string; canonicalAddress: string; lat?: number; lng?: number } | null> {
  try {
    const encoded = encodeURIComponent(rawAddress.trim());
    const url = `${AIS_BASE}/search/${encoded}?include_units=false`;

    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(`AIS returned ${res.status}: ${res.statusText}`);
    }

    const data: AisResponse = await res.json();
    const feature = data.features?.[0];
    if (!feature) return null;

    const { opa_account_num, street_address, lat, lng } = feature.properties;
    return {
      opaAccountNumber: opa_account_num,
      canonicalAddress: street_address,
      lat,
      lng,
    };
  } catch (error) {
    console.error('[atlas] normalizePhillyAddress error:', error);
    return null;
  }
}

/**
 * Build a NormalizedAddress from a Philadelphia AIS result.
 * Falls back to the raw address fields from the property record when AIS is unavailable.
 */
export async function buildNormalizedAddress(
  addressRaw: string,
  city: string,
  state: string,
  zip: string,
): Promise<NormalizedAddress> {
  // Attempt AIS normalization for Philadelphia addresses
  const aisResult = state === 'PA' && city.toLowerCase().includes('philadelphia')
    ? await normalizePhillyAddress(addressRaw)
    : null;

  const parts = addressRaw.trim().split(' ');
  const streetNumber = parts[0] ?? '';
  const streetName = parts.slice(1).join(' ');

  return {
    addressRaw: aisResult?.canonicalAddress ?? addressRaw,
    streetNumber,
    streetName,
    city,
    state,
    zip,
    opaAccountNumber: aisResult?.opaAccountNumber,
  };
}
