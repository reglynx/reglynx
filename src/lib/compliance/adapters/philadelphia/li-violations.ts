import type { ComplianceAdapter } from '../../adapter-interface';
import type { Property, ComplianceResult, ComplianceRecord } from '@/lib/types';

/**
 * Philadelphia L&I Violations adapter.
 * Source: OpenDataPhilly / Philadelphia L&I Violations dataset
 * API: https://phl.carto.com/api/v2/sql (public CARTO endpoint)
 */
export class PhiladelphiaLIViolationsAdapter implements ComplianceAdapter {
  readonly name = 'philadelphia_li_violations';
  readonly jurisdiction = 'Philadelphia_PA';
  readonly description = 'Philadelphia Department of Licenses & Inspections — Violations';
  readonly sourceEndpoint = 'https://phl.carto.com/api/v2/sql';

  async check(property: Property): Promise<ComplianceResult> {
    const baseResult: ComplianceResult = {
      adapterName: this.name,
      jurisdiction: this.jurisdiction,
      matchMethod: 'normalized_address',
      matchState: 'no_match',
      recordCount: 0,
      sourceEndpoint: this.sourceEndpoint,
      noMatchReason: null,
      records: [],
      checkedAt: new Date().toISOString(),
    };

    // Determine match strategy
    if (property.local_parcel_id) {
      baseResult.matchMethod = 'local_id';
    }

    try {
      const records = await this.fetchViolations(property);

      if (records.length > 0) {
        baseResult.matchState = 'matched';
        baseResult.recordCount = records.length;
        baseResult.records = records;
      } else {
        baseResult.matchState = 'no_match';
        baseResult.noMatchReason = 'No L&I violation records found for this address';
      }
    } catch (err) {
      console.error(`[${this.name}] check error:`, err);
      baseResult.matchState = 'no_match';
      baseResult.noMatchReason = 'Failed to query L&I violations API';
    }

    return baseResult;
  }

  private async fetchViolations(property: Property): Promise<ComplianceRecord[]> {
    // Normalize address for CARTO query
    const address = this.normalizeAddressForQuery(property);
    if (!address) return [];

    // Query Philadelphia L&I violations via CARTO SQL API
    const query = `
      SELECT violationid, violationdate, violationcodetitle,
             violationstatus, casegroupnumber, casetypetitle,
             opa_account_num, address
      FROM violations
      WHERE UPPER(address) LIKE UPPER('%${this.escapeSql(address)}%')
      ORDER BY violationdate DESC
      LIMIT 50
    `;

    const url = new URL(this.sourceEndpoint);
    url.searchParams.set('q', query);

    const res = await fetch(url.toString());
    if (!res.ok) return [];

    const data = await res.json();
    const rows = data?.rows || [];

    return rows.map((row: Record<string, unknown>) => ({
      id: String(row.violationid || ''),
      type: 'li_violation',
      status: String(row.violationstatus || 'unknown'),
      description: String(row.violationcodetitle || 'L&I Violation'),
      date: row.violationdate ? String(row.violationdate) : null,
      sourceUrl: null,
      rawData: row,
    }));
  }

  private normalizeAddressForQuery(property: Property): string | null {
    // Use address_line1 as the primary match field
    const addr = property.address_line1?.trim();
    if (!addr) return null;

    // Remove apartment/unit suffixes for broader matching
    return addr
      .replace(/\s+(apt|suite|unit|ste|#)\s*\S*/i, '')
      .trim();
  }

  private escapeSql(str: string): string {
    return str.replace(/'/g, "''");
  }
}
