import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdaptersForJurisdiction } from '@/lib/compliance/adapter-interface';
import { registerPhiladelphiaAdapters } from '@/lib/compliance/adapters/philadelphia';
import { structuredLog } from '@/lib/logging';
import type { ComplianceResult } from '@/lib/types';

// Register adapters on module load
registerPhiladelphiaAdapters();

/**
 * POST /api/compliance/check
 * Run all compliance adapters for a property's jurisdiction.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { propertyId } = body;

    if (!propertyId) {
      return NextResponse.json({ error: 'propertyId is required' }, { status: 400 });
    }

    // Fetch the property
    const { data: property, error: propError } = await supabase
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .single();

    if (propError || !property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    // Determine jurisdiction(s) for this property
    const jurisdictions: string[] = [];

    if (property.city?.toLowerCase() === 'philadelphia' && property.state === 'PA') {
      jurisdictions.push('Philadelphia_PA');
    }

    // Run all adapters for each jurisdiction
    const results: ComplianceResult[] = [];

    for (const jurisdiction of jurisdictions) {
      const adapters = getAdaptersForJurisdiction(jurisdiction);

      for (const adapter of adapters) {
        try {
          const result = await adapter.check(property);
          results.push(result);

          structuredLog('adapter_execution', {
            propertyId,
            adapter: adapter.name,
            jurisdiction,
            matchState: result.matchState,
            recordCount: result.recordCount,
            status: 'success',
          });
        } catch (err) {
          console.error(`[compliance] adapter ${adapter.name} error:`, err);

          structuredLog('adapter_execution', {
            propertyId,
            adapter: adapter.name,
            jurisdiction,
            status: 'failed',
            reason: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      }
    }

    return NextResponse.json({
      propertyId,
      jurisdictions,
      results,
      checkedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[compliance/check] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
