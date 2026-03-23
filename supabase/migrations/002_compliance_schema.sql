-- =============================================================================
-- RegLynx — Compliance Monitoring Schema Migration 002
-- Philadelphia MVP — System of Record for Property Compliance
--
-- Run in Supabase SQL Editor after 001_document_templates.sql
-- Safe to re-run: all statements use IF NOT EXISTS / DO NOTHING guards
-- =============================================================================

-- ── property_aliases ──────────────────────────────────────────────────────────
-- Maps a property to external source identifiers (OPA account, parcel ID, etc.)
CREATE TABLE IF NOT EXISTS property_aliases (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id     uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  external_source_id  text NOT NULL,
  source_name     text NOT NULL,  -- 'opa', 'atlas', 'lni', etc.
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (property_id, source_name)
);

-- ── source_records ────────────────────────────────────────────────────────────
-- Raw data fetched from each Philadelphia data source, stored as JSONB.
-- source_type: 'violation' | 'permit' | 'license' | 'inspection' | 'assessment'
CREATE TABLE IF NOT EXISTS source_records (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id     uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  source_type     text NOT NULL,
  source_name     text NOT NULL,  -- 'philly_lni_violations', 'philly_rental_license', etc.
  source_url      text,
  raw_data        jsonb NOT NULL DEFAULT '{}',
  retrieved_at    timestamptz NOT NULL DEFAULT now(),
  effective_date  date,
  -- Deduplication: don't re-insert the same record from the same source
  UNIQUE (property_id, source_name, source_type, effective_date)
);

CREATE INDEX IF NOT EXISTS source_records_property_id_idx ON source_records(property_id);
CREATE INDEX IF NOT EXISTS source_records_source_type_idx ON source_records(source_type);

-- ── compliance_items ──────────────────────────────────────────────────────────
-- Evaluated compliance state per property per item type.
-- status: 'good' | 'expired' | 'expiring' | 'open_violation' | 'closed' | 'needs_review' | 'unknown'
-- confidence: 'verified' | 'likely' | 'needs_review'
CREATE TABLE IF NOT EXISTS compliance_items (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id      uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  type             text NOT NULL,  -- 'rental_license', 'cert_of_suitability', 'violation', 'lead_safe_cert', etc.
  label            text NOT NULL,  -- human-readable label
  status           text NOT NULL DEFAULT 'unknown',
  due_date         date,
  source_record_id uuid REFERENCES source_records(id) ON DELETE SET NULL,
  confidence_level text NOT NULL DEFAULT 'needs_review',
  notes            text,
  updated_at       timestamptz NOT NULL DEFAULT now(),
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (property_id, type)
);

CREATE INDEX IF NOT EXISTS compliance_items_property_id_idx ON compliance_items(property_id);
CREATE INDEX IF NOT EXISTS compliance_items_status_idx ON compliance_items(status);

-- ── status_snapshots ─────────────────────────────────────────────────────────
-- Point-in-time snapshot of overall compliance status per property.
-- Enables trend tracking and historical reporting.
CREATE TABLE IF NOT EXISTS status_snapshots (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id    uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  overall_status text NOT NULL,   -- 'compliant' | 'attention_needed' | 'non_compliant' | 'unknown'
  item_summary   jsonb NOT NULL DEFAULT '{}',  -- { total, good, expired, open_violations }
  computed_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS status_snapshots_property_id_idx ON status_snapshots(property_id);
CREATE INDEX IF NOT EXISTS status_snapshots_computed_at_idx ON status_snapshots(computed_at DESC);

-- ── reports ───────────────────────────────────────────────────────────────────
-- Generated compliance reports (monthly, triggered, on-demand).
CREATE TABLE IF NOT EXISTS reports (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid NOT NULL,
  property_id  uuid REFERENCES properties(id) ON DELETE SET NULL,
  report_type  text NOT NULL DEFAULT 'monthly',  -- 'monthly' | 'triggered' | 'on_demand'
  generated_at timestamptz NOT NULL DEFAULT now(),
  file_url     text,
  summary_data jsonb NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS reports_org_id_idx ON reports(org_id);
CREATE INDEX IF NOT EXISTS reports_property_id_idx ON reports(property_id);

-- ── Extend existing alerts table with compliance fields ───────────────────────
-- Add compliance_item_id to link alerts to specific items (if column doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'regulatory_alerts' AND column_name = 'compliance_item_id'
  ) THEN
    ALTER TABLE regulatory_alerts ADD COLUMN compliance_item_id uuid REFERENCES compliance_items(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ── RLS Policies ─────────────────────────────────────────────────────────────
-- Enable RLS on all new tables. Organizations can only access their own data.

ALTER TABLE property_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- property_aliases: access via properties → org
CREATE POLICY IF NOT EXISTS "org_access_property_aliases" ON property_aliases
  USING (
    property_id IN (
      SELECT p.id FROM properties p
      JOIN organizations o ON o.id = p.org_id
      WHERE o.owner_id = auth.uid()
    )
  );

-- source_records: access via properties → org
CREATE POLICY IF NOT EXISTS "org_access_source_records" ON source_records
  USING (
    property_id IN (
      SELECT p.id FROM properties p
      JOIN organizations o ON o.id = p.org_id
      WHERE o.owner_id = auth.uid()
    )
  );

-- compliance_items: access via properties → org
CREATE POLICY IF NOT EXISTS "org_access_compliance_items" ON compliance_items
  USING (
    property_id IN (
      SELECT p.id FROM properties p
      JOIN organizations o ON o.id = p.org_id
      WHERE o.owner_id = auth.uid()
    )
  );

-- status_snapshots: access via properties → org
CREATE POLICY IF NOT EXISTS "org_access_status_snapshots" ON status_snapshots
  USING (
    property_id IN (
      SELECT p.id FROM properties p
      JOIN organizations o ON o.id = p.org_id
      WHERE o.owner_id = auth.uid()
    )
  );

-- reports: direct org_id check
CREATE POLICY IF NOT EXISTS "org_access_reports" ON reports
  USING (
    org_id IN (
      SELECT o.id FROM organizations o WHERE o.owner_id = auth.uid()
    )
  );

-- =============================================================================
-- Verification
-- =============================================================================
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'property_aliases', 'source_records', 'compliance_items',
    'status_snapshots', 'reports'
  )
ORDER BY table_name;
