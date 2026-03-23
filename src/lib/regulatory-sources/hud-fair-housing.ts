export const FAIR_HOUSING_REFERENCES = {
  federal: {
    protected_classes: [
      'race',
      'color',
      'national origin',
      'religion',
      'sex (including gender identity and sexual orientation)',
      'familial status',
      'disability',
    ],
    primary_statute: {
      code: '42 U.S.C. §§ 3601-3619',
      title: 'Fair Housing Act',
      url: 'https://www.justice.gov/crt/fair-housing-act-1',
    },
    hud_regulations: {
      code: '24 CFR Part 100',
      title: 'HUD Fair Housing Regulations',
      url: 'https://www.ecfr.gov/current/title-24/subtitle-B/chapter-I/subchapter-A/part-100',
    },
    ada_supplement: {
      code: '42 U.S.C. § 12101',
      title: 'Americans with Disabilities Act',
      url: 'https://www.ada.gov/law-and-regs/ada/',
    },
    last_verified: '2026-03-20',
  },
  state_PA: {
    additional_protected_classes: [
      'age (40+)',
      'ancestry',
      'use of guide or support animal',
      'handler or trainer of support animal',
      'GED vs diploma holder',
    ],
    primary_statute: {
      code: '43 P.S. §§ 951-963',
      title: 'Pennsylvania Human Relations Act',
      url: 'https://www.phrc.pa.gov/About-Us/Pages/Pennsylvania-Human-Relations-Act.aspx',
    },
    last_verified: '2026-03-20',
  },
  local_Philadelphia: {
    additional_protected_classes: [
      'source of income (Section 8 voucher)',
      'domestic/sexual violence survivor status',
      'gender identity',
      'sexual orientation',
      'marital status',
      'age (any age)',
    ],
    primary_statute: {
      code: 'Philadelphia Code Chapter 9-1100',
      title: 'Philadelphia Fair Practices Ordinance',
      url: 'https://codelibrary.amlegal.com/codes/philadelphia/latest/philadelphia_pa/0-0-0-200094',
    },
    last_verified: '2026-03-20',
  },
} as const;

/** Returns relevant fair housing references for a given jurisdiction key. */
export function getFairHousingReferencesForJurisdiction(jurisdiction: string) {
  const refs: Record<string, unknown>[] = [FAIR_HOUSING_REFERENCES.federal];
  if (jurisdiction === 'PA' || jurisdiction === 'Philadelphia_PA') {
    refs.push(FAIR_HOUSING_REFERENCES.state_PA);
  }
  if (jurisdiction === 'Philadelphia_PA') {
    refs.push(FAIR_HOUSING_REFERENCES.local_Philadelphia);
  }
  return refs;
}

/** Formats fair housing references for injection into AI prompts. */
export function formatFairHousingReferencesForPrompt(jurisdiction: string): string {
  const lines: string[] = [];

  // Federal always applies
  const fed = FAIR_HOUSING_REFERENCES.federal;
  lines.push('FEDERAL FAIR HOUSING REFERENCES:');
  lines.push(`- ${fed.primary_statute.code}: ${fed.primary_statute.title} | ${fed.primary_statute.url}`);
  lines.push(`- ${fed.hud_regulations.code}: ${fed.hud_regulations.title} | ${fed.hud_regulations.url}`);
  lines.push(`- ${fed.ada_supplement.code}: ${fed.ada_supplement.title} | ${fed.ada_supplement.url}`);
  lines.push(`- Federal protected classes: ${fed.protected_classes.join(', ')}`);

  if (jurisdiction === 'PA' || jurisdiction === 'Philadelphia_PA') {
    const pa = FAIR_HOUSING_REFERENCES.state_PA;
    lines.push('\nPENNSYLVANIA STATE REFERENCES:');
    lines.push(`- ${pa.primary_statute.code}: ${pa.primary_statute.title} | ${pa.primary_statute.url}`);
    lines.push(`- PA additional protected classes: ${pa.additional_protected_classes.join(', ')}`);
  }

  if (jurisdiction === 'Philadelphia_PA') {
    const phila = FAIR_HOUSING_REFERENCES.local_Philadelphia;
    lines.push('\nPHILADELPHIA LOCAL REFERENCES:');
    lines.push(`- ${phila.primary_statute.code}: ${phila.primary_statute.title} | ${phila.primary_statute.url}`);
    lines.push(`- Philadelphia additional protected classes: ${phila.additional_protected_classes.join(', ')}`);
  }

  return lines.join('\n');
}
