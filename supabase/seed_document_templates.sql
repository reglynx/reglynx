-- =============================================================================
-- RegLynx — Document Templates Seed
-- Run this in the Supabase SQL Editor (Project → SQL Editor → New query)
-- Safe to re-run: uses INSERT ... ON CONFLICT DO NOTHING
-- =============================================================================

-- 1. Federal Fair Housing Policy
INSERT INTO document_templates
  (document_type, jurisdiction, title, description, prompt_template, regulation_references, is_active, version)
VALUES (
  'fair_housing_policy',
  'federal',
  'Federal Fair Housing Policy',
  'Fair Housing Act compliance policy for all property types — federal jurisdiction.',
  E'Draft a comprehensive Fair Housing Policy for {{org_name}}, a {{entity_type}} that manages {{unit_count}} units.\n\nThe policy must:\n1. State the organization''s commitment to fair housing under the Fair Housing Act.\n2. List ALL seven federally protected classes verbatim.\n3. Describe prohibited conduct (discriminatory advertising, steering, refusal to rent, differing terms/conditions).\n4. Explain reasonable accommodation and modification obligations for persons with disabilities.\n5. Describe the internal complaint procedure.\n6. State penalties for violations by staff.\n7. Include a staff acknowledgment section.\n\nUse only the regulation references provided in the system prompt. Do not invent citations.',
  '[
    {"code": "42 U.S.C. §§ 3601-3619", "title": "Fair Housing Act", "url": "https://www.justice.gov/crt/fair-housing-act-1"},
    {"code": "24 CFR Part 100", "title": "HUD Fair Housing Regulations", "url": "https://www.ecfr.gov/current/title-24/subtitle-B/chapter-I/subchapter-A/part-100"},
    {"code": "42 U.S.C. § 12101", "title": "Americans with Disabilities Act", "url": "https://www.ada.gov/law-and-regs/ada/"}
  ]',
  true,
  1
)
ON CONFLICT (document_type, jurisdiction) DO NOTHING;

-- 2. Pennsylvania Fair Housing Policy
INSERT INTO document_templates
  (document_type, jurisdiction, title, description, prompt_template, regulation_references, is_active, version)
VALUES (
  'fair_housing_policy',
  'PA',
  'Pennsylvania Fair Housing Policy',
  'Fair Housing policy for Pennsylvania properties — includes state protected classes under PHRA.',
  E'Draft a comprehensive Fair Housing Policy for {{org_name}}, a {{entity_type}} that manages {{unit_count}} units in Pennsylvania.\n\nThe policy must:\n1. State the organization''s commitment to fair housing under BOTH the federal Fair Housing Act AND the Pennsylvania Human Relations Act.\n2. List ALL seven federal protected classes verbatim.\n3. List ALL Pennsylvania-specific additional protected classes verbatim (age 40+, ancestry, use of guide/support animal, handler/trainer of support animal, GED vs diploma).\n4. Describe prohibited conduct under both laws.\n5. Explain reasonable accommodation obligations.\n6. Describe the internal complaint procedure, including referral to the Pennsylvania Human Relations Commission (PHRC).\n7. Include a staff acknowledgment section.\n\nUse only the regulation references provided in the system prompt. Do not invent citations.',
  '[
    {"code": "42 U.S.C. §§ 3601-3619", "title": "Fair Housing Act", "url": "https://www.justice.gov/crt/fair-housing-act-1"},
    {"code": "24 CFR Part 100", "title": "HUD Fair Housing Regulations", "url": "https://www.ecfr.gov/current/title-24/subtitle-B/chapter-I/subchapter-A/part-100"},
    {"code": "43 P.S. §§ 951-963", "title": "Pennsylvania Human Relations Act", "url": "https://www.phrc.pa.gov/About-Us/Pages/Pennsylvania-Human-Relations-Act.aspx"}
  ]',
  true,
  1
)
ON CONFLICT (document_type, jurisdiction) DO NOTHING;

-- 3. Philadelphia Fair Housing Policy
INSERT INTO document_templates
  (document_type, jurisdiction, title, description, prompt_template, regulation_references, is_active, version)
