import type { ComplianceAdapter } from '../../adapter-interface';
import type { Property, ComplianceResult, ComplianceRecord } from '@/lib/types';

/**
 * Philadelphia Permits adapter.
 * Source: OpenDataPhilly / Philadelphia Permits dataset
 * API: https://phl.carto.com/api/v2/sql (public CARTO endpoint)
 */
export class PhiladelphiaPermitsAdapter implements ComplianceAdapter {
  readonly name = 'philadelphia_permits';
  readonly jurisdiction = 'Philadelphia_PA';
  readonly description = 'Philadelphia Department of Licenses & Inspections — Permits';
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

    if (property.local_parcel_id) {
      baseResult.matchMethod = 'local_id';
    }

    try {
      const records = await this.fetchPermits(property);

      if (records.length > 0) {
        baseResult.matchState = 'matched';
        baseResult.recordCount = records.length;
        baseResult.records = records;
      } else {
        baseResult.matchState = 'no_match';
        baseResult.noMatchReason = 'No permit records found for this address';
      }
    } catch (err) {
      console.error(`[${this.name}] check error:`, err);
      baseResult.matchState = 'no_match';
      baseResult.noMatchReason = 'Failed to query permits API';
    }

    return baseResult;
  }

  private async fetchPermits(property: Property): Promise<ComplianceRecord[]> {
    const address = property.address_line1?.trim();
    if (!address) return [];

    const query = `
      SELECT permitnumber, permittype, status,
             permitdescription, permitissuedate, completed_date,
             address, opa_account_num
      FROM permits
      WHERE UPPER(address) LIKE UPPER('%${this.escapeSql(address.replace(/\s+(apt|suite|unit|ste|#)\s*\S*/i, '').trim())}%')
      ORDER BY permitissuedate DESC
      LIMIT 30
    `;

    const url = new URL(this.sourceEndpoint);
    url.searchParams.set('q', query);

    const res = await fetch(url.toString());
    if (!res.ok) return [];

    const data = await res.json();
    const rows = data?.rows || [];

    return rows.map((row: Record<string, unknown>) => ({
      id: String(row.permitnumber || ''),
      type: 'permit',
      status: String(row.status || 'unknown'),
      description: String(row.permitdescription || `Permit ${row.permittype || ''}`),
      date: row.permitissuedate ? String(row.permitissuedate) : null,
      sourceUrl: null,
      rawData: row,
    }));
  }

  private escapeSql(str: string): string {
    return str.replace(/'/g, "''");
  }
}
