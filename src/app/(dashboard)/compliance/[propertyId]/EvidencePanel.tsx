'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, Database, Clock, Shield } from 'lucide-react';

// ── Types passed from server ──────────────────────────────────────────────────

export interface EvidenceItem {
  id: string;
  type: string;
  label: string;
  status: string;
  confidence_level: string;
  provenance: string;
  source_retrieved_at: string | null;
  notes: string | null;
  // Joined source record fields (null for derived/mock items)
  source_name: string | null;
  source_url: string | null;
  source_effective_date: string | null;
  source_raw_status: string | null;
}

// ── Source agency lookup ──────────────────────────────────────────────────────

const SOURCE_AGENCY: Record<string, { agency: string; portalUrl: string }> = {
  philly_lni_violations: {
    agency: 'Philadelphia Dept. of Licenses & Inspections — Violations',
    portalUrl: 'https://li.phila.gov',
  },
  philly_rental_license: {
    agency: 'Philadelphia Dept. of Licenses & Inspections — Business Licenses',
    portalUrl: 'https://www.opendataphilly.org/datasets/business-licenses',
  },
  philly_permits: {
    agency: 'Philadelphia Dept. of Licenses & Inspections — Building Permits',
    portalUrl: 'https://www.opendataphilly.org/datasets/building-permits',
  },
  philly_inspections: {
    agency: 'Philadelphia Dept. of Licenses & Inspections — Inspections',
    portalUrl: 'https://www.opendataphilly.org/datasets/l-i-inspections',
  },
};

// ── Provenance labels ─────────────────────────────────────────────────────────

const PROVENANCE_INFO: Record<string, { label: string; description: string; color: string }> = {
  verified_from_source: {
    label: 'Verified from Source',
    description: 'Status was retrieved directly from a Philadelphia Open Data API response.',
    color: 'text-emerald-700',
  },
  derived_from_rule: {
    label: 'Derived from Rule',
    description: 'Status was inferred from Philadelphia compliance regulations. No public source data available — manual verification required.',
    color: 'text-blue-700',
  },
  pending_source_verification: {
    label: 'Pending Source Verification',
    description: 'The source API was queried but returned no matching records. Status requires manual verification.',
    color: 'text-amber-700',
  },
  mock_demo_only: {
    label: 'Demo Data Only',
    description: 'This is a placeholder item. No real source data has been retrieved. Replace by re-evaluating once the property address matches live Philadelphia Open Data records.',
    color: 'text-slate-600',
  },
};

// ── Freshness helpers ─────────────────────────────────────────────────────────

function freshnessInfo(retrievedAt: string | null): { label: string; isStale: boolean; color: string } {
  if (!retrievedAt) return { label: 'No source data', isStale: true, color: 'text-slate-500' };
  const hours = (Date.now() - new Date(retrievedAt).getTime()) / 3_600_000;
  if (hours < 1) return { label: 'Synced recently', isStale: false, color: 'text-emerald-600' };
  if (hours < 24) return { label: 'Synced today', isStale: false, color: 'text-emerald-600' };
  const days = Math.floor(hours / 24);
  if (days < 7) return { label: `Synced ${days}d ago`, isStale: false, color: 'text-amber-600' };
  return { label: `Stale — ${days}d old`, isStale: true, color: 'text-red-600' };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function EvidencePanel({ item }: { item: EvidenceItem }) {
  const [open, setOpen] = useState(false);

  const provInfo = PROVENANCE_INFO[item.provenance] ?? PROVENANCE_INFO.pending_source_verification;
  const srcAgency = item.source_name ? (SOURCE_AGENCY[item.source_name] ?? null) : null;
  const freshness = freshnessInfo(item.source_retrieved_at);

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="inline-flex items-center gap-1 rounded text-[11px] text-muted-foreground hover:text-foreground transition-colors"
      >
        <Database className="size-3" />
        Evidence
        {open ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
      </button>

      {open && (
        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-3 text-xs">
          {/* Provenance */}
          <div className="flex items-start gap-2">
            <Shield className="size-3.5 mt-0.5 shrink-0 text-slate-400" />
            <div>
              <span className={`font-semibold ${provInfo.color}`}>{provInfo.label}</span>
              <p className="text-muted-foreground mt-0.5 leading-relaxed">{provInfo.description}</p>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {/* Source agency */}
            {srcAgency ? (
              <Row label="Source Agency">
                <a
                  href={srcAgency.portalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 text-blue-600 hover:underline"
                >
                  {srcAgency.agency}
                  <ExternalLink className="size-2.5" />
                </a>
              </Row>
            ) : (
              <Row label="Source Agency">
                <span className="text-muted-foreground">
                  {item.provenance === 'derived_from_rule'
                    ? 'RegLynx Rules Engine (Philadelphia Code)'
                    : item.provenance === 'mock_demo_only'
                    ? 'Demo / Mock Data'
                    : 'Unknown'}
                </span>
              </Row>
            )}

            {/* Source name */}
            {item.source_name && (
              <Row label="Dataset">
                {item.source_url ? (
                  <a
                    href={item.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 text-blue-600 hover:underline"
                  >
                    {item.source_name}
                    <ExternalLink className="size-2.5" />
                  </a>
                ) : (
                  <span>{item.source_name}</span>
                )}
              </Row>
            )}

            {/* Retrieved at / freshness */}
            <Row label="Data Freshness">
              <span className={`flex items-center gap-1 ${freshness.color}`}>
                <Clock className="size-3" />
                {freshness.label}
                {item.source_retrieved_at && (
                  <span className="text-muted-foreground ml-1">
                    ({new Date(item.source_retrieved_at).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                    })})
                  </span>
                )}
              </span>
            </Row>

            {/* Effective date */}
            {item.source_effective_date && (
              <Row label="Effective Date">
                {new Date(item.source_effective_date).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric',
                })}
              </Row>
            )}

            {/* Raw source status */}
            {item.source_raw_status && (
              <Row label="Raw Source Status">
                <code className="rounded bg-slate-200 px-1 text-[11px]">
                  {item.source_raw_status}
                </code>
              </Row>
            )}

            {/* RegLynx interpreted status */}
            <Row label="RegLynx Status">
              <span className="font-medium capitalize">{item.status.replace(/_/g, ' ')}</span>
            </Row>

            {/* Confidence */}
            <Row label="Confidence">
              <span className="capitalize">{item.confidence_level.replace(/_/g, ' ')}</span>
            </Row>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">{label}</p>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}
