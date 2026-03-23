'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { PROPERTY_TYPES } from '@/lib/constants';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button, buttonVariants } from '@/components/ui/button';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

interface PropertyFormData {
  name: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  zip: string;
  county?: string;
  property_type: 'residential_multifamily' | 'residential_single' | 'commercial' | 'mixed_use';
  unit_count: number;
  year_built?: number;
  has_lead_paint: boolean;
  has_pool: boolean;
  has_elevator: boolean;
  is_section8: boolean;
  is_tax_credit: boolean;
}

const propertySchema = z.object({
  name: z.string().min(2, 'Property name must be at least 2 characters'),
  address_line1: z.string().min(3, 'Street address is required'),
  address_line2: z.string().optional(),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  zip: z.string().min(5, 'ZIP code is required'),
  county: z.string().optional(),
  property_type: z.enum([
    'residential_multifamily',
    'residential_single',
    'commercial',
    'mixed_use',
  ]),
  unit_count: z.coerce.number().int().min(1, 'At least 1 unit is required'),
  year_built: z.coerce.number().int().min(1800).max(new Date().getFullYear()).optional(),
  has_lead_paint: z.boolean(),
  has_pool: z.boolean(),
  has_elevator: z.boolean(),
  is_section8: z.boolean(),
  is_tax_credit: z.boolean(),
});

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NewPropertyPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PropertyFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(propertySchema) as any,
    defaultValues: {
      state: 'PA',
      property_type: 'residential_multifamily',
      unit_count: 1,
      has_lead_paint: false,
      has_pool: false,
      has_elevator: false,
      is_section8: false,
      is_tax_credit: false,
    },
  });

  async function onSubmit(data: PropertyFormData) {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      // Get the current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError('You must be logged in to add a property.');
        return;
      }

      // Fetch the user's organization
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      if (orgError || !org) {
        setError('Could not find your organization. Please complete onboarding first.');
        return;
      }

      // Billing gate: free (starter) plan limited to 1 property
      const [{ count: propCount }, { data: orgData }] = await Promise.all([
        supabase
          .from('properties')
          .select('*', { count: 'exact', head: true })
          .eq('org_id', org.id),
        supabase
          .from('organizations')
          .select('subscription_plan, subscription_status')
          .eq('owner_id', user.id)
          .single(),
      ]);

      const isFree =
        orgData?.subscription_plan === 'starter' &&
        orgData?.subscription_status !== 'active';
      if (isFree && (propCount ?? 0) >= 1) {
        setError(
          'Free accounts are limited to 1 property. Upgrade your plan in Settings → Billing to add more.',
        );
        return;
      }

      // Insert the property
      const { data: newProp, error: insertError } = await supabase
        .from('properties')
        .insert({
          org_id: org.id,
          name: data.name,
          address_line1: data.address_line1,
          address_line2: data.address_line2 || null,
          city: data.city,
          state: data.state,
          zip: data.zip,
          county: data.county || null,
          property_type: data.property_type,
          unit_count: data.unit_count,
          year_built: data.year_built || null,
          has_lead_paint: data.has_lead_paint,
          has_pool: data.has_pool,
          has_elevator: data.has_elevator,
          is_section8: data.is_section8,
          is_tax_credit: data.is_tax_credit,
        })
        .select('id')
        .single();

      if (insertError || !newProp) {
        setError(insertError?.message ?? 'Failed to create property.');
        return;
      }

      // Kick off compliance evaluation (non-blocking — results visible on compliance page)
      fetch('/api/compliance/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ property_id: newProp.id }),
      }).catch(console.error);

      router.push(`/compliance/${newProp.id}?new=1`);
      // no router.refresh() needed — navigating to a new page
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  // Helper for error classes on inputs
  const errCls = (field: keyof PropertyFormData) =>
    errors[field] ? 'border-red-300 focus-visible:ring-red-200' : '';

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Back link */}
      <Link
        href="/properties"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Properties
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Add Property</CardTitle>
          <CardDescription>
            Enter the details for your new property. This information is used to
            determine which compliance documents are required.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* ---- Property name ---- */}
            <div className="space-y-2">
              <Label htmlFor="name">Property Name</Label>
              <Input
                id="name"
                placeholder="e.g. Oak Street Apartments"
                {...register('name')}
                className={errCls('name')}
              />
              {errors.name && (
                <p className="text-xs text-red-600">{errors.name.message}</p>
              )}
            </div>

            {/* ---- Address ---- */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-700">Address</h3>

              <div className="space-y-2">
                <Label htmlFor="address_line1">Street Address</Label>
                <Input
                  id="address_line1"
                  placeholder="123 Main St"
                  {...register('address_line1')}
                  className={errCls('address_line1')}
                />
                {errors.address_line1 && (
                  <p className="text-xs text-red-600">
                    {errors.address_line1.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="address_line2">Address Line 2</Label>
                <Input
                  id="address_line2"
                  placeholder="Apt, Suite, Unit, etc. (optional)"
                  {...register('address_line2')}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="col-span-2 space-y-2 sm:col-span-1">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    placeholder="Philadelphia"
                    {...register('city')}
                    className={errCls('city')}
                  />
                  {errors.city && (
                    <p className="text-xs text-red-600">{errors.city.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    placeholder="PA"
                    {...register('state')}
                    className={errCls('state')}
                  />
                  {errors.state && (
                    <p className="text-xs text-red-600">{errors.state.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="zip">ZIP Code</Label>
                  <Input
                    id="zip"
                    placeholder="19103"
                    {...register('zip')}
                    className={errCls('zip')}
                  />
                  {errors.zip && (
                    <p className="text-xs text-red-600">{errors.zip.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="county">County</Label>
                  <Input
                    id="county"
                    placeholder="Optional"
                    {...register('county')}
                  />
                </div>
              </div>
            </div>

            {/* ---- Property details ---- */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-700">
                Property Details
              </h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="property_type">Property Type</Label>
                  <select
                    id="property_type"
                    {...register('property_type')}
                    className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    {Object.entries(PROPERTY_TYPES).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  {errors.property_type && (
                    <p className="text-xs text-red-600">
                      {errors.property_type.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unit_count">Unit Count</Label>
                  <Input
                    id="unit_count"
                    type="number"
                    min={1}
                    {...register('unit_count')}
                    className={errCls('unit_count')}
                  />
                  {errors.unit_count && (
                    <p className="text-xs text-red-600">
                      {errors.unit_count.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="year_built">Year Built</Label>
                  <Input
                    id="year_built"
                    type="number"
                    placeholder="e.g. 1965"
                    {...register('year_built')}
                    className={errCls('year_built')}
                  />
                  {errors.year_built && (
                    <p className="text-xs text-red-600">
                      {errors.year_built.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* ---- Flags ---- */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-700">
                Property Flags
              </h3>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    {...register('has_lead_paint')}
                    className="size-4 rounded border-slate-300"
                  />
                  Has lead-based paint (pre-1978)
                </label>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    {...register('has_pool')}
                    className="size-4 rounded border-slate-300"
                  />
                  Has pool
                </label>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    {...register('has_elevator')}
                    className="size-4 rounded border-slate-300"
                  />
                  Has elevator
                </label>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    {...register('is_section8')}
                    className="size-4 rounded border-slate-300"
                  />
                  Section 8
                </label>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    {...register('is_tax_credit')}
                    className="size-4 rounded border-slate-300"
                  />
                  Tax Credit (LIHTC)
                </label>
              </div>
            </div>

            {/* ---- Submit ---- */}
            <div className="flex items-center gap-3 pt-2">
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-[#0f172a] text-white hover:bg-[#1e293b]"
              >
                {isLoading ? 'Adding Property…' : 'Add Property'}
              </Button>
              <Link href="/properties" className={buttonVariants({ variant: "outline" })}>Cancel</Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
