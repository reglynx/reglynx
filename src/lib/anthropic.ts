import Anthropic from '@anthropic-ai/sdk';
import type { Organization, Property, DocumentTemplate } from './types';
import { LEGAL_DISCLAIMER } from './constants';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

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

export async function generateDocument(
  template: DocumentTemplate,
  org: Organization,
  property?: Property | null
): Promise<string> {
  const hydratedPrompt = hydrateTemplate(template.prompt_template, org, property);

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: `You are a compliance document TEMPLATE specialist for the property management industry. You draft document templates based on published regulations.

CRITICAL RULES:
1. ONLY use regulation citations that are provided in the template prompt below. NEVER invent, guess, or generate citation numbers on your own. If you are unsure about a citation, write "VERIFY WITH COUNSEL: [description of regulation]" instead.
2. NEVER claim the document ensures legal compliance. Always frame as "based on published regulations as of [date]."
3. NEVER use the phrase "legal advice" — this is a template, not legal counsel.
4. Include "DRAFT — REVIEW WITH QUALIFIED COUNSEL BEFORE IMPLEMENTATION" as a header on every document.
5. If the template prompt includes regulation references, use ONLY those exact references. Do not supplement with additional citations.
6. At the end of every document, include this standard RegLynx disclaimer block:

${LEGAL_DISCLAIMER}
Generated: ${new Date().toISOString().split('T')[0]} | Template Version: ${template.version}`,
    messages: [{ role: 'user', content: hydratedPrompt }],
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  return textBlock?.text || '';
}
