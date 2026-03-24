import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Plus, Building2, Archive } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { buttonVariants } from '@/components/ui/button-variants';
import { PropertyCard } from '@/components/dashboard/PropertyCard';
import type { Organization, Property } from '@/lib/types';

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const showArchived = tab === 'archived';

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('*')
    .eq('owner_id', user.id)
    .maybeSingle<Organization>();

  if (orgError) {
    console.error('Org fetch error:', orgError);
  }

  if (!org) redirect('/onboarding');

  // Fetch active properties (not archived)
  const activeQuery = supabase
    .from('properties')
    .select('*')
    .eq('org_id', org.id)
    .is('archived_at', null)
    .order('created_at', { ascending: false });

  // Fetch archived properties
  const archivedQuery = supabase
    .from('properties')
    .select('*')
    .eq('org_id', org.id)
    .not('archived_at', 'is', null)
    .order('archived_at', { ascending: false });

  const { data: activeProps } = await activeQuery;
  const { data: archivedProps } = await archivedQuery;

  const activeList: Property[] = activeProps ?? [];
  const archivedList: Property[] = archivedProps ?? [];
  const propertyList = showArchived ? archivedList : activeList;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Properties</h1>
          <p className="text-muted-foreground">
            Manage your properties and their compliance requirements.
          </p>
        </div>
        <Link href="/properties/new" className={buttonVariants({ variant: "default" })}>
            <Plus className="size-4" />
            Add Property
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        <Link
          href="/properties"
          className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
            !showArchived
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-muted-foreground hover:text-slate-600'
          }`}
        >
          <Building2 className="size-3.5" />
          Active ({activeList.length})
        </Link>
        <Link
          href="/properties?tab=archived"
          className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
            showArchived
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-muted-foreground hover:text-slate-600'
          }`}
        >
          <Archive className="size-3.5" />
          Archived ({archivedList.length})
        </Link>
      </div>

      {/* Property grid or empty state */}
      {propertyList.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
            {showArchived ? (
              <Archive className="size-6 text-slate-400" />
            ) : (
              <Building2 className="size-6 text-slate-400" />
            )}
          </div>
          <h3 className="text-base font-semibold text-slate-900">
            {showArchived ? 'No archived properties' : 'No properties yet'}
          </h3>
          <p className="mt-1 max-w-sm text-sm text-slate-500">
            {showArchived
              ? 'Archived properties will appear here.'
              : 'Add your first property to start generating compliance documents tailored to its location and characteristics.'}
          </p>
          {!showArchived && (
            <Link href="/properties/new" className={buttonVariants({ variant: "default", className: "mt-6" })}>
                <Plus className="size-4" />
                Add your first property
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {propertyList.map((property) => (
            <PropertyCard key={property.id} property={property} showArchived={showArchived} />
          ))}
        </div>
      )}
    </div>
  );
}
