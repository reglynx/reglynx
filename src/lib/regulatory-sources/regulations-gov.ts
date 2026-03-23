/**
 * Regulations.gov API integration
 * Base URL: https://api.regulations.gov/v4
 * Requires API key: REGULATIONS_GOV_API_KEY
 * Register at: https://open.gsa.gov/api/regulationsgov/
 */

const RG_BASE_URL = 'https://api.regulations.gov/v4';

export interface RegulationsGovDocument {
  id: string;
  attributes: {
    docketId: string | null;
    documentType: string;
    frDocNum: string | null;
    lastModifiedDate: string;
    objectId: string;
    openForComment: boolean;
    postedDate: string;
    title: string;
    commentEndDate: string | null;
    commentStartDate: string | null;
    subtype: string | null;
  };
}

export interface RegulationsGovDocket {
  id: string;
  attributes: {
    agencyId: string;
    docketType: string;
    lastModifiedDate: string;
    objectId: string;
    title: string;
    program: string | null;
    rin: string | null;
  };
}

/** Housing and property management related agency codes on regulations.gov */
const PM_AGENCY_IDS = ['HUD', 'EPA', 'DOL', 'DOJ', 'CFPB'] as const;

function getApiKey(): string | null {
  return process.env.REGULATIONS_GOV_API_KEY ?? null;
}

/**
 * Fetch open comment periods for housing/property regulations.
 * Returns null if no API key is configured.
 */
export async function fetchOpenCommentPeriods(): Promise<RegulationsGovDocument[] | null> {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn('REGULATIONS_GOV_API_KEY not set — skipping Regulations.gov fetch');
    return null;
  }

  try {
    const params = new URLSearchParams({
      'filter[agencyId]': PM_AGENCY_IDS.join(','),
      'filter[documentType]': 'Proposed Rule',
      'filter[commentEndDate][gte]': new Date().toISOString().split('T')[0],
      'sort': '-postedDate',
      'page[size]': '25',
    });

    const res = await fetch(`${RG_BASE_URL}/documents?${params.toString()}`, {
      headers: {
        'X-Api-Key': apiKey,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      console.error(`Regulations.gov API error: ${res.status} ${res.statusText}`);
      return null;
    }

    const data = await res.json();
    return (data.data as RegulationsGovDocument[]) ?? [];
  } catch (error) {
    console.error('Regulations.gov fetch error:', error);
    return null;
  }
}

/**
 * Fetch docket details for a specific docket ID.
 */
export async function fetchDocketDetails(docketId: string): Promise<RegulationsGovDocket | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  try {
    const res = await fetch(`${RG_BASE_URL}/dockets/${docketId}`, {
      headers: { 'X-Api-Key': apiKey },
      next: { revalidate: 3600 },
    });

    if (!res.ok) return null;

    const data = await res.json();
    return data.data as RegulationsGovDocket;
  } catch {
    return null;
  }
}

/**
 * Filter open comment period documents to those relevant to property management.
 */
export function filterPropertyManagementDockets(docs: RegulationsGovDocument[]): RegulationsGovDocument[] {
  const keywords = [
    'housing', 'rental', 'landlord', 'tenant', 'property',
    'lead', 'fair housing', 'section 8', 'voucher', 'habitability',
    'eviction', 'affordable housing', 'hud', 'osha',
  ];
  return docs.filter((doc) => {
    const title = doc.attributes.title.toLowerCase();
    return keywords.some((kw) => title.includes(kw));
  });
}
