# RegLynx — Claude Code Continuation Prompt

## CONNECT TO EXISTING REPO
This project already exists at: **github.com/reglynx/reglynx**
Select this repository when starting. Do NOT create a new project.

---

## CURRENT STATE (as of March 21, 2026)

### What's DONE and LIVE at www.reglynx.com:
- ✅ Next.js 16 app with TypeScript, Tailwind CSS, shadcn/ui
- ✅ Landing page with hero, features, pricing ($147/$297/$597), footer
- ✅ Auth pages (login, signup) with Supabase Auth
- ✅ Onboarding wizard (4 steps: Company Info, First Property, Jurisdictions, Terms & Plan)
- ✅ Dashboard layout (sidebar, topbar)
- ✅ Dashboard home (compliance score, stats, alerts, recent docs)
- ✅ Properties CRUD (list, create, detail)
- ✅ Document generation (API route + generate page using Claude API)
- ✅ Document library + viewer (list, detail with markdown rendering)
- ✅ Document download disclaimer modal
- ✅ Stripe integration (checkout, webhook, billing portal)
- ✅ Alert system (feed page + cron endpoint)
- ✅ Settings pages (org settings, team, billing)
- ✅ Terms of Service page (/terms)
- ✅ Privacy Policy page (/privacy)
- ✅ Custom domain: www.reglynx.com (reglynx.com redirects to www)
- ✅ Vercel deployment with auto-deploy on push to main
- ✅ All environment variables configured in Vercel

### Infrastructure:
- **Frontend/Backend:** Next.js 16.2.1 (App Router, Turbopack) with TypeScript
- **Database:** Supabase (PostgreSQL + Auth + Storage)
- **AI:** Anthropic Claude API (claude-sonnet-4-20250514)
- **Payments:** Stripe (3 products created, webhook configured)
- **Email:** Resend (API key configured, 4 sender addresses)
- **Deployment:** Vercel (Hobby plan, connected to GitHub)
- **Domain:** reglynx.com via Cloudflare DNS → Vercel
- **SSL:** Auto-provisioned by Vercel

### Database (Supabase):
All 8 tables created with RLS enabled:
- organizations, properties, documents, regulatory_alerts
- org_alerts, document_templates, audit_log, team_members
- 7 document templates seeded (Federal + PA + Philadelphia)
- RLS fixed with SECURITY DEFINER helper functions (get_user_org_ids, get_owned_org_ids)

### File Structure (67 source files):
```
src/
├── app/
│   ├── (auth)/login/page.tsx, signup/page.tsx, layout.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx, dashboard/page.tsx
│   │   ├── properties/page.tsx, [id]/page.tsx, new/page.tsx
│   │   ├── documents/page.tsx, [id]/page.tsx, generate/page.tsx
│   │   ├── alerts/page.tsx, AlertsList.tsx
│   │   └── settings/page.tsx, billing/page.tsx, team/page.tsx
│   ├── api/documents/generate/route.ts, stripe/*, alerts/check/route.ts, auth/callback/route.ts
│   ├── onboarding/page.tsx, layout.tsx
│   ├── privacy/page.tsx, terms/page.tsx
│   ├── page.tsx (landing page), layout.tsx, globals.css
│   └── proxy.ts (Next.js 16 middleware replacement)
├── components/dashboard/*, documents/*, landing/*, shared/*, ui/*
├── lib/supabase/client.ts, server.ts, middleware.ts
├── lib/anthropic.ts, stripe.ts, constants.ts, types.ts, utils.ts, emails/send.ts
```

