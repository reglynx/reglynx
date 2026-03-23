/**
 * Property Identity Resolver
 *
 * Orchestrates address normalization, geocoding, and external ID resolution
 * for any jurisdiction. Philadelphia-specific resolution is delegated to
 * PhiladelphiaPropertyResolver.
 *
 * Resolution order:
 *   1. Normalize the raw address (uppercase, strip punctuation, canonical form)
 *   2. Geocode via US Census Geocoder (free, no API key)
 *   3. Run jurisdiction-specific resolver if available (e.g., Philly OPA lookup)
 *   4. Persist resolved identity fields back to the properties table
 *
 * Census Geocoder API:
 *   https://geocoding.geo.census.gov/geocoder/
 *   Endpoint: /locations/onelineaddress?address=<addr>&benchmark=Public_AR_Current&format=json
 *   Free, no auth, ~1–3 s response time.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { resolvePhiladelphiaIdentity } from './philadelphia-property-resolver';
import { logger } from '@/lib/debug-logger';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface RawPropertyAddress {
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  zip: string;
}

export interface PropertyIdentity {
  /** Canonical single-line address returned by the geocoder / authoritative source */
  normalizedAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  /** Jurisdiction as resolved by the geocoder (may differ from user-entered city) */
  jurisdictionCity: string | null;
  jurisdictionCounty: string | null;
  jurisdictionState: string | null;
  /** National identifier — not yet populated (future: ATTOM / CoreLogic) */
  nationalPropertyId: string | null;
  /** OPA account number (Philadelphia) or equivalent local parcel ID */
  localParcelId: string | null;
  /** Local tax / APN ID — same as parcel for many municipalities */
  localTaxId: string | null;
  /** Which service resolved this identity */
  providerName: string;
  /** 0–1 confidence from the geocoder / resolver */
  providerConfidence: number;
}

interface CensusGeocodeResult {
  address: string;
  coordinates: { x: number; y: number };
  tigerLine?: { tigerLineId: string; side: string };
  addressComponents?: {
    city: string;
    state: string;
    zip: string;
    streetName: string;
    preQualifier: string;
    preDirection: string;
    preType: string;
    suffixType: string;
    suffixDirection: string;
    suffixQualifier: string;
    fromAddress: string;
    toAddress: string;
  };
}

// ── Address normalization ──────────────────────────────────────────────────────

/**
 * Produce a clean single-line address for API calls.
 * Strips excess punctuation and collapses whitespace.
 */
