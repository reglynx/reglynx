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
}

// ── Evaluated compliance item ─────────────────────────────────────────────────

export interface EvaluatedItem {
  type: ComplianceItemType;
  label: string;
  status: ComplianceStatus;
  dueDate: string | null;    // ISO date
  sourceRecordId: string | null;
  confidenceLevel: ConfidenceLevel;
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