### Environment Variables (all set in Vercel):
- NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
- ANTHROPIC_API_KEY
- STRIPE_SECRET_KEY, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET
- STRIPE_PRICE_ID_STARTER, STRIPE_PRICE_ID_PROFESSIONAL, STRIPE_PRICE_ID_ENTERPRISE
- RESEND_API_KEY, RESEND_FROM_ALERTS, RESEND_FROM_SUPPORT, RESEND_FROM_BILLING, RESEND_FROM_NOREPLY
- NEXT_PUBLIC_APP_URL (https://www.reglynx.com)
- NEXT_PUBLIC_APP_DOMAIN, NEXT_PUBLIC_SUPPORT_EMAIL, NEXT_PUBLIC_CONTACT_EMAIL

---

## UNCOMMITTED LOCAL CHANGES TO PUSH
The following 4 files have address updates (1401 Spruce → 1700 Market St. Suite 1005, Philadelphia, PA 19103) that need to be committed and pushed:
- src/app/page.tsx
- src/app/terms/page.tsx
- src/app/privacy/page.tsx
- src/lib/emails/send.ts

Commit these with message: "Update business address to 1700 Market St. Suite 1005"

---

## KNOWN ISSUES TO FIX

### 1. Supabase Auth email confirmation redirects
The Supabase email confirmation callback at /api/auth/callback needs to handle the auth code exchange properly and redirect to /onboarding or /dashboard. Currently the email confirmation link from Supabase may not redirect correctly after confirming.

### 2. Supabase Auth email templates need RegLynx branding
Go to Supabase Dashboard → Authentication → Email Templates and customize:
- "Confirm signup" template with RegLynx logo and branding
- "Reset password" template with RegLynx branding
Currently sends default Supabase-branded emails.

### 3. Vercel Cron Job not set up yet
Need to configure in vercel.json:
```json
{
  "crons": [{
    "path": "/api/alerts/check",
    "schedule": "0 11 * * *"
  }]
}
```

### 4. PDF generation not implemented
The document viewer has a "Download Draft as PDF" button but the /api/documents/[id]/pdf endpoint doesn't exist yet. Need to implement PDF generation (could use @react-pdf/renderer or puppeteer).

---

## BRAND IDENTITY (reference for all future work)

### Colors:
- Navy: #0f172a (primary text, sidebar)
- Slate: #334155 (secondary text)
- Emerald: #059669 (brand accent, compliant/current status)
- Amber: #f59e0b (warning/needs review, lynx iris)
- Red: #dc2626 (critical/outdated)
- Blue: #2563eb (info/action buttons)
- Background: #f8fafc
- Card: #ffffff
- Border: #e2e8f0

### Logo:
Minimalist lynx eye with amber iris. "Reg" in navy + "Lynx" in emerald. Tagline: "COMPLIANCE. ALWAYS WATCHING."

### Tone:
B2B compliance software. Professional, authoritative. NOT playful. Think Bloomberg meets Notion.

### CRITICAL LEGAL LANGUAGE RULES:
- NEVER use: "legal documents", "legally compliant", "ensures compliance", "legal advice", "guaranteed accuracy", "ready to use"
- ALWAYS use: "compliance document templates", "based on published regulations", "supports your compliance efforts", "ready for your review"
- Document generation button: "Generate Draft" (NOT "Generate Document")
- Status labels: "Current Draft" / "Needs Review" / "Outdated" (NEVER "Approved" or "Certified")
- Every page footer: "RegLynx is not a law firm and does not provide legal advice. All generated document templates should be reviewed by qualified counsel before implementation."

### Business Info:
- Company: RegLynx — A product of Ramesses Management & Contracting LLC
- Address: 1700 Market St. Suite 1005, Philadelphia, PA 19103
- Contact: hello@reglynx.com
- Support: support@reglynx.com
- Billing: billing@reglynx.com
- Alerts: alerts@reglynx.com

---

## NEXT PRIORITIES (in order)

### Immediate (do now):
1. Push the uncommitted address changes
2. Fix any remaining auth/onboarding flow issues
3. Test full flow: signup → email confirm → onboarding → Stripe checkout → dashboard → generate document → download PDF
4. Add vercel.json with cron configuration

### Phase 1 — Template Quality (Months 1-2):
5. Validate all citation references in seed templates
6. Add "Last Verified" dates to every template
7. Run beta users through full document generation flow
8. Implement PDF generation for document downloads

### Phase 2 — Revenue (Months 2-4):
9. Launch paid plans
10. Add NJ, NY, DE jurisdiction templates
11. Add PDF generation with professional formatting

### Phase 3 — Scale (Months 4-8):
12. Document expiration reminders (email 30/14/7 days before)
13. Bulk document generation
14. Regulatory feed integration (Federal Register API)

### Phase 4 — Expansion (Months 8-12+):
15. Add top-demand states (CA, TX, FL)
16. White-label capability for Enterprise tier
17. API access for Enterprise tier
18. Arabic language support for GCC expansion

---

## TECH STACK DETAILS

### package.json dependencies:
- next: 16.2.1
- react/react-dom: 19.2.4
- @supabase/supabase-js, @supabase/ssr
- @anthropic-ai/sdk
- stripe, @stripe/stripe-js
- resend
- tailwindcss v4, shadcn (v4.1.0)
- zod v4, react-hook-form, @hookform/resolvers
- lucide-react, date-fns, class-variance-authority, clsx, tailwind-merge

### Important Next.js 16 notes:
- middleware.ts is DEPRECATED in Next.js 16 — use proxy.ts instead
- The app uses proxy.ts for Supabase auth session management
- App Router with src/ directory structure
- Server Components by default, Client Components only for interactive elements

### Stripe Products (Test Mode):
- RegLynx Starter: price_1TDXcYAKG8XaxVVRON7bzSgq ($147/mo)
- RegLynx Professional: price_1TDXcYAKG8XaxVVR3xMeGpkQ ($297/mo)
- RegLynx Enterprise: price_1TDXcYAKG8XaxVVRiZt8jAsu ($597/mo)
- Webhook: https://www.reglynx.com/api/stripe/webhook (4 events configured)

### Supabase RLS:
Uses SECURITY DEFINER helper functions to avoid circular policy dependencies:
- get_user_org_ids() — returns org IDs where user is owner or team member
- get_owned_org_ids() — returns org IDs where user is owner
All table policies use these functions instead of direct cross-table queries.

---

## DOCUMENT TEMPLATES SEEDED (7 total):

| Type | Jurisdiction | Title |
|------|-------------|-------|
| fair_housing_policy | federal | Fair Housing Policy |
| lead_disclosure | federal | Lead-Based Paint Disclosure |
| emergency_action_plan | federal | Emergency Action Plan |
| ada_policy | federal | ADA Compliance Policy |
| landlord_tenant_rights | PA | PA Landlord-Tenant Rights Disclosure |
| phila_rental_license | Philadelphia_PA | Philadelphia Rental License Compliance Checklist |
| phila_lead_safe | Philadelphia_PA | Philadelphia Lead Safe Certification Compliance |

---

## INSTRUCTIONS
You are continuing development of RegLynx. The codebase exists in the connected GitHub repository. Pull the latest code, review the current state, fix any issues listed above, and continue building features. Always follow the legal language rules. Always test changes before pushing. Commit incrementally with clear messages.
