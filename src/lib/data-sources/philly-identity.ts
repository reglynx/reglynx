/**
 * Philadelphia Property Identity Resolver
 *
 * 3-step identity pipeline:
 *   Step 1: AIS lookup → if opa_account_num present, use directly (high confidence)
 *   Step 2: AIS coords → Carto spatial lookup against opa_properties_public (medium confidence)
 *   Step 3: Address string ILIKE fallback (low confidence)
 *
 * AIS is free, no key required.
 */

const AIS_ENDPOINT = 'https://api.phila.gov/ais/v1/addresses';
const CARTO_ENDPOINT = 'https://phl.carto.com/api/v2/sql';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MatchMethod = 'ais_direct' | 'ais_spatial_fallback' | 'address_string' | 'unresolved';
export type MatchConfidence = 'high' | 'medium' | 'low' | 'none';

export interface PhillyIdentity {
  input_address: string;
  standardized_address: string | null;
  opa_account_num: string | null;
  alternate_address: string | null;
  coordinates: { lat: number; lng: number } | null;
  match_method: MatchMethod;
  match_confidence: MatchConfidence;
  atlas_link: string | null;
  resolved: boolean;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

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

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    });
  } catch (e) {
    console.error(`[CARTO-identity] fetch error:`, e instanceof Error ? e.message : e);
    return [];
  }

  if (!res.ok) {
    let body = '';
    try { body = await res.text(); } catch { /* ignore */ }
    console.error(`[CARTO-identity] HTTP ${res.status}: ${body.slice(0, 200)}`);
    return [];
  }

  const data = await res.json();
  return data?.rows ?? [];
}

// ---------------------------------------------------------------------------
// Step 1: AIS Lookup
// ---------------------------------------------------------------------------

interface AISFeature {
  properties: {
    street_address: string;
    opa_account_num: string;
    opa_owners: string[];
    dor_parcel_id: string;
    pwd_parcel_id: string;
    zip_code: string;
    [key: string]: unknown;
  };
  geometry: {
    coordinates: [number, number]; // [lng, lat]
    type: string;
  };
}

interface AISResponse {
  features: AISFeature[];
  total_size: number;
}

async function aisLookup(address: string): Promise<AISFeature | null> {
  const encoded = encodeURIComponent(address.trim());
  const url = `${AIS_ENDPOINT}/${encoded}`;

  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.error(`[AIS] HTTP ${res.status} for "${address}"`);
      return null;
    }

    const data: AISResponse = await res.json();
    if (data.features && data.features.length > 0) {
      return data.features[0];
    }
    return null;
  } catch (e) {
    console.error('[AIS] Fetch error:', e);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Step 2: Spatial Parcel Lookup via Carto
// ---------------------------------------------------------------------------

async function spatialParcelLookup(
  lat: number,
  lng: number,
): Promise<{ parcel_number: string; location: string } | null> {
  // Use ST_DWithin with a 30-meter buffer to find nearest parcel
  const sql = `
    SELECT parcel_number, location
    FROM opa_properties_public
    WHERE the_geom IS NOT NULL
      AND ST_DWithin(
        the_geom::geography,
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
        30
      )
    ORDER BY ST_Distance(
      the_geom::geography,
      ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
    )
    LIMIT 1
  `;

  const rows = await cartoQuery(sql);
  if (rows.length > 0) {
    return {
      parcel_number: String(rows[0].parcel_number ?? ''),
      location: String(rows[0].location ?? ''),
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Step 3: Address string fallback
// ---------------------------------------------------------------------------

async function addressStringFallback(
  address: string,
): Promise<{ parcel_number: string; location: string } | null> {
  const safe = sanitizeForCarto(address.toUpperCase());
  if (!safe) return null;

  const sql = `
    SELECT parcel_number, location
    FROM opa_properties_public
    WHERE location ILIKE '%${safe}%'
    LIMIT 1
  `;

  const rows = await cartoQuery(sql);
  if (rows.length > 0) {
    return {
      parcel_number: String(rows[0].parcel_number ?? ''),
      location: String(rows[0].location ?? ''),
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Main resolver
// ---------------------------------------------------------------------------

export async function resolvePhillyIdentity(inputAddress: string): Promise<PhillyIdentity> {
  const base: PhillyIdentity = {
    input_address: inputAddress,
    standardized_address: null,
    opa_account_num: null,
    alternate_address: null,
    coordinates: null,
    match_method: 'unresolved',
    match_confidence: 'none',
    atlas_link: null,
    resolved: false,
  };

  // Step 1: AIS lookup
  const aisResult = await aisLookup(inputAddress);

  if (aisResult) {
    const props = aisResult.properties;
    const coords = aisResult.geometry?.coordinates;

    base.standardized_address = props.street_address ?? null;
    if (coords && coords.length === 2) {
      base.coordinates = { lat: coords[1], lng: coords[0] };
    }

    const opaNum = props.opa_account_num?.trim();

    if (opaNum) {
      // Direct AIS match — high confidence
      base.opa_account_num = opaNum;
      base.match_method = 'ais_direct';
      base.match_confidence = 'high';
      base.resolved = true;
      base.atlas_link = `https://atlas.phila.gov/${encodeURIComponent(props.street_address)}`;

      return base;
    }

    // AIS returned result but no OPA — try spatial fallback with coords
    if (base.coordinates) {
      const spatial = await spatialParcelLookup(
        base.coordinates.lat,
        base.coordinates.lng,
      );

      if (spatial && spatial.parcel_number) {
        base.opa_account_num = spatial.parcel_number;
        base.alternate_address = spatial.location || null;
        base.match_method = 'ais_spatial_fallback';
        base.match_confidence = 'medium';
        base.resolved = true;
        base.atlas_link = `https://atlas.phila.gov/${encodeURIComponent(props.street_address)}`;

        return base;
      }
    }
  }

  // Step 3: Address string fallback (last resort)
  const fallback = await addressStringFallback(inputAddress);
  if (fallback && fallback.parcel_number) {
    base.opa_account_num = fallback.parcel_number;
    base.alternate_address = fallback.location || null;
    base.match_method = 'address_string';
    base.match_confidence = 'low';
    base.resolved = true;
    base.atlas_link = fallback.location
      ? `https://atlas.phila.gov/${encodeURIComponent(fallback.location)}`
      : null;

    return base;
  }

  // Unresolved — identity could not be established
  return base;
}
