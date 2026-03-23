import Anthropic from '@anthropic-ai/sdk';
import type { Organization, Property, DocumentTemplate } from './types';
import { LEGAL_DISCLAIMER } from './constants';
import {
  formatFairHousingReferencesForPrompt,
} from './regulatory-sources/hud-fair-housing';
import {
  formatLeadPaintReferencesForPrompt,
} from './regulatory-sources/lead-paint';
import {
  formatOshaReferencesForPrompt,
} from './regulatory-sources/osha-standards';

let _anthropic: Anthropic | null = null;
function getAnthropicClient(): Anthropic {
  if (!_anthropic) {
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  }
  return _anthropic;
}

function hydrateTemplate(
  template: string,
  org: Organization,
  property?: Property | null
): string {
  let result = template;

  // Org-level replacements
  result = result.replace(/\{\{org_name\}\}/g, org.name);
  result = result.replace(/\{\{entity_type\}\}/g, org.entity_type || 'LLC');
  result = result.replace(/\{\{unit_count\}\}/g, String(org.unit_count || 0));

  // Property-level replacements
  if (property) {
    result = result.replace(/\{\{property_name\}\}/g, property.name);
    result = result.replace(
      /\{\{property_address\}\}/g,
      `${property.address_line1}${property.address_line2 ? ', ' + property.address_line2 : ''}, ${property.city}, ${property.state} ${property.zip}`
    );
    result = result.replace(/\{\{property_type\}\}/g, property.property_type);
    result = result.replace(/\{\{year_built\}\}/g, String(property.year_built || 'Unknown'));
    result = result.replace(/\{\{has_lead_paint\}\}/g, String(property.has_lead_paint));
    result = result.replace(/\{\{has_pool\}\}/g, String(property.has_pool));
    result = result.replace(/\{\{has_elevator\}\}/g, String(property.has_elevator));
    result = result.replace(/\{\{state\}\}/g, property.state);
    result = result.replace(/\{\{city\}\}/g, property.city);
  }

  // Fallback: replace any remaining state/city with org-level if no property
  if (!property) {
    result = result.replace(/\{\{state\}\}/g, 'PA');
    result = result.replace(/\{\{city\}\}/g, 'Philadelphia');
  }

  return result;
}

/**
 * Build the verified references block for a given document type and jurisdiction.
 * These are ONLY hard-coded, verified references — never hallucinated.
 */
function buildVerifiedReferences(
  documentType: string,
  jurisdiction: string,
  property?: Property | null,
): string {
  const propertyType = property?.property_type ?? 'residential_multifamily';

  switch (documentType) {
    case 'fair_housing_policy':
    case 'ada_policy':
      return formatFairHousingReferencesForPrompt(jurisdiction);

    case 'lead_disclosure':
    case 'phila_lead_safe':
      return formatLeadPaintReferencesForPrompt(jurisdiction);

    case 'emergency_action_plan':
      return formatOshaReferencesForPrompt(propertyType);

    case 'landlord_tenant_rights':
      // PA-specific statutory references (verified)
      return `PENNSYLVANIA LANDLORD-TENANT REFERENCES:
- 68 P.S. §§ 250.101-250.602: Landlord and Tenant Act of 1951 | https://www.legis.state.pa.us/cfdocs/legis/LI/uconsCheck.cfm?txtType=HTM&yr=1951&sessInd=0&smthLwInd=0&act=0020.
- 68 Pa. C.S. §§ 8101-8415: Landlord and Tenant Act of 1995 (Residential) | https://www.legis.state.pa.us/cfdocs/legis/LI/uconsCheck.cfm?txtType=HTM&yr=1995&sessInd=0&smthLwInd=0&act=0029.
- 35 P.S. § 1700-1: Warranty of Habitability (PA) | https://www.legis.state.pa.us/`;

    case 'phila_rental_license':
      return `PHILADELPHIA RENTAL LICENSE REFERENCES:
- Philadelphia Code § 9-3901: Rental License Requirement | https://www.phila.gov/services/permits-violations-licenses/get-a-license/business-licenses/rental-property/
- Philadelphia Code Chapter 6-800: Property Maintenance Code | https://www.phila.gov/services/permits-violations-licenses/
- Philadelphia Code § 9-1001: Certificate of Rental Suitability | https://www.phila.gov/services/permits-violations-licenses/get-a-license/business-licenses/rental-property/`;

    default:
      return `GENERAL COMPLIANCE REFERENCES (federal):
- 42 U.S.C. §§ 3601-3619: Fair Housing Act | https://www.justice.gov/crt/fair-housing-act-1
- 24 CFR Part 100: HUD Fair Housing Regulations | https://www.ecfr.gov/current/title-24/subtitle-B/chapter-I/subchapter-A/part-100`;
  }
}

export async function generateDocument(
  template: DocumentTemplate,
  org: Organization,
  property?: Property | null
): Promise<string> {
  const hydratedPrompt = hydrateTemplate(template.prompt_template, org, property);

  // Build verified, hard-coded references for this document type
  const verifiedReferences = buildVerifiedReferences(
    template.document_type,
    template.jurisdiction,
    property,
  );

  const response = await getAnthropicClient().messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: `You are a compliance document TEMPLATE specialist for the property management industry. You draft document templates based on published regulations.

CRITICAL RULES — READ CAREFULLY:
1. Use ONLY the regulation references provided in the "VERIFIED REFERENCES" section below. Do NOT add any citations not listed there. NEVER invent, guess, or generate citation numbers on your own.
2. If you need to reference a regulation that is NOT in the VERIFIED REFERENCES list, write "VERIFY WITH COUNSEL: [description of regulation]" instead of inventing a citation.
3. NEVER claim the document ensures legal compliance. Always frame as "based on published regulations as of [date]."
4. NEVER use the phrase "legal advice" — this is a template, not legal counsel.
5. Include "DRAFT — REVIEW WITH QUALIFIED COUNSEL BEFORE IMPLEMENTATION" as a prominent header on every document.
6. At the end of every document, include the standard RegLynx disclaimer block provided below.
7. Every citation in the output MUST come from the VERIFIED REFERENCES list below. This is a hard requirement.

VERIFIED REFERENCES (use ONLY these — no others):
${verifiedReferences}

STANDARD DISCLAIMER (include verbatim at end of document):
${LEGAL_DISCLAIMER}
Generated: ${new Date().toISOString().split('T')[0]} | Template Version: ${template.version}`,
    messages: [{ role: 'user', content: hydratedPrompt }],
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  return textBlock?.text || '';
}
