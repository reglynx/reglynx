-- Migration 002: Jurisdiction coverage registry
-- Run this in Supabase SQL Editor or via `supabase db push`

CREATE TABLE IF NOT EXISTS jurisdiction_coverage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country TEXT NOT NULL DEFAULT 'US',
  state TEXT,
  city TEXT,
  jurisdiction_key TEXT NOT NULL UNIQUE,
  coverage_status TEXT NOT NULL DEFAULT 'unsupported'
    CHECK (coverage_status IN ('active', 'partial', 'pending', 'unsupported')),
  adapters_available JSONB DEFAULT '[]'::jsonb,
  intake_enabled BOOLEAN DEFAULT true,
  billing_enabled BOOLEAN DEFAULT false,
  waitlist_enabled BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE jurisdiction_coverage ENABLE ROW LEVEL SECURITY;

-- Public read access (no auth required to check coverage)
CREATE POLICY "jurisdiction_coverage_public_read"
  ON jurisdiction_coverage FOR SELECT
  USING (true);

-- Seed coverage data
INSERT INTO jurisdiction_coverage (country, state, city, jurisdiction_key, coverage_status, adapters_available, intake_enabled, billing_enabled, notes)
VALUES
  -- Federal
  ('US', NULL, NULL, 'federal', 'active', '["document_generation", "regulatory_alerts"]'::jsonb, true, true, 'Federal compliance coverage active'),
  -- Pennsylvania — active
  ('US', 'PA', NULL, 'PA', 'active', '["document_generation", "regulatory_alerts"]'::jsonb, true, true, 'Pennsylvania state coverage active'),
  -- Philadelphia — first-class active
  ('US', 'PA', 'Philadelphia', 'Philadelphia_PA', 'active', '["document_generation", "regulatory_alerts", "li_violations", "rental_license", "permits"]'::jsonb, true, true, 'Philadelphia first-class compliance coverage'),
  -- Contiguous states — pending/intake-only
  ('US', 'AL', NULL, 'AL', 'pending', '["document_generation"]'::jsonb, true, false, NULL),
  ('US', 'AZ', NULL, 'AZ', 'pending', '["document_generation"]'::jsonb, true, false, NULL),
  ('US', 'AR', NULL, 'AR', 'pending', '["document_generation"]'::jsonb, true, false, NULL),
  ('US', 'CA', NULL, 'CA', 'pending', '["document_generation"]'::jsonb, true, false, NULL),
  ('US', 'CO', NULL, 'CO', 'pending', '["document_generation"]'::jsonb, true, false, NULL),
  ('US', 'CT', NULL, 'CT', 'pending', '["document_generation"]'::jsonb, true, false, NULL),
  ('US', 'DE', NULL, 'DE', 'pending', '["document_generation"]'::jsonb, true, false, NULL),
  ('US', 'FL', NULL, 'FL', 'pending', '["document_generation"]'::jsonb, true, false, NULL),
  ('US', 'GA', NULL, 'GA', 'pending', '["document_generation"]'::jsonb, true, false, NULL),
  ('US', 'ID', NULL, 'ID', 'pending', '["document_generation"]'::jsonb, true, false, NULL),
  ('US', 'IL', NULL, 'IL', 'pending', '["document_generation"]'::jsonb, true, false, NULL),
  ('US', 'IN', NULL, 'IN', 'pending', '["document_generation"]'::jsonb, true, false, NULL),
  ('US', 'IA', NULL, 'IA', 'pending', '["document_generation"]'::jsonb, true, false, NULL),
  ('US', 'KS', NULL, 'KS', 'pending', '["document_generation"]'::jsonb, true, false, NULL),
  ('US', 'KY', NULL, 'KY', 'pending', '["document_generation"]'::jsonb, true, false, NULL),
  ('US', 'LA', NULL, 'LA', 'pending', '["document_generation"]'::jsonb, true, false, NULL),
  ('US', 'ME', NULL, 'ME', 'pending', '["document_generation"]'::jsonb, true, false, NULL),
  ('US', 'MD', NULL, 'MD', 'pending', '["document_generation"]'::jsonb, true, false, NULL),
  ('US', 'MA', NULL, 'MA', 'pending', '["document_generation"]'::jsonb, true, false, NULL),
  ('US', 'MI', NULL, 'MI', 'pending', '["document_generation"]'::jsonb, true, false, NULL),
  ('US', 'MN', NULL, 'MN', 'pending', '["document_generation"]'::jsonb, true, false, NULL),
  ('US', 'MS', NULL, 'MS', 'pending', '["document_generation"]'::jsonb, true, false, NULL),
  ('US', 'MO', NULL, 'MO', 'pending', '["document_generation"]'::jsonb, true, false, NULL),
  ('US', 'MT', NULL, 'MT', 'pending', '["document_generation"]'::jsonb, true, false, NULL),
  ('US', 'NE', NULL, 'NE', 'pending', '["document_generation"]'::jsonb, true, false, NULL),
  ('US', 'NV', NULL, 'NV', 'pending', '["document_generation"]'::jsonb, true, false, NULL),
  ('US', 'NH', NULL, 'NH', 'pending', '["document_generation"]'::jsonb, true, false, NULL),
  ('US', 'NJ', NULL, 'NJ', 'pending', '["document_generation"]'::jsonb, true, false, NULL),
  ('US', 'NM', NULL, 'NM', 'pending', '["document_generation"]'::jsonb, true, false, NULL),
  ('US', 'NY', NULL, 'NY', 'pending', '["document_generation"]'::jsonb, true, false, NULL),
  ('US', 'NC', NULL, 'NC', 'pending', '["document_generation"]'::jsonb, true, false, NULL),
  ('US', 'ND', NULL, 'ND', 'pending', '["document_generation"]'::jsonb, true, false, NULL),
  ('US', 'OH', NULL, 'OH', 'pending', '["document_generation"]'::jsonb, true, false, NULL),
  ('US', 'OK', NULL, 'OK', 'pending', '["document_generation"]'::jsonb, true, false, NULL),
  ('US', 'OR', NULL, 'OR', 'pending', '["document_generation"]'::jsonb, true, false, NULL),
  ('US', 'RI', NULL, 'RI', 'pending', '["document_generation"]'::jsonb, true, false, NULL),
  ('US', 'SC', NULL, 'SC', 'pending', '["document_generation"]'::jsonb, true, false, NULL),
  ('US', 'SD', NULL, 'SD', 'pending', '["document_generation"]'::jsonb, true, false, NULL),
  ('US', 'TN', NULL, 'TN', 'pending', '["document_generation"]'::jsonb, true, false, NULL),
  ('US', 'TX', NULL, 'TX', 'pending', '["document_generation"]'::jsonb, true, false, NULL),
  ('US', 'UT', NULL, 'UT', 'pending', '["document_generation"]'::jsonb, true, false, NULL),
  ('US', 'VT', NULL, 'VT', 'pending', '["document_generation"]'::jsonb, true, false, NULL),
  ('US', 'VA', NULL, 'VA', 'pending', '["document_generation"]'::jsonb, true, false, NULL),
  ('US', 'WA', NULL, 'WA', 'pending', '["document_generation"]'::jsonb, true, false, NULL),
  ('US', 'WV', NULL, 'WV', 'pending', '["document_generation"]'::jsonb, true, false, NULL),
  ('US', 'WI', NULL, 'WI', 'pending', '["document_generation"]'::jsonb, true, false, NULL),
  ('US', 'WY', NULL, 'WY', 'pending', '["document_generation"]'::jsonb, true, false, NULL)
ON CONFLICT (jurisdiction_key) DO NOTHING;
