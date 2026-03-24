import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { structuredLog } from '@/lib/logging';

/**
 * PATCH /api/properties/:id — Update property fields
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch org for scoping
    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .eq('owner_id', user.id)
      .single();

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const body = await request.json();

    // Whitelist updateable fields
    const allowed = [
      'name', 'address_line1', 'address_line2', 'city', 'state', 'zip',
      'county', 'country', 'property_type', 'unit_count', 'year_built',
      'has_lead_paint', 'has_pool', 'has_elevator', 'is_section8', 'is_tax_credit',
      'archived_at',
    ];

    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) {
        updates[key] = body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // Build input_address if address fields changed
    if (updates.address_line1 || updates.city || updates.state || updates.zip) {
      const addr = [
        updates.address_line1 || body.address_line1,
        updates.city || body.city,
        updates.state || body.state,
        updates.zip || body.zip,
      ].filter(Boolean).join(', ');
      updates.input_address = addr;
    }

    const { data: updated, error: updateError } = await supabase
      .from('properties')
      .update(updates)
      .eq('id', id)
      .eq('org_id', org.id)
      .select('*')
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (!updated) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    structuredLog('property_crud', {
      propertyId: id,
      action: updates.archived_at !== undefined ? 'archive' : 'update',
      fields: Object.keys(updates),
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error('[PATCH /api/properties/:id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/properties/:id — Soft-delete a property (sets archived_at)
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .eq('owner_id', user.id)
      .single();

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Soft delete: set archived_at
    const { error: deleteError } = await supabase
      .from('properties')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', id)
      .eq('org_id', org.id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    structuredLog('property_crud', { propertyId: id, action: 'delete' });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/properties/:id] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
