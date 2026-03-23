/**
 * /admin/validate — Internal address validation tool
 *
 * NOT linked in the sidebar. Access directly via /admin/validate.
 * Auth-gated: requires ADMIN_EMAILS env var or development mode.
 *
 * Lets operators test an address against the live Philadelphia adapters
 * without touching the database.
 */

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ValidationClient } from './ValidationClient';

function getAdminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? '';
  return new Set(
    raw.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean),
  );
}

export default async function AdminValidatePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const adminEmails = getAdminEmails();
  const isAdmin =
    adminEmails.size === 0
      ? process.env.NODE_ENV === 'development'
      : adminEmails.has((user.email ?? '').toLowerCase());

  if (!isAdmin) {
    redirect('/dashboard');
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">
          Internal Tool · Not public
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Address Validation</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Run live Philadelphia adapter queries against any address.
          No data is written to the database. Results are for QA and pilot verification only.
        </p>
      </div>

      <ValidationClient />
    </div>
  );
}
