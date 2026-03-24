import type { ComplianceAdapter } from '../../adapter-interface';
import type { Property, ComplianceResult, ComplianceRecord } from '@/lib/types';
import { sanitizeForCarto, normalizePhillyAddress, queryPhillyCarto, CARTO_ENDPOINT } from './carto-utils';

/**
 * Philadelphia Permits adapter.
 * Source: OpenDataPhilly — Permits dataset (public CARTO API)
 */
export class PhiladelphiaPermitsAdapter implements ComplianceAdapter {
  readonly name = 'philadelphia_permits';
  readonly jurisdiction = 'Philadelphia_PA';
  readonly description = 'Philadelphia Department of Licenses & Inspections — Permits';
  readonly sourceEndpoint = CARTO_ENDPOINT;

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

    try {
      const records = await this.fetchPermits(property);

      if (records.length > 0) {
        baseResult.matchState = 'matched';
        baseResult.recordCount = records.length;
        baseResult.records = records;
      } else {
        baseResult.noMatchReason = 'No permit records found for this address.';
      }
    } catch (err) {
      console.error(`[${this.name}] check error:`, err);
      baseResult.noMatchReason = 'Unable to query permits data source at this time.';
    }

    return baseResult;
  }

  private async fetchPermits(property: Property): Promise<ComplianceRecord[]> {
    const address = normalizePhillyAddress(property.address_line1);
    if (!address) return [];

    const safeAddr = sanitizeForCarto(address);

    const query = `
      SELECT permitnumber, permittype, status,
             permitdescription, permitissuedate, permitcompleteddate,
             address, opa_account_num
      FROM permits
      WHERE UPPER(address) LIKE '%${safeAddr}%'
      ORDER BY permitissuedate DESC
      LIMIT 30
    `;

    const rows = await queryPhillyCarto(query);

    return rows.map((row) => ({
      id: String(row.permitnumber || ''),
      type: 'permit',
      status: String(row.status || 'unknown'),
      description: String(row.permitdescription || `Permit ${row.permittype || ''}`),
      date: row.permitissuedate ? String(row.permitissuedate) : null,
      sourceUrl: null,
      rawData: row,
    }));
  }
}
