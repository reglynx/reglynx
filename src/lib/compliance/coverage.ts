/**
 * RegLynx Source Coverage Model
 *
 * Computes a per-property, per-category coverage matrix from existing
 * compliance_items and source_records rows.  No extra DB writes required.
 *
 * Coverage tells the operator:
 *   "For this property, how well is each compliance category backed by
 *    real Philadelphia Open Data source records?"
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type CoverageStatus =
  | 'verified'     // Real source records returned and processed
  | 'partial'      // Source queried; some records found but match is ambiguous
  | 'rule_derived' // Compliance determined from regulation rules; no source API exists
  | 'pending'      // Source API queried but returned no matching records
  | 'unavailable'; // Source API failed, or property is outside monitored jurisdiction

export interface CategoryCoverage {
  category: string;              // machine key — 'lni_violations', 'rental_license', etc.
  label: string;                 // human-readable label
  coverage_status: CoverageStatus;
  last_checked_at: string | null; // ISO datetime from the most recent source_record for this category
  source_count: number;           // number of raw source records stored for this category
  notes: string;                  // 1-sentence explanation shown in the UI
}

export interface CoverageMatrix {
  property_id: string;
  /** Rolled-up overall coverage for the property */
  overall_coverage: 'full' | 'partial' | 'pending' | 'unavailable';
  categories: CategoryCoverage[];
  computed_at: string;
}

// ── Input row shapes (subset of full DB rows) ─────────────────────────────────

export interface CoverageItemRow {
  type: string;
  provenance: string;           // 'verified_from_source' | 'derived_from_rule' | etc.
  source_retrieved_at: string | null;
}

export interface CoverageSourceRow {
  source_name: string;
  retrieved_at: string;
}

// ── Category config ───────────────────────────────────────────────────────────

interface CategoryConfig {
  category: string;
  label: string;
  itemType: string | null;      // compliance_items.type to look for (null = source-only)
  sourceName: string | null;    // source_records.source_name to count
  ruleBasedByDefault: boolean;  // true = always rule_derived unless source override
}

const CATEGORIES: CategoryConfig[] = [
  {
    category: 'lni_violations',
    label: 'L&I Violations',
    itemType: 'open_violation',
    sourceName: 'philly_lni_violations',
    ruleBasedByDefault: false,
  },
  {
    category: 'rental_license',
    label: 'Rental License',
    itemType: 'rental_license',
    sourceName: 'philly_rental_license',
    ruleBasedByDefault: false,
  },
  {
    category: 'cert_of_rental_suitability',
    label: 'Certificate of Rental Suitability',
    itemType: 'cert_of_rental_suitability',
    sourceName: null,             // not in public data
    ruleBasedByDefault: true,
  },
  {
    category: 'permits_history',
    label: 'Building Permits / History',
    itemType: null,
    sourceName: 'philly_building_permits',
    ruleBasedByDefault: false,
  },
  {
    category: 'inspections',
    label: 'L&I Inspections',
    itemType: null,
    sourceName: 'philly_lni_inspections',
    ruleBasedByDefault: false,
  },
];

// ── Coverage notes ────────────────────────────────────────────────────────────

const COVERAGE_NOTES: Record<string, Record<CoverageStatus, string>> = {
  lni_violations: {
    verified:     'Violations data retrieved from Philadelphia L&I Open Data.',
    partial:      'Some violation records found; OPA account match may be partial.',
    rule_derived: 'No direct violations source API — checked via address lookup.',
    pending:      'L&I violations API queried; no matching records found for this address.',
    unavailable:  'L&I violations data could not be retrieved (API error or outside monitored area).',
  },
  rental_license: {
    verified:     'Rental license status confirmed via Philadelphia Business License data.',
    partial:      'License records found but match confidence is moderate.',
    rule_derived: 'License status derived from rule; no direct source record available.',
    pending:      'License API queried; no matching rental license found for this address.',
    unavailable:  'Rental license data could not be retrieved.',
  },
  cert_of_rental_suitability: {
    verified:     'Certificate status confirmed via source data.',
    partial:      'Certificate records partially matched.',
    rule_derived: 'Required per Philadelphia Code; not tracked in public Open Data. Verify manually.',
    pending:      'Certificate status unknown. Verify with Philadelphia L&I.',
    unavailable:  'Certificate data not available via public API.',
  },
  permits_history: {
    verified:     'Building permit history retrieved from Philadelphia Open Data.',
    partial:      'Some permit records retrieved; history may be incomplete.',
    rule_derived: 'Permit history not applicable to this property type.',
    pending:      'No permit history found for this address in the past 2 years.',
    unavailable:  'Permit history data could not be retrieved.',
  },
  inspections: {
    verified:     'Inspection history retrieved from Philadelphia L&I Open Data.',
    partial:      'Some inspection records found; may not reflect all inspections.',
    rule_derived: 'Inspection history not applicable.',
    pending:      'No inspection records found for this address.',
    unavailable:  'Inspection data could not be retrieved.',
  },
};

