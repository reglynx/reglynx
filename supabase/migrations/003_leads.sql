-- Migration 003: Early access leads table
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  city TEXT,
  state TEXT,
  unit_count TEXT,
  source TEXT DEFAULT 'early_access',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: only service role can read/write leads
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Index for admin lookups
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads (email);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads (created_at DESC);
