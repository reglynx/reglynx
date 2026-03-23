-- =============================================================================
-- RegLynx — Trust Layer Migration 003
-- Adds source provenance tracking and freshness timestamps to compliance items.
--
-- Run after 002_compliance_schema.sql
-- Safe to re-run: all statements use IF NOT EXISTS guards
-- =============================================================================

-- ── Add provenance column ──────────────────────────────────────────────────────
-- provenance tracks how this compliance item's status was determined:
--   verified_from_source      — status came directly from a Philadelphia Open Data API response
--   derived_from_rule         — status inferred from regulation rules (no direct source data available)
--   pending_source_verification — source API was queried but returned no data; manual check required
--   mock_demo_only            — placeholder demo data, not backed by any real source
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'compliance_items' AND column_name = 'provenance'
  ) THEN
    ALTER TABLE compliance_items
      ADD COLUMN provenance TEXT NOT NULL DEFAULT 'pending_source_verification';
  END IF;
END $$;

-- ── Add source_retrieved_at column ────────────────────────────────────────────
-- Timestamp of the most recent API call that backed this item's status.
-- NULL for derived-from-rule and mock items (no source API was called).
-- Used to compute data freshness / stale-data warnings in the UI.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'compliance_items' AND column_name = 'source_retrieved_at'
  ) THEN
    ALTER TABLE compliance_items
      ADD COLUMN source_retrieved_at TIMESTAMPTZ;
  END IF;
END $$;

-- Index for provenance filtering (e.g. count mock items quickly)
CREATE INDEX IF NOT EXISTS compliance_items_provenance_idx
  ON compliance_items(provenance);

-- =============================================================================
-- Verification
-- =============================================================================
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'compliance_items'
  AND column_name IN ('provenance', 'source_retrieved_at')
ORDER BY column_name;
