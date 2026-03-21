import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Plus, Building2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { buttonVariants } from '@/components/ui/button';
import { PropertyCard } from '@/components/dashboard/PropertyCard';
import type { Organization, Property } from '@/lib/types';

export default async function PropertiesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: org } = await supabase
    .from('organizations')
    .select('*')
    .eq('owner_id', user.id)
    .single<Organization>();

  if (!org) redirect('/onboarding');

  const { data: properties } = await supabase
    .from('properties')
    .select('*')
    .eq('org_id', org.id)
    .order('created_at', { ascending: false });

  const propertyList: Property[] = properties ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Properties</h1>
          <p className="text-muted-foreground">
            Manage your properties and their compliance documents.
          </p>
        </div>
        <Link href="/properties/new" className={buttonVariants({ variant: "default" })}>
            <Plus className="size-4" />
            Add Property
        </Link>
      </div>

      {/* Property grid or empty state */}
      {propertyList.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
            <Building2 className="size-6 text-slate-400" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">
            No properties yet
          </h3>
          <p className="mt-1 max-w-sm text-sm text-slate-500">
            Add your first property to start generating compliance documents
            tailored to its location and characteristics.
          </p>
          <Link href="/properties/new" className={buttonVariants({ variant: "default", className: "mt-6" })}>
              <Plus className="size-4" />
              Add your first property
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {propertyList.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      )}
    </div>
  );
}
