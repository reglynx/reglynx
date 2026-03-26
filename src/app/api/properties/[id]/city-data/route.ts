import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchAllCityData } from '@/lib/data-sources/philadelphia-open-data';
import type { Organization, Property } from '@/lib/types';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle<Pick<Organization, 'id'>>();

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const { data: property } = await supabase
      .from('properties')
      .select('*')
      .eq('id', id)
      .eq('org_id', org.id)
      .maybeSingle<Property>();

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    // Only Philadelphia properties have city data
    if (
      property.city?.toLowerCase() !== 'philadelphia' ||
      property.state !== 'PA'
    ) {
      return NextResponse.json(
        { error: 'City data is currently only available for Philadelphia, PA properties' },
        { status: 400 },
      );
    }

    const address = property.address_line1 ?? '';
    if (!address) {
      return NextResponse.json(
        { error: 'Property has no address' },
        { status: 400 },
      );
    }

    const cityData = await fetchAllCityData(address);

    return NextResponse.json(cityData);
  } catch (error) {
    console.error('City data fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch city data' },
      { status: 500 },
    );
  }
}
