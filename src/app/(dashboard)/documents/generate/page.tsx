'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { createClient } from '@/lib/supabase/client';
import { DOCUMENT_TYPES, JURISDICTIONS, getDocumentTypeName } from '@/lib/constants';
import type { Property } from '@/lib/types';

function GenerateDocumentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const preselectedDocType = searchParams.get('doc_type') || '';
  const preselectedJurisdiction = searchParams.get('jurisdiction') || '';
  const preselectedPropertyId = searchParams.get('property_id') || '';

  const [documentType, setDocumentType] = useState(preselectedDocType);
  const [propertyId, setPropertyId] = useState(preselectedPropertyId);
  const [jurisdiction, setJurisdiction] = useState(preselectedJurisdiction);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchingProperties, setFetchingProperties] = useState(true);

  // Fetch properties on mount
  useEffect(() => {
    async function fetchProperties() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: org } = await supabase
        .from('organizations')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (!org) return;

      const { data } = await supabase
        .from('properties')
        .select('*')
        .eq('org_id', org.id)
        .order('name', { ascending: true });

      setProperties(data ?? []);
      setFetchingProperties(false);
    }
    fetchProperties();
  }, []);

  // Auto-suggest jurisdiction when property is selected (only if no preselected jurisdiction)
  useEffect(() => {
    if (!propertyId) return;
    if (preselectedJurisdiction) return; // Don't override preselected
    const property = properties.find((p) => p.id === propertyId);
    if (!property) return;

    if (property.city === 'Philadelphia' && property.state === 'PA') {
      setJurisdiction('Philadelphia_PA');
    } else if (property.state === 'PA') {
      setJurisdiction('PA');
    } else {
      setJurisdiction('federal');
    }
  }, [propertyId, properties, preselectedJurisdiction]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/documents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_type: documentType,
          property_id: propertyId || undefined,
          jurisdiction,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to generate document');
      }

      const doc = await res.json();
      router.push(`/documents/${doc.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-sm font-medium text-muted-foreground">
          Generating your draft...
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          This may take 15-30 seconds
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Generate Document Draft
        </h1>
        <p className="text-muted-foreground">
          Select a document type and jurisdiction to generate an AI-drafted
          compliance template.
        </p>
      </div>

      {preselectedDocType && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
          <p className="text-emerald-800 text-sm font-medium">
            \u2713 Ready to generate your <strong>{getDocumentTypeName(preselectedDocType)}</strong> draft.
            Select a property below to get started.
          </p>
        </div>
      )}

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Document Type */}
            <div className="space-y-2">
              <Label htmlFor="document_type">Document Type</Label>
              <select
                id="document_type"
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                required
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Select a document type...</option>
                {Object.entries(DOCUMENT_TYPES).map(([key, dt]) => (
                  <option key={key} value={key}>
                    {dt.label}
                  </option>
                ))}
              </select>
              {documentType &&
                DOCUMENT_TYPES[
                  documentType as keyof typeof DOCUMENT_TYPES
                ] && (
                  <p className="text-xs text-muted-foreground">
                    {
                      DOCUMENT_TYPES[
                        documentType as keyof typeof DOCUMENT_TYPES
                      ].description
                    }
                  </p>
                )}
            </div>

            {/* Property (optional) */}
            <div className="space-y-2">
              <Label htmlFor="property_id">Property (Optional)</Label>
              <select
                id="property_id"
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
                disabled={fetchingProperties}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">
                  {fetchingProperties
                    ? 'Loading properties...'
                    : 'Organization-wide (no specific property)'}
                </option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} \u2014 {p.city}, {p.state}
                  </option>
                ))}
              </select>
            </div>

            {/* Jurisdiction */}
            <div className="space-y-2">
              <Label htmlFor="jurisdiction">Jurisdiction</Label>
              <select
                id="jurisdiction"
                value={jurisdiction}
                onChange={(e) => setJurisdiction(e.target.value)}
                required
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Select a jurisdiction...</option>
                {Object.entries(JURISDICTIONS).map(([key, j]) => (
                  <option key={key} value={key}>
                    {j.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              className="w-full"
              disabled={!documentType || !jurisdiction}
            >
              Generate Draft
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function GenerateDocumentPage() {
  return (
    <Suspense fallback={<div />}>
      <GenerateDocumentForm />
    </Suspense>
  );
}
