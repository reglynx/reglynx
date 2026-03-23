/**
 * Federal Register API integration
 * Base URL: https://www.federalregister.gov/api/v1
 * No API key required.
 */

export const PROPERTY_MANAGEMENT_AGENCIES = [
  'housing-and-urban-development-department', // HUD
  'environmental-protection-agency', // EPA (lead paint, environmental)
  'labor-department', // OSHA
  'justice-department', // DOJ (Fair Housing enforcement)
  'consumer-financial-protection-bureau', // CFPB (lending/leasing)
] as const;

export const PM_SEARCH_TERMS = [
  'fair housing',
  'lead-based paint',
  'rental property',
  'landlord tenant',
  'OSHA workplace safety',
  'ADA accessibility',
  'Section 8 housing',
  'housing choice voucher',
  'habitability',
  'security deposit',
  'eviction',
  'property management',
  'HUD compliance',
  'mold remediation',
  'fire safety residential',
  'rent stabilization',
  'affordable housing compliance',
] as const;

const FR_BASE_URL = 'https://www.federalregister.gov/api/v1';

export interface FederalRegisterDocument {
  document_number: string;
  title: string;
  abstract: string | null;
  html_url: string;
  publication_date: string;
  type: 'RULE' | 'PRORULE' | 'NOTICE' | 'PRESDOCU';
  agencies: Array<{ raw_name: string; slug: string; url?: string }>;
}

export interface FederalRegisterResponse {
  count: number;
  total_pages: number;
  results: FederalRegisterDocument[];
}

/**
 * Fetch recent regulatory documents from the Federal Register for a specific agency.
 * Returns documents published in the last `daysBack` days.
 */
export async function fetchAgencyDocuments(
  agencySlug: string,
  daysBack = 30,
): Promise<FederalRegisterDocument[]> {
  const date = new Date();
  date.setDate(date.getDate() - daysBack);
  const cutoffDate = date.toISOString().split('T')[0]; // YYYY-MM-DD

  const params = new URLSearchParams({
    'conditions[agencies][]': agencySlug,
    'conditions[publication_date][gte]': cutoffDate,
    'fields[]': 'title',
    'per_page': '20',
  });
  // Append multi-value params manually
  const url =
    `${FR_BASE_URL}/documents.json?` +
    params.toString() +
    '&conditions[type][]=RULE&conditions[type][]=PRORULE' +
    '&fields[]=abstract&fields[]=document_number&fields[]=html_url' +
    '&fields[]=publication_date&fields[]=agencies&fields[]=type';

  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    console.error(
      `Federal Register API error for agency ${agencySlug}: ${res.status} ${res.statusText}`,
    );
    return [];
  }

  const data: FederalRegisterResponse = await res.json();
  return data.results ?? [];
}

/**
 * Fetch recent documents by search term.
 */
export async function fetchDocumentsBySearchTerm(
  term: string,
  daysBack = 30,
): Promise<FederalRegisterDocument[]> {
  const date = new Date();
  date.setDate(date.getDate() - daysBack);
  const cutoffDate = date.toISOString().split('T')[0];

  const params = new URLSearchParams({
    'conditions[term]': term,
    'conditions[publication_date][gte]': cutoffDate,
    'per_page': '10',
  });
  const url =
    `${FR_BASE_URL}/documents.json?` +
    params.toString() +
    '&conditions[type][]=RULE&conditions[type][]=PRORULE' +
    '&fields[]=title&fields[]=abstract&fields[]=document_number' +
    '&fields[]=html_url&fields[]=publication_date&fields[]=agencies&fields[]=type';

  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    console.error(
      `Federal Register search error for term "${term}": ${res.status} ${res.statusText}`,
    );
    return [];
  }

  const data: FederalRegisterResponse = await res.json();
  return data.results ?? [];
}

/**
 * Determine if a Federal Register document is relevant to property management.
 */
export function isPropertyManagementRelevant(doc: FederalRegisterDocument): boolean {
  const text = `${doc.title} ${doc.abstract ?? ''}`.toLowerCase();
  const keywords = [
    'housing',
    'rental',
    'landlord',
    'tenant',
    'property',
    'lead',
    'fair housing',
    'osha',
    'section 8',
    'eviction',
    'habitability',
    'fair practices',
    'mold',
    'fire safety',
    'affordable housing',
    'voucher',
  ];
  return keywords.some((kw) => text.includes(kw));
}

/**
 * Map a Federal Register document type and agency to a severity level.
 */
export function mapDocumentSeverity(
  type: FederalRegisterDocument['type'],
): 'critical' | 'warning' | 'info' {
  if (type === 'RULE') return 'critical';
  if (type === 'PRORULE') return 'warning';
  return 'info';
}

/**
 * Determine which document types are affected by a Federal Register document.
 */
export function getAffectedDocumentTypes(doc: FederalRegisterDocument): string[] {
  const text = `${doc.title} ${doc.abstract ?? ''}`.toLowerCase();
  const affected: string[] = [];

  if (text.includes('fair housing') || text.includes('protected class')) {
    affected.push('fair_housing_policy');
  }
  if (text.includes('lead') || text.includes('paint')) {
    affected.push('lead_disclosure', 'phila_lead_safe');
  }
  if (text.includes('osha') || text.includes('emergency') || text.includes('fire')) {
    affected.push('emergency_action_plan');
  }
  if (text.includes('disability') || text.includes('ada') || text.includes('accessible')) {
    affected.push('ada_policy');
  }
  if (text.includes('landlord') || text.includes('tenant') || text.includes('eviction') || text.includes('security deposit')) {
    affected.push('landlord_tenant_rights');
  }
  if (text.includes('rental license') || text.includes('rental permit')) {
    affected.push('phila_rental_license');
  }

  // Default: flag emergency action plan as potentially affected
  if (affected.length === 0) {
    affected.push('emergency_action_plan');
  }

  return affected;
}

/**
 * Fetch all property-management-relevant documents across all tracked agencies.
 * De-duplicates by document_number.
 */
export async function fetchAllPropertyManagementDocuments(
  daysBack = 30,
): Promise<FederalRegisterDocument[]> {
  const seen = new Set<string>();
  const allDocs: FederalRegisterDocument[] = [];

  // Fetch by agency
  for (const agencySlug of PROPERTY_MANAGEMENT_AGENCIES) {
    const docs = await fetchAgencyDocuments(agencySlug, daysBack);
    for (const doc of docs) {
      if (!seen.has(doc.document_number) && isPropertyManagementRelevant(doc)) {
        seen.add(doc.document_number);
        allDocs.push(doc);
      }
    }
  }

  // Fetch by search term (broader net)
  for (const term of PM_SEARCH_TERMS.slice(0, 5)) {
    // Limit to avoid rate limiting
    const docs = await fetchDocumentsBySearchTerm(term, daysBack);
    for (const doc of docs) {
      if (!seen.has(doc.document_number)) {
        seen.add(doc.document_number);
        allDocs.push(doc);
      }
    }
  }

  return allDocs;
}
