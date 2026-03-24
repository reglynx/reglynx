-- Migration 005: Property Identity Resolution
--
-- Adds stable identity fields to the properties table so we can:
--   1. Store the canonical normalized address returned by a geocoder
--   2. Store geocoordinates for map display and future proximity queries
--   3. Store jurisdiction metadata (city / county / state as resolved externally)
--   4. Store external parcel / tax / national property IDs for cross-referencing
--   5. Track which provider resolved the identity and how confident we are
--
-- These fields are populated by src/lib/services/property-identity-resolver.ts
-- during compliance evaluation and can be re-resolved at any time.

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS normalized_address    TEXT,
  ADD COLUMN IF NOT EXISTS latitude              NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS longitude             NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS jurisdiction_city     TEXT,
  ADD COLUMN IF NOT EXISTS jurisdiction_county   TEXT,
  ADD COLUMN IF NOT EXISTS jurisdiction_state    TEXT,
  ADD COLUMN IF NOT EXISTS national_property_id  TEXT,
  ADD COLUMN IF NOT EXISTS local_parcel_id       TEXT,
  ADD COLUMN IF NOT EXISTS local_tax_id          TEXT,
  ADD COLUMN IF NOT EXISTS provider_name         TEXT,
  ADD COLUMN IF NOT EXISTS provider_confidence   NUMERIC(4, 3),   -- 0.000 – 1.000
  ADD COLUMN IF NOT EXISTS identity_resolved_at  TIMESTAMPTZ;

-- Index for future geospatial proximity queries
CREATE INDEX IF NOT EXISTS idx_properties_lat_lng
  ON properties (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Index for OPA / parcel lookups
CREATE INDEX IF NOT EXISTS idx_properties_local_parcel_id
  ON properties (local_parcel_id)
  WHERE local_parcel_id IS NOT NULL;
