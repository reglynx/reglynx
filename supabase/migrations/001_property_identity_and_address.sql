-- Migration 001: Property identity, address normalization, and archive support
-- Run this in Supabase SQL Editor or via `supabase db push`

-- Add country field
ALTER TABLE properties ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'US';

-- Address normalization fields
ALTER TABLE properties ADD COLUMN IF NOT EXISTS input_address TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS normalized_address TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS address_provider TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS address_confidence REAL;

-- Property identity resolution fields
ALTER TABLE properties ADD COLUMN IF NOT EXISTS national_property_id TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS local_parcel_id TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS local_tax_id TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS identity_provider TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS identity_confidence REAL;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS identity_resolved_at TIMESTAMPTZ;

-- Archive support
ALTER TABLE properties ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_properties_state ON properties (state);
CREATE INDEX IF NOT EXISTS idx_properties_city_state ON properties (city, state);
CREATE INDEX IF NOT EXISTS idx_properties_local_parcel_id ON properties (local_parcel_id) WHERE local_parcel_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_properties_archived ON properties (archived_at) WHERE archived_at IS NULL;
