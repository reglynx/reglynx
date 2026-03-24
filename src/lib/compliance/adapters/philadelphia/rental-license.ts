import type { ComplianceAdapter } from '../../adapter-interface';
import type { Property, ComplianceResult, ComplianceRecord } from '@/lib/types';

/**
 * Philadelphia Rental License adapter.
 * Source: OpenDataPhilly / Philadelphia Business Licenses dataset
 * API: https://phl.carto.com/api/v2/sql (public CARTO endpoint)
 */
export class PhiladelphiaRentalLicenseAdapter implements ComplianceAdapter {
  readonly name = 'philadelphia_rental_license';
  readonly jurisdiction = 'Philadelphia_PA';
  readonly description = 'Philadelphia Department of Licenses & Inspections — Rental Licenses';
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
      const records = await this.fetchLicenses(property);

      if (records.length > 0) {
        baseResult.matchState = 'matched';
        baseResult.recordCount = records.length;
        baseResult.records = records;
      } else {
        baseResult.matchState = 'no_match';
        baseResult.noMatchReason = 'No rental license records found for this address';
      }
    } catch (err) {
      console.error(`[${this.name}] check error:`, err);
      baseResult.matchState = 'no_match';
      baseResult.noMatchReason = 'Failed to query rental license API';
    }

    return baseResult;
  }

  private async fetchLicenses(property: Property): Promise<ComplianceRecord[]> {
    const address = property.address_line1?.trim();
    if (!address) return [];

    // Query Philadelphia business licenses for rental activity licenses
    const query = `
      SELECT licensenumber, licensetype, licensestatus,
             legalname, initialissuedate, expirationdate,
             address, opa_account_num
      FROM li_business_licenses
      WHERE UPPER(address) LIKE UPPER('%${this.escapeSql(address.replace(/\s+(apt|suite|unit|ste|#)\s*\S*/i, '').trim())}%')
        AND UPPER(licensetype) LIKE '%RENTAL%'
      ORDER BY expirationdate DESC
      LIMIT 20
    `;

    const url = new URL(this.sourceEndpoint);
    url.searchParams.set('q', query);

    const res = await fetch(url.toString());
    if (!res.ok) return [];

    const data = await res.json();
    const rows = data?.rows || [];

    return rows.map((row: Record<string, unknown>) => ({
      id: String(row.licensenumber || ''),
      type: 'rental_license',
      status: String(row.licensestatus || 'unknown'),
      description: `Rental License ${row.licensenumber || ''} — ${row.licensestatus || 'unknown'}`,
      date: row.expirationdate ? String(row.expirationdate) : null,
      sourceUrl: null,
      rawData: row,
    }));
  }

  private escapeSql(str: string): string {
    return str.replace(/'/g, "''");
  }
}
