export const LEAD_PAINT_REFERENCES = {
  federal: {
    disclosure_rule: {
      code: '42 U.S.C. § 4852d',
      title: 'Residential Lead-Based Paint Hazard Reduction Act',
      url: 'https://www.epa.gov/lead/residential-lead-based-paint-hazard-reduction-act-title-x-section-1018',
    },
    hud_rule: {
      code: '24 CFR Part 35',
      title: 'HUD Lead Disclosure Rule',
      url: 'https://www.ecfr.gov/current/title-24/subtitle-A/part-35',
    },
    epa_rrp: {
      code: '40 CFR Part 745',
      title: 'EPA Renovation, Repair, and Painting Rule',
      url: 'https://www.ecfr.gov/current/title-40/chapter-I/subchapter-R/part-745',
    },
    penalty_amount: '$27,018 per violation (2026 adjusted)',
    applies_to: 'All housing built before 1978',
    last_verified: '2026-03-20',
  },
  state_PA: {
    statute: {
      code: '35 P.S. § 5901',
      title: 'PA Lead Certification Act',
      url: 'https://www.health.pa.gov/topics/Environmental/Lead/Pages/Lead.aspx',
    },
    last_verified: '2026-03-20',
  },
  local_Philadelphia: {
    statute: {
      code: 'Bill No. 200725',
      title: 'Philadelphia Lead Disclosure and Certification Law',
      url: 'https://www.phila.gov/programs/lead-and-healthy-homes-program/',
    },
    requirement:
      'Lead-safe or lead-free certification required BEFORE a child under 6 occupies any pre-1978 unit',
    penalty: 'Up to $2,000/day per violation',
    last_verified: '2026-03-20',
  },
} as const;

/** Formats lead paint references for injection into AI prompts. */
export function formatLeadPaintReferencesForPrompt(jurisdiction: string): string {
  const lines: string[] = [];

  const fed = LEAD_PAINT_REFERENCES.federal;
  lines.push('FEDERAL LEAD PAINT REFERENCES:');
  lines.push(`- ${fed.disclosure_rule.code}: ${fed.disclosure_rule.title} | ${fed.disclosure_rule.url}`);
  lines.push(`- ${fed.hud_rule.code}: ${fed.hud_rule.title} | ${fed.hud_rule.url}`);
  lines.push(`- ${fed.epa_rrp.code}: ${fed.epa_rrp.title} | ${fed.epa_rrp.url}`);
  lines.push(`- Applies to: ${fed.applies_to}`);
  lines.push(`- Federal penalty: ${fed.penalty_amount}`);

  if (jurisdiction === 'PA' || jurisdiction === 'Philadelphia_PA') {
    const pa = LEAD_PAINT_REFERENCES.state_PA;
    lines.push('\nPENNSYLVANIA STATE REFERENCES:');
    lines.push(`- ${pa.statute.code}: ${pa.statute.title} | ${pa.statute.url}`);
  }

  if (jurisdiction === 'Philadelphia_PA') {
    const phila = LEAD_PAINT_REFERENCES.local_Philadelphia;
    lines.push('\nPHILADELPHIA LOCAL REFERENCES:');
    lines.push(`- ${phila.statute.code}: ${phila.statute.title} | ${phila.statute.url}`);
    lines.push(`- Philadelphia requirement: ${phila.requirement}`);
    lines.push(`- Philadelphia penalty: ${phila.penalty}`);
  }

  return lines.join('\n');
}