VALUES (
  'fair_housing_policy',
  'Philadelphia_PA',
  'Philadelphia Fair Housing Policy',
  'Fair Housing policy for Philadelphia properties — federal, PA, and Philadelphia protected classes.',
  E'Draft a comprehensive Fair Housing Policy for {{org_name}}, a {{entity_type}} that manages {{unit_count}} units in Philadelphia, PA.\n\nThe policy must:\n1. State compliance with federal Fair Housing Act, Pennsylvania Human Relations Act, AND Philadelphia Fair Practices Ordinance.\n2. List ALL seven federal protected classes verbatim.\n3. List ALL Pennsylvania-specific additional protected classes verbatim.\n4. List ALL Philadelphia-specific additional protected classes verbatim (source of income including Section 8 vouchers, domestic/sexual violence survivor status, gender identity, sexual orientation, marital status, age — any age).\n5. Describe the prohibition on source-of-income discrimination and its implications for Section 8 voucher holders.\n6. Explain reasonable accommodation obligations.\n7. Describe the complaint procedure, including referral to the Philadelphia Commission on Human Relations (PCHR).\n8. Include a staff acknowledgment section.\n\nUse only the regulation references provided in the system prompt. Do not invent citations.',
  '[
    {"code": "42 U.S.C. §§ 3601-3619", "title": "Fair Housing Act", "url": "https://www.justice.gov/crt/fair-housing-act-1"},
    {"code": "24 CFR Part 100", "title": "HUD Fair Housing Regulations", "url": "https://www.ecfr.gov/current/title-24/subtitle-B/chapter-I/subchapter-A/part-100"},
    {"code": "43 P.S. §§ 951-963", "title": "Pennsylvania Human Relations Act", "url": "https://www.phrc.pa.gov/About-Us/Pages/Pennsylvania-Human-Relations-Act.aspx"},
    {"code": "Philadelphia Code Chapter 9-1100", "title": "Philadelphia Fair Practices Ordinance", "url": "https://codelibrary.amlegal.com/codes/philadelphia/latest/philadelphia_pa/0-0-0-200094"}
  ]',
  true,
  1
)
ON CONFLICT (document_type, jurisdiction) DO NOTHING;

-- 4. Federal Lead-Based Paint Disclosure
INSERT INTO document_templates
  (document_type, jurisdiction, title, description, prompt_template, regulation_references, is_active, version)
VALUES (
  'lead_disclosure',
  'federal',
  'Lead-Based Paint Disclosure',
  'Required EPA/HUD lead-based paint disclosure for pre-1978 residential properties.',
  E'Draft a Lead-Based Paint Disclosure form for {{org_name}} for the property: {{property_name}} located at {{property_address}}.\n\nProperty year built: {{year_built}}. Lead paint risk flag: {{has_lead_paint}}.\n\nThe disclosure must include:\n1. A clear statement that this disclosure is required by federal law for housing built before 1978.\n2. A section for the seller/lessor to disclose known lead-based paint and lead-based paint hazards.\n3. A list of available records and reports pertaining to lead-based paint (or a statement that none are available).\n4. The EPA-prescribed "Protect Your Family From Lead In Your Home" pamphlet acknowledgment statement.\n5. Signatures of lessor, lessee, and agent (if applicable) with dates.\n6. A statement of the federal penalty for violations.\n7. A section for the tenant/buyer to acknowledge receipt of all disclosures and the pamphlet.\n\nUse only the regulation references provided in the system prompt. Do not invent citations.',
  '[
    {"code": "42 U.S.C. § 4852d", "title": "Residential Lead-Based Paint Hazard Reduction Act", "url": "https://www.epa.gov/lead/residential-lead-based-paint-hazard-reduction-act-title-x-section-1018"},
    {"code": "24 CFR Part 35", "title": "HUD Lead Disclosure Rule", "url": "https://www.ecfr.gov/current/title-24/subtitle-A/part-35"},
    {"code": "40 CFR Part 745", "title": "EPA Renovation, Repair, and Painting Rule", "url": "https://www.ecfr.gov/current/title-40/chapter-I/subchapter-R/part-745"}
  ]',
  true,
  1
)
ON CONFLICT (document_type, jurisdiction) DO NOTHING;

