/**
 * RegLynx Compliance Rules Engine — Philadelphia MVP
 *
 * evaluateCompliance(propertyId, supabase) is the main entry point.
 * It:
 *   1. Fetches property details
 *   2. Normalizes the address via Atlas
 *   3. Runs all applicable Philadelphia adapters
 *   4. Stores raw source_records in the DB
 *   5. Applies rules to evaluate each compliance item
 *   6. Writes compliance_items to the DB (upsert)
 *   7. Writes a status_snapshot
 *   8. Returns the ComplianceEvaluation
 *
 * TODO (multi-city expansion): inject city-specific adapter sets via config.
 * TODO (production): add rate limiting / retry logic around adapter calls.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { buildNormalizedAddress } from './adapters/atlas';
import { fetchLniViolations, classifyViolations } from './adapters/lni-violations';
import {
  fetchRentalLicenses,
  evaluateRentalLicenseStatus,
  EXPIRING_SOON_DAYS,
} from './adapters/rental-license';
import { fetchBuildingPermits, fetchInspectionHistory } from './adapters/property-history';
import type {
  ComplianceEvaluation,
  ComplianceStatus,
  ConfidenceLevel,
  EvaluatedItem,
  OverallStatus,
  AdapterResult,
  SourceRecord,
  ComplianceItemType,
} from './types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function deriveOverallStatus(items: EvaluatedItem[]): OverallStatus {
  if (items.length === 0) return 'unknown';

  const hasOpenViolation = items.some((i) => i.status === 'open_violation');
  const hasExpired = items.some((i) => i.status === 'expired');
  if (hasOpenViolation || hasExpired) return 'non_compliant';

  const hasExpiring = items.some((i) => i.status === 'expiring');
  const hasNeedsReview = items.some((i) => i.status === 'needs_review');
  if (hasExpiring || hasNeedsReview) return 'attention_needed';

  const allUnknown = items.every((i) => i.status === 'unknown');
  if (allUnknown) return 'unknown';

  return 'compliant';
}

function buildItemSummary(items: EvaluatedItem[]) {
  return {
    total: items.length,
    good: items.filter((i) => i.status === 'good' || i.status === 'closed').length,
    expiring: items.filter((i) => i.status === 'expiring').length,
    expired: items.filter((i) => i.status === 'expired').length,
    openViolations: items.filter((i) => i.status === 'open_violation').length,
    needsReview: items.filter((i) => i.status === 'needs_review').length,
    unknown: items.filter((i) => i.status === 'unknown').length,
  };
}

// ── Persist source records ────────────────────────────────────────────────────

async function persistSourceRecords(
  supabase: SupabaseClient,
  propertyId: string,
  records: SourceRecord[],
): Promise<Map<string, string>> {
  // Returns a map of effectiveDate → inserted record id (for linking compliance_items)
  const idMap = new Map<string, string>();

  for (const rec of records) {
    const { data, error } = await supabase
      .from('source_records')
      .upsert(
        {
          property_id: propertyId,
          source_type: rec.sourceType,
          source_name: rec.sourceName,
          source_url: rec.sourceUrl,
          raw_data: rec.rawData,
          retrieved_at: rec.retrievedAt,
          effective_date: rec.effectiveDate,
        },
        { onConflict: 'property_id,source_name,source_type,effective_date', ignoreDuplicates: false },
      )
      .select('id')
      .maybeSingle();

    if (!error && data?.id) {
      const key = `${rec.sourceName}:${rec.effectiveDate}`;
      idMap.set(key, data.id);
    }
  }

  return idMap;
}

// ── Upsert compliance item ────────────────────────────────────────────────────

async function upsertComplianceItem(
  supabase: SupabaseClient,
  propertyId: string,
  item: EvaluatedItem,
): Promise<void> {
  await supabase
    .from('compliance_items')
    .upsert(
      {
        property_id: propertyId,
        type: item.type,
        label: item.label,
        status: item.status,
        due_date: item.dueDate,
        source_record_id: item.sourceRecordId,
        confidence_level: item.confidenceLevel,
        notes: item.notes,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'property_id,type' },
    );
}

// ── Main evaluation function ──────────────────────────────────────────────────

export async function evaluateCompliance(
  propertyId: string,
  supabase: SupabaseClient,
): Promise<ComplianceEvaluation> {
  const computedAt = new Date().toISOString();

  // 1. Fetch property
  const { data: property, error: propError } = await supabase
    .from('properties')
    .select('*')
    .eq('id', propertyId)
    .single();

  if (propError || !property) {
    throw new Error(`Property ${propertyId} not found: ${propError?.message}`);
  }

  const addressRaw = [property.address_line1, property.address_line2]
    .filter(Boolean)
    .join(' ');

  // 2. Normalize address (Philadelphia AIS)
  const normalizedAddress = await buildNormalizedAddress(
    addressRaw,
    property.city,
    property.state,
    property.zip,
  );

  const { opaAccountNumber } = normalizedAddress;

  // Persist OPA account number alias if we got one
  if (opaAccountNumber) {
    await supabase
      .from('property_aliases')
      .upsert(
        { property_id: propertyId, external_source_id: opaAccountNumber, source_name: 'opa' },
        { onConflict: 'property_id,source_name', ignoreDuplicates: false },
      );
  }

  const isPhiladelphia =
    property.city?.toLowerCase().includes('philadelphia') && property.state === 'PA';

  // 3. Run all applicable adapters concurrently
  const adapterResults: AdapterResult[] = await Promise.all([
    fetchLniViolations(addressRaw, opaAccountNumber),
    fetchRentalLicenses(addressRaw, opaAccountNumber),
    ...(isPhiladelphia
      ? [
          fetchBuildingPermits(addressRaw, opaAccountNumber),
          fetchInspectionHistory(addressRaw, opaAccountNumber),
        ]
      : []),
  ]);

  // 4. Persist all source records
  const allRecords: SourceRecord[] = adapterResults.flatMap((r) => r.records);
  const recordIdMap = await persistSourceRecords(supabase, propertyId, allRecords);

  // 5. Apply compliance rules
  const evaluatedItems: EvaluatedItem[] = [];

  // ── Rule: Rental License ──────────────────────────────────────────────────
  const licenseAdapter = adapterResults.find((r) => r.adapterName === 'rental_license');
  const licenseRecords = licenseAdapter?.records ?? [];
  const licenseEval = evaluateRentalLicenseStatus(licenseRecords);

  let licenseStatus: ComplianceStatus;
  let licenseConfidence: ConfidenceLevel;
  let licenseSourceId: string | null = null;

  if (licenseEval.status === 'not_found') {
    licenseStatus = isPhiladelphia ? 'needs_review' : 'unknown';
    licenseConfidence = 'needs_review';
  } else {
    licenseStatus =
      licenseEval.status === 'active' ? 'good' :
      licenseEval.status === 'expiring' ? 'expiring' : 'expired';
    licenseConfidence = 'verified';
    // Find the record id for the most recent license
    const latestRecord = licenseRecords.sort((a, b) =>
      (b.effectiveDate ?? '').localeCompare(a.effectiveDate ?? '')
    )[0];
    if (latestRecord) {
      licenseSourceId = recordIdMap.get(
        `philly_rental_license:${latestRecord.effectiveDate}`
      ) ?? null;
    }
  }

  const licenseItem: EvaluatedItem = {
    type: 'rental_license' as ComplianceItemType,
    label: 'Philadelphia Rental License',
    status: licenseStatus,
    dueDate: licenseEval.expirationDate,
    sourceRecordId: licenseSourceId,
    confidenceLevel: licenseConfidence,
    notes:
      licenseEval.status === 'not_found'
        ? 'No rental license found in Philadelphia L&I data. Verify manually.'
        : licenseEval.status === 'expiring'
        ? `Expires in ${licenseEval.daysUntilExpiration} days (${licenseEval.expirationDate}). Renew at the L&I Self-Service portal.`
        : licenseEval.status === 'expired'
        ? `Expired on ${licenseEval.expirationDate}. Renew immediately to avoid citations.`
        : `License #${licenseEval.licenseNumber} — active through ${licenseEval.expirationDate}.`,
  };

  if (isPhiladelphia || licenseEval.status !== 'not_found') {
    evaluatedItems.push(licenseItem);
  }

  // ── Rule: L&I Violations ──────────────────────────────────────────────────
  const violationsAdapter = adapterResults.find((r) => r.adapterName === 'lni_violations');
  const violationRecords = violationsAdapter?.records ?? [];
  const { openCount, mostRecentOpenDate, mostRecentOpenDescription } =
    classifyViolations(violationRecords);

  if (openCount > 0) {
    const vSourceId = mostRecentOpenDate
      ? (recordIdMap.get(`philly_lni_violations:${mostRecentOpenDate}`) ?? null)
      : null;

    evaluatedItems.push({
      type: 'open_violation' as ComplianceItemType,
      label: 'Open L&I Violations',
      status: 'open_violation',
      dueDate: null,
      sourceRecordId: vSourceId,
      confidenceLevel: 'verified',
      notes: `${openCount} open violation${openCount > 1 ? 's' : ''}. Most recent: ${mostRecentOpenDescription ?? 'See L&I records'} (${mostRecentOpenDate}).`,
    });
  }

  // ── Rule: Lead Safe Certification (Philadelphia pre-1978 units) ───────────
  if (
    isPhiladelphia &&
    property.year_built &&
    property.year_built < 1978
  ) {
    // Philadelphia requires lead-safe or lead-free cert before any child under 6 moves in.
    // This is NOT in open data — must be verified manually.
    evaluatedItems.push({
      type: 'lead_safe_cert' as ComplianceItemType,
      label: 'Philadelphia Lead Safe Certification',
      status: 'needs_review',
      dueDate: null,
      sourceRecordId: null,
      confidenceLevel: 'needs_review',
      notes:
        `Pre-1978 property. Philadelphia Bill No. 200725 requires lead-safe or lead-free ` +
        `certification before any child under 6 occupies a unit. ` +
        `Verify certification status manually — not available in public data. ` +
        `Contact Philadelphia Lead and Healthy Homes Program: (215) 685-2788.`,
    });
  }

  // ── Rule: Certificate of Rental Suitability ───────────────────────────────
  // Required per tenancy — not tracked in public data. Always needs_review.
  if (isPhiladelphia) {
    evaluatedItems.push({
      type: 'cert_of_rental_suitability' as ComplianceItemType,
      label: 'Certificate of Rental Suitability',
      status: 'needs_review',
      dueDate: null,
      sourceRecordId: null,
      confidenceLevel: 'needs_review',
      notes:
        'Required for each new tenancy in Philadelphia. Obtain from the L&I Self-Service portal ' +
        '(https://li.phila.gov) before executing a new lease. Not tracked in public data — verify manually.',
    });
  }

  // 6. Compute overall status
  const overallStatus = deriveOverallStatus(evaluatedItems);
  const itemSummary = buildItemSummary(evaluatedItems);

  // 7. Upsert compliance items to DB
  await Promise.all(
    evaluatedItems.map((item) => upsertComplianceItem(supabase, propertyId, item)),
  );

  // 8. Write status snapshot
  await supabase.from('status_snapshots').insert({
    property_id: propertyId,
    overall_status: overallStatus,
    item_summary: itemSummary,
    computed_at: computedAt,
  });

  return {
    propertyId,
    overallStatus,
    items: evaluatedItems,
    itemSummary,
    computedAt,
  };
}

// ── Alert detection ───────────────────────────────────────────────────────────

/**
 * Compare new evaluation against the previous snapshot to detect changes
 * that should trigger user alerts.
 */
export function detectAlertChanges(
  newEval: ComplianceEvaluation,
  previousItems: Array<{ type: string; status: string }>,
): Array<{ type: string; message: string; severity: 'critical' | 'warning' | 'info' }> {
  const alerts: Array<{ type: string; message: string; severity: 'critical' | 'warning' | 'info' }> = [];
  const prevMap = new Map(previousItems.map((i) => [i.type, i.status]));

  for (const item of newEval.items) {
    const prev = prevMap.get(item.type);

    // New open violation appeared
    if (item.status === 'open_violation' && prev !== 'open_violation') {
      alerts.push({
        type: 'new_violation',
        message: `New open violation detected: ${item.label}. ${item.notes ?? ''}`,
        severity: 'critical',
      });
    }

    // License just expired
    if (item.status === 'expired' && prev !== 'expired') {
      alerts.push({
        type: 'expired',
        message: `${item.label} has expired. Renew immediately.`,
        severity: 'critical',
      });
    }

    // License entering expiring window
    if (item.status === 'expiring' && prev === 'good') {
      alerts.push({
        type: 'expiring_soon',
        message: `${item.label} is expiring soon. ${item.notes ?? ''}`,
        severity: 'warning',
      });
    }
  }

  return alerts;
}