export function normalizeAddress(addr: RawPropertyAddress): string {
  const line = [addr.addressLine1, addr.addressLine2]
    .filter(Boolean)
    .join(' ');
  const full = `${line}, ${addr.city}, ${addr.state} ${addr.zip}`;
  return full
    .replace(/[.,#]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── US Census Geocoder ─────────────────────────────────────────────────────────

const CENSUS_BASE =
  'https://geocoding.geo.census.gov/geocoder/locations/onelineaddress';

/**
 * Geocode a single-line address using the US Census Geocoder API.
 * Returns null on any failure so callers can fall back gracefully.
 */
export async function geocodeAddress(
  singleLineAddress: string,
): Promise<CensusGeocodeResult | null> {
  try {
    const params = new URLSearchParams({
      address: singleLineAddress,
      benchmark: 'Public_AR_Current',
      format: 'json',
    });

    const res = await fetch(`${CENSUS_BASE}?${params.toString()}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      logger.warn('property_resolution', 'Census geocoder returned error', { status: res.status, address: singleLineAddress });
      return null;
    }

    const json = await res.json();
    const matches: CensusGeocodeResult[] =
      json?.result?.addressMatches ?? [];

    if (matches.length === 0) return null;

    // First match is the best match
    return matches[0];
  } catch (err) {
    logger.warn('property_resolution', 'Census geocode request failed', { address: singleLineAddress, error: String(err) });
    return null;
  }
}

// ── Main orchestrator ──────────────────────────────────────────────────────────

/**
 * Resolve the full stable identity for a property.
 *
 * Steps:
 *   1. Normalize the raw address
 *   2. Attempt a Philadelphia-specific OPA resolution (if city = Philadelphia, PA)
 *   3. Fall back to Census geocoding
 *   4. Return a PropertyIdentity record
 */
export async function resolvePropertyIdentity(
  addr: RawPropertyAddress,
): Promise<PropertyIdentity> {
  const isPhiladelphia =
    addr.state === 'PA' &&
    addr.city.toLowerCase().replace(/\s+/g, '').includes('philadelphia');

  const singleLine = normalizeAddress(addr);
  logger.info('property_resolution', 'Resolving property identity', { normalizedAddress: singleLine, isPhiladelphia });

  // ── Philadelphia-specific path ──────────────────────────────────────────────
  if (isPhiladelphia) {
    const phillyResult = await resolvePhiladelphiaIdentity(addr);
    if (phillyResult) {
      logger.info('property_resolution', 'Philadelphia AIS resolution succeeded', {
        normalizedAddress: phillyResult.normalizedAddress,
        localParcelId: phillyResult.localParcelId,
        providerName: phillyResult.providerName,
        confidence: phillyResult.providerConfidence,
      });
      return phillyResult;
    }
    logger.warn('property_resolution', 'Philadelphia AIS resolution failed — falling back to Census', { address: singleLine });
  }

  // ── Generic path: Census Geocoder ──────────────────────────────────────────
  const geocoded = await geocodeAddress(singleLine);

  if (geocoded) {
    const components = geocoded.addressComponents;
    logger.info('property_resolution', 'Census geocoder resolution succeeded', {
      normalizedAddress: geocoded.address,
      city: components?.city ?? addr.city,
      state: components?.state ?? addr.state,
    });
    return {
      normalizedAddress: geocoded.address,
      latitude: geocoded.coordinates.y,
      longitude: geocoded.coordinates.x,
      jurisdictionCity: components?.city ?? addr.city,
      jurisdictionCounty: null, // Census onelineaddress does not return county
      jurisdictionState: components?.state ?? addr.state,
      nationalPropertyId: null,
      localParcelId: null,
      localTaxId: null,
      providerName: 'census_geocoder',
      providerConfidence: 0.75,
    };
  }

  // ── Last resort: return normalized form of the user-entered address ─────────
  logger.warn('property_resolution', 'All geocoder sources failed — using user input fallback', { address: singleLine });
  return {
    normalizedAddress: singleLine,
    latitude: null,
    longitude: null,
    jurisdictionCity: addr.city,
    jurisdictionCounty: null,
    jurisdictionState: addr.state,
    nationalPropertyId: null,
    localParcelId: null,
    localTaxId: null,
    providerName: 'user_input',
    providerConfidence: 0.3,
  };
}

// ── Persist to DB ─────────────────────────────────────────────────────────────

/**
 * Write the resolved identity fields back to the properties row.
 * Safe to call multiple times — always overwrites with the latest resolution.
 */
export async function persistPropertyIdentity(
  supabase: SupabaseClient,
  propertyId: string,
  identity: PropertyIdentity,
): Promise<void> {
  const { error } = await supabase
    .from('properties')
    .update({
      normalized_address: identity.normalizedAddress,
      latitude: identity.latitude,
      longitude: identity.longitude,
      jurisdiction_city: identity.jurisdictionCity,
      jurisdiction_county: identity.jurisdictionCounty,
      jurisdiction_state: identity.jurisdictionState,
      national_property_id: identity.nationalPropertyId,
      local_parcel_id: identity.localParcelId,
      local_tax_id: identity.localTaxId,
      provider_name: identity.providerName,
      provider_confidence: identity.providerConfidence,
      identity_resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', propertyId);

  if (error) {
    logger.error('property_resolution', 'Failed to persist property identity', { propertyId, error: error.message });
  } else {
    logger.info('property_resolution', 'Property identity persisted', { propertyId, providerName: identity.providerName });
  }
}
