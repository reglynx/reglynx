import type { ComplianceAdapter } from '../../adapter-interface';
import type { Property, ComplianceResult, ComplianceRecord } from '@/lib/types';
import { sanitizeForCarto, normalizePhillyAddress, queryPhillyCarto, CARTO_ENDPOINT } from './carto-utils';

/**
 * Philadelphia L&I Violations adapter.
 * Source: OpenDataPhilly — L&I Violations dataset (public CARTO API)
 */
export class PhiladelphiaLIViolationsAdapter implements ComplianceAdapter {
  readonly name = 'philadelphia_li_violations';
  readonly jurisdiction = 'Philadelphia_PA';
  readonly description = 'Philadelphia Department of Licenses & Inspections — Violations';
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
      const records = await this.fetchViolations(property);

      if (records.length > 0) {
        baseResult.matchState = 'matched';
        baseResult.recordCount = records.length;
        baseResult.records = records;
      } else {
        baseResult.noMatchReason = 'No L&I violation records found for this address. This may indicate a clean record or an address format mismatch.';
      }
    } catch (err) {
      console.error(`[${this.name}] check error:`, err);
      baseResult.noMatchReason = 'Unable to query L&I violations data source at this time.';
    }

    return baseResult;
  }

  private async fetchViolations(property: Property): Promise<ComplianceRecord[]> {
    const address = normalizePhillyAddress(property.address_line1);
    if (!address) return [];

    const safeAddr = sanitizeForCarto(address);

    const query = `
      SELECT violationnumber, violationdate, violationcodetitle,
             violationstatus, casenumber, casetype,
             opa_account_num, address
      FROM violations
      WHERE UPPER(address) LIKE '%${safeAddr}%'
      ORDER BY violationdate DESC
      LIMIT 50
    `;

    const rows = await queryPhillyCarto(query);

    return rows.map((row) => ({
      id: String(row.violationnumber || ''),
      type: 'li_violation',
      status: String(row.violationstatus || 'unknown'),
      description: String(row.violationcodetitle || 'L&I Violation'),
      date: row.violationdate ? String(row.violationdate) : null,
      sourceUrl: null,
      rawData: row,
    }));
  }
}