-- 5. Pennsylvania Lead-Based Paint Disclosure
INSERT INTO document_templates
  (document_type, jurisdiction, title, description, prompt_template, regulation_references, is_active, version)
VALUES (
  'lead_disclosure',
  'PA',
  'Pennsylvania Lead-Based Paint Disclosure',
  'Lead-based paint disclosure for Pennsylvania pre-1978 properties — federal + PA state requirements.',
  E'Draft a Lead-Based Paint Disclosure form for {{org_name}} for the property: {{property_name}} located at {{property_address}} in Pennsylvania.\n\nProperty year built: {{year_built}}. Lead paint risk flag: {{has_lead_paint}}.\n\nThe disclosure must include:\n1. Federal disclosure requirements under 42 U.S.C. § 4852d.\n2. Pennsylvania-specific requirements under 35 P.S. § 5901 (PA Lead Certification Act).\n3. Lessor disclosure of known hazards and available records.\n4. EPA pamphlet acknowledgment.\n5. Statement that Pennsylvania may require a certified lead inspector for certain transactions.\n6. Signature/acknowledgment section.\n7. Federal and Pennsylvania penalty statements.\n\nUse only the regulation references provided in the system prompt. Do not invent citations.',
  '[
    {"code": "42 U.S.C. § 4852d", "title": "Residential Lead-Based Paint Hazard Reduction Act", "url": "https://www.epa.gov/lead/residential-lead-based-paint-hazard-reduction-act-title-x-section-1018"},
    {"code": "24 CFR Part 35", "title": "HUD Lead Disclosure Rule", "url": "https://www.ecfr.gov/current/title-24/subtitle-A/part-35"},
    {"code": "35 P.S. § 5901", "title": "PA Lead Certification Act", "url": "https://www.health.pa.gov/topics/Environmental/Lead/Pages/Lead.aspx"}
  ]',
  true,
  1
)
ON CONFLICT (document_type, jurisdiction) DO NOTHING;

-- 6. Philadelphia Lead-Based Paint Disclosure
INSERT INTO document_templates
  (document_type, jurisdiction, title, description, prompt_template, regulation_references, is_active, version)
VALUES (
  'lead_disclosure',
  'Philadelphia_PA',
  'Philadelphia Lead-Based Paint Disclosure',
  'Lead-based paint disclosure for Philadelphia pre-1978 properties — federal, PA, and city requirements.',
  E'Draft a Lead-Based Paint Disclosure form for {{org_name}} for the property: {{property_name}} located at {{property_address}} in Philadelphia, PA.\n\nProperty year built: {{year_built}}. Lead paint risk flag: {{has_lead_paint}}.\n\nThe disclosure must include:\n1. Federal disclosure requirements under 42 U.S.C. § 4852d.\n2. Pennsylvania requirements under 35 P.S. § 5901.\n3. Philadelphia-specific requirements under Bill No. 200725: a lead-safe or lead-free certification is required BEFORE a child under 6 years of age occupies any pre-1978 unit.\n4. Statement of Philadelphia penalty: up to $2,000 per day per violation.\n5. Lessor disclosure of known hazards, available records, and certification status.\n6. EPA pamphlet acknowledgment.\n7. Signature and acknowledgment section for all parties.\n\nUse only the regulation references provided in the system prompt. Do not invent citations.',
  '[
    {"code": "42 U.S.C. § 4852d", "title": "Residential Lead-Based Paint Hazard Reduction Act", "url": "https://www.epa.gov/lead/residential-lead-based-paint-hazard-reduction-act-title-x-section-1018"},
    {"code": "24 CFR Part 35", "title": "HUD Lead Disclosure Rule", "url": "https://www.ecfr.gov/current/title-24/subtitle-A/part-35"},
    {"code": "35 P.S. § 5901", "title": "PA Lead Certification Act", "url": "https://www.health.pa.gov/topics/Environmental/Lead/Pages/Lead.aspx"},
    {"code": "Bill No. 200725", "title": "Philadelphia Lead Disclosure and Certification Law", "url": "https://www.phila.gov/programs/lead-and-healthy-homes-program/"}
  ]',
  true,
  1
)
ON CONFLICT (document_type, jurisdiction) DO NOTHING;

