import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAddressProvider } from '@/lib/address';
import { getPropertyIdentityProvider } from '@/lib/property-identity';
import { structuredLog } from '@/lib/logging';

/**
 * POST /api/properties/resolve
 * Resolves address normalization and property identity for a property.
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
      .maybeSingle();

    if (propError || !property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    const updates: Record<string, unknown> = {};

    // Step 1: Address normalization via Google Places
    const addressProvider = getAddressProvider();
    const rawAddress = [
      property.address_line1,
      property.address_line2,
      property.city,
      property.state,
      property.zip,
    ].filter(Boolean).join(', ');

    const normalized = await addressProvider.geocode(rawAddress);

    if (normalized) {
      updates.normalized_address = normalized.formattedAddress;
      updates.latitude = normalized.latitude;
      updates.longitude = normalized.longitude;
      updates.address_provider = normalized.provider;
      updates.address_confidence = normalized.confidence;

      structuredLog('address_resolution', {
        propertyId,
        inputAddress: rawAddress,
        normalizedAddress: normalized.formattedAddress,
        provider: normalized.provider,
        confidence: normalized.confidence,
        status: 'success',
      });
    } else {
      structuredLog('address_resolution', {
        propertyId,
        inputAddress: rawAddress,
        provider: addressProvider.name,
        status: 'failed',
        reason: 'No geocoding result returned',
      });
    }

    // Step 2: Property identity resolution via Regrid
    if (normalized) {
      const identityProvider = getPropertyIdentityProvider();
      const identity = await identityProvider.resolve(normalized);

      if (identity) {
        updates.national_property_id = identity.nationalPropertyId;
        updates.local_parcel_id = identity.localParcelId;
        updates.local_tax_id = identity.localTaxId;
        updates.identity_provider = identity.provider;
        updates.identity_confidence = identity.confidence;
        updates.identity_resolved_at = identity.resolvedAt;

        structuredLog('identity_resolution', {
          propertyId,
          provider: identity.provider,
          nationalPropertyId: identity.nationalPropertyId,
          localParcelId: identity.localParcelId,
          confidence: identity.confidence,
          status: 'success',
        });
      } else {
        structuredLog('identity_resolution', {
          propertyId,
          provider: identityProvider.name,
          status: 'failed',
          reason: 'No identity match returned',
        });
      }
    }

    // Update property with resolution data
    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from('properties')
        .update(updates)
        .eq('id', propertyId);

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      updates,
    });
  } catch (err) {
    console.error('[resolve] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
