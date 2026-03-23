-- =============================================================================
-- RegLynx — Pilot Schema Migration 004
-- Adds internal_notes to properties for tester annotations.
-- Safe to re-run: uses IF NOT EXISTS / DO NOTHING guards.
-- =============================================================================

-- Internal notes column on properties.
-- Testers can record "Atlas mismatch", "address issue", "missing evidence", etc.
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS internal_notes TEXT;