-- 7. Emergency Action Plan (Federal / OSHA)
INSERT INTO document_templates
  (document_type, jurisdiction, title, description, prompt_template, regulation_references, is_active, version)
VALUES (
  'emergency_action_plan',
  'federal',
  'Emergency Action Plan (OSHA)',
  'OSHA-compliant Emergency Action Plan for property management operations.',
  E'Draft an Emergency Action Plan (EAP) for {{org_name}}, a {{entity_type}} operating {{unit_count}} residential/commercial units.\n\nThe EAP must comply with OSHA requirements and include:\n1. Purpose and scope of the plan.\n2. Emergency reporting procedures (who to call, how to report fires, hazmat, medical emergencies).\n3. Emergency escape routes and procedures — including floor plans reference note.\n4. Procedures for employees who remain behind to perform critical operations before evacuation.\n5. Accounting for all employees after emergency evacuation (headcount procedure).\n6. Rescue and medical duties for designated employees.\n7. Alarm system description (audible, visual signals).\n8. Training requirements for maintenance staff.\n9. Plan review and update schedule (at minimum when plan changes, when the employer''s responsibilities change, or when the layout changes).\n10. A section for each of the applicable OSHA standards: fall protection, confined spaces, hazard communication, electrical safety, lockout/tagout, and PPE.\n\nUse only the regulation references provided in the system prompt. Do not invent citations.',
  '[
    {"code": "29 CFR 1910.38", "title": "Emergency Action Plans", "url": "https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.38"},
    {"code": "29 CFR 1910.39", "title": "Fire Prevention Plans", "url": "https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.39"},
    {"code": "29 CFR 1910.157", "title": "Portable Fire Extinguishers", "url": "https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.157"},
    {"code": "29 CFR 1910.1200", "title": "Hazard Communication", "url": "https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.1200"},
    {"code": "29 CFR 1910.28", "title": "Duty to Have Fall Protection", "url": "https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.28"},
    {"code": "29 CFR 1910.303", "title": "General Requirements for Electrical Safety", "url": "https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.303"},
    {"code": "29 CFR 1910.147", "title": "Control of Hazardous Energy (HVAC, elevators)", "url": "https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.147"},
    {"code": "29 CFR 1910.146", "title": "Permit-Required Confined Spaces", "url": "https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.146"},
    {"code": "29 CFR 1910.132", "title": "General Requirements for PPE", "url": "https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.132"},
    {"code": "29 CFR 1910.1030", "title": "Bloodborne Pathogens", "url": "https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.1030"}
  ]',
  true,
  1
)
ON CONFLICT (document_type, jurisdiction) DO NOTHING;

-- 8. ADA Compliance Policy (Federal)
INSERT INTO document_templates
  (document_type, jurisdiction, title, description, prompt_template, regulation_references, is_active, version)
