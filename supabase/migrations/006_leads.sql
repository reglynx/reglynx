-- Migration 006: Lead Capture Table
--
-- Stores convention / demo lead submissions from /early-access.
-- Row Level Security:
--   - INSERT: allowed for all roles including anon (public form)
--   - SELECT: only service role (admin reads bypass RLS via service client)
--   - No authenticated-user SELECT policy — admins use the service client

CREATE TABLE IF NOT EXISTS leads (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email           text        NOT NULL,
  company_name    text,
  city            text,
  state           text,
  property_count  integer,
  message         text,
  status          text        NOT NULL DEFAULT 'new',
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Index for admin filtering
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_status     ON leads (status);
CREATE INDEX IF NOT EXISTS idx_leads_state      ON leads (state);

-- Enable Row Level Security
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Policy: anyone (including anonymous visitors) can submit a lead
CREATE POLICY "leads_insert_public"
  ON leads FOR INSERT
  WITH CHECK (true);

-- No SELECT policy for regular authenticated users.
-- Admin reads use the service-role client which bypasses RLS entirely.
-- This prevents authenticated non-admin users from reading lead data.
