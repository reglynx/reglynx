'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Archive, ArchiveRestore, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  PROPERTY_TYPES,
  CONTIGUOUS_US_STATES,
  isStateSupported,
  COVERAGE_MESSAGES,
} from '@/lib/constants';
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
import type { Property } from '@/lib/types';

export default function EditPropertyPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const propertyId = params.id;

  const [property, setProperty] = useState<Property | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    async function fetchProperty() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: org } = await supabase
        .from('organizations')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      if (!org) { router.push('/onboarding'); return; }

      const { data } = await supabase
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .eq('org_id', org.id)
        .single();

      if (!data) { router.push('/properties'); return; }
      setProperty(data as Property);
      setIsFetching(false);
    }
    fetchProperty();
  }, [propertyId, router]);

  async function handleSave() {
    if (!property) return;
    if (!isStateSupported(property.state)) {
      setError(COVERAGE_MESSAGES.unsupported);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/properties/${propertyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: property.name,
          address_line1: property.address_line1,
          address_line2: property.address_line2 || null,
          city: property.city,
          state: property.state.toUpperCase(),
          zip: property.zip,
          county: property.county || null,
          property_type: property.property_type,
          unit_count: property.unit_count,
          year_built: property.year_built || null,
          has_lead_paint: property.has_lead_paint,
          has_pool: property.has_pool,
          has_elevator: property.has_elevator,
          is_section8: property.is_section8,
          is_tax_credit: property.is_tax_credit,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to update property');
        return;
      }

      router.push(`/properties/${propertyId}`);
      router.refresh();
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleArchive() {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/properties/${propertyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          archived_at: property?.archived_at ? null : new Date().toISOString(),
        }),
      });
      if (res.ok) {
        router.push('/properties');
        router.refresh();
      }
    } catch {
      setError('Failed to archive property');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete() {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/properties/${propertyId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        router.push('/properties');
        router.refresh();
      }
    } catch {
      setError('Failed to delete property');
    } finally {
      setIsLoading(false);
    }
  }

  if (isFetching || !property) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isArchived = !!property.archived_at;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href={`/properties/${propertyId}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Property
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Edit Property</CardTitle>
          <CardDescription>
            Update property details. Address changes may require re-verification.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Property name */}
            <div className="space-y-2">
              <Label>Property Name</Label>
              <Input
                value={property.name}
                onChange={(e) => setProperty({ ...property, name: e.target.value })}
              />
            </div>

            {/* Address */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-700">Property Address</h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Country</Label>
                  <select disabled className="h-8 w-full rounded-lg border border-input bg-slate-50 px-2.5 text-sm text-slate-500">
                    <option value="US">United States</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>State</Label>
                  <select
                    value={property.state}
                    onChange={(e) => setProperty({ ...property, state: e.target.value })}
                    className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none"
                  >
                    <option value="">Select state...</option>
                    {CONTIGUOUS_US_STATES.map((s) => (
                      <option key={s.code} value={s.code}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Street Address</Label>
                <Input
                  value={property.address_line1}
                  onChange={(e) => setProperty({ ...property, address_line1: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Address Line 2</Label>
                <Input
                  value={property.address_line2 || ''}
                  onChange={(e) => setProperty({ ...property, address_line2: e.target.value })}
                  placeholder="Apt, Suite, Unit (optional)"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input
                    value={property.city}
                    onChange={(e) => setProperty({ ...property, city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>ZIP</Label>
                  <Input
                    value={property.zip}
                    onChange={(e) => setProperty({ ...property, zip: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>County</Label>
                  <Input
                    value={property.county || ''}
                    onChange={(e) => setProperty({ ...property, county: e.target.value })}
                    placeholder="Optional"
                  />
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-700">Property Details</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Property Type</Label>
                  <select
                    value={property.property_type}
                    onChange={(e) => setProperty({ ...property, property_type: e.target.value as Property['property_type'] })}
                    className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none"
                  >
                    {Object.entries(PROPERTY_TYPES).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Unit Count</Label>
                  <Input
                    type="number"
                    min={1}
                    value={property.unit_count}
                    onChange={(e) => setProperty({ ...property, unit_count: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Year Built</Label>
                  <Input
                    type="number"
                    value={property.year_built || ''}
                    onChange={(e) => setProperty({ ...property, year_built: parseInt(e.target.value) || null })}
                  />
                </div>
              </div>
            </div>

            {/* Flags */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-700">Property Flags</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'has_lead_paint' as const, label: 'Has lead-based paint (pre-1978)' },
                  { key: 'has_pool' as const, label: 'Has pool' },
                  { key: 'has_elevator' as const, label: 'Has elevator' },
                  { key: 'is_section8' as const, label: 'Section 8' },
                  { key: 'is_tax_credit' as const, label: 'Tax Credit (LIHTC)' },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={property[key]}
                      onChange={(e) => setProperty({ ...property, [key]: e.target.checked })}
                      className="size-4 rounded border-slate-300"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between border-t pt-4">
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="bg-[#0f172a] text-white hover:bg-[#1e293b]"
                >
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </Button>
                <Link href={`/properties/${propertyId}`} className={buttonVariants({ variant: 'outline' })}>
                  Cancel
                </Link>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleArchive}
                  disabled={isLoading}
                >
                  {isArchived ? (
                    <>
                      <ArchiveRestore className="size-3.5" />
                      Restore
                    </>
                  ) : (
                    <>
                      <Archive className="size-3.5" />
                      Archive
                    </>
                  )}
                </Button>

                {!showDeleteConfirm ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={isLoading}
                  >
                    <Trash2 className="size-3.5" />
                    Delete
                  </Button>
                ) : (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                    disabled={isLoading}
                  >
                    Confirm Delete
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