VALUES (
  'ada_policy',
  'federal',
  'ADA Compliance Policy',
  'Americans with Disabilities Act compliance policy for property management.',
  E'Draft an ADA Compliance Policy for {{org_name}}, a {{entity_type}} that manages {{unit_count}} units.\n\nThe policy must include:\n1. Statement of commitment to ADA compliance and non-discrimination on basis of disability.\n2. Explanation of who is covered (tenants, prospective tenants, guests, employees).\n3. Reasonable accommodation obligations: definition, request procedure, interactive process, documentation.\n4. Reasonable modification obligations: tenant right to make structural modifications at their expense (with conditions), restoration requirements.\n5. Accessible common areas and facilities requirements.\n6. Grievance procedure for disability-related complaints.\n7. Designate an ADA/Section 504 Coordinator (placeholder name/contact).\n8. Staff training requirements.\n9. Statement that the policy is reviewed annually.\n\nAlso reference Fair Housing Act disability protections as they overlap with ADA in residential housing.\n\nUse only the regulation references provided in the system prompt. Do not invent citations.',
  '[
    {"code": "42 U.S.C. § 12101", "title": "Americans with Disabilities Act", "url": "https://www.ada.gov/law-and-regs/ada/"},
    {"code": "42 U.S.C. §§ 3601-3619", "title": "Fair Housing Act (disability protections)", "url": "https://www.justice.gov/crt/fair-housing-act-1"},
    {"code": "24 CFR Part 100", "title": "HUD Fair Housing Regulations", "url": "https://www.ecfr.gov/current/title-24/subtitle-B/chapter-I/subchapter-A/part-100"}
  ]',
  true,
  1
)
ON CONFLICT (document_type, jurisdiction) DO NOTHING;

-- 9. Pennsylvania Landlord-Tenant Rights Disclosure
INSERT INTO document_templates
  (document_type, jurisdiction, title, description, prompt_template, regulation_references, is_active, version)
VALUES (
  'landlord_tenant_rights',
  'PA',
  'Pennsylvania Landlord-Tenant Rights Disclosure',
  'Pennsylvania landlord-tenant law disclosure covering security deposits, habitability, notices, and eviction.',
  E'Draft a Pennsylvania Landlord-Tenant Rights Disclosure for {{org_name}} to be provided to tenants at {{property_name}}, {{property_address}}.\n\nThe disclosure must cover Pennsylvania law requirements including:\n1. Security deposit rules: maximum limits (2 months first year, 1 month thereafter), required interest-bearing account above $100, itemized deduction requirements, 30-day return deadline.\n2. Landlord entry notice requirements: advance notice requirements under Pennsylvania law.\n3. Habitability warranty: landlord''s obligation to maintain fit and habitable premises.\n4. Tenant remedies for habitability violations (rent escrow).\n5. Notice requirements for lease termination (proper notice periods).\n6. Eviction procedure overview: notice requirements, magisterial district judge process.\n7. Retaliation protections for tenants who exercise legal rights.\n8. Contact information for local housing authorities and legal aid.\n\nUse only the regulation references provided in the system prompt. Do not invent citations.',
  '[
    {"code": "68 P.S. §§ 250.101-250.602", "title": "Pennsylvania Landlord and Tenant Act of 1951", "url": "https://www.legis.state.pa.us/cfdocs/legis/LI/uconsCheck.cfm?txtType=HTM&yr=1951&sessInd=0&smthLwInd=0&act=0020"},
    {"code": "68 Pa. C.S. §§ 8101-8415", "title": "Landlord and Tenant Act of 1995 (Residential)", "url": "https://www.legis.state.pa.us/cfdocs/legis/LI/uconsCheck.cfm?txtType=HTM&yr=1995&sessInd=0&smthLwInd=0&act=0029"},
    {"code": "35 P.S. § 1700-1", "title": "Pennsylvania Warranty of Habitability", "url": "https://www.legis.state.pa.us/"}
  ]',
  true,
  1
)
ON CONFLICT (document_type, jurisdiction) DO NOTHING;

-- 10. Philadelphia Rental License Compliance Checklist
INSERT INTO document_templates
  (document_type, jurisdiction, title, description, prompt_template, regulation_references, is_active, version)
