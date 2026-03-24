import type { Property, ComplianceResult } from '@/lib/types';

/**
 * Pluggable compliance adapter interface.
 * Each adapter represents one data source for a specific jurisdiction.
 */
export interface ComplianceAdapter {
  /** Unique adapter name, e.g. 'philadelphia_li_violations' */
  readonly name: string;

  /** Jurisdiction key, e.g. 'Philadelphia_PA' */
  readonly jurisdiction: string;

  /** Human-readable description */
  readonly description: string;

  /** Source endpoint URL (for transparency) */
  readonly sourceEndpoint: string;

  /**
   * Check a property against this compliance data source.
   * Returns records found, match method, and confidence.
   */
  check(property: Property): Promise<ComplianceResult>;
}

/**
 * Registry of all available compliance adapters.
 */
const adapterRegistry: ComplianceAdapter[] = [];

export function registerAdapter(adapter: ComplianceAdapter): void {
  adapterRegistry.push(adapter);
}

export function getAdaptersForJurisdiction(jurisdiction: string): ComplianceAdapter[] {
  return adapterRegistry.filter((a) => a.jurisdiction === jurisdiction);
}

export function getAllAdapters(): ComplianceAdapter[] {
  return [...adapterRegistry];
}
