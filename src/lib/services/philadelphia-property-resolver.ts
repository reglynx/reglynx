/**
 * Philadelphia Property Resolver
 *
 * Resolves a property's stable Philadelphia identity using the City of
 * Philadelphia Address Information Service (AIS).
 *
 * AIS is the authoritative source for:
 *   - OPA account number (used by L&I, Business Licenses, Permits datasets)
 *   - Canonical street address (normalized by the city)
 *   - Geocoordinates
 *
 * AIS API: https://cityofphiladelphia.github.io/ais_docs/
 * Endpoint: https://api.phila.gov/ais/v1/search/{address}
 * Free, no API key required. Rate-limited to ~10 req/s.
 *
 * Falls back to the Census Geocoder if AIS is unavailable or returns no match.
 */

import type { RawPropertyAddress, PropertyIdentity } from './property-identity-resolver';
import { normalizeAddress, geocodeAddress } from './property-identity-resolver';

const AIS_BASE = 'https://api.phila.gov/ais/v1';

// ── AIS response types ────────────────────────────────────────────────────────

interface AisProperties {
  street_address: string;
  opa_account_num: string;
  opa_address: string;
  zip_code: string;
  electoral_ward: string;
  council_district_8: string;
  lat: number;
  lng: number;
  geocode_type: string;
}

interface AisFeature {
  type: string;
  ais_feature_type: string;
  properties: AisProperties;
}

interface AisResponse {
  features: AisFeature[];
  total_size: number;
}

// ── OPA lookup ────────────────────────────────────────────────────────────────

/**
 * Query AIS for a single address.
 * Returns the first matching feature or null.
 */
async function queryAis(singleLineAddress: string): Promise<AisProperties | null> {
  try {
    const encoded = encodeURIComponent(singleLineAddress.trim());
    const url = `${AIS_BASE}/search/${encoded}?include_units=false`;

    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8_000),
    });

    if (res.status === 404) return null;
    if (!res.ok) {
      console.warn('[philly-resolver] AIS returned', res.status);
      return null;
    }

    const data: AisResponse = await res.json();
    return data.features?.[0]?.properties ?? null;
  } catch (err) {
    console.warn('[philly-resolver] AIS fetch failed:', err);
    return null;
  }
}

// ── Main resolver ─────────────────────────────────────────────────────────────

/**
 * Resolve a Philadelphia property's identity using AIS.
 *
 * Resolution strategy:
 *   1. Build a clean single-line address (street + city + state + zip)
 *   2. Query AIS → get OPA account number + canonical address + coordinates
 *   3. If AIS returns no match, fall back to Census geocoder (no OPA number)
 *   4. Return PropertyIdentity with the best available data
 */
export async function resolvePhiladelphiaIdentity(
  addr: RawPropertyAddress,
): Promise<PropertyIdentity | null> {
  const singleLine = normalizeAddress(addr);

  // ── 1. Try AIS ──────────────────────────────────────────────────────────────
  const aisResult = await queryAis(singleLine);

  if (aisResult) {
    const opaNum = aisResult.opa_account_num?.trim() || null;
    return {
      normalizedAddress: aisResult.street_address ?? aisResult.opa_address ?? singleLine,
      latitude: aisResult.lat ?? null,
      longitude: aisResult.lng ?? null,
      jurisdictionCity: 'Philadelphia',
      jurisdictionCounty: 'Philadelphia County',
      jurisdictionState: 'PA',
      nationalPropertyId: null,
      // OPA account number is the primary Philadelphia parcel/tax identifier
      localParcelId: opaNum,
      localTaxId: opaNum,
      providerName: 'phila_ais',
      providerConfidence: opaNum ? 0.97 : 0.80,
    };
  }

  // ── 2. Fall back to Census geocoder ─────────────────────────────────────────
  const geocoded = await geocodeAddress(singleLine);

  if (geocoded) {
    return {
      normalizedAddress: geocoded.address,
      latitude: geocoded.coordinates.y,
      longitude: geocoded.coordinates.x,
      jurisdictionCity: 'Philadelphia',
      jurisdictionCounty: 'Philadelphia County',
      jurisdictionState: 'PA',
      nationalPropertyId: null,
      localParcelId: null,
      localTaxId: null,
      providerName: 'census_geocoder_philly_fallback',
      providerConfidence: 0.60,
    };
  }

  // ── 3. Both sources failed — signal caller to try something else ─────────────
  return null;
}

/**
 * Given an already-known OPA account number, return a minimal identity
 * without making additional API calls.
 * Useful when the engine already has an OPA number from a previous resolution.
 */
export function identityFromOpaNumber(
  opaAccountNumber: string,
  addr: RawPropertyAddress,
): PropertyIdentity {
  return {
    normalizedAddress: normalizeAddress(addr),
    latitude: null,
    longitude: null,
    jurisdictionCity: 'Philadelphia',
    jurisdictionCounty: 'Philadelphia County',
    jurisdictionState: 'PA',
    nationalPropertyId: null,
    localParcelId: opaAccountNumber,
    localTaxId: opaAccountNumber,
    providerName: 'phila_ais_cached',
    providerConfidence: 0.97,
  };
}
