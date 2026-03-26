import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import type { Organization, Property } from '@/lib/types';

export default async function ComplianceIndexPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  let org: Organization | null = null;
  try {
    const { data } = await supabase
      .from('organizations')
      .select('*')
      .eq('owner_id', user.id)
      .maybeSingle<Organization>();
    org = data;
  } catch (e) {
    console.error('Failed to fetch organization:', e);
  }

  if (!org) redirect('/onboarding');

  let props: Property[] = [];
  try {
    const { data: properties } = await supabase
      .from('properties')
      .select('*')
      .eq('org_id', org.id)
      .order('created_at', { ascending: false });
    props = (properties ?? []) as Property[];
  } catch (e) {
    console.error('Failed to fetch properties:', e);
  }

  if (props.length === 1) {
    redirect(`/compliance/${props[0].id}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Compliance</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Select a property to view its compliance status.
        </p>
      </div>

      {props.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No properties yet.{' '}
            <Link href="/properties/new" className="text-blue-600 hover:underline">
              Add your first property
            </Link>{' '}
            to get started.
          </CardContent>
        </Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {props.map((p) => {
            const address = [p.address_line1, p.city, p.state].filter(Boolean).join(', ');
            return (
              <li key={p.id}>
                <Link
                  href={`/compliance/${p.id}`}
                  className="flex items-center justify-between rounded-lg border bg-white p-4 shadow-sm hover:border-blue-300 hover:shadow-md transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <ShieldCheck className="size-5 shrink-0 text-slate-400" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{p.name ?? address}</p>
                      {p.name && (
                        <p className="truncate text-xs text-muted-foreground">{address}</p>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