VALUES (
  'phila_rental_license',
  'Philadelphia_PA',
  'Philadelphia Rental License Compliance Checklist',
  'Philadelphia rental license, Certificate of Rental Suitability, and inspection requirements.',
  E'Draft a Philadelphia Rental License Compliance Checklist for {{org_name}} for the property at {{property_address}} ({{property_type}}, {{unit_count}} units, built {{year_built}}).\n\nThe checklist must cover:\n1. Rental License requirement: every residential rental unit in Philadelphia requires a Rental License from L&I. Include the process to obtain/renew.\n2. Certificate of Rental Suitability: required for every new tenancy. Steps to obtain.\n3. Lead disclosure requirements for pre-1978 units (cross-reference: see Lead Disclosure document).\n4. Mandatory disclosure to tenants of the "City of Philadelphia Partners for Good Housing" handbook.\n5. Property Maintenance Code compliance: key habitability standards (heat, hot water, structural integrity, pests).\n6. Smoke and carbon monoxide detector requirements.\n7. Fire safety requirements for multi-unit buildings.\n8. Annual inspection requirements (if applicable based on property type).\n9. Penalties for operating without a license.\n10. L&I contact information and portal link.\n\nUse only the regulation references provided in the system prompt. Do not invent citations.',
  '[
    {"code": "Philadelphia Code § 9-3901", "title": "Rental License Requirement", "url": "https://www.phila.gov/services/permits-violations-licenses/get-a-license/business-licenses/rental-property/"},
    {"code": "Philadelphia Code Chapter 6-800", "title": "Property Maintenance Code", "url": "https://www.phila.gov/services/permits-violations-licenses/"},
    {"code": "Philadelphia Code § 9-1001", "title": "Certificate of Rental Suitability", "url": "https://www.phila.gov/services/permits-violations-licenses/get-a-license/business-licenses/rental-property/"}
  ]',
  true,
  1
)
ON CONFLICT (document_type, jurisdiction) DO NOTHING;

-- 11. Philadelphia Lead Safe Certification Compliance
INSERT INTO document_templates
  (document_type, jurisdiction, title, description, prompt_template, regulation_references, is_active, version)
VALUES (
  'phila_lead_safe',
  'Philadelphia_PA',
  'Philadelphia Lead Safe Certification Compliance',
  'Philadelphia lead-safe/lead-free certification requirements for pre-1978 rental units with children under 6.',
  E'Draft a Philadelphia Lead Safe Certification Compliance document for {{org_name}} for the property at {{property_name}}, {{property_address}} (built {{year_built}}).\n\nThis document must cover:\n1. Trigger requirement: Philadelphia law (Bill No. 200725) requires a lead-safe or lead-free certification BEFORE a child under 6 years of age occupies any pre-1978 residential unit.\n2. Definition of "lead-safe" vs "lead-free" certification and the difference in requirements.\n3. Who may perform the certification: only EPA-certified lead inspectors or risk assessors.\n4. Steps to obtain certification: inspection, testing, remediation if needed, re-inspection, certification issuance.\n5. Certification validity period and renewal requirements.\n6. Record-keeping obligations: retain certification records for the duration of the tenancy plus 3 years.\n7. Tenant disclosure requirements: provide certification to tenant before occupancy and upon renewal.\n8. Philadelphia Health Department reporting requirements.\n9. Penalties for non-compliance: up to $2,000 per day per violation.\n10. Resources: Philadelphia Lead and Healthy Homes Program contact information.\n\nUse only the regulation references provided in the system prompt. Do not invent citations.',
  '[
    {"code": "Bill No. 200725", "title": "Philadelphia Lead Disclosure and Certification Law", "url": "https://www.phila.gov/programs/lead-and-healthy-homes-program/"},
    {"code": "42 U.S.C. § 4852d", "title": "Residential Lead-Based Paint Hazard Reduction Act", "url": "https://www.epa.gov/lead/residential-lead-based-paint-hazard-reduction-act-title-x-section-1018"},
    {"code": "40 CFR Part 745", "title": "EPA Renovation, Repair, and Painting Rule", "url": "https://www.ecfr.gov/current/title-40/chapter-I/subchapter-R/part-745"},
    {"code": "35 P.S. § 5901", "title": "PA Lead Certification Act", "url": "https://www.health.pa.gov/topics/Environmental/Lead/Pages/Lead.aspx"}
  ]',
  true,
  1
)
ON CONFLICT (document_type, jurisdiction) DO NOTHING;

-- =============================================================================
-- Verify the seed
-- =============================================================================
SELECT document_type, jurisdiction, title, is_active, version
FROM document_templates
ORDER BY document_type, jurisdiction;
