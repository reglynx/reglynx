export const OSHA_PROPERTY_MANAGEMENT_STANDARDS = {
  emergency_action_plans: {
    code: '29 CFR 1910.38',
    title: 'Emergency Action Plans',
    url: 'https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.38',
    last_verified: '2026-03-20',
    applies_to: ['all_properties'],
  },
  fire_prevention: {
    code: '29 CFR 1910.39',
    title: 'Fire Prevention Plans',
    url: 'https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.39',
    last_verified: '2026-03-20',
    applies_to: ['all_properties'],
  },
  portable_fire_extinguishers: {
    code: '29 CFR 1910.157',
    title: 'Portable Fire Extinguishers',
    url: 'https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.157',
    last_verified: '2026-03-20',
    applies_to: ['commercial', 'mixed_use'],
  },
  hazard_communication: {
    code: '29 CFR 1910.1200',
    title: 'Hazard Communication (cleaning chemicals, maintenance)',
    url: 'https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.1200',
    last_verified: '2026-03-20',
    applies_to: ['all_properties'],
  },
  bloodborne_pathogens: {
    code: '29 CFR 1910.1030',
    title: 'Bloodborne Pathogens (maintenance staff exposure)',
    url: 'https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.1030',
    last_verified: '2026-03-20',
    applies_to: ['all_properties'],
  },
  fall_protection: {
    code: '29 CFR 1910.28',
    title: 'Duty to Have Fall Protection',
    url: 'https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.28',
    last_verified: '2026-03-20',
    applies_to: ['all_properties'],
  },
  electrical_safety: {
    code: '29 CFR 1910.303',
    title: 'General Requirements for Electrical Safety',
    url: 'https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.303',
    last_verified: '2026-03-20',
    applies_to: ['all_properties'],
  },
  lockout_tagout: {
    code: '29 CFR 1910.147',
    title: 'Control of Hazardous Energy (HVAC, elevators)',
    url: 'https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.147',
    last_verified: '2026-03-20',
    applies_to: ['commercial', 'mixed_use', 'residential_multifamily'],
  },
  confined_spaces: {
    code: '29 CFR 1910.146',
    title: 'Permit-Required Confined Spaces (boiler rooms, crawl spaces)',
    url: 'https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.146',
    last_verified: '2026-03-20',
    applies_to: ['all_properties'],
  },
  general_ppe: {
    code: '29 CFR 1910.132',
    title: 'General Requirements for PPE (maintenance staff)',
    url: 'https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.132',
    last_verified: '2026-03-20',
    applies_to: ['all_properties'],
  },
} as const;

export type OshaStandard = keyof typeof OSHA_PROPERTY_MANAGEMENT_STANDARDS;

/** Returns OSHA standards that apply to a given property type. */
export function getApplicableOshaStandards(propertyType: string) {
  return Object.entries(OSHA_PROPERTY_MANAGEMENT_STANDARDS).filter(([, std]) => {
    const appliesToArray = std.applies_to as readonly string[];
    return appliesToArray.includes('all_properties') || appliesToArray.includes(propertyType);
  });
}

/** Formats OSHA references for injection into AI prompts. */
export function formatOshaReferencesForPrompt(propertyType: string): string {
  const applicable = getApplicableOshaStandards(propertyType);
  return applicable
    .map(([, std]) => `- ${std.code}: ${std.title} | ${std.url}`)
    .join('\n');
}