function getNotes(category: string, status: CoverageStatus): string {
  return COVERAGE_NOTES[category]?.[status] ?? `Coverage status: ${status}.`;
}

// ── Core computation ──────────────────────────────────────────────────────────

function deriveCategoryStatus(
  cfg: CategoryConfig,
  itemsByType: Map<string, CoverageItemRow>,
  recordsBySrc: Map<string, CoverageSourceRow[]>,
): CoverageStatus {
  if (cfg.ruleBasedByDefault) {
    // Check if there's a real source record overriding the rule default
    const srcRecords = cfg.sourceName ? (recordsBySrc.get(cfg.sourceName) ?? []) : [];
    if (srcRecords.length > 0) return 'verified';
    return 'rule_derived';
  }

  // Check source records first
  const srcRecords = cfg.sourceName ? (recordsBySrc.get(cfg.sourceName) ?? []) : [];
  if (srcRecords.length > 0) return 'verified';

  // Fall back to compliance item provenance
  if (cfg.itemType) {
    const item = itemsByType.get(cfg.itemType);
    if (item) {
      if (item.provenance === 'verified_from_source') return 'verified';
      if (item.provenance === 'derived_from_rule') return 'rule_derived';
      if (item.provenance === 'pending_source_verification') return 'pending';
      if (item.provenance === 'mock_demo_only') return 'unavailable';
    }
  }

  return 'pending';
}

function deriveLastChecked(
  cfg: CategoryConfig,
  itemsByType: Map<string, CoverageItemRow>,
  recordsBySrc: Map<string, CoverageSourceRow[]>,
): string | null {
  const srcRecords = cfg.sourceName ? (recordsBySrc.get(cfg.sourceName) ?? []) : [];
  if (srcRecords.length > 0) {
    // Most recent retrieved_at
    return srcRecords.reduce<string | null>((best, r) => {
      if (!best || r.retrieved_at > best) return r.retrieved_at;
      return best;
    }, null);
  }
  if (cfg.itemType) {
    return itemsByType.get(cfg.itemType)?.source_retrieved_at ?? null;
  }
  return null;
}

export function buildCoverageMatrix(
  propertyId: string,
  items: CoverageItemRow[],
  sourceRecords: CoverageSourceRow[],
): CoverageMatrix {
  const itemsByType = new Map(items.map((i) => [i.type, i]));
  const recordsBySrc = sourceRecords.reduce<Map<string, CoverageSourceRow[]>>((acc, r) => {
    const list = acc.get(r.source_name) ?? [];
    list.push(r);
    acc.set(r.source_name, list);
    return acc;
  }, new Map());

  const categories: CategoryCoverage[] = CATEGORIES.map((cfg) => {
    const status = deriveCategoryStatus(cfg, itemsByType, recordsBySrc);
    const lastChecked = deriveLastChecked(cfg, itemsByType, recordsBySrc);
    const sourceCount = cfg.sourceName ? (recordsBySrc.get(cfg.sourceName)?.length ?? 0) : 0;
    return {
      category: cfg.category,
      label: cfg.label,
      coverage_status: status,
      last_checked_at: lastChecked,
      source_count: sourceCount,
      notes: getNotes(cfg.category, status),
    };
  });

  const overall = deriveOverallCoverage(categories);

  return {
    property_id: propertyId,
    overall_coverage: overall,
    categories,
    computed_at: new Date().toISOString(),
  };
}

function deriveOverallCoverage(
  categories: CategoryCoverage[],
): CoverageMatrix['overall_coverage'] {
  const nonRule = categories.filter((c) => c.coverage_status !== 'rule_derived');
  if (nonRule.length === 0) return 'pending';
  if (nonRule.every((c) => c.coverage_status === 'verified')) return 'full';
  if (nonRule.some((c) => c.coverage_status === 'unavailable')) return 'unavailable';
  if (nonRule.some((c) => c.coverage_status === 'verified')) return 'partial';
  return 'pending';
}

// ── Display helpers (shared between UI and reports) ───────────────────────────

export const COVERAGE_BADGE: Record<CoverageStatus, { label: string; cls: string }> = {
  verified:     { label: 'Verified',     cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  partial:      { label: 'Partial',      cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  rule_derived: { label: 'Rule-Derived', cls: 'bg-slate-50 text-slate-600 border-slate-200' },
  pending:      { label: 'Pending',      cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  unavailable:  { label: 'Unavailable',  cls: 'bg-red-50 text-red-600 border-red-200' },
};

export function formatLastChecked(ts: string | null): string {
  if (!ts) return 'Not yet checked';
  const hours = (Date.now() - new Date(ts).getTime()) / 3_600_000;
  if (hours < 1) return 'Just now';
  if (hours < 24) return 'Today';
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
