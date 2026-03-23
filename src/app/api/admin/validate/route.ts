/**
 * POST /api/admin/validate
 *
 * Internal-only endpoint. Runs the two primary Philadelphia adapters
 * (L&I violations + rental license) against a supplied address without
 * writing anything to the database.  Used by the admin validation UI.
 *
 * Auth: must be authenticated + email must be in ADMIN_EMAILS env var
 * (comma-separated list, e.g. "alice@example.com,bob@example.com").
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchLniViolations, classifyViolations } from '@/lib/compliance/adapters/lni-violations';
import {
  fetchRentalLicenses,
  evaluateRentalLicenseStatus,
} from '@/lib/compliance/adapters/rental-license';
import { buildCoverageMatrix } from '@/lib/compliance/coverage';
import { resolvePhiladelphiaIdentity } from '@/lib/services/philadelphia-property-resolver';
import { normalizeAddress } from '@/lib/services/property-identity-resolver';

function getAdminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? '';
  return new Set(
    raw.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean),
  );
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminEmails = getAdminEmails();
  // If ADMIN_EMAILS is not configured, only allow in development
  const isAdmin =
    adminEmails.size === 0
      ? process.env.NODE_ENV === 'development'
      : adminEmails.has((user.email ?? '').toLowerCase());

  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { address?: string; opaAccountNumber?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const address = (body.address ?? '').trim();
  if (!address) {
    return NextResponse.json({ error: 'address is required' }, { status: 400 });
  }

  const opaAccountNumberInput = (body.opaAccountNumber ?? '').trim() || undefined;

  // Run Philadelphia AIS resolution to obtain canonical address and OPA account number.
  // This mirrors what the compliance engine does, ensuring the validate tool
  // tests the exact same resolution path as production.
  const rawAddr = { addressLine1: address, city: 'Philadelphia', state: 'PA' };
  const normalizedAddressStr = normalizeAddress(rawAddr);

  let resolvedOpa = opaAccountNumberInput ?? null;
  let resolvedNormalizedAddress: string | null = normalizedAddressStr;
  let aisResolution: Record<string, unknown> | null = null;

  if (!resolvedOpa) {
    const identity = await resolvePhiladelphiaIdentity(rawAddr);
    if (identity) {
      resolvedOpa = identity.localParcelId;
      resolvedNormalizedAddress = identity.normalizedAddress;
      aisResolution = {
        normalizedAddress: identity.normalizedAddress,
        localParcelId: identity.localParcelId,
        localTaxId: identity.localTaxId,
        providerName: identity.providerName,
        providerConfidence: identity.providerConfidence,
        latitude: identity.latitude,
        longitude: identity.longitude,
      };
    }
  } else {
    aisResolution = { note: 'OPA number supplied manually — AIS lookup skipped', opaAccountNumber: resolvedOpa };
  }

  const queryInput = {
    addressRaw: address,
    normalizedAddress: resolvedNormalizedAddress,
    opaAccountNumber: resolvedOpa,
    city: 'Philadelphia',
    state: 'PA',
  };

  const [violationsResult, licenseResult] = await Promise.all([
    fetchLniViolations(queryInput),
    fetchRentalLicenses(queryInput),
  ]);

  const violations = classifyViolations(violationsResult.records);
  const licenseStatus = evaluateRentalLicenseStatus(licenseResult.records);

  // Build a synthetic coverage matrix from adapter output (no DB rows)
  const syntheticItems = [
    ...violationsResult.records.map(() => ({
      type: 'open_violation',
      provenance: violationsResult.success ? 'verified_from_source' : 'pending_source_verification',
      source_retrieved_at: new Date().toISOString(),
    })),
    ...licenseResult.records.map(() => ({
      type: 'rental_license',
      provenance: licenseResult.success ? 'verified_from_source' : 'pending_source_verification',
      source_retrieved_at: new Date().toISOString(),
    })),
  ];

  const syntheticSourceRecords = [
    ...violationsResult.records.map((r) => ({
      source_name: r.sourceName,
      retrieved_at: r.retrievedAt,
    })),
    ...licenseResult.records.map((r) => ({
      source_name: r.sourceName,
      retrieved_at: r.retrievedAt,
    })),
  ];

  const coverage = buildCoverageMatrix('__validate__', syntheticItems, syntheticSourceRecords);

  // Produce a human-readable reason for each no-match case
  function noMatchReason(
    result: typeof violationsResult,
    resolvedOpaNum: string | null,
  ): string | null {
    if (result.success && result.matchState === 'no_match_found') {
      if (resolvedOpaNum && result.matchMethod === 'opa_account') {
        return `Queried by OPA account ${resolvedOpaNum} — no records in this dataset for this parcel.`;
      }
      if (result.matchMethod === 'normalized_address') {
        return `Queried by normalized address — no records matched "${result.queryInput}". Try OPA lookup.`;
      }
      return `Queried by address prefix "${result.queryInput}" — no records matched. Address-fallback queries have lower confidence.`;
    }
    if (!result.success && result.matchState === 'query_failed') {
      return `API request failed: ${result.error ?? 'unknown error'}`;
    }
    return null;
  }

  return NextResponse.json({
    address,
    normalizedAddress: resolvedNormalizedAddress,
    opaAccountNumber: resolvedOpa ?? null,
    aisResolution,
    adapters: {
      lni_violations: {
        success: violationsResult.success,
        matchMethod: violationsResult.matchMethod,
        matchState: violationsResult.matchState,
        queryInput: violationsResult.queryInput,
        sourceEndpoint: violationsResult.sourceEndpoint ?? null,
        error: violationsResult.error ?? null,
        recordCount: violationsResult.records.length,
        noMatchReason: noMatchReason(violationsResult, resolvedOpa),
        classification: violations,
        sample: violationsResult.records.slice(0, 5).map((r) => r.rawData),
      },
      rental_license: {
        success: licenseResult.success,
        matchMethod: licenseResult.matchMethod,
        matchState: licenseResult.matchState,
        queryInput: licenseResult.queryInput,
        sourceEndpoint: licenseResult.sourceEndpoint ?? null,
        error: licenseResult.error ?? null,
        recordCount: licenseResult.records.length,
        noMatchReason: noMatchReason(licenseResult, resolvedOpa),
        classification: licenseStatus,
        sample: licenseResult.records.slice(0, 5).map((r) => r.rawData),
      },
    },
    coverage,
    checkedAt: new Date().toISOString(),
  });
}
