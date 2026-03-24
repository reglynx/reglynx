import type { ComplianceAdapter } from '../../adapter-interface';
import type { Property, ComplianceResult, ComplianceRecord } from '@/lib/types';
import { sanitizeForCarto, normalizePhillyAddress, queryPhillyCarto, CARTO_ENDPOINT } from './carto-utils';

/**
 * Philadelphia Rental License adapter.
 * Source: OpenDataPhilly — Business Licenses dataset (public CARTO API)
 */
export class PhiladelphiaRentalLicenseAdapter implements ComplianceAdapter {
  readonly name = 'philadelphia_rental_license';
  readonly jurisdiction = 'Philadelphia_PA';
  readonly description = 'Philadelphia Department of Licenses & Inspections — Rental Licenses';
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
      const records = await this.fetchLicenses(property);

      if (records.length > 0) {
        baseResult.matchState = 'matched';
        baseResult.recordCount = records.length;
        baseResult.records = records;
      } else {
        baseResult.noMatchReason = 'No rental license records found for this address. The property may not have an active rental license on file.';
      }
    } catch (err) {
      console.error(`[${this.name}] check error:`, err);
      baseResult.noMatchReason = 'Unable to query rental license data source at this time.';
    }

    return baseResult;
  }

  private async fetchLicenses(property: Property): Promise<ComplianceRecord[]> {
    const address = normalizePhillyAddress(property.address_line1);
    if (!address) return [];

    const safeAddr = sanitizeForCarto(address);

    const query = `
      SELECT licensenumber, licensetype, licensestatus,
             legalname, initialissuedate, expirationdate,
             address, opa_account_num
      FROM li_business_licenses
      WHERE UPPER(address) LIKE '%${safeAddr}%'
        AND UPPER(licensetype) LIKE '%RENTAL%'
      ORDER BY expirationdate DESC
      LIMIT 20
    `;

    const rows = await queryPhillyCarto(query);

    return rows.map((row) => ({
      id: String(row.licensenumber || ''),
      type: 'rental_license',
      status: String(row.licensestatus || 'unknown'),
      description: `Rental License ${row.licensenumber || ''} — ${row.licensestatus || 'unknown'}`,
      date: row.expirationdate ? String(row.expirationdate) : null,
      sourceUrl: null,
      rawData: row,
    }));
  }
}
