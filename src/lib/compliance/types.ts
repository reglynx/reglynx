/**
 * Core types for the RegLynx compliance monitoring engine.
 * Designed for multi-city expansion — Philadelphia is the initial implementation.
 */

// ── Status vocabulary ─────────────────────────────────────────────────────────

export type ComplianceStatus =
  | 'good'           // Verified compliant, not expiring soon
  | 'expiring'       // Expires within 60 days
  | 'expired'        // Past expiration date
  | 'open_violation' // Active, unresolved violation
  | 'closed'         // Violation or item closed/resolved
  | 'needs_review'   // Data found but confidence is low
  | 'unknown';       // No data retrieved yet

export type OverallStatus =
  | 'compliant'         // All items good
  | 'attention_needed'  // Items expiring or needs_review
  | 'non_compliant'     // Open violations or expired items
  | 'unknown';          // Not yet evaluated

export type ConfidenceLevel = 'verified' | 'likely' | 'needs_review';

// ── Provenance ────────────────────────────────────────────────────────────────
// Tracks how the compliance item's current status was determined.
// Surfaces in the UI as a trust indicator.

export type Provenance =
  | 'verified_from_source'         // Status came directly from Philadelphia Open Data API
  | 'derived_from_rule'            // Inferred from regulation rules; no direct API source
  | 'pending_source_verification'  // API was queried but returned no data; manual check required
  | 'mock_demo_only';              // Placeholder demo data only — not backed by any real source

// ── Item types ────────────────────────────────────────────────────────────────

export type ComplianceItemType =
  | 'rental_license'
  | 'cert_of_rental_suitability'
  | 'lead_safe_cert'
  | 'open_violation'
  | 'building_permit'
  | 'fire_inspection'
  | 'housing_inspection';

// ── Adapter interfaces ────────────────────────────────────────────────────────

/** Normalized address used to query all adapters */
export interface NormalizedAddress {
  addressRaw: string;
  streetNumber: string;
  streetName: string;
  city: string;
  state: string;
  zip: string;
  /** OPA account number, if known */
  opaAccountNumber?: string;
}

/**
 * Enriched query input passed to every adapter.
 * Adapters choose the best available identifier in priority order:
 *   1. opaAccountNumber (most reliable — Philly parcel ID)
 *   2. normalizedAddress (canonical form from geocoder)
 *   3. addressRaw (user-entered; lowest confidence)
 */
export interface AdapterQueryInput {
  /** Raw address as entered by the user */
  addressRaw: string;
  /** Canonical single-line address from the identity resolver */
  normalizedAddress?: string | null;
  /** Philadelphia OPA account number (parcel / tax ID) */
  opaAccountNumber?: string | null;
  city: string;
  state: string;
}

/**
 * How the adapter found (or failed to find) records.
 * Stored on AdapterResult and used for UI trust indicators.
 */
export type AdapterMatchMethod =
  | 'opa_account'        // Queried by OPA / stable parcel ID — most reliable
  | 'normalized_address' // Queried by canonical geocoded address
  | 'address_fallback'   // Queried by raw address prefix — lowest confidence
  | 'none';              // No query sent (e.g., no address available)

/**
 * Explicit outcome of an adapter query run.
 * Replaces silent empty results.
 */
export type AdapterMatchState =
  | 'verified_match'       // Query succeeded and returned ≥1 records
  | 'no_match_found'       // Query succeeded but 0 records returned
  | 'query_failed'         // API call failed (network / HTTP error)
  | 'pending_verification';// Property ID not resolved; match quality uncertain

/** A single record returned from a data source adapter */
export interface SourceRecord {
  sourceType: 'violation' | 'permit' | 'license' | 'inspection' | 'assessment';
  sourceName: string;
  sourceUrl: string | null;
  rawData: Record<string, unknown>;
  effectiveDate: string | null; // ISO date string
  retrievedAt: string;          // ISO datetime
}

/** Result from an adapter run */
export interface AdapterResult {
  adapterName: string;
  success: boolean;
  records: SourceRecord[];
  error?: string;
  /** True if this adapter is a stub returning mock data */
  isStub?: boolean;
  /** Which identifier was used to query this adapter */
  matchMethod: AdapterMatchMethod;
  /** Explicit outcome — never silently empty */
  matchState: AdapterMatchState;
  /** The query string / value that was sent to the API */
  queryInput?: string;
  /** The full URL that was fetched */
  sourceEndpoint?: string;
  /** Raw record count returned before any filtering */
  recordCount?: number;
}

// ── Evaluated compliance item ─────────────────────────────────────────────────

export interface EvaluatedItem {
  type: ComplianceItemType;
  label: string;
  status: ComplianceStatus;
  dueDate: string | null;         // ISO date
  sourceRecordId: string | null;
  confidenceLevel: ConfidenceLevel;
  provenance: Provenance;
  sourceRetrievedAt: string | null; // ISO datetime — null for derived/mock items
  notes: string | null;
}

/** Full result of evaluateCompliance(property_id) */
export interface ComplianceEvaluation {
  propertyId: string;
  overallStatus: OverallStatus;
  items: EvaluatedItem[];
  itemSummary: {
    total: number;
    good: number;
    expiring: number;
    expired: number;
    openViolations: number;
    needsReview: number;
    unknown: number;
  };
  computedAt: string;
  /** True if any items are mock_demo_only (pilot readiness indicator) */
  hasMockData: boolean;
}

// ── Alert triggers ────────────────────────────────────────────────────────────

export type AlertType =
  | 'new_violation'
  | 'expiring_soon'
  | 'expired'
  | 'violation_resolved'
  | 'license_renewed';

export interface ComplianceAlert {
  propertyId: string;
  type: AlertType;
  message: string;
  severity: 'critical' | 'warning' | 'info';
  itemType: ComplianceItemType;
}
